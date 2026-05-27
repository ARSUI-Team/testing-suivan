/// Module: deepbook_yield
/// DeepBook V3 flash loan integration for Archa yield optimization
///
/// This module enables Archa pools to generate yield via:
/// 1. Flash loan arbitrage — borrow from DeepBook, execute swaps, keep profit
/// 2. Idle fund deployment — deposit pool funds to DeepBook BalanceManager
/// 3. Maker rebates — place limit orders on DeepBook to earn maker fees
///
/// Flash Loan Flow (atomic via Hot Potato):
/// 1. borrow_flashloan_base/quote() from DeepBook Pool → (Coin, FlashLoan)
/// 2. Execute swap strategy (swap on same pool opposite direction)
/// 3. return_flashloan_base/quote() to same pool — MUST return exact amount
/// 4. If profit exists: return surplus Coin to caller for deposit
/// 5. If loss: tx aborts (FlashLoan cannot be unwrapped → rollback)
///
/// PTB composition: flash_arbitrage → deposit_yield_profit_usdc (if USDC)
module archa::deepbook_yield {
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event;

    use archa::arisan_pool::{Self, ArisanPool, PoolAdminCap, YieldWithdrawalReceipt};
    use archa::test_usdc::TEST_USDC;
    use deepbook::pool::{Self as deepbook_pool, Pool as DeepBookPool};
    use deepbook::vault::FlashLoan;
    use deepbook::balance_manager::{Self as balance_manager, BalanceManager};
    use token::deep::DEEP;

    // ====== Constants ======
    const E_INSUFFICIENT_PROFIT: u64 = 1000;
    const E_FLASH_LOAN_AMOUNT_ZERO: u64 = 1001;

    // ====== Events ======

    #[allow(unused_field)]
    public struct FlashArbitrageExecuted has copy, drop {
        pool_id: ID,
        deepbook_pool_id: ID,
        borrowed_amount: u64,
        returned_amount: u64,
        profit: u64,
        is_base: bool,
    }

    #[allow(unused_field)]
    public struct YieldProfitDeposited has copy, drop {
        pool_id: ID,
        amount: u64,
    }

    #[allow(unused_field)]
    public struct FundsDepositedToDeepBook has copy, drop {
        pool_id: ID,
        amount: u64,
    }

    #[allow(unused_field)]
    public struct FundsWithdrawnFromDeepBook has copy, drop {
        pool_id: ID,
        amount: u64,
    }

    // ====== Flash Arbitrage — Borrow Base ======

    /// Execute flash loan arbitrage borrowing base asset from DeepBook
    ///
    /// Flow:
    /// 1. Borrow base asset from DeepBook (hot potato FlashLoan)
    /// 2. Swap borrowed base for quote on DeepBook
    /// 3. Swap quote back for base (aiming for more than borrowed)
    /// 4. Return exact borrowed amount → consume FlashLoan
    /// 5. Return all remaining coins to caller (profit + leftovers)
    ///
    /// min_profit: minimum profit expected — tx aborts if profit < min_profit (slippage protection)
    /// Caller composes PTB: flash_arbitrage_borrow_base → deposit_yield_profit_usdc
    public fun flash_arbitrage_borrow_base<BaseAsset, QuoteAsset>(
        archa_pool_id: ID,
        deepbook_pool: &mut DeepBookPool<BaseAsset, QuoteAsset>,
        borrow_amount: u64,
        min_profit: u64,
        deep_coin: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
        assert!(borrow_amount > 0, E_FLASH_LOAN_AMOUNT_ZERO);

        let (borrowed_base, flash_loan) = deepbook_pool::borrow_flashloan_base(
            deepbook_pool, borrow_amount, ctx,
        );

        let (base_left_1, quote_out, deep_mid) = deepbook_pool::swap_exact_base_for_quote(
            deepbook_pool, borrowed_base, deep_coin, 0, clock, ctx,
        );

        let (mut base_back, quote_left, deep_out) = deepbook_pool::swap_exact_quote_for_base(
            deepbook_pool, quote_out, deep_mid, borrow_amount, clock, ctx,
        );

        // Merge any unfilled base from first swap
        if (coin::value(&base_left_1) > 0) {
            coin::join(&mut base_back, base_left_1);
        } else {
            coin::destroy_zero(base_left_1);
        };

        let base_value = coin::value(&base_back);
        assert!(base_value >= borrow_amount, E_INSUFFICIENT_PROFIT);

        let profit = base_value - borrow_amount;
        assert!(profit >= min_profit, E_INSUFFICIENT_PROFIT);

        let return_coin = coin::split(&mut base_back, borrow_amount, ctx);
        deepbook_pool::return_flashloan_base(deepbook_pool, return_coin, flash_loan);

        event::emit(FlashArbitrageExecuted {
            pool_id: archa_pool_id,
            deepbook_pool_id: object::id(deepbook_pool),
            borrowed_amount: borrow_amount,
            returned_amount: borrow_amount,
            profit,
            is_base: true,
        });

        (base_back, quote_left, deep_out)
    }

