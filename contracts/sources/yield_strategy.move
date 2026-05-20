/// Module: yield_strategy
/// Simulated yield strategy for Archa — holds pool funds and generates simulated APY
///
/// This is a hackathon simulation. In production, this would route funds
/// to actual DeFi protocols (Scallop, NAVI, Cetus) on Sui.
///
/// Bug fixes from audit:
/// - C2: No owner bypass in withdraw() — everyone needs shares
/// - M2: Minimum deposit check to prevent dust/zero shares
module archa::yield_strategy {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};

    use archa::test_usdc::TEST_USDC;

    // ====== Constants ======
    const E_NOT_OWNER: u64 = 200;
    const E_NOT_AI_OPTIMIZER: u64 = 201;
    const E_INSUFFICIENT_SHARES: u64 = 202;
    const E_MIN_DEPOSIT: u64 = 203;
    const E_INVALID_APY: u64 = 204;

    // ====== Structs ======

    /// Strategy admin capability
    public struct StrategyAdminCap has key, store { id: UID }

    /// YieldStrategy — shared object, one per deployment
    /// Holds pool funds, tracks shares per depositor, simulates APY
    public struct YieldStrategy has key {
        id: UID,
        owner: address,
        ai_optimizer: address,

        // Share accounting
        total_deposits: u64,      // Total USDC ever deposited (principal)
        total_shares: u64,        // Total shares issued
        shares: Table<address, u64>,  // Per-address share balance

        // Yield simulation
        simulated_apy: u64,       // Basis points (e.g. 500 = 5%)
        protocol_name: String,    // Current "protocol" name (for display)
        last_update_time_ms: u64, // Last yield simulation timestamp

        // Vault tracking (for future real DeFi integration)
        active_vault_id: Option<ID>,
        registered_vaults: vector<ID>,

        // Funds
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

    public struct ProtocolSwitched has copy, drop {
        strategy_id: ID,
        old_protocol: String,
        new_protocol: String,
        new_apy: u64,
    }

    public struct YieldSimulated has copy, drop {
        strategy_id: ID,
        yield_amount: u64,
        new_total_value: u64,
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
            simulated_apy: 500, // Default 5%
            protocol_name: string::utf8(b"Scallop Lend"),
            last_update_time_ms: 0,
            active_vault_id: option::none(),
            registered_vaults: vector[],
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

        // Calculate shares to mint
        // If first deposit: 1:1 ratio
        // Otherwise: shares = amount * total_shares / total_deposits
        let shares_to_mint = if (strategy.total_shares == 0) {
            amount
        } else {
            amount * strategy.total_shares / strategy.total_deposits
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

        // Must have enough shares — NO owner bypass (fix C2)
        assert!(table::contains(&strategy.shares, withdrawer), E_INSUFFICIENT_SHARES);
        let my_shares = table::borrow_mut(&mut strategy.shares, withdrawer);
        assert!(*my_shares >= share_amount, E_INSUFFICIENT_SHARES);

        // Calculate USDC amount to return
        let amount = if (strategy.total_shares > 0) {
            share_amount * strategy.total_deposits / strategy.total_shares
        } else {
            0
        };

        assert!(amount > 0, E_INSUFFICIENT_SHARES);

        // Burn shares
        *my_shares = *my_shares - share_amount;
        strategy.total_shares = strategy.total_shares - share_amount;
        strategy.total_deposits = strategy.total_deposits - amount;

        // Withdraw from balance
        let withdrawn = coin::take(&mut strategy.funds, amount, ctx);

        event::emit(WithdrawnFromStrategy {
            strategy_id: object::id(strategy),
            withdrawer,
            shares_burned: share_amount,
            amount,
        });

        withdrawn
    }

    /// Simulate yield accrual — called by AI optimizer or owner
    /// For hackathon: adds simulated yield based on APY and time elapsed
    public fun simulate_yield(
        strategy: &mut YieldStrategy,
        clock: &sui::clock::Clock,
        _cap: &StrategyAdminCap,
    ) {
        let current_time = sui::clock::timestamp_ms(clock);

        if (strategy.last_update_time_ms == 0) {
            strategy.last_update_time_ms = current_time;
            return
        };

        let elapsed_ms = current_time - strategy.last_update_time_ms;
        if (elapsed_ms == 0) { return };

        // Simple yield: (total_deposits * APY * elapsed) / (10000 * year_ms)
        // APY in basis points (500 = 5%)
        let year_ms = 365u64 * 24 * 60 * 60 * 1000;
        let current_value = balance::value(&strategy.funds);

        if (current_value == 0) {
            strategy.last_update_time_ms = current_time;
            return
        };

        let yield_amount = current_value * strategy.simulated_apy * elapsed_ms / (10000 * year_ms);

        if (yield_amount == 0) {
            strategy.last_update_time_ms = current_time;
            return
        };

        // Simulated yield: increase total_deposits WITHOUT requiring actual coins
        // This increases share value proportionally
        // In a real system, yield would come from external DeFi protocols
        strategy.total_deposits = strategy.total_deposits + yield_amount;
        strategy.last_update_time_ms = current_time;

        event::emit(YieldSimulated {
            strategy_id: object::id(strategy),
            yield_amount,
            new_total_value: strategy.total_deposits,
        });
    }

    // ====== Admin Functions ======

    /// Switch to a different "protocol" — changes APY and name
    /// Only owner or AI optimizer can call
    public fun switch_protocol(
        strategy: &mut YieldStrategy,
        _cap: &StrategyAdminCap,
        new_protocol_name: String,
        new_apy: u64,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        assert!(sender == strategy.owner || sender == strategy.ai_optimizer, E_NOT_AI_OPTIMIZER);
        assert!(new_apy <= 5000, E_INVALID_APY); // Max 50% APY

        let old_protocol = strategy.protocol_name;
        strategy.protocol_name = new_protocol_name;
        strategy.simulated_apy = new_apy;

        event::emit(ProtocolSwitched {
            strategy_id: object::id(strategy),
            old_protocol,
            new_protocol: new_protocol_name,
            new_apy,
        });
    }

    /// Set AI optimizer address
    public fun set_ai_optimizer(
        strategy: &mut YieldStrategy,
        new_optimizer: address,
        ctx: &mut TxContext,
    ) {
        assert!(ctx.sender() == strategy.owner, E_NOT_OWNER);
        strategy.ai_optimizer = new_optimizer;
    }

    // ====== View Functions ======

    /// Get total value in the strategy (deposits + simulated yield)
    public fun get_total_value(strategy: &YieldStrategy): u64 {
        strategy.total_deposits
    }

    /// Get shares of a specific address
    public fun get_shares(strategy: &YieldStrategy, addr: address): u64 {
        if (table::contains(&strategy.shares, addr)) {
            *table::borrow(&strategy.shares, addr)
        } else {
            0
        }
    }

    /// Get share price (total_deposits / total_shares, scaled by 1e6)
    public fun get_share_price(strategy: &YieldStrategy): u64 {
        if (strategy.total_shares == 0) {
            return 1_000_000 // 1.0
        };
        strategy.total_deposits * 1_000_000 / strategy.total_shares
    }

    /// Get current APY in basis points
    public fun get_apy(strategy: &YieldStrategy): u64 {
        strategy.simulated_apy
    }

    /// Get protocol name
    public fun get_protocol_name(strategy: &YieldStrategy): String {
        strategy.protocol_name
    }

    /// Get actual balance (may differ from total_deposits due to simulated yield)
    public fun get_actual_balance(strategy: &YieldStrategy): u64 {
        balance::value(&strategy.funds)
    }

    /// Calculate how much USDC a given number of shares is worth
    public fun shares_to_amount(strategy: &YieldStrategy, shares: u64): u64 {
        if (strategy.total_shares == 0) {
            return 0
        };
        shares * strategy.total_deposits / strategy.total_shares
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
            simulated_apy: 500,
            protocol_name: string::utf8(b"Test Protocol"),
            last_update_time_ms: 0,
            active_vault_id: option::none(),
            registered_vaults: vector[],
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
            shares, simulated_apy: _, protocol_name: _,
            last_update_time_ms: _, active_vault_id,
            registered_vaults, funds
        } = strategy;
        table::drop(shares);
        option::destroy_none(active_vault_id);
        vector::destroy_empty(registered_vaults);
        balance::destroy_for_testing(funds);
        object::delete(id);

        let StrategyAdminCap { id: cap_id } = cap;
        object::delete(cap_id);
    }
}
