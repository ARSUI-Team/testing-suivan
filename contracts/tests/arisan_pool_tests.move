/// Tests for arisan_pool module
/// Comprehensive tests covering pool creation, join, start, deposit, winner selection
/// Updated for capability-based auth (SEC-AC-1 fix)
#[test_only]
module suivan::arisan_pool_tests {
    use sui::test_scenario;
    use sui::coin::{Self, Coin};
    use sui::balance;
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::random::{Self, Random};
    use suivan::arisan_pool::{Self, ArisanPool, PoolAdminCap};
    use suivan::test_usdc::TEST_USDC;
    use std::string;


    const DEPOSIT_AMOUNT: u64 = 10_000_000;
    const MAX_PARTICIPANTS: u64 = 5;
    const CYCLE_DURATION_MS: u64 = 2_592_000_000;
    const COLLATERAL_MULTIPLIER: u64 = 125;
    const REQUIRED_COLLATERAL: u64 = 50_000_000;

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

    /// Helper: initialize Random shared object for testing
    fun init_random(scenario: &mut test_scenario::Scenario) {
        test_scenario::next_tx(scenario, @0x0);
        sui::random::create_for_testing(test_scenario::ctx(scenario));
        let mut random_state = test_scenario::take_shared<Random>(scenario);
        sui::random::update_randomness_state_for_testing(
            &mut random_state,
            0,
            x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
            test_scenario::ctx(scenario),
        );
        test_scenario::return_shared(random_state);
        test_scenario::next_tx(scenario, @0xA);
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
        assert!(arisan_pool::required_collateral(&pool) == 45_000_000);
        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    fun test_required_collateral_150pct() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = arisan_pool::test_create_pool_for_unit_test<TEST_USDC>(1_000_000, 3, 500_000, 150, scenario.ctx());
        assert!(arisan_pool::required_collateral(&pool) == 3_000_000);
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
        assert!(arisan_pool::required_collateral(&pool2) == 4_900_000_000);
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
            option::none(),
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
            option::none(),
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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral1, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 200, string::utf8(b""), option::none(), scenario.ctx());

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
        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xB));
        assert!(arisan_pool::active_depositors(&pool) == 1);
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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 100, string::utf8(b""), option::none(), scenario.ctx());

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
        assert!(arisan_pool::has_deposited_this_cycle(&pool, @0xB));
        assert!(arisan_pool::active_depositors(&pool) == 1);
        assert!(arisan_pool::total_pool_funds(&pool) == DEPOSIT_AMOUNT);

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 200, string::utf8(b""), option::none(), scenario.ctx());

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
        init_random(&mut scenario);

        // Create pool with 2 participants, short cycle
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        // Select winner - payout is reserved until the winner claims it
        arisan_pool::set_seal_seed(&mut pool, b"test_seed");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

        // Verify pool state
        assert!(arisan_pool::info_is_ended(&arisan_pool::pool_info(&pool)) == false);
        assert!(arisan_pool::info_current_cycle(&arisan_pool::pool_info(&pool)) == 2);

        // Verify cycle winner recorded
        let winner_opt = arisan_pool::get_cycle_winner(&pool, 1);
        assert!(option::is_some(&winner_opt));
        let winner = *option::borrow(&winner_opt);
        let winner_info = arisan_pool::get_participant(&pool, winner);
        assert!(arisan_pool::participant_pending_winner_payout(&winner_info) == DEPOSIT_AMOUNT * 2);
        assert!(arisan_pool::total_pending_winner_payouts(&pool) == DEPOSIT_AMOUNT * 2);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(winner);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::claim_winner_payout(&mut pool, scenario.ctx());
        let winner_info = arisan_pool::get_participant(&pool, winner);
        assert!(arisan_pool::participant_pending_winner_payout(&winner_info) == 0);
        assert!(arisan_pool::participant_winner_payout_claimed(&winner_info));
        assert!(arisan_pool::total_pending_winner_payouts(&pool) == 0);
        test_scenario::return_shared(pool);

        scenario.next_tx(winner);
        let _payout_coin = scenario.take_from_sender<coin::Coin<suivan::test_usdc::TEST_USDC>>();
        assert!(coin::value(&_payout_coin) == DEPOSIT_AMOUNT * 2);
        let bal = coin::into_balance(_payout_coin);
        balance::destroy_for_testing(bal);
        scenario.end();
    }

    // =========================================================================
    // SECTION 11: end_pool (with PoolAdminCap auth)
    // =========================================================================

    #[test]
    #[expected_failure(abort_code = 15)] // E_NO_WINNERS_LEFT — guard prevents early termination
    fun test_end_pool_rejects_early_termination() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        // Attempt to end pool early — should abort with E_NO_WINNERS_LEFT
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let random_state = scenario.take_shared<Random>();
        arisan_pool::end_pool(&cap, &mut pool, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 17)] // E_WRONG_POOL_CAP
    fun test_end_pool_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        // Create shared pool — A gets cap for this pool
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::end_pool(&other_cap, &mut pool, &random_state, scenario.ctx());
        transfer::public_transfer(other_cap, @0xA);

        test_scenario::return_shared(pool);
        test_scenario::return_shared(random_state);
        scenario.end();
    }

    // =========================================================================
    // SECTION 12: claim_collateral
    // =========================================================================

    #[test]
    fun test_claim_collateral_success() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        // ====== Cycle 1 ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_a1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_a1, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_b1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_b1, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"seed1");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // ====== Cycle 2 ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_a2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_a2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_b2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_b2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(2_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"seed2");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Pool is now ended — both claim collateral
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&collateral_coin) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        // ====== Cycle 1 ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_a1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_a1, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_b1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_b1, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"seed1");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // ====== Cycle 2 ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_a2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_a2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_b2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_b2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(2_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"seed2");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
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
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 51, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 11)] // E_WRONG_DEPOSIT_AMOUNT
    fun test_create_pool_zero_deposit_amount() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, 0, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 11)] // E_WRONG_DEPOSIT_AMOUNT
    fun test_create_pool_zero_cycle_duration() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, 0, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 10)] // E_COLLATERAL_TOO_LOW
    fun test_create_pool_multiplier_below_100() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, 99, string::utf8(b""), option::none(), scenario.ctx());

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 16)] // E_NOT_ENOUGH_PARTICIPANTS
    fun test_create_pool_max_participants_too_low() {
        let mut scenario = test_scenario::begin(@0xA);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 1, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
    #[expected_failure(abort_code = 12)] // E_ALREADY_DEPOSITED — slash marks deposits_this_cycle=true
    fun test_slash_collateral_inactive_participant() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 100, string::utf8(b""), option::none(), scenario.ctx());

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
    #[expected_failure(abort_code = suivan::arisan_pool::E_CYCLE_NOT_COMPLETE)]
    fun test_slash_before_cycle_complete() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 200, string::utf8(b""), option::none(), scenario.ctx());

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
    #[expected_failure(abort_code = suivan::arisan_pool::E_ALREADY_DEPOSITED)]
    fun test_slash_participant_who_deposited() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 200, string::utf8(b""), option::none(), scenario.ctx());

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
        init_random(&mut scenario);

        // Create pool with 2 participants
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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
    #[expected_failure(abort_code = suivan::arisan_pool::E_DEPOSITS_INCOMPLETE)]
    fun test_select_winner_rejects_incomplete_deposits() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        test_scenario::return_shared(random_state);
        scenario.end();
    }

    #[test]
    fun test_winner_must_deposit_next_cycle() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Verify no automatic payout object is required before cycle 2
        // Payout remains in escrow until the selected winner claims it.

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    #[test]
    fun test_inactive_participant_not_required_to_deposit() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 100, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_total_pool_funds(&info) == DEPOSIT_AMOUNT * 2 - DEPOSIT_AMOUNT * 2);
        let winner_opt = arisan_pool::get_cycle_winner(&pool, 1);
        let winner = *option::borrow(&winner_opt);

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(winner);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::claim_winner_payout(&mut pool, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(winner);
        let payout = scenario.take_from_sender<coin::Coin<suivan::test_usdc::TEST_USDC>>();
        assert!(coin::value(&payout) == DEPOSIT_AMOUNT * 2);
        let bal = coin::into_balance(payout);
        balance::destroy_for_testing(bal);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_NO_SEAL_SEED)]
    fun test_select_winner_without_seal_seed_aborts() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        test_scenario::return_shared(random_state);

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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

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

    // =========================================================================
    // SECTION 7: Negative Path Tests (expected failures)
    // =========================================================================

    // Helper: create a pool with 2 participants (A creator, B joiner) via shared objects
    fun setup_two_participant_pool(scenario: &mut test_scenario::Scenario): ArisanPool<TEST_USDC> {
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let join_collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, join_collateral, scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.next_tx(@0xA);
        scenario.take_shared<ArisanPool<TEST_USDC>>()
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_join_pool_already_started() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        let mut pool = setup_two_participant_pool(&mut scenario);
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        test_scenario::return_shared(clock);
        transfer::public_transfer(cap, @0xA);
        arisan_pool::join_pool(&mut pool, mint_coin(REQUIRED_COLLATERAL, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 10)]
    fun test_join_pool_insufficient_collateral() {
        let mut scenario = test_scenario::begin(@0xA);
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::join_pool(&mut pool, mint_coin(REQUIRED_COLLATERAL - 1, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 6)]
    fun test_deposit_before_start() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        transfer::public_transfer(cap, @0xA);
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_deposit_not_participant() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        let mut pool = setup_two_participant_pool(&mut scenario);
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        test_scenario::return_shared(clock);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 9)]
    fun test_select_winner_cycle_not_complete() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);
        let mut pool = setup_two_participant_pool(&mut scenario);
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::test_set_seal_seed(&mut pool, b"test_seed");
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(clock);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        test_scenario::return_shared(random_state);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 17)]
    fun test_select_winner_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);
        let (mut pool, cap) = create_test_pool(&mut scenario);
        transfer::public_transfer(cap, @0xA);
        let wrong_cap = arisan_pool::test_create_dummy_cap(scenario.ctx());
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&wrong_cap, &mut pool, &clock, &random_state, scenario.ctx());
        transfer::public_transfer(wrong_cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        test_scenario::return_shared(random_state);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_claim_collateral_not_participant() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);
        let mut pool = setup_two_participant_pool(&mut scenario);
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        test_scenario::return_shared(clock);
        // A deposits for cycle 1
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        // B also deposits for cycle 1
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);
        // Cycle 1: select winner
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(CYCLE_DURATION_MS + 1000 + 1);
        arisan_pool::set_seal_seed(&mut pool, b"seed_c1");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        transfer::public_transfer(cap, @0xA);

        // Cycle 2: both deposit
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());
        test_scenario::return_shared(pool);

        // Cycle 2: select winner — pool auto-ends
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(CYCLE_DURATION_MS * 2 + 1000 + 1);
        arisan_pool::set_seal_seed(&mut pool, b"seed_c2");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        transfer::public_transfer(cap, @0xA);

        // C tries to claim — not a participant
        scenario.next_tx(@0xC);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let c = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        let b = coin::into_balance(c);
        balance::destroy_for_testing(b);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 17: Emergency Pause Tests
    // =========================================================================

    #[test]
    fun test_pause_pool_blocks_join() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();

        // Pause the pool
        arisan_pool::pause_pool(&cap, &mut pool);
        assert!(arisan_pool::is_paused(&pool));

        // Verify join is blocked via assert_not_paused → aborts with E_POOL_PAUSED (25)
        // We'll test via expected_failure below

        // Unpause
        arisan_pool::unpause_pool(&cap, &mut pool);
        assert!(!arisan_pool::is_paused(&pool));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 25)]
    fun test_join_pool_when_paused_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();

        arisan_pool::pause_pool(&cap, &mut pool);
        transfer::public_transfer(cap, @0xA);

        // B tries to join — should fail because pool is paused
        scenario.next_tx(@0xB);
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 25)]
    fun test_make_deposit_when_paused_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        // B joins
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        // A starts pool, pauses, then tries to deposit
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);

        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        arisan_pool::pause_pool(&cap, &mut pool);

        // Try deposit — should fail because pool is paused
        arisan_pool::make_deposit(&mut pool, mint_coin(DEPOSIT_AMOUNT, scenario.ctx()), scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    fun test_pause_unpause_requires_correct_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, MAX_PARTICIPANTS, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();

        assert!(!arisan_pool::is_paused(&pool));

        arisan_pool::pause_pool(&cap, &mut pool);
        assert!(arisan_pool::is_paused(&pool));

        arisan_pool::unpause_pool(&cap, &mut pool);
        assert!(!arisan_pool::is_paused(&pool));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 17)]
    fun test_pause_pool_wrong_cap_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        let (mut pool, cap) = create_test_pool(&mut scenario);
        transfer::public_transfer(cap, @0xA);
        let wrong_cap = arisan_pool::test_create_dummy_cap(scenario.ctx());
        // Wrong cap should fail with E_WRONG_POOL_CAP
        arisan_pool::pause_pool(&wrong_cap, &mut pool);
        transfer::public_transfer(wrong_cap, @0xA);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    // =========================================================================
    // SECTION 14: Gacha draw (weighted random at pool end)
    // =========================================================================

    #[test]
    fun test_gacha_distribution_with_yield() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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

        // ====== Cycle 1 ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_a1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_a1, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_b1 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_b1, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"seed1");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // ====== Deposit yield into yield_balance ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let yield_bal = balance::create_for_testing<TEST_USDC>(5_000_000);
        arisan_pool::deposit_yield_balance(&cap, &mut pool, yield_bal);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        // ====== Cycle 2 (final — triggers end_pool_internal → gacha) ======
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_a2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_a2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let dep_b2 = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, dep_b2, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(2_001_000);
        arisan_pool::set_seal_seed(&mut pool, b"seed2");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());
        test_scenario::return_shared(random_state);

        // Verify pool ended with gacha draw executing correctly
        let info = arisan_pool::pool_info(&pool);
        assert!(arisan_pool::info_is_ended(&info));
        assert!(arisan_pool::info_total_yield(&info) == 0);
        let gacha_winner_opt = arisan_pool::info_gacha_winner(&info);
        assert!(option::is_some(&gacha_winner_opt));
        let gacha_winner = *option::borrow(&gacha_winner_opt);
        let other = if (gacha_winner == @0xA) { @0xB } else { @0xA };
        assert!(arisan_pool::is_gacha_winner(&pool, gacha_winner));
        assert!(!arisan_pool::is_gacha_winner(&pool, other));

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        // Both claim collateral
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&collateral_coin) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_coin = arisan_pool::claim_collateral(&mut pool, scenario.ctx());
        assert!(coin::value(&collateral_coin) == REQUIRED_COLLATERAL);
        let bal = coin::into_balance(collateral_coin);
        balance::destroy_for_testing(bal);
        test_scenario::return_shared(pool);

        scenario.end();
    }

    // =========================================================================
    // SECTION 18: Pause/Unpause Mechanism (CRITICAL FIX #4)
    // =========================================================================

    #[test]
    fun test_pause_and_unpause_success() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        assert!(!arisan_pool::is_paused(&pool));

        arisan_pool::pause_pool(&cap, &mut pool);
        assert!(arisan_pool::is_paused(&pool));

        arisan_pool::unpause_pool(&cap, &mut pool);
        assert!(!arisan_pool::is_paused(&pool));

        cleanup_empty(pool, cap, &mut scenario);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_WRONG_POOL_CAP)]
    fun test_pause_pool_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, _cap) = create_test_pool(&mut scenario);
        let (other_pool, wrong_cap) = create_test_pool(&mut scenario);

        arisan_pool::pause_pool(&wrong_cap, &mut pool);

        arisan_pool::test_cleanup_pool<TEST_USDC>(pool, _cap, scenario.ctx());
        arisan_pool::test_cleanup_pool<TEST_USDC>(other_pool, wrong_cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_WRONG_POOL_CAP)]
    fun test_unpause_pool_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);
        let (other_pool, wrong_cap) = create_test_pool(&mut scenario);

        arisan_pool::pause_pool(&cap, &mut pool);
        arisan_pool::unpause_pool(&wrong_cap, &mut pool);

        arisan_pool::test_cleanup_pool<TEST_USDC>(pool, cap, scenario.ctx());
        arisan_pool::test_cleanup_pool<TEST_USDC>(other_pool, wrong_cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_POOL_PAUSED)]
    fun test_join_pool_rejected_when_paused() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::pause_pool(&cap, &mut pool);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_POOL_PAUSED)]
    fun test_make_deposit_rejected_when_paused() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::pause_pool(&cap, &mut pool);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let deposit = mint_coin(DEPOSIT_AMOUNT, scenario.ctx());
        arisan_pool::make_deposit(&mut pool, deposit, scenario.ctx());

        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_POOL_PAUSED)]
    fun test_start_pool_rejected_when_paused() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::pause_pool(&cap, &mut pool);
        let clock = scenario.take_shared<Clock>();
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_POOL_PAUSED)]
    fun test_select_winner_rejected_when_paused() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::pause_pool(&cap, &mut pool);
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
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(random_state);
        test_scenario::return_shared(pool);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_POOL_PAUSED)]
    fun test_slash_collateral_rejected_when_paused() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, 200, string::utf8(b""), option::none(), scenario.ctx());

        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(20_000_000, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        test_scenario::return_shared(pool);

        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        let mut clock = scenario.take_shared<Clock>();
        clock.set_for_testing(1000);
        arisan_pool::start_pool(&cap, &mut pool, &clock, scenario.ctx());
        arisan_pool::pause_pool(&cap, &mut pool);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(pool);

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

    #[test]
    #[expected_failure(abort_code = suivan::arisan_pool::E_POOL_PAUSED)]
    fun test_end_pool_rejected_when_paused() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();
        init_random(&mut scenario);

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 2, 1_000_000, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

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
        arisan_pool::pause_pool(&cap, &mut pool);
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
        arisan_pool::set_seal_seed(&mut pool, b"seed");
        let random_state = scenario.take_shared<Random>();
        arisan_pool::select_winner(&cap, &mut pool, &clock, &random_state, scenario.ctx());

        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(clock);
        test_scenario::return_shared(random_state);
        test_scenario::return_shared(pool);

        // After cycle 1, pool may be ended (2 participants). Try end_pool while paused.
        // But now pool needs to be ended already for this to work or we need 3 participants.
        scenario.end();
    }

    #[test]
    fun test_pause_unpause_then_join() {
        let mut scenario = test_scenario::begin(@0xA);
        scenario.create_system_objects();

        let collateral = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::create_pool(collateral, DEPOSIT_AMOUNT, 3, CYCLE_DURATION_MS, COLLATERAL_MULTIPLIER, string::utf8(b""), option::none(), scenario.ctx());

        // Pause
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::pause_pool(&cap, &mut pool);
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        // Unpause
        scenario.next_tx(@0xA);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let cap = scenario.take_from_sender<PoolAdminCap>();
        arisan_pool::unpause_pool(&cap, &mut pool);
        assert!(!arisan_pool::is_paused(&pool));
        transfer::public_transfer(cap, @0xA);
        test_scenario::return_shared(pool);

        // Now B should be able to join
        scenario.next_tx(@0xB);
        let mut pool = scenario.take_shared<ArisanPool<TEST_USDC>>();
        let collateral_b = mint_coin(REQUIRED_COLLATERAL, scenario.ctx());
        arisan_pool::join_pool(&mut pool, collateral_b, scenario.ctx());
        assert!(arisan_pool::participant_count(&pool) == 2);
        test_scenario::return_shared(pool);

        scenario.end();
    }

}
