/// Tests for yield_strategy module
#[test_only]
module archa::yield_strategy_tests {
    use sui::test_scenario;
    use sui::coin;
    use sui::balance;
    use archa::yield_strategy::{Self};
    use archa::test_usdc::TEST_USDC;

    const DEPOSIT_100_USDC: u64 = 100_000_000;

    // ====== Helper: mint test USDC ======
    fun mint_coin(amount: u64, ctx: &mut TxContext): coin::Coin<TEST_USDC> {
        coin::from_balance(
            balance::create_for_testing<TEST_USDC>(amount),
            ctx,
        )
    }

    // =========================================================================
    // SECTION 1: Deposit & Shares
    // =========================================================================

    #[test]
    fun test_first_deposit_one_to_one() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        assert!(yield_strategy::get_total_value(&strategy) == DEPOSIT_100_USDC);
        assert!(yield_strategy::get_shares(&strategy, @0xA) == DEPOSIT_100_USDC);
        assert!(yield_strategy::get_share_price(&strategy) == 1_000_000); // 1.0
        assert!(yield_strategy::get_actual_balance(&strategy) == DEPOSIT_100_USDC);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_second_deposit_same_user() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        let d1 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, d1, scenario.ctx());

        let d2 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, d2, scenario.ctx());

        assert!(yield_strategy::get_total_value(&strategy) == DEPOSIT_100_USDC * 2);
        assert!(yield_strategy::get_shares(&strategy, @0xA) == DEPOSIT_100_USDC * 2);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // SECTION 2: Withdraw
    // =========================================================================

    #[test]
    fun test_withdraw_success() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        // Withdraw half
        let withdrawn = yield_strategy::withdraw(&mut strategy, DEPOSIT_100_USDC / 2, scenario.ctx());
        // Destroy withdrawn coin for testing
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(yield_strategy::get_shares(&strategy, @0xA) == DEPOSIT_100_USDC / 2);
        assert!(yield_strategy::get_actual_balance(&strategy) == DEPOSIT_100_USDC / 2);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_withdraw_all() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        // Withdraw all shares
        let withdrawn = yield_strategy::withdraw(&mut strategy, DEPOSIT_100_USDC, scenario.ctx());
        // Destroy withdrawn coin for testing
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(yield_strategy::get_shares(&strategy, @0xA) == 0);
        assert!(yield_strategy::get_actual_balance(&strategy) == 0);
        assert!(yield_strategy::get_total_value(&strategy) == 0);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 202)] // E_INSUFFICIENT_SHARES
    fun test_withdraw_more_than_shares() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        let withdrawn = yield_strategy::withdraw(&mut strategy, DEPOSIT_100_USDC + 1, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    // Fix C2: No owner bypass - non-depositor cannot withdraw
    #[test]
    #[expected_failure(abort_code = 202)] // E_INSUFFICIENT_SHARES
    fun test_withdraw_no_owner_bypass() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        // A deposits
        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        // Switch to B, try to withdraw without depositing
        scenario.next_tx(@0xB);
        let withdrawn = yield_strategy::withdraw(&mut strategy, 1, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // SECTION 3: switch_protocol
    // =========================================================================

    #[test]
    fun test_switch_protocol() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        yield_strategy::switch_protocol(
            &mut strategy,
            &cap,
            std::string::utf8(b"NAVI Lend"),
            800,
            scenario.ctx(),
        );

        assert!(yield_strategy::get_apy(&strategy) == 800);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 204)] // E_INVALID_APY
    fun test_switch_protocol_apy_too_high() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        yield_strategy::switch_protocol(
            &mut strategy,
            &cap,
            std::string::utf8(b"Scam Protocol"),
            5001,
            scenario.ctx(),
        );

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // SECTION 4: View Functions
    // =========================================================================

    #[test]
    fun test_shares_to_amount_empty() {
        let mut scenario = test_scenario::begin(@0xA);
        let (strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        assert!(yield_strategy::shares_to_amount(&strategy, 100) == 0);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_get_shares_non_depositor() {
        let mut scenario = test_scenario::begin(@0xA);
        let (strategy, cap) = yield_strategy::test_create_strategy(scenario.ctx());

        assert!(yield_strategy::get_shares(&strategy, @0xB) == 0);

        yield_strategy::test_cleanup_strategy(strategy, cap, scenario.ctx());
        scenario.end();
    }
}
