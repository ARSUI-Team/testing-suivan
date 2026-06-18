/// Tests for yield_strategy module
/// C-02 fix: no simulated yield, total_deposits == actual_balance invariant
#[test_only]
module suivan::yield_strategy_tests {
    use sui::test_scenario;
    use sui::coin;
    use sui::balance;
    use suivan::yield_strategy::{Self};
    use suivan::test_usdc::TEST_USDC;

    const DEPOSIT_100_USDC: u64 = 100_000_000;
    const MIN_SHARES_OFFSET: u64 = 1000;

    fun mint_coin(amount: u64, ctx: &mut TxContext): coin::Coin<TEST_USDC> {
        coin::from_balance(
            balance::create_for_testing<TEST_USDC>(amount),
            ctx,
        )
    }

    #[test]
    fun test_first_deposit_one_to_one() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        assert!(yield_strategy::get_total_value(&strategy) == DEPOSIT_100_USDC);
        assert!(yield_strategy::get_shares(&strategy, @0xA) == DEPOSIT_100_USDC + MIN_SHARES_OFFSET);
        assert!(yield_strategy::get_actual_balance(&strategy) == DEPOSIT_100_USDC);
        assert!(yield_strategy::get_total_value(&strategy) == yield_strategy::get_actual_balance(&strategy));

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_second_deposit_same_user() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        let d1 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, d1, scenario.ctx());

        let d2 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, d2, scenario.ctx());

        assert!(yield_strategy::get_total_value(&strategy) == DEPOSIT_100_USDC * 2);
        assert!(yield_strategy::get_total_value(&strategy) == yield_strategy::get_actual_balance(&strategy));
        let first_shares = DEPOSIT_100_USDC + MIN_SHARES_OFFSET;
        let second_shares = yield_strategy::get_shares(&strategy, @0xA) - first_shares;
        assert!(second_shares > DEPOSIT_100_USDC - 100_000);
        assert!(second_shares < DEPOSIT_100_USDC + 100_000);

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_withdraw_success() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        let total_shares = yield_strategy::get_shares(&strategy, @0xA);
        let half_shares = total_shares / 2;
        let withdrawn = yield_strategy::withdraw(&mut strategy, half_shares, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(yield_strategy::get_shares(&strategy, @0xA) == total_shares - half_shares);
        assert!(yield_strategy::get_actual_balance(&strategy) < DEPOSIT_100_USDC);
        assert!(yield_strategy::get_total_value(&strategy) == yield_strategy::get_actual_balance(&strategy));

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_withdraw_all_invariant() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        let total_shares = yield_strategy::get_shares(&strategy, @0xA);
        let withdrawn = yield_strategy::withdraw(&mut strategy, total_shares, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(yield_strategy::get_shares(&strategy, @0xA) == 0);
        assert!(yield_strategy::get_actual_balance(&strategy) == 0);
        assert!(yield_strategy::get_total_value(&strategy) == 0);
        assert!(yield_strategy::get_total_value(&strategy) == yield_strategy::get_actual_balance(&strategy));

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 202)]
    fun test_withdraw_more_than_shares() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        let withdrawn = yield_strategy::withdraw(&mut strategy, DEPOSIT_100_USDC + MIN_SHARES_OFFSET + 1, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 202)]
    fun test_withdraw_no_owner_bypass() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        yield_strategy::deposit(&mut strategy, deposit, scenario.ctx());

        scenario.next_tx(@0xB);
        let withdrawn = yield_strategy::withdraw(&mut strategy, 1, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_shares_to_amount_empty() {
        let mut scenario = test_scenario::begin(@0xA);
        let (strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        assert!(yield_strategy::shares_to_amount(&strategy, 100) == 0);

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_get_shares_non_depositor() {
        let mut scenario = test_scenario::begin(@0xA);
        let (strategy, cap) = yield_strategy::test_create_strategy<TEST_USDC>(scenario.ctx());

        assert!(yield_strategy::get_shares(&strategy, @0xB) == 0);

        yield_strategy::test_cleanup_strategy<TEST_USDC>(strategy, cap, scenario.ctx());
        scenario.end();
    }
}
