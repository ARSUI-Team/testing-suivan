/// Tests for arisan_pool module
/// Comprehensive tests covering pool creation, join, start, deposit, winner selection
/// Updated for capability-based auth (SEC-AC-1 fix)
#[test_only]
module archa::arisan_pool_tests {
    use sui::test_scenario;
    use sui::coin::{Self, Coin};
    use sui::balance;
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use archa::arisan_pool::{Self, ArisanPool, PoolAdminCap};
    use archa::test_usdc::TEST_USDC;
    use std::string;


    const DEPOSIT_AMOUNT: u64 = 10_000_000;
    const MAX_PARTICIPANTS: u64 = 5;
    const CYCLE_DURATION_MS: u64 = 2_592_000_000;
    const COLLATERAL_MULTIPLIER: u64 = 125;
    const REQUIRED_COLLATERAL: u64 = 12_500_000;

    fun mint_coin(amount: u64, ctx: &mut TxContext): Coin<TEST_USDC> {
        coin::from_balance(
            balance::create_for_testing<TEST_USDC>(amount),
            ctx,
        )
    }

    fun create_test_pool(scenario: &mut test_scenario::Scenario): (ArisanPool<TEST_USDC>, PoolAdminCap) {
        arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(
            DEPOSIT_AMOUNT,
            MAX_PARTICIPANTS,
            CYCLE_DURATION_MS,
            COLLATERAL_MULTIPLIER,
            scenario.ctx(),
        )
    }

    fun cleanup_empty(pool: ArisanPool<TEST_USDC>, cap: PoolAdminCap, scenario: &mut test_scenario::Scenario) {
        arisan_pool::test_cleanup_pool<TEST_USDC>(pool, cap, scenario.ctx());
    }

    // =========================================================================
    // SECTION 1: Pool Creation & Initial State (unit test helpers)
    // =========================================================================

