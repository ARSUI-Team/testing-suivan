/// Tests for protocol_vault module
#[test_only]
module archa::protocol_vault_tests {
    use sui::test_scenario;
    use sui::coin;
    use sui::balance;
    use archa::protocol_vault::{Self};
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
    // SECTION 1: View Functions on Empty Vault
    // =========================================================================

    #[test]
    fun test_empty_vault_state() {
        let mut scenario = test_scenario::begin(@0xA);
        let vault = protocol_vault::test_create_vault(850, scenario.ctx());

        assert!(protocol_vault::get_total_assets(&vault) == 0);
        assert!(protocol_vault::get_actual_balance(&vault) == 0);
        assert!(protocol_vault::get_apy(&vault) == 850);
        assert!(protocol_vault::get_shares(&vault, @0xA) == 0);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // SECTION 2: Deposit & Shares
    // =========================================================================

    #[test]
    fun test_deposit() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        assert!(protocol_vault::get_total_assets(&vault) == DEPOSIT_100_USDC);
        assert!(protocol_vault::get_actual_balance(&vault) == DEPOSIT_100_USDC);
        assert!(protocol_vault::get_shares(&vault, @0xA) == DEPOSIT_100_USDC);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_multiple_deposits() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        let d1 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, d1, scenario.ctx());

        let d2 = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, d2, scenario.ctx());

        assert!(protocol_vault::get_total_assets(&vault) == DEPOSIT_100_USDC * 2);
        assert!(protocol_vault::get_shares(&vault, @0xA) == DEPOSIT_100_USDC * 2);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // SECTION 3: Withdraw
    // =========================================================================

    #[test]
    fun test_withdraw() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        let deposit = mint_coin(DEPOSIT_100_USDC, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        // Withdraw half
        let withdrawn = protocol_vault::withdraw(&mut vault, 50_000_000, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        assert!(protocol_vault::get_shares(&vault, @0xA) == 50_000_000);
        assert!(protocol_vault::get_actual_balance(&vault) == 50_000_000);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 300)] // E_INSUFFICIENT_SHARES
    fun test_withdraw_no_shares() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        let withdrawn = protocol_vault::withdraw(&mut vault, 1, scenario.ctx());
        let bal = coin::into_balance(withdrawn);
        balance::destroy_for_testing(bal);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    // =========================================================================
    // SECTION 4: simulate_yield
    // =========================================================================

    #[test]
    fun test_simulate_yield() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        let deposit = mint_coin(100_000_000, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        // Simulate yield (owner = @0xA)
        protocol_vault::simulate_yield(&mut vault, scenario.ctx());

        // total_assets should increase
        // yield = 100_000_000 * 850 / 10000 / 12 = 7_083_333
        let assets = protocol_vault::get_total_assets(&vault);
        assert!(assets > 100_000_000);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_simulate_yield_empty_vault() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        protocol_vault::simulate_yield(&mut vault, scenario.ctx());
        assert!(protocol_vault::get_total_assets(&vault) == 0);

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 301)] // E_NOT_OWNER
    fun test_simulate_yield_not_owner() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut vault = protocol_vault::test_create_vault(850, scenario.ctx());

        let deposit = mint_coin(100_000_000, scenario.ctx());
        protocol_vault::deposit(&mut vault, deposit, scenario.ctx());

        // Switch to B, try to simulate yield
        scenario.next_tx(@0xB);
        protocol_vault::simulate_yield(&mut vault, scenario.ctx());

        protocol_vault::test_cleanup_vault(vault, scenario.ctx());
        scenario.end();
    }
}
