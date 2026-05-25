/// Tests for deepbook_yield module + arisan_pool yield integration hooks
/// Updated for S1-2/H-03 fix: hot potato YieldWithdrawalReceipt + public(package)
#[test_only]
module archa::deepbook_yield_tests {
    use sui::test_scenario;
    use sui::coin::{Self, Coin};
    use sui::balance;
    use archa::arisan_pool::{Self, ArisanPool, PoolAdminCap, YieldWithdrawalReceipt};
    use archa::test_usdc::TEST_USDC;

    const DEPOSIT_AMOUNT: u64 = 10_000_000;
    const MAX_PARTICIPANTS: u64 = 5;
    const CYCLE_DURATION_MS: u64 = 2_592_000_000;
    const COLLATERAL_MULTIPLIER: u64 = 125;

    fun mint_coin(amount: u64, ctx: &mut TxContext): Coin<TEST_USDC> {
        coin::from_balance(
            balance::create_for_testing<TEST_USDC>(amount),
            ctx,
        )
    }

    fun create_test_pool(scenario: &mut test_scenario::Scenario): (ArisanPool, PoolAdminCap) {
        arisan_pool::test_create_pool_for_unit_test(
            DEPOSIT_AMOUNT,
            MAX_PARTICIPANTS,
            CYCLE_DURATION_MS,
            COLLATERAL_MULTIPLIER,
            scenario.ctx(),
        )
    }

    // =========================================================================
    // Test: deposit_yield_balance — profit deposit hook
    // =========================================================================