    #[test]
    fun test_create_pool_initial_state() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);

        assert!(arisan_pool::participant_count(&pool) == 0);
        assert!(arisan_pool::total_collateral(&pool) == 0);
        assert!(arisan_pool::total_pool_funds(&pool) == 0);
        assert!(arisan_pool::total_yield(&pool) == 0);
        assert!(arisan_pool::active_depositors(&pool) == 0);
        assert!(arisan_pool::required_collateral(&pool) == REQUIRED_COLLATERAL);
        assert!(arisan_pool::is_participant(&pool, @0xA) == false);
        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xA) == false);

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_required_collateral_100pct() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(5_000_000, 10, 1_000_000, 100, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 5_000_000);
        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_required_collateral_150pct() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(1_000_000, 3, 500_000, 150, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 1_500_000);
        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_pool_various_configs() {
        let mut scenario = test_scenario::begin(@0xA);

        let (pool, cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(1_000_000, 2, 100_000, 200, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 2_000_000);
        cleanup_empty(pool, cap, &mut scenario);

        let (pool2, cap2) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(100_000_000, 50, 10_000_000_000, 100, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool2) == 100_000_000);
        cleanup_empty(pool2, cap2, &mut scenario);
        scenario.end();
    }

    // =========================================================================
    // SECTION 2: Eligible Winners & Cycle Checks
    // =========================================================================

    #[test]
    fun test_eligible_winners_empty() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);

        let eligible = arisan_pool::get_eligible_winners(&pool);
        assert!(vector::length(&eligible) == 0);
        vector::destroy_empty(eligible);

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_cycle_not_complete_before_start() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);

        assert!(arisan_pool::test_is_cycle_complete(&pool, 1_000_000) == false);
        assert!(arisan_pool::test_is_cycle_complete(&pool, 999_999_999_999) == false);

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_pool_info_returns_correct_data() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_deposit_amount(&info) == DEPOSIT_AMOUNT);
        assert!(arisan_pool::info_max_participants(&info) == MAX_PARTICIPANTS);
        assert!(arisan_pool::info_current_participants(&info) == 0);
        assert!(arisan_pool::info_current_cycle(&info) == 0);
        assert!(arisan_pool::info_is_active(&info) == true);
        assert!(arisan_pool::info_is_full(&info) == false);
        assert!(arisan_pool::info_is_started(&info) == false);
        assert!(arisan_pool::info_is_ended(&info) == false);
        assert!(arisan_pool::info_total_collateral(&info) == 0);
        assert!(arisan_pool::info_total_pool_funds(&info) == 0);
        assert!(arisan_pool::info_total_yield(&info) == 0);

        cleanup_empty(pool, cap, &mut scenario);
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
            string::utf8(b""),
            scenario.ctx(),
        );

        scenario.next_tx(@0xA);
        let pool = scenario.take_shared<ArisanPool<TEST_USDC>>();

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
    #[expected_failure(abort_code = 10)]
    fun test_create_pool_insufficient_collateral() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL - 1, scenario.ctx());
        arisan_pool::create_pool(
            collateral,
            DEPOSIT_AMOUNT,
            MAX_PARTICIPANTS,
            CYCLE_DURATION_MS,
            COLLATERAL_MULTIPLIER,
            string::utf8(b""),
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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());

        assert!(arisan_pool::participant_count(&pool) == 2);
        assert!(arisan_pool::is_participant(&pool, @0xB) == true);
        assert!(arisan_pool::total_collateral(&pool) == REQUIRED_COLLATERAL * 2);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 3)]
    fun test_join_pool_full() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_c = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_c, scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 5)]
    fun test_join_pool_already_joined() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_a2 = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_a2, scenario.ctx());

        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 5: start_pool (capability-based auth)
    // =========================================================================

    #[test]
    fun test_start_pool_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start pool as A (creator) using PoolAdminCap
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        assert!(arisan_pool::info_is_started(&arisan_pool::pool_info(&pool)) == true);
        assert!(arisan_pool::info_current_cycle(&arisan_pool::pool_info(&pool)) == 1);

        let p_a = arisan_pool::get_participant(&pool, @0xA);
        let p_b = arisan_pool::get_participant(&pool, @0xB);
        assert!(arisan_pool::participant_joined_at(&p_a) > 0);
        assert!(arisan_pool::participant_joined_at(&p_b) > 0);

        // Return cap to sender (it's an owned object, must be consumed)
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 17)] // E_WRONG_POOL_CAP
    fun test_start_pool_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // Create shared pool via entry function — A gets PoolAdminCap for this pool
        let collateral1 = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral1, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // Create a separate unit-test pool with different pool_id, extract just the cap
        let (other_pool, other_cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(
            DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, scenario.ctx()
        );
        arisan_pool::test_destroy_pool_only<TEST_USDC>(other_pool, scenario.ctx());

        // B joins the shared pool
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A tries to start the shared pool using other_cap (wrong pool_id)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&other_cap, &mut pool, &clock, scenario.ctx());
        // Cap must be consumed (won't reach here due to abort)
        transfer::public_transfer(other_cap, @0xA);

        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 16)]
    fun test_start_pool_not_enough_participants() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();

        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        // Cap must be consumed (won't reach here due to abort)
        transfer::public_transfer(cap, @0xA);

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool + deposits
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());

        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xA) == true);
        assert!(arisan_pool::active_depositors(&pool) == 1);
        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // B makes deposit
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());

        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xB) == true);
        assert!(arisan_pool::active_depositors(&pool) == 2);
        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT * 2);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 12)]
    fun test_make_deposit_twice() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool + deposits twice (second should fail)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit1, scenario.ctx());

        // Second deposit - should fail
        let deposit2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit2, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 11)]
    fun test_make_deposit_wrong_amount() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool, then deposits wrong amount
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit = mint_coin(1_000_000, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 7: slash_collateral (capability-based auth)
    // =========================================================================

    #[test]
    fun test_slash_collateral_partial() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 200, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A slashes B using PoolAdminCap (after cycle completes)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(CYCLE_DURATION_MS + 1000 + 1);
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());

        let p_b = arisan_pool::get_participant(&pool, @0xB);
        assert!(arisan_pool::participant_collateral(&p_b) == 10_000_000);
        assert!(arisan_pool::participant_missed(&p_b) == 1);
        assert!(arisan_pool::participant_is_active(&p_b) == true);
        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_slash_collateral_full_deactivation() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 100, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Slash B - full depletion (after cycle completes)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(CYCLE_DURATION_MS + 1000 + 1);
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());

        let p_b = arisan_pool::get_participant(&pool, @0xB);
        assert!(arisan_pool::participant_collateral(&p_b) == 0);
        assert!(arisan_pool::participant_is_active(&p_b) == false);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 17)] // E_WRONG_POOL_CAP
    fun test_slash_collateral_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // Create shared pool — A gets cap for this pool
        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 200, string::utf8(b""), scenario.ctx());

        // Create separate unit-test pool, extract just the cap
        let (other_pool, other_cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(
            DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 200, scenario.ctx()
        );
        arisan_pool::test_destroy_pool_only<TEST_USDC>(other_pool, scenario.ctx());

        // B joins pool
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool with correct cap
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A tries to slash B using other_cap (wrong pool_id) — should fail
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(CYCLE_DURATION_MS + 1000 + 1);
        arisan_pool::slash_collateral(&other_cap, &mut pool, @0xB, &clock, scenario.ctx());
        transfer::public_transfer(other_cap, @0xA);

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
        let (pool, cap) = create_test_pool(&mut scenario);

        let winner = arisan_pool::get_cycle_winner(&pool, 1);
        assert!(option::is_none(&winner));

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    // =========================================================================
    // SECTION 9: get_participant_list
    // =========================================================================

    #[test]
    fun test_get_participant_list_empty() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);

        let list = arisan_pool::get_participant_list(&pool);
        assert!(vector::length(list) == 0);

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    // =========================================================================
    // SECTION 10: select_winner
    // =========================================================================

    #[test]
    fun test_select_winner_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // Create pool with 2 participants, short cycle
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool + deposits
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // B deposits
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Advance time past cycle 1 end
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        // Cycle 1 ends at: start_time + 1 * cycle_duration = 1000 + 1_000_000 = 1_001_000
        clock.set_for_testing(1_001_000);

        // Select winner — payout goes directly to winner address (H-02 fix)
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        // Verify pool state
        assert!(arisan_pool::info_is_ended(&arisan_pool::pool_info(&pool)) == false);
        assert!(arisan_pool::info_current_cycle(&arisan_pool::pool_info(&pool)) == 2);

        // Verify cycle winner recorded
        let winner_opt = arisan_pool::get_cycle_winner(&pool, 1);
        assert!(option::is_some(&winner_opt));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Verify winner received payout (check from winner's address in next tx)
        scenario.next_tx(@0xA);
        let _payout_coin = scenario.take_from_sender<coin::Coin<archa::test_usdc::TEST_USDC>>();
        assert!(coin::value(&_payout_coin) == DEPOSIT_AMOUNT * 2);
        let bal = coin::into_balance(_payout_coin);
        balance::destroy_for_testing(bal);
        scenario.end();
    }

    // =========================================================================
    // SECTION 11: end_pool (with PoolAdminCap auth)
    // =========================================================================

    #[test]
    fun test_end_pool_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A ends pool using PoolAdminCap
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::end_pool(&cap, &mut pool, scenario.ctx());

        assert!(arisan_pool::info_is_ended(&arisan_pool::pool_info(&pool)) == true);
        assert!(arisan_pool::info_is_active(&arisan_pool::pool_info(&pool)) == false);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 17)] // E_WRONG_POOL_CAP
    fun test_end_pool_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // Create shared pool — A gets cap for this pool
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // Create separate unit-test pool with different pool_id
        let (other_pool, other_cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(
            DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, scenario.ctx()
        );
        arisan_pool::test_destroy_pool_only<TEST_USDC>(other_pool, scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A tries to end pool using other_cap (wrong pool_id)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::end_pool(&other_cap, &mut pool, scenario.ctx());
        transfer::public_transfer(other_cap, @0xA);

        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 12: claim_collateral
    // =========================================================================

    #[test]
    fun test_claim_collateral_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A ends pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::end_pool(&cap, &mut pool, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        // A claims collateral
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&collateral_coin) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        // B claims collateral
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&collateral_coin) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 19)] // E_POOL_NOT_ENDED
    fun test_claim_collateral_before_pool_ends() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A tries to claim before pool ends — should fail
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 20)] // E_ALREADY_CLAIMED
    fun test_claim_collateral_twice() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // A ends pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::end_pool(&cap, &mut pool, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        // A claims collateral — success
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        // A tries to claim again — should fail
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 13: MAX_POOL_SIZE enforcement
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = 18)] // E_POOL_TOO_LARGE
    fun test_create_pool_too_large() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 51, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 11)] // E_WRONG_DEPOSIT_AMOUNT
    fun test_create_pool_zero_deposit_amount() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, 0, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 11)] // E_WRONG_DEPOSIT_AMOUNT
    fun test_create_pool_zero_cycle_duration() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, 0, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 10)] // E_COLLATERAL_TOO_LOW
    fun test_create_pool_multiplier_below_100() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, 99, string::utf8(b""), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 16)] // E_NOT_ENOUGH_PARTICIPANTS
    fun test_create_pool_max_participants_too_low() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 1, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.end();
    }

    #[test]
    fun test_is_cycle_complete_clock_before_start() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        arisan_pool::test_set_started(&mut pool, 5_000_000);

        assert!(arisan_pool::test_is_cycle_complete(&pool, 1_000_000) == false);

        arisan_pool::test_cleanup_pool<TEST_USDC>(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 4)] // E_NOT_PARTICIPANT (slash inactive participant)
    fun test_slash_collateral_inactive_participant() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 100, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Slash B once — full depletion, becomes inactive
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(CYCLE_DURATION_MS * 2 + 1);
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());

        // Try to slash B again — now inactive, should fail
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_CYCLE_NOT_COMPLETE)]
    fun test_slash_before_cycle_complete() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 200, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(500);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Try to slash B immediately — cycle hasn't completed yet
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(999);
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_ALREADY_DEPOSITED)]
    fun test_slash_participant_who_deposited() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 200, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(500);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // B deposits this cycle
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Try to slash B after cycle completes — but B already deposited
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 14: Full pool lifecycle (2 participants, 2 cycles)
    // =========================================================================

    #[test]
    fun test_full_lifecycle_two_participants() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        // Create pool with 2 participants
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Cycle 1: A and B deposit
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Cycle 1: select winner
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);

        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        // After first select_winner: pool at cycle 2, 1 winner selected
        assert!(arisan_pool::info_current_cycle(&arisan_pool::pool_info(&pool)) == 2);
        assert!(arisan_pool::info_is_ended(&arisan_pool::pool_info(&pool)) == false);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Cycle 2: A and B deposit
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_a2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b2, scenario.ctx());
        test_scenario::return_shared(pool);

        // Cycle 2: select winner (this will end pool — all 2 participants have won)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(2_001_000);

        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        // Pool should be ended (all participants won)
        assert!(arisan_pool::info_is_ended(&arisan_pool::pool_info(&pool)) == true);
        assert!(arisan_pool::info_is_active(&arisan_pool::pool_info(&pool)) == false);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Both participants claim collateral
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let col_a = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&col_a) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(col_a);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let col_b = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&col_b) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(col_b);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    // =========================================================================
    // SECTION 15: Solvency enforcement (S1-1 fix)
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_DEPOSITS_INCOMPLETE)]
    fun test_select_winner_rejects_incomplete_deposits() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        // B and C join
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_c = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_c, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Only A and B deposit (C misses)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Try to select winner — should fail because C hasn't deposited
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_winner_must_deposit_next_cycle() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start + deposit cycle 1
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Select cycle 1 winner
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Winner takes payout
        scenario.next_tx(@0xA);
        let _payout = scenario.take_from_sender<coin::Coin<archa::test_usdc::TEST_USDC>>();
        let bal = coin::into_balance(_payout);
        balance::destroy_for_testing(bal);

        // Now cycle 2: winner must also deposit — both deposit
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let deposit_a2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a2, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b2, scenario.ctx());
        test_scenario::return_shared(pool);

        // Cycle 2 winner selection works because both deposited
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(2_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    #[test]
    fun test_inactive_participant_not_required_to_deposit() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 100, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Start pool
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Slash B fully — B becomes inactive
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::slash_collateral(&cap, &mut pool, @0xB, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Only A deposits — B is inactive, so not required
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        // select_winner should work — B is inactive, A deposited
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    // =========================================================================
    // SECTION 15: Seal Randomness Integration
    // =========================================================================

    #[test]
    fun test_seal_seed_is_cleared_after_winner_selection() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);

        arisan_pool::set_seal_seed(&mut pool, vector[1u8, 2u8, 3u8, 4u8, 5u8, 6u8, 7u8, 8u8]);
        assert!(arisan_pool::has_seal_seed(&pool));

        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        assert!(!arisan_pool::has_seal_seed(&pool));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    #[test]
    fun test_seed_seed_does_not_affect_payout_amount() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);

        arisan_pool::set_seal_seed(&mut pool, vector[0xABu8, 0xCDu8]);
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info) == DEPOSIT_AMOUNT * 2 - DEPOSIT_AMOUNT * 2);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let payout = scenario.take_from_sender<coin::Coin<archa::test_usdc::TEST_USDC>>();
        assert!(coin::value(&payout) == DEPOSIT_AMOUNT * 2);
        let bal = coin::into_balance(payout);
        balance::destroy_for_testing(bal);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::arisan_pool::E_NO_SEAL_SEED)]
    fun test_legacy_path_no_seal_seed() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);

        assert!(!arisan_pool::has_seal_seed(&pool));

        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    #[test]
    fun test_clear_seal_seed_resets_to_none() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        arisan_pool::set_seal_seed(&mut pool, vector[42u8]);
        assert!(arisan_pool::has_seal_seed(&pool));

        arisan_pool::clear_seal_seed(&mut pool);
        assert!(!arisan_pool::has_seal_seed(&pool));

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_seal_seed_deterministic_same_seed_same_winner() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);

        arisan_pool::set_seal_seed(&mut pool, vector[0xDEu8, 0xADu8, 0xBEu8, 0xEFu8]);
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        let winner1 = arisan_pool::get_cycle_winner(&pool, 1);
        assert!(option::is_some(&winner1));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    // =========================================================================
    // SECTION 16: Event Emission Tests
    // =========================================================================

    #[test]
    fun test_winner_selected_includes_extended_fields() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_current_cycle(&info) == 2);
        let winner_opt = arisan_pool::get_cycle_winner(&pool, 1);
        assert!(option::is_some(&winner_opt));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_seal_seed_set_emits_event() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, _cap) = create_test_pool(&mut scenario);

        arisan_pool::set_seal_seed(&mut pool, vector[1u8, 2u8, 3u8]);
        assert!(arisan_pool::has_seal_seed(&pool));

        let seed_bytes = arisan_pool::borrow_seal_seed(&pool);
        assert!(*vector::borrow(seed_bytes, 0) == 1u8);
        assert!(*vector::borrow(seed_bytes, 1) == 2u8);
        assert!(*vector::borrow(seed_bytes, 2) == 3u8);

        arisan_pool::clear_seal_seed(&mut pool);
        assert!(!arisan_pool::has_seal_seed(&pool));

        cleanup_empty(pool, _cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_clear_seal_seed_via_select_winner() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);

        arisan_pool::set_seal_seed(&mut pool, vector[0xFFu8]);
        assert!(arisan_pool::has_seal_seed(&pool));

        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());
        assert!(!arisan_pool::has_seal_seed(&pool));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_cycle_advanced_emits_after_winner() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_c = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_c, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_c = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_c, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_current_cycle(&info) == 2);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_all_cycles_completed_emits_on_final_winner() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        let deposit_a = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // Cycle 1 winner
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Cycle 2 deposits
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_a2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_a2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit_b2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit_b2, scenario.ctx());
        test_scenario::return_shared(pool);

        // Cycle 2 winner — should end pool (2 participants, 2 cycles)
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(2_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        arisan_pool::select_winner(&cap, &mut pool, &clock, scenario.ctx());

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_is_ended(&info) == true);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_pool_funds_deployed_returned_events() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        let deposit_coin = mint_coin(50_000_000, scenario.ctx());
        arisan_pool::deposit_pool_funds(&cap, &mut pool, deposit_coin);

        let (withdrawn_coin, receipt) = arisan_pool::withdraw_pool_funds_for_yield(
            &cap, &mut pool, 30_000_000, scenario.ctx()
        );

        arisan_pool::return_pool_funds_from_yield(&cap, &mut pool, withdrawn_coin, receipt, scenario.ctx());

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info) == 50_000_000);

        arisan_pool::test_cleanup_pool_with_funds(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_walrus_blob_type_is_u8() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);
        arisan_pool::test_destroy_pool_only<TEST_USDC>(pool, scenario.ctx());
        arisan_pool::test_destroy_cap(cap);
        scenario.end();
    }
}
