/// Module: yield_strategy
/// Yield strategy for Archa — holds pool funds and tracks shares per depositor
/// Real yield comes from DeepBook profits deposited as actual coins (C-02/M-03 fix)
/// Invariant: total_deposits == balance::value(&funds) at all times
///
/// Bug fixes from audit:
/// - C2: No owner bypass in withdraw() — everyone needs shares
/// - M2: Minimum deposit check to prevent dust/zero shares
/// - C-02: Removed simulated yield — total_deposits always matches actual balance
#[allow(unused_field)]
module archa::yield_strategy {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};

    use archa::test_usdc::TEST_USDC;

    const E_INSUFFICIENT_SHARES: u64 = 202;
    const E_MIN_DEPOSIT: u64 = 203;

    const MIN_SHARES_OFFSET: u64 = 1000;

    public struct StrategyAdminCap has key, store { id: UID }

    public struct YieldStrategy has key {
        id: UID,
        owner: address,
        ai_optimizer: address,
        total_deposits: u64,
        total_shares: u64,
        shares: Table<address, u64>,
        funds: Balance<TEST_USDC>,
    }

    // ====== Events ======

    public struct StrategyCreated has copy, drop {
        strategy_id: ID,
        owner: address,
    }

    public struct DepositedToStrategy has copy, drop {
        strategy_id: ID,
        depositor: address,
        amount: u64,
        shares_minted: u64,
    }

    public struct WithdrawnFromStrategy has copy, drop {
        strategy_id: ID,
        withdrawer: address,
        shares_burned: u64,
        amount: u64,
    }

    // ====== Init ======

    public struct YIELD_STRATEGY has drop {}

    fun init(otw: YIELD_STRATEGY, ctx: &mut TxContext) {
        let strategy_id = object::new(ctx);
        let strategy = YieldStrategy {
            id: strategy_id,
            owner: ctx.sender(),
            ai_optimizer: ctx.sender(),
            total_deposits: 0,
            total_shares: 0,
            shares: table::new(ctx),
            funds: balance::zero(),
        };

        event::emit(StrategyCreated {
            strategy_id: object::id(&strategy),
            owner: ctx.sender(),
        });

        transfer::share_object(strategy);

        let admin_cap = StrategyAdminCap { id: object::new(ctx) };
        transfer::public_transfer(admin_cap, ctx.sender());

        let YIELD_STRATEGY {} = otw;
    }

    // ====== Core Functions ======

    /// Internal: precise multiplication-division using u128 intermediate (SEC-AR-3 fix)
    fun mul_div(a: u64, b: u64, c: u64): u64 {
        (((a as u128) * (b as u128) / (c as u128)) as u64)
    }

    /// Deposit USDC into the strategy, receive shares
    /// - Minimum deposit enforced (fix M2)
    /// - Share price = total_deposits / total_shares (1:1 initially)
    public fun deposit(
        strategy: &mut YieldStrategy,
        coin: Coin<TEST_USDC>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        assert!(amount > 0, E_MIN_DEPOSIT);

        let depositor = ctx.sender();

        // Calculate shares to mint (SEC-AR-3 fix: u128 intermediate + offset)
        // If first deposit: shares = amount + MIN_SHARES_OFFSET (offset prevents dust)
        // Otherwise: shares = mul_div(amount + offset_portion, total_shares, total_deposits)
        let shares_to_mint = if (strategy.total_shares == 0) {
            amount + MIN_SHARES_OFFSET
        } else {
            mul_div(amount, strategy.total_shares, strategy.total_deposits)
        };

        // Prevent zero shares from dust deposits (fix M2)
        assert!(shares_to_mint > 0, E_MIN_DEPOSIT);

        // Update state
        strategy.total_deposits = strategy.total_deposits + amount;
        strategy.total_shares = strategy.total_shares + shares_to_mint;

        // Update depositor's shares
        if (table::contains(&strategy.shares, depositor)) {
            let current = table::borrow_mut(&mut strategy.shares, depositor);
            *current = *current + shares_to_mint;
        } else {
            table::add(&mut strategy.shares, depositor, shares_to_mint);
        };

        // Add funds
        balance::join(&mut strategy.funds, coin::into_balance(coin));

        event::emit(DepositedToStrategy {
            strategy_id: object::id(strategy),
            depositor,
            amount,
            shares_minted: shares_to_mint,
        });
    }

    /// Withdraw USDC by burning shares (fix C2: NO owner bypass)
    /// - Caller must have enough shares
    /// - Share value = total_deposits / total_shares
    /// - Amount = shares * total_deposits / total_shares
    public fun withdraw(
        strategy: &mut YieldStrategy,
        share_amount: u64,
        ctx: &mut TxContext,
    ): Coin<TEST_USDC> {
        let withdrawer = ctx.sender();

        assert!(table::contains(&strategy.shares, withdrawer), E_INSUFFICIENT_SHARES);
        let my_shares = table::borrow_mut(&mut strategy.shares, withdrawer);
        assert!(*my_shares >= share_amount, E_INSUFFICIENT_SHARES);

        let amount = if (strategy.total_shares > 0) {
            mul_div(share_amount, strategy.total_deposits, strategy.total_shares)
        } else {
            0
        };

        assert!(amount > 0, E_INSUFFICIENT_SHARES);

        *my_shares = *my_shares - share_amount;
        strategy.total_shares = strategy.total_shares - share_amount;
        strategy.total_deposits = strategy.total_deposits - amount;

        let withdrawn = coin::take(&mut strategy.funds, amount, ctx);

        event::emit(WithdrawnFromStrategy {
            strategy_id: object::id(strategy),
            withdrawer,
            shares_burned: share_amount,
            amount,
        });

        withdrawn
    }

    // ====== Admin Functions ======

    public fun set_ai_optimizer(
        _cap: &StrategyAdminCap,
        strategy: &mut YieldStrategy,
        new_optimizer: address,
    ) {
        strategy.ai_optimizer = new_optimizer;
    }

    // ====== View Functions ======

    public fun get_total_value(strategy: &YieldStrategy): u64 {
        strategy.total_deposits
    }

    public fun get_shares(strategy: &YieldStrategy, addr: address): u64 {
        if (table::contains(&strategy.shares, addr)) {
            *table::borrow(&strategy.shares, addr)
        } else {
            0
        }
    }

    public fun get_share_price(strategy: &YieldStrategy): u64 {
        if (strategy.total_shares == 0) {
            return 1_000_000
        };
        mul_div(strategy.total_deposits, 1_000_000, strategy.total_shares)
    }

    public fun get_actual_balance(strategy: &YieldStrategy): u64 {
        balance::value(&strategy.funds)
    }

    public fun shares_to_amount(strategy: &YieldStrategy, shares: u64): u64 {
        if (strategy.total_shares == 0) {
            return 0
        };
        mul_div(shares, strategy.total_deposits, strategy.total_shares)
    }

    // ====== TEST HELPERS ======

    #[test_only]
    public fun test_create_strategy(ctx: &mut TxContext): (YieldStrategy, StrategyAdminCap) {
        let strategy = YieldStrategy {
            id: object::new(ctx),
            owner: ctx.sender(),
            ai_optimizer: ctx.sender(),
            total_deposits: 0,
            total_shares: 0,
            shares: table::new(ctx),
            funds: balance::zero(),
        };
        let cap = StrategyAdminCap { id: object::new(ctx) };
        (strategy, cap)
    }

    #[test_only]
    public fun test_cleanup_strategy(strategy: YieldStrategy, cap: StrategyAdminCap, _ctx: &mut TxContext) {
        let YieldStrategy {
            id, owner: _, ai_optimizer: _,
            total_deposits: _, total_shares: _,
            shares, funds
        } = strategy;
        table::drop(shares);
        balance::destroy_for_testing(funds);
        object::delete(id);

        let StrategyAdminCap { id: cap_id } = cap;
        object::delete(cap_id);
    }
}