    #[test]
    fun test_deposit_yield_balance_success() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_yield(&info) == 0);

        let yield_coin = mint_coin(5_000_000, scenario.ctx());
        arisan_pool::deposit_yield_balance(&cap, &mut pool, coin::into_balance(yield_coin));

        let info_after = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_yield(&info_after) == 5_000_000);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_deposit_yield_balance_multiple() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let coin1 = mint_coin(3_000_000, scenario.ctx());
        arisan_pool::deposit_yield_balance(&cap, &mut pool, coin::into_balance(coin1));

        let coin2 = mint_coin(2_500_000, scenario.ctx());
        arisan_pool::deposit_yield_balance(&cap, &mut pool, coin::into_balance(coin2));

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_yield(&info) == 5_500_000);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // Test: deposit_pool_funds — seeding pool_funds_balance (no receipt needed)
    // =========================================================================

    #[test]
    fun test_deposit_pool_funds_success() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let seed_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info) == 50_000_000);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // Test: withdraw/return with hot potato receipt (S1-2/H-03 fix)
    // =========================================================================

    #[test]
    fun test_withdraw_and_return_pool_funds_with_receipt() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        // Seed pool with funds using deposit_pool_funds
        let seed_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info) == 50_000_000);

        // Withdraw with hot potato receipt
        let (withdrawn, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 20_000_000, scenario.ctx()
        );
        assert!(coin::value(&withdrawn) == 20_000_000);

        let info2 = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info2) == 30_000_000);

        // Return with receipt — consumes hot potato
        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, withdrawn, receipt);

        let info3 = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info3) == 50_000_000);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_INSUFFICIENT_FUNDS)]
    fun test_withdraw_pool_funds_insufficient() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let seed_coin = mint_coin(10_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        // Will abort with E_INSUFFICIENT_FUNDS — receipt is never consumed so tx aborts
        let (withdrawn, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 20_000_000, scenario.ctx()
        );
        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, withdrawn, receipt);

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_WRONG_DEPOSIT_AMOUNT)]
    fun test_withdraw_pool_funds_zero_amount() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let (withdrawn, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 0, scenario.ctx()
        );
        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, withdrawn, receipt);

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // Test: receipt pool_id mismatch — return to wrong pool
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_WRONG_RECEIPT)]
    fun test_return_funds_wrong_pool_receipt() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool1, cap1) = create_test_pool(&mut scenario);
        let (mut pool2, cap2) = create_test_pool(&mut scenario);

        // Seed pool1
        let seed1 = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap1, &mut pool1, seed1);

        // Withdraw from pool1 — get receipt for pool1
        let (withdrawn, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap1, &mut pool1, 10_000_000, scenario.ctx()
        );

        // Try to return to pool2 using pool1's receipt — should fail E_WRONG_RECEIPT
        arisan_pool::return_pool_funds_from_yield(&cap2, &mut pool2, withdrawn, receipt);

        arisan_pool::test_cleanup_pool_with_funds(pool1, cap1, scenario.ctx());
        arisan_pool::test_cleanup_pool_with_funds(pool2, cap2, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // Test: full yield lifecycle — withdraw → profit → deposit
    // =========================================================================

    #[test]
    fun test_yield_lifecycle_withdraw_profit_deposit() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        // 1. Seed pool with funds
        let seed_coin = mint_coin(100_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        // 2. Withdraw for "yield operation" — get coin + hot potato receipt
        let (funds, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 30_000_000, scenario.ctx()
        );

        // 3. Simulate profit: mint extra coins
        let profit_coin = mint_coin(2_000_000, scenario.ctx());

        // 4. Return principal — consumes hot potato receipt
        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, funds, receipt);

        // 5. Deposit profit to yield_balance
        arisan_pool::deposit_yield_balance(&cap, &mut pool, coin::into_balance(profit_coin));

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info) == 100_000_000);
        assert!(arisan_pool::info_total_yield(&info) == 2_000_000);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // Test: cap binding — E_WRONG_POOL_CAP on yield hooks
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_WRONG_POOL_CAP)]
    fun test_deposit_yield_balance_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, _cap) = create_test_pool(&mut scenario);

        let (_other_pool, other_cap) = create_test_pool(&mut scenario);
        arisan_pool::test_destroy_pool_only(_other_pool, scenario.ctx());

        let yield_coin = mint_coin(5_000_000, scenario.ctx());
        arisan_pool::deposit_yield_balance(&other_cap, &mut pool, coin::into_balance(yield_coin));

        arisan_pool::test_cleanup_pool_with_funds(pool, _cap, scenario.ctx());
        arisan_pool::test_destroy_cap(other_cap);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_WRONG_POOL_CAP)]
    fun test_withdraw_pool_funds_for_yield_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, _cap) = create_test_pool(&mut scenario);

        let (_other_pool, other_cap) = create_test_pool(&mut scenario);
        arisan_pool::test_destroy_pool_only(_other_pool, scenario.ctx());

        let seed_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&_cap, &mut pool, seed_coin);

        let (_withdrawn, _receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &other_cap, &mut pool, 10_000_000, scenario.ctx()
        );

        arisan_pool::return_pool_funds_from_yield(&_cap, &mut pool, _withdrawn, _receipt);
        arisan_pool::test_cleanup_pool_with_funds(pool, _cap, scenario.ctx());
        arisan_pool::test_destroy_cap(other_cap);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_WRONG_POOL_CAP)]
    fun test_return_pool_funds_from_yield_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, _cap) = create_test_pool(&mut scenario);

        let (_other_pool, other_cap) = create_test_pool(&mut scenario);
        arisan_pool::test_destroy_pool_only(_other_pool, scenario.ctx());

        // Need to first withdraw with correct cap to get a receipt
        let seed_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&_cap, &mut pool, seed_coin);

        let (withdrawn, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &_cap, &mut pool, 10_000_000, scenario.ctx()
        );

        // Try to return using wrong cap — should abort E_WRONG_POOL_CAP
        arisan_pool::return_pool_funds_from_yield(&other_cap, &mut pool, withdrawn, receipt);

        arisan_pool::test_cleanup_pool_with_funds(pool, _cap, scenario.ctx());
        arisan_pool::test_destroy_cap(other_cap);
        scenario.end();
    }

    // =========================================================================
    // Test: yield hooks on ended pool — SEK-10/11/12
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_POOL_ENDED)]
    fun test_deposit_yield_balance_pool_ended() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        arisan_pool::test_set_ended(&mut pool);

        let yield_coin = mint_coin(5_000_000, scenario.ctx());
        arisan_pool::deposit_yield_balance(&cap, &mut pool, coin::into_balance(yield_coin));

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_POOL_ENDED)]
    fun test_withdraw_pool_funds_for_yield_pool_ended() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let seed_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        arisan_pool::test_set_ended(&mut pool);

        let (_withdrawn, _receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 10_000_000, scenario.ctx()
        );

        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, _withdrawn, _receipt);
        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_POOL_ENDED)]
    fun test_deposit_pool_funds_pool_ended() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        arisan_pool::test_set_ended(&mut pool);

        let seed_coin = mint_coin(10_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // Test: V-01 fix — receipt amount enforcement
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_INSUFFICIENT_FUNDS)]
    fun test_return_pool_funds_insufficient_amount() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let seed_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, seed_coin);

        let (mut withdrawn, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 20_000_000, scenario.ctx()
        );

        let _partial = coin::split(&mut withdrawn, 10_000_000, scenario.ctx());
        // Return only 10_000_000 instead of 20_000_000 → E_INSUFFICIENT_FUNDS
        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, _partial, receipt);

        // Unreachable after abort, but compiler needs withdrawal consumed
        balance::destroy_for_testing(coin::into_balance(withdrawn));

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }
}
