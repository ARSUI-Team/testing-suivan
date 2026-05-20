/// Tests for arisan_pool module
/// Comprehensive tests covering pool creation, join, start, deposit, winner selection
#[test_only]
module archa::arisan_pool_tests {
    use sui::test_scenario;
    use sui::coin::{Self, Coin};
    use sui::balance;
    use sui::clock::{Self, Clock};
    use archa::arisan_pool::{Self, ArisanPool};
    use archa::test_usdc::TEST_USDC;

    // ====== Test Constants ======
    const DEPOSIT_AMOUNT: u64 = 10_000_000;       // 10 USDC
    const MAX_PARTICIPANTS: u64 = 5;
    const CYCLE_DURATION_MS: u64 = 2_592_000_000; // 30 days
    const COLLATERAL_MULTIPLIER: u64 = 125;        // 125%
    const REQUIRED_COLLATERAL: u64 = 12_500_000;   // 10M * 125 / 100

    // ====== Helper: mint test USDC coin ======
    fun mint_coin(amount: u64, ctx: &mut TxContext): Coin<TEST_USDC> {
        coin::from_balance(
            balance::create_for_testing<TEST_USDC>(amount),
            ctx,
        )
    }

    // ====== Helper: create a test pool (no shared object - for unit tests) ======
    fun create_test_pool(scenario: &mut test_scenario::Scenario): ArisanPool {
        arisan_pool::test_create_pool_for_unit_test(
            DEPOSIT_AMOUNT,
            MAX_PARTICIPANTS,
            CYCLE_DURATION_MS,
            COLLATERAL_MULTIPLIER,
            scenario.ctx(),
        )
    }

    /// Helper: cleanup pool (only works for empty pools)
    fun cleanup_empty(pool: ArisanPool, scenario: &mut test_scenario::Scenario) {
        arisan_pool::test_cleanup_pool(pool, scenario.ctx());
    }

    // =========================================================================
    // SECTION 1: Pool Creation & Initial State
    // =========================================================================

    #[test]
    fun test_create_pool_initial_state() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = create_test_pool(&mut scenario);