    // ====== Flash Arbitrage — Borrow Quote ======

    /// Execute flash loan arbitrage borrowing quote asset from DeepBook
    ///
    /// min_profit: minimum profit expected — tx aborts if profit < min_profit (slippage protection)
    /// Returns: (base_remaining, quote_profit, deep_remaining)
    public fun flash_arbitrage_borrow_quote<BaseAsset, QuoteAsset>(
        archa_pool_id: ID,
        deepbook_pool: &mut DeepBookPool<BaseAsset, QuoteAsset>,
        borrow_amount: u64,
        min_profit: u64,
        deep_coin: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
        assert!(borrow_amount > 0, E_FLASH_LOAN_AMOUNT_ZERO);

        let (borrowed_quote, flash_loan) = deepbook_pool::borrow_flashloan_quote(
            deepbook_pool, borrow_amount, ctx,
        );

        let (base_out, quote_left_1, deep_mid) = deepbook_pool::swap_exact_quote_for_base(
            deepbook_pool, borrowed_quote, deep_coin, 0, clock, ctx,
        );

        let (base_left, mut quote_back, deep_out) = deepbook_pool::swap_exact_base_for_quote(
            deepbook_pool, base_out, deep_mid, borrow_amount, clock, ctx,
        );

        // Merge any unfilled quote from first swap
        if (coin::value(&quote_left_1) > 0) {
            coin::join(&mut quote_back, quote_left_1);
        } else {
            coin::destroy_zero(quote_left_1);
        };

        let quote_value = coin::value(&quote_back);
        assert!(quote_value >= borrow_amount, E_INSUFFICIENT_PROFIT);

        let profit = quote_value - borrow_amount;
        assert!(profit >= min_profit, E_INSUFFICIENT_PROFIT);

        let return_coin = coin::split(&mut quote_back, borrow_amount, ctx);
        deepbook_pool::return_flashloan_quote(deepbook_pool, return_coin, flash_loan);

        event::emit(FlashArbitrageExecuted {
            pool_id: archa_pool_id,
            deepbook_pool_id: object::id(deepbook_pool),
            borrowed_amount: borrow_amount,
            returned_amount: borrow_amount,
            profit,
            is_base: false,
        });

        (base_left, quote_back, deep_out)
    }

    // ====== Yield Deposit ======

    /// Deposit flash arbitrage profit (USDC) to Archa pool yield_balance
    /// Call this after flash_arbitrage when the profit coin is TEST_USDC
    /// PTB-composable: chain after flash_arbitrage in same transaction
    public fun deposit_yield_profit_usdc(
        cap: &PoolAdminCap,
        archa_pool: &mut ArisanPool,
        profit_coin: Coin<TEST_USDC>,
    ) {
        let profit_amount = coin::value(&profit_coin);
        if (profit_amount > 0) {
            arisan_pool::deposit_yield_balance(cap, archa_pool, coin::into_balance(profit_coin));

            event::emit(YieldProfitDeposited {
                pool_id: object::id(archa_pool),
                amount: profit_amount,
            });
        } else {
            coin::destroy_zero(profit_coin);
        };
    }

    // ====== BalanceManager Integration ======

    /// Deposit idle pool funds to DeepBook BalanceManager for trading
    /// Returns YieldWithdrawalReceipt — MUST be consumed by withdraw_funds_from_deepbook
    /// in the same PTB (hot potato pattern enforces return)
    public fun deposit_funds_to_deepbook(
        cap: &PoolAdminCap,
        archa_pool: &mut ArisanPool,
        balance_manager: &mut BalanceManager,
        amount: u64,
        ctx: &mut TxContext,
    ): YieldWithdrawalReceipt {
        let (coin, receipt) = arisan_pool::withdraw_pool_funds_for_yield(cap, archa_pool, amount, ctx);
        balance_manager::deposit(balance_manager, coin, ctx);

        event::emit(FundsDepositedToDeepBook {
            pool_id: object::id(archa_pool),
            amount,
        });

        receipt
    }

    /// Withdraw funds from DeepBook BalanceManager back to Archa pool
    /// Consumes YieldWithdrawalReceipt (hot potato)
    public fun withdraw_funds_from_deepbook(
        cap: &PoolAdminCap,
        archa_pool: &mut ArisanPool,
        balance_manager: &mut BalanceManager,
        amount: u64,
        receipt: YieldWithdrawalReceipt,
        ctx: &mut TxContext,
    ) {
        let coin = balance_manager::withdraw<TEST_USDC>(balance_manager, amount, ctx);
        arisan_pool::return_pool_funds_from_yield(cap, archa_pool, coin, receipt);

        event::emit(FundsWithdrawnFromDeepBook {
            pool_id: object::id(archa_pool),
            amount,
        });
    }
}
