/// Tests for protocol_vault module
/// C-02 fix: no simulated yield, total_assets == actual_balance invariant
#[test_only]
module archa::protocol_vault_tests {
    use sui::test_scenario;
    use sui::coin;
    use sui::balance;
    use archa::protocol_vault::{Self};
    use archa::test_usdc::TEST_USDC;

    const DEPOSIT_100_USDC: u64 = 100_000_000;
    const MIN_SHARES_OFFSET: u64 = 1000;

    fun mint_coin(amount: u64, ctx: &mut TxContext): coin::Coin<TEST_USDC> {
        coin::from_balance(
            balance::create_for_testing<TEST_USDC>(amount),
            ctx,
        )
    }

    #[test]
    fun test_empty_vault_state() {
        let mut scenario = test_scenario::begin(@0xA);
        let vault = protocol_vault::test_create_vault(scenario.ctx());

        assert!(protocol_vault::get_total_assets(&vault) == 0);
        assert!(protocol_vault::get_actual_balance(&vault) == 0);
        assert!(protocol_vault::get_shares(&vault, @0xA) == 0);
        assert!(protocol_vault::get_total_assets(&vault) == protocol_vault::get_actual_balance(&vault));

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_deposit() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        assert!(protocol_vault::get_total_assets(&vault) == DEPOSIT_100_USDC);
        assert!(protocol_vault::get_actual_balance(&vault) == DEPOSIT_100_USDC);
        assert!(protocol_vault::get_shares(&vault, @0xA) == DEPOSIT_100_USDC + MIN_SHARES_OFFSET);
        assert!(protocol_vault::get_total_assets(&vault) == protocol_vault::get_actual_balance(&vault));

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_multiple_deposits() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(scenario.ctx());

        let d1 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, d1, scenario.ctx());

        let d2 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, d2, scenario.ctx());

        assert!(protocol_vault::get_total_assets(&vault) == DEPOSIT_100_USDC * 2);
        assert!(protocol_vault::get_total_assets(&vault) == protocol_vault::get_actual_balance(&vault));
        let first_shares = DEPOSIT_100_USDC + MIN_SHARES_OFFSET;
        let total_shares = protocol_vault::get_shares(&vault, @0xA);
        let second_shares = total_shares - first_shares;
        assert!(second_shares > DEPOSIT_100_USDC - 100_000);
        assert!(second_shares < DEPOSIT_100_USDC + 100_000);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_withdraw() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        let total_shares = protocol_vault::get_shares(&vault, @0xA);
        let half_shares = total_shares / 2;
        let withdrawn = protocol_vault::withdraw(&mut vault, half_shares, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(protocol_vault::get_shares(&vault, @0xA) == total_shares - half_shares);
        assert!(protocol_vault::get_actual_balance(&vault) < DEPOSIT_100_USDC);
        assert!(protocol_vault::get_total_assets(&vault) == protocol_vault::get_actual_balance(&vault));

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_withdraw_all_invariant() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        let total_shares = protocol_vault::get_shares(&vault, @0xA);
        let withdrawn = protocol_vault::withdraw(&mut vault, total_shares, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(protocol_vault::get_shares(&vault, @0xA) == 0);
        assert!(protocol_vault::get_actual_balance(&vault) == 0);
        assert!(protocol_vault::get_total_assets(&vault) == 0);
        assert!(protocol_vault::get_total_assets(&vault) == protocol_vault::get_actual_balance(&vault));

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 300)]
    fun test_withdraw_no_shares() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(scenario.ctx());

        let withdrawn = protocol_vault::withdraw(&mut vault, 1, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }
}