        assert!(arisan_pool::participant_count(&pool) == 0);
        assert!(arisan_pool::total_collateral(&pool) == 0);
        assert!(arisan_pool::total_pool_funds(&pool) == 0);
        assert!(arisan_pool::total_yield(&pool) == 0);
        assert!(arisan_pool::active_depositors(&pool) == 0);
        assert!(arisan_pool::required_collateral(&pool) == REQUIRED_COLLATERAL);
        assert!(arisan_pool::is_participant(&pool, @0xA) == false);
        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xA) == false);

        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_required_collateral_100pct() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = arisan_pool::test_create_pool_for_unit_test(5_000_000, 10, 1_000_000, 100, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 5_000_000);
        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_required_collateral_150pct() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = arisan_pool::test_create_pool_for_unit_test(1_000_000, 3, 500_000, 150, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 1_500_000);
        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_pool_various_configs() {
        let mut scenario = test_scenario::begin(@0xA);

        let pool = arisan_pool::test_create_pool_for_unit_test(1_000_000, 2, 100_000, 200, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 2_000_000);
        cleanup_empty(pool, &mut scenario);

        let pool2 = arisan_pool::test_create_pool_for_unit_test(100_000_000, 50, 10_000_000_000, 100, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool2) == 100_000_000);
        cleanup_empty(pool2, &mut scenario);
        scenario.end();
    }

    // =========================================================================
    // SECTION 2: Eligible Winners & Cycle Checks
    // =========================================================================

    #[test]
    fun test_eligible_winners_empty() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = create_test_pool(&mut scenario);

        let eligible = arisan_pool::get_eligible_winners(&pool);
        assert!(vector::length(&eligible) == 0);
        vector::destroy_empty(eligible);

        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_cycle_not_complete_before_start() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = create_test_pool(&mut scenario);

        assert!(arisan_pool::test_is_cycle_complete(&pool, 1_000_000) == false);
        assert!(arisan_pool::test_is_cycle_complete(&pool, 999_999_999_999) == false);

        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_pool_info_returns_correct_data() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = create_test_pool(&mut scenario);

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_deposit_amount(&info) == DEPOSIT_AMOUNT);
        assert!(arisan_pool::info_max_participants(&info) == MAX_PARTICIPANTS);
        assert!(arisan_pool::info_current_participants(&info) == 0);
        assert!(arisan_pool::info_current_cycle(&info) == 0);
        assert!(arisan_pool::info_is_active(&info) == false);
        assert!(arisan_pool::info_is_full(&info) == false);
        assert!(arisan_pool::info_is_started(&info) == false);
        assert!(arisan_pool::info_is_ended(&info) == false);
        assert!(arisan_pool::info_total_collateral(&info) == 0);
        assert!(arisan_pool::info_total_pool_funds(&info) == 0);
        assert!(arisan_pool::info_total_yield(&info) == 0);

        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    // =========================================================================
    // SECTION 3: create_pool (entry function - with shared object)
    // =========================================================================

    #[test]
    fun test_create_pool_shared() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(
            collateral,
            DEPOSIT_AMOUNT,
            MAX_PARTICIPANTS,
            CYCLE_DURATION_MS,
            COLLATERAL_MULTIPLIER,
            scenario.ctx(),
        );

        scenario.next_tx(@0xA);
        let pool = scenario.take_shared<ArisanPool>();

        assert!(arisan_pool::participant_count(&pool) == 1);
        assert!(arisan_pool::is_participant(&pool, @0xA) == true);
        assert!(arisan_pool::total_collateral(&pool) == REQUIRED_COLLATERAL);

        let participant = arisan_pool::get_participant(&pool, @0xA);
        assert!(arisan_pool::participant_collateral(&participant) == REQUIRED_COLLATERAL);
        assert!(arisan_pool::participant_missed(&participant) == 0);
        assert!(arisan_pool::participant_has_payout(&participant) == false);
        assert!(arisan_pool::participant_is_active(&participant) == true);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 10)] // E_COLLATERAL_TOO_LOW
    fun test_create_pool_insufficient_collateral() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL - 1, scenario.ctx());
        arisan_pool::create_pool(
            collateral,
            DEPOSIT_AMOUNT,
            MAX_PARTICIPANTS,
            CYCLE_DURATION_MS,
            COLLATERAL_MULTIPLIER,
            scenario.ctx(),
        );

        scenario.end();
    }

    // =========================================================================
    // SECTION 4: join_pool
    // =========================================================================

    #[test]
    fun test_join_pool_success() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());

        assert!(arisan_pool::participant_count(&pool) == 2);
        assert!(arisan_pool::is_participant(&pool, @0xB) == true);
        assert!(arisan_pool::total_collateral(&pool) == REQUIRED_COLLATERAL * 2);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 3)] // E_POOL_FULL
    fun test_join_pool_full() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins - pool becomes full (2/2)
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // C tries to join - should fail
        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_c = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_c, scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 5)] // E_ALREADY_JOINED
    fun test_join_pool_already_joined() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();

        // A tries to join again
        let collateral_a2 = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_a2, scenario.ctx());

        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 5: start_pool
    // =========================================================================

    #[test]
    fun test_start_pool_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start pool as A (creator)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        assert!(arisan_pool::info_is_started(&arisan_pool::pool_info(&pool)) == true);
        assert!(arisan_pool::info_current_cycle(&arisan_pool::pool_info(&pool)) == 1);

        let p_a = arisan_pool::get_participant(&pool, @0xA);
        let p_b = arisan_pool::get_participant(&pool, @0xB);
        assert!(arisan_pool::participant_joined_at(&p_a) > 0);
        assert!(arisan_pool::participant_joined_at(&p_b) > 0);

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 7)] // E_NOT_OWNER
    fun test_start_pool_not_owner() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins, then B tries to start (not owner)
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());

        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 16)] // E_NOT_ENOUGH_PARTICIPANTS
    fun test_start_pool_not_enough_participants() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();

        // Only 1 participant - try to start
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 6: make_deposit
    // =========================================================================

    #[test]
    fun test_make_deposit_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool + deposits
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());

        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xA) == true);
        assert!(arisan_pool::active_depositors(&pool) == 1);
        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT);

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // B makes deposit
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();

        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());

        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xB) == true);
        assert!(arisan_pool::active_depositors(&pool) == 2);
        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT * 2);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 12)] // E_ALREADY_DEPOSITED
    fun test_make_deposit_twice() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool + deposits twice (second should fail)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        let deposit1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit1, scenario.ctx());

        // Second deposit - should fail
        let deposit2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit2, scenario.ctx());

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 11)] // E_WRONG_DEPOSIT_AMOUNT
    fun test_make_deposit_wrong_amount() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool, then deposits wrong amount
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        // Wrong amount (1 USDC instead of 10)
        let deposit = mint_coin(1_000_000, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit, scenario.ctx());

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 7: slash_collateral
    // =========================================================================

    #[test]
    fun test_slash_collateral_partial() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // 200% collateral so collateral = 20M
        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 200, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A slashes B
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        arisan_pool::slash_collateral(&mut pool, @0xB, scenario.ctx());

        let p_b = arisan_pool::get_participant(&pool, @0xB);
        assert!(arisan_pool::participant_collateral(&p_b) == 10_000_000); // 20M - 10M = 10M
        assert!(arisan_pool::participant_missed(&p_b) == 1);
        assert!(arisan_pool::participant_is_active(&p_b) == true);

        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_slash_collateral_full_deactivation() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // 100% collateral (collateral = deposit = 10M)
        let collateral = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 100, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Slash B - full depletion
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool>();
        arisan_pool::slash_collateral(&mut pool, @0xB, scenario.ctx());

        let p_b = arisan_pool::get_participant(&pool, @0xB);
        assert!(arisan_pool::participant_collateral(&p_b) == 0);
        assert!(arisan_pool::participant_is_active(&p_b) == false);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 7)] // E_NOT_OWNER
    fun test_slash_collateral_not_owner() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx());

        // B joins, starts pool, then tries to slash A (not owner)
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());

        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&mut pool, &clock, scenario.ctx());

        // B tries to slash A - should fail
        arisan_pool::slash_collateral(&mut pool, @0xA, scenario.ctx());

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 8: get_cycle_winner
    // =========================================================================

    #[test]
    fun test_get_cycle_winner_before_any_winner() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = create_test_pool(&mut scenario);

        let winner = arisan_pool::get_cycle_winner(&pool, 1);
        assert!(option::is_none(&winner));

        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }

    // =========================================================================
    // SECTION 9: get_participant_list
    // =========================================================================

    #[test]
    fun test_get_participant_list_empty() {
        let mut scenario = test_scenario::begin(@0xA);
        let pool = create_test_pool(&mut scenario);

        let list = arisan_pool::get_participant_list(&pool);
        assert!(vector::length(list) == 0);

        cleanup_empty(pool, &mut scenario);
        scenario.end();
    }
}
