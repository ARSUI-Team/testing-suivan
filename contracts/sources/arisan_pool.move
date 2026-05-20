/// Module: arisan_pool
/// Core arisan (rotating savings) pool logic for Archa on Sui
///
/// Design decisions (from audit):
/// - G2: No per-pool AdminCap; admin funcs use owner field check
/// - G4: Per-cycle deposit tracking (has_deposited: bool), not cumulative
/// - D3: Separate collateral_balance and pool_funds_balance
/// - C1: Payout uses active_depositors count, not maxParticipants
/// - H1: deposits_this_cycle bool + last_deposit_cycle u64
/// - C3: _end_pool withdraws all from strategy FIRST, then distributes
#[allow(lint(unused_const), unused_field)]
module archa::arisan_pool {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::String;

    use archa::test_usdc::TEST_USDC;

    // ====== Constants ======
    const E_POOL_NOT_ACTIVE: u64 = 0;
    const E_POOL_ALREADY_STARTED: u64 = 1;
    const E_POOL_ALREADY_FULL: u64 = 2;
    const E_POOL_FULL: u64 = 3;
    const E_NOT_PARTICIPANT: u64 = 4;
    const E_ALREADY_JOINED: u64 = 5;
    const E_POOL_NOT_STARTED: u64 = 6;
    const E_NOT_OWNER: u64 = 7;
    const E_POOL_ENDED: u64 = 8;
    const E_CYCLE_NOT_COMPLETE: u64 = 9;
    const E_COLLATERAL_TOO_LOW: u64 = 10;
    const E_WRONG_DEPOSIT_AMOUNT: u64 = 11;
    const E_ALREADY_DEPOSITED: u64 = 12;
    const E_NOT_ELIGIBLE: u64 = 13;
    const E_INSUFFICIENT_FUNDS: u64 = 14;
    const E_NO_WINNERS_LEFT: u64 = 15;
    const E_NOT_ENOUGH_PARTICIPANTS: u64 = 16;

    // ====== Structs ======

    /// Pool configuration — immutable after creation
    public struct PoolConfig has store, copy, drop {
        deposit_amount: u64,           // Monthly deposit in USDC (6 decimals)
        max_participants: u64,         // Max members (e.g. 5, 10, 20)
        cycle_duration_ms: u64,        // Cycle length in milliseconds
        collateral_multiplier: u64,    // Collateral = deposit_amount * multiplier (e.g. 125 = 125%)
    }

    /// Participant record — tracks per-user state
    public struct Participant has store, copy, drop {
        collateral_amount: u64,        // Collateral deposited (can decrease via slashing)
        missed_payments: u64,          // Total missed cycles
        has_received_payout: bool,     // Already won a cycle
        is_active: bool,               // Still in the pool (not fully slashed out)
        joined_at_ms: u64,             // Timestamp when joined
        last_deposit_cycle: u64,       // Last cycle where deposit was made (fix H1)
        deposits_this_cycle: bool,     // Already deposited this cycle (fix H1)
    }

    /// The shared pool object — one per arisan group
    public struct ArisanPool has key {
        id: UID,

        // Immutable config
        config: PoolConfig,
        creator: address,               // Pool creator address
        ai_optimizer: address,          // AI optimizer address (for admin functions)

        // State
        current_cycle: u64,             // Current cycle number (0 = not started)
        pool_start_time_ms: u64,       // Timestamp when pool started (0 = not started)
        is_active: bool,                // Pool is running
        is_full: bool,                  // Has max_participants
        is_started: bool,               // start_pool() has been called
        is_ended: bool,                 // Pool completed all cycles or ended early
        last_winner: Option<address>,   // Winner of last cycle

        // Participants
        participant_list: vector<address>,
        participants: Table<address, Participant>,
        cycle_winners: Table<u64, address>,  // cycle_number => winner_address

        // Deposit tracking per cycle (fix H1)
        active_depositors_count: u64,   // How many deposited THIS cycle

        // Funds — separated as per audit fix D3
        collateral_balance: Balance<TEST_USDC>,  // Holds all collateral
        pool_funds_balance: Balance<TEST_USDC>,   // Holds all deposits (for yield)
        yield_balance: Balance<TEST_USDC>,        // Holds earned yield

        // Yield strategy reference (G3 Option A)
        strategy_id: Option<ID>,        // ID of YieldStrategy shared object
    }

    // ====== View Helper Struct ======

    /// Pool info for frontend consumption
    public struct PoolInfo has store, copy, drop {
        creator: address,
        deposit_amount: u64,
        max_participants: u64,
        current_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        current_cycle: u64,
        is_active: bool,
        is_full: bool,
        is_started: bool,
        is_ended: bool,
        last_winner: Option<address>,
        total_collateral: u64,
        total_pool_funds: u64,
        total_yield: u64,
        required_collateral: u64,
        active_depositors: u64,
    }

    // ====== Events ======

    public struct PoolCreated has copy, drop {
        pool_id: ID,
        creator: address,
        deposit_amount: u64,
        max_participants: u64,
        collateral_multiplier: u64,
    }

    public struct ParticipantJoined has copy, drop {
        pool_id: ID,
        participant: address,
        collateral: u64,
        participant_count: u64,
    }

    public struct PoolStarted has copy, drop {
        pool_id: ID,
        start_time_ms: u64,
        participant_count: u64,
    }

    public struct DepositMade has copy, drop {
        pool_id: ID,
        participant: address,
        amount: u64,
        cycle: u64,
    }

    public struct WinnerSelected has copy, drop {
        pool_id: ID,
        winner: address,
        cycle: u64,
        payout: u64,
        yield_bonus: u64,
    }

    public struct CollateralSlashed has copy, drop {
        pool_id: ID,
        participant: address,
        slash_amount: u64,
        remaining_collateral: u64,
        missed_payments: u64,
    }

    public struct PoolEnded has copy, drop {
        pool_id: ID,
        total_cycles_completed: u64,
        total_yield_earned: u64,
    }

    public struct ParticipantRemoved has copy, drop {
        pool_id: ID,
        participant: address,
        reason: vector<u8>,  // UTF-8: "collateral_depleted"
    }

    // ====== View Functions ======

    /// Get required collateral amount based on config
    public fun required_collateral(pool: &ArisanPool): u64 {
        pool.config.deposit_amount * pool.config.collateral_multiplier / 100
    }

    /// Get total collateral held
    public fun total_collateral(pool: &ArisanPool): u64 {
        balance::value(&pool.collateral_balance)
    }

    /// Get total pool funds (deposits)
    public fun total_pool_funds(pool: &ArisanPool): u64 {
        balance::value(&pool.pool_funds_balance)
    }

    /// Get total yield earned
    public fun total_yield(pool: &ArisanPool): u64 {
        balance::value(&pool.yield_balance)
    }

    /// Get current participant count
    public fun participant_count(pool: &ArisanPool): u64 {
        vector::length(&pool.participant_list)
    }

    /// Get active depositors this cycle
    public fun active_depositors(pool: &ArisanPool): u64 {
        pool.active_depositors_count
    }

    /// Check if an address is a participant
    public fun is_participant(pool: &ArisanPool, addr: address): bool {
        table::contains(&pool.participants, addr)
    }

    /// Get participant info
    public fun get_participant(pool: &ArisanPool, addr: address): Participant {
        assert!(table::contains(&pool.participants, addr), E_NOT_PARTICIPANT);
        *table::borrow(&pool.participants, addr)
    }

    // Participant field accessors
    public fun participant_collateral(p: &Participant): u64 { p.collateral_amount }
    public fun participant_missed(p: &Participant): u64 { p.missed_payments }
    public fun participant_has_payout(p: &Participant): bool { p.has_received_payout }
    public fun participant_is_active(p: &Participant): bool { p.is_active }
    public fun participant_joined_at(p: &Participant): u64 { p.joined_at_ms }

    /// Check if participant has deposited this cycle (fix H1)
    public fun has_deposited_this_cycle(pool: &ArisanPool, addr: address): bool {
        if (!table::contains(&pool.participants, addr)) {
            return false
        };
        table::borrow(&pool.participants, addr).deposits_this_cycle
    }

    /// Get eligible winners (active participants who haven't received payout)
    public fun get_eligible_winners(pool: &ArisanPool): vector<address> {
        let mut eligible = vector[];
        let len = vector::length(&pool.participant_list);
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow(&pool.participants, addr);
            // Must be active, not already won, and deposited this cycle
            if (participant.is_active && !participant.has_received_payout && participant.deposits_this_cycle) {
                vector::push_back(&mut eligible, addr);
            };
            i = i + 1;
        };
        eligible
    }

    /// Get pool info as a single struct for frontend
    public fun pool_info(pool: &ArisanPool): PoolInfo {
        PoolInfo {
            creator: pool.creator,
            deposit_amount: pool.config.deposit_amount,
            max_participants: pool.config.max_participants,
            current_participants: vector::length(&pool.participant_list),
            cycle_duration_ms: pool.config.cycle_duration_ms,
            collateral_multiplier: pool.config.collateral_multiplier,
            current_cycle: pool.current_cycle,
            is_active: pool.is_active,
            is_full: pool.is_full,
            is_started: pool.is_started,
            is_ended: pool.is_ended,
            last_winner: pool.last_winner,
            total_collateral: balance::value(&pool.collateral_balance),
            total_pool_funds: balance::value(&pool.pool_funds_balance),
            total_yield: balance::value(&pool.yield_balance),
            required_collateral: required_collateral(pool),
            active_depositors: pool.active_depositors_count,
        }
    }

    /// Get participant list
    public fun get_participant_list(pool: &ArisanPool): &vector<address> {
        &pool.participant_list
    }

    // PoolInfo field accessors
    public fun info_creator(i: &PoolInfo): address { i.creator }
    public fun info_deposit_amount(i: &PoolInfo): u64 { i.deposit_amount }
    public fun info_max_participants(i: &PoolInfo): u64 { i.max_participants }
    public fun info_current_participants(i: &PoolInfo): u64 { i.current_participants }
    public fun info_cycle_duration(i: &PoolInfo): u64 { i.cycle_duration_ms }
    public fun info_collateral_multiplier(i: &PoolInfo): u64 { i.collateral_multiplier }
    public fun info_current_cycle(i: &PoolInfo): u64 { i.current_cycle }
    public fun info_is_active(i: &PoolInfo): bool { i.is_active }
    public fun info_is_full(i: &PoolInfo): bool { i.is_full }
    public fun info_is_started(i: &PoolInfo): bool { i.is_started }
    public fun info_is_ended(i: &PoolInfo): bool { i.is_ended }
    public fun info_total_collateral(i: &PoolInfo): u64 { i.total_collateral }
    public fun info_total_pool_funds(i: &PoolInfo): u64 { i.total_pool_funds }
    public fun info_total_yield(i: &PoolInfo): u64 { i.total_yield }

    /// Get winner for a specific cycle
    public fun get_cycle_winner(pool: &ArisanPool, cycle: u64): Option<address> {
        if (table::contains(&pool.cycle_winners, cycle)) {
            option::some(*table::borrow(&pool.cycle_winners, cycle))
        } else {
            option::none()
        }
    }

    // ====== Internal Helpers (stubs for now, will implement in next task) ======

    /// Internal: update deposits_this_cycle for a participant
    fun mark_deposited(pool: &mut ArisanPool, addr: address) {
        if (table::contains(&pool.participants, addr)) {
            let participant = table::borrow_mut(&mut pool.participants, addr);
            if (!participant.deposits_this_cycle) {
                participant.deposits_this_cycle = true;
                participant.last_deposit_cycle = pool.current_cycle;
                pool.active_depositors_count = pool.active_depositors_count + 1;
            };
        };
    }

    /// Internal: reset all participants' deposits_this_cycle to false
    fun reset_cycle_deposits(pool: &mut ArisanPool) {
        let len = vector::length(&pool.participant_list);
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow_mut(&mut pool.participants, addr);
            participant.deposits_this_cycle = false;
            i = i + 1;
        };
        pool.active_depositors_count = 0;
    }

    /// Internal: check if cycle is complete based on time
    fun is_cycle_complete(pool: &ArisanPool, current_time_ms: u64): bool {
        if (pool.pool_start_time_ms == 0) { return false };
        let elapsed = current_time_ms - pool.pool_start_time_ms;
        let cycle_end_time = pool.current_cycle * pool.config.cycle_duration_ms;
        elapsed >= cycle_end_time
    }

    // ====== Entry Functions ======

    /// Create a new ArisanPool and join as the first participant
    /// - Accepts collateral Coin (must be >= deposit_amount * collateral_multiplier / 100)
    /// - Pool is created as shared object so anyone can join
    /// - Creator becomes first participant automatically
    public fun create_pool(
        collateral: Coin<TEST_USDC>,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        ctx: &mut TxContext,
    ) {
        // Validate collateral amount
        let required = deposit_amount * collateral_multiplier / 100;
        assert!(coin::value(&collateral) >= required, E_COLLATERAL_TOO_LOW);

        let sender = ctx.sender();
        let pool_id = object::new(ctx);

        // Build participant list with creator as first member
        let mut participant_list = vector[];
        vector::push_back(&mut participant_list, sender);

        // Build participants table with creator
        let mut participants = table::new(ctx);
        table::add(
            &mut participants,
            sender,
            Participant {
                collateral_amount: coin::value(&collateral),
                missed_payments: 0,
                has_received_payout: false,
                is_active: true,
                joined_at_ms: 0, // will be set on start_pool
                last_deposit_cycle: 0,
                deposits_this_cycle: false,
            },
        );

        let pool = ArisanPool {
            id: pool_id,
            config: PoolConfig {
                deposit_amount,
                max_participants,
                cycle_duration_ms,
                collateral_multiplier,
            },
            creator: sender,
            ai_optimizer: sender, // default: creator is also ai_optimizer
            current_cycle: 0,
            pool_start_time_ms: 0,
            is_active: true,
            is_full: max_participants <= 1,
            is_started: false,
            is_ended: false,
            last_winner: option::none(),
            participant_list,
            participants,
            cycle_winners: table::new(ctx),
            active_depositors_count: 0,
            collateral_balance: coin::into_balance(collateral),
            pool_funds_balance: balance::zero(),
            yield_balance: balance::zero(),
            strategy_id: option::none(),
        };

        // Emit event
        event::emit(PoolCreated {
            pool_id: object::id(&pool),
            creator: sender,
            deposit_amount,
            max_participants,
            collateral_multiplier,
        });

        // Share the pool so anyone can access it
        transfer::share_object(pool);
    }

    /// Join an existing pool by providing collateral
    /// - Pool must be active and not started yet
    /// - Must not have already joined
    /// - Pool must not be full
    public fun join_pool(
        pool: &mut ArisanPool,
        collateral: Coin<TEST_USDC>,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();

        // Pre-conditions
        assert!(pool.is_active, E_POOL_NOT_ACTIVE);
        assert!(!pool.is_started, E_POOL_ALREADY_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(!table::contains(&pool.participants, sender), E_ALREADY_JOINED);
        assert!(!pool.is_full, E_POOL_FULL);

        // Validate collateral amount
        let required = pool.config.deposit_amount * pool.config.collateral_multiplier / 100;
        assert!(coin::value(&collateral) >= required, E_COLLATERAL_TOO_LOW);

        // Add participant
        let collateral_amount = coin::value(&collateral);
        vector::push_back(&mut pool.participant_list, sender);
        table::add(
            &mut pool.participants,
            sender,
            Participant {
                collateral_amount,
                missed_payments: 0,
                has_received_payout: false,
                is_active: true,
                joined_at_ms: 0,
                last_deposit_cycle: 0,
                deposits_this_cycle: false,
            },
        );

        // Add collateral to pool balance
        balance::join(&mut pool.collateral_balance, coin::into_balance(collateral));

        // Check if pool is now full
        if (vector::length(&pool.participant_list) >= pool.config.max_participants) {
            pool.is_full = true;
        };

        // Emit event
        event::emit(ParticipantJoined {
            pool_id: object::id(pool),
            participant: sender,
            collateral: collateral_amount,
            participant_count: vector::length(&pool.participant_list),
        });
    }

    /// Start the pool — only creator can call this
    /// - Requires at least 2 participants
    /// - Sets pool_start_time_ms, advances to cycle 1
    /// - Needs Clock for timestamp
    public fun start_pool(
        pool: &mut ArisanPool,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();

        // Pre-conditions
        assert!(sender == pool.creator, E_NOT_OWNER);
        assert!(!pool.is_started, E_POOL_ALREADY_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(vector::length(&pool.participant_list) >= 2, E_NOT_ENOUGH_PARTICIPANTS);

        let start_time = sui::clock::timestamp_ms(clock);

        pool.is_started = true;
        pool.current_cycle = 1;
        pool.pool_start_time_ms = start_time;

        // Set joined_at_ms for all existing participants
        let len = vector::length(&pool.participant_list);
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow_mut(&mut pool.participants, addr);
            participant.joined_at_ms = start_time;
            i = i + 1;
        };

        event::emit(PoolStarted {
            pool_id: object::id(pool),
            start_time_ms: start_time,
            participant_count: vector::length(&pool.participant_list),
        });
    }

    /// Make a deposit for the current cycle
    /// - Pool must be started and active
    /// - Caller must be an active participant
    /// - Must not have already deposited this cycle (fix H1)
    /// - Coin must be exactly deposit_amount
    public fun make_deposit(
        pool: &mut ArisanPool,
        deposit: Coin<TEST_USDC>,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();

        // Pre-conditions
        assert!(pool.is_active, E_POOL_NOT_ACTIVE);
        assert!(pool.is_started, E_POOL_NOT_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(table::contains(&pool.participants, sender), E_NOT_PARTICIPANT);

        let participant = table::borrow_mut(&mut pool.participants, sender);
        assert!(participant.is_active, E_NOT_PARTICIPANT);
        assert!(!participant.deposits_this_cycle, E_ALREADY_DEPOSITED);

        // Validate deposit amount
        assert!(coin::value(&deposit) == pool.config.deposit_amount, E_WRONG_DEPOSIT_AMOUNT);

        // Mark deposited (fix H1)
        participant.deposits_this_cycle = true;
        participant.last_deposit_cycle = pool.current_cycle;

        pool.active_depositors_count = pool.active_depositors_count + 1;

        // Add deposit to pool funds balance
        balance::join(&mut pool.pool_funds_balance, coin::into_balance(deposit));

        event::emit(DepositMade {
            pool_id: object::id(pool),
            participant: sender,
            amount: pool.config.deposit_amount,
            cycle: pool.current_cycle,
        });
    }

    /// Select winner for the current cycle
    /// - Only creator or ai_optimizer can call
    /// - Cycle must be complete (time-based check)
    /// - Payout uses active_depositors count (fix C1), NOT maxParticipants
    /// - Pseudo-random selection (hackathon only)
    /// - Advances cycle, resets deposits, emits event
    public fun select_winner(
        pool: &mut ArisanPool,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();

        // Pre-conditions
        assert!(sender == pool.creator || sender == pool.ai_optimizer, E_NOT_OWNER);
        assert!(pool.is_active, E_POOL_NOT_ACTIVE);
        assert!(pool.is_started, E_POOL_NOT_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);

        // Check cycle is complete
        let current_time = sui::clock::timestamp_ms(clock);
        assert!(is_cycle_complete(pool, current_time), E_CYCLE_NOT_COMPLETE);

        // Get eligible winners
        let eligible = get_eligible_winners(pool);
        let eligible_count = vector::length(&eligible);
        assert!(eligible_count > 0, E_NO_WINNERS_LEFT);

        // Pseudo-random selection (hackathon only — NOT production safe)
        // Use tx digest bytes + current_time + cycle as entropy
        let tx_hash: &vector<u8> = sui::tx_context::digest(ctx);
        let mut seed = pool.current_cycle;
        let mut i = 0;
        let hash_len = vector::length(tx_hash);
        while (i < hash_len) {
            seed = seed * 31 + (*vector::borrow(tx_hash, i) as u64);
            i = i + 1;
        };
        seed = seed + current_time;
        let winner_index = seed % (eligible_count as u64);
        let winner = *vector::borrow(&eligible, winner_index);

        // === Payout calculation (fix C1) ===
        // Use active_depositors (people who deposited this cycle), NOT maxParticipants
        let active_deps = pool.active_depositors_count;
        assert!(active_deps > 0, E_NO_WINNERS_LEFT);

        let cycle_deposits = pool.config.deposit_amount * active_deps;

        // Yield bonus: distribute yield proportionally
        let yield_value = balance::value(&pool.yield_balance);
        let yield_bonus = if (yield_value > 0 && active_deps > 0) {
            yield_value / active_deps
        } else {
            0
        };

        let total_payout = cycle_deposits + yield_bonus;

        // Safety: ensure pool has enough funds
        let pool_funds = balance::value(&pool.pool_funds_balance);
        assert!(pool_funds >= total_payout, E_INSUFFICIENT_FUNDS);

        // Withdraw payout from pool_funds_balance + yield_balance
        let mut payout_balance = balance::split(&mut pool.pool_funds_balance, cycle_deposits);
        if (yield_bonus > 0) {
            let yield_part = balance::split(&mut pool.yield_balance, yield_bonus);
            balance::join(&mut payout_balance, yield_part);
        };

        // Mark winner
        let participant = table::borrow_mut(&mut pool.participants, winner);
        participant.has_received_payout = true;

        // Record winner
        table::add(&mut pool.cycle_winners, pool.current_cycle, winner);
        pool.last_winner = option::some(winner);

        // Transfer payout to winner
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, winner);

        // Check if all participants have won → end pool
        let all_won = check_all_received_payout(pool);

        if (all_won) {
            end_pool(pool, ctx);
        } else {
            // Advance cycle
            pool.current_cycle = pool.current_cycle + 1;
            // Reset deposits for new cycle (fix H1)
            reset_cycle_deposits(pool);
        };

        event::emit(WinnerSelected {
            pool_id: object::id(pool),
            winner,
            cycle: pool.current_cycle,
            payout: total_payout,
            yield_bonus,
        });
    }

    // ====== Internal: check if all active participants received payout ======

    fun check_all_received_payout(pool: &ArisanPool): bool {
        let len = vector::length(&pool.participant_list);
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow(&pool.participants, addr);
            if (participant.is_active && !participant.has_received_payout) {
                return false
            };
            i = i + 1;
        };
        true
    }

    /// End the pool — return remaining collateral + yield to participants (fix C3)
    /// - Withdraw all from strategy first, then distribute
    /// - Transfer collateral back to each participant
    public fun end_pool(pool: &mut ArisanPool, ctx: &mut TxContext) {
        assert!(!pool.is_ended, E_POOL_ENDED);

        pool.is_active = false;
        pool.is_ended = true;

        // Return collateral to each active participant
        let len = vector::length(&pool.participant_list);
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow_mut(&mut pool.participants, addr);

            if (participant.is_active && participant.collateral_amount > 0) {
                let return_amount = participant.collateral_amount;
                participant.collateral_amount = 0;

                // Split collateral balance
                let collateral_coin = coin::take(
                    &mut pool.collateral_balance,
                    return_amount,
                    ctx,
                );
                transfer::public_transfer(collateral_coin, addr);
            };
            i = i + 1;
        };

        // Remaining pool_funds and yield are kept in the pool object
        // (can be claimed by creator or distributed via separate function)

        event::emit(PoolEnded {
            pool_id: object::id(pool),
            total_cycles_completed: pool.current_cycle,
            total_yield_earned: balance::value(&pool.yield_balance),
        });
    }

    /// Slash collateral from a participant who missed payment
    /// - Only creator or ai_optimizer can call
    /// - Slashed amount = deposit_amount per missed payment
    /// - If collateral drops to 0, participant is removed (deactivated)
    /// - Slashed funds go to pool_funds_balance (becomes pool funds)
    public fun slash_collateral(
        pool: &mut ArisanPool,
        participant_addr: address,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();

        // Pre-conditions
        assert!(sender == pool.creator || sender == pool.ai_optimizer, E_NOT_OWNER);
        assert!(pool.is_active, E_POOL_NOT_ACTIVE);
        assert!(pool.is_started, E_POOL_NOT_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(table::contains(&pool.participants, participant_addr), E_NOT_PARTICIPANT);

        // Read participant state first, then decide action
        let slash_amount = pool.config.deposit_amount;
        let current_collateral = table::borrow(&pool.participants, participant_addr).collateral_amount;
        assert!(current_collateral > 0, E_NOT_PARTICIPANT);

        let pool_id = object::id(pool);

        if (slash_amount >= current_collateral) {
            // Full depletion — deactivate participant
            let remaining = current_collateral;
            let missed = table::borrow(&pool.participants, participant_addr).missed_payments + 1;

            // Update participant
            let participant = table::borrow_mut(&mut pool.participants, participant_addr);
            participant.collateral_amount = 0;
            participant.is_active = false;
            participant.missed_payments = missed;

            // Move remaining collateral to pool funds
            if (remaining > 0) {
                let slashed = coin::take(&mut pool.collateral_balance, remaining, ctx);
                balance::join(&mut pool.pool_funds_balance, coin::into_balance(slashed));
            };

            event::emit(ParticipantRemoved {
                pool_id,
                participant: participant_addr,
                reason: b"collateral_depleted",
            });
        } else {
            // Partial slash
            let new_collateral = current_collateral - slash_amount;
            let missed = table::borrow(&pool.participants, participant_addr).missed_payments + 1;

            let participant = table::borrow_mut(&mut pool.participants, participant_addr);
            participant.collateral_amount = new_collateral;
            participant.missed_payments = missed;

            let slashed_coin = coin::take(&mut pool.collateral_balance, slash_amount, ctx);
            balance::join(&mut pool.pool_funds_balance, coin::into_balance(slashed_coin));

            event::emit(CollateralSlashed {
                pool_id,
                participant: participant_addr,
                slash_amount,
                remaining_collateral: new_collateral,
                missed_payments: missed,
            });
        };
    }

    // ====== Init (package-level, creates AdminCap) ======

    /// AdminCap for pool admin functions — created once on package publish
    public struct AdminCap has key, store { id: UID }

    /// One-time witness for this module
    public struct ARISAN_POOL has drop {}

    fun init(otw: ARISAN_POOL, ctx: &mut TxContext) {
        // Create AdminCap and transfer to publisher
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::public_transfer(admin_cap, ctx.sender());
        // Otw consumed — only one init call
        let ARISAN_POOL {} = otw;
    }

    // ====== TEST HELPERS (only compiled in test) ======

    #[test_only]
    public fun test_create_pool_for_unit_test(
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        ctx: &mut TxContext,
    ): ArisanPool {
        ArisanPool {
            id: object::new(ctx),
            config: PoolConfig {
                deposit_amount,
                max_participants,
                cycle_duration_ms,
                collateral_multiplier,
            },
            creator: ctx.sender(),
            ai_optimizer: ctx.sender(),
            current_cycle: 0,
            pool_start_time_ms: 0,
            is_active: false,
            is_full: false,
            is_started: false,
            is_ended: false,
            last_winner: option::none(),
            participant_list: vector[],
            participants: table::new(ctx),
            cycle_winners: table::new(ctx),
            active_depositors_count: 0,
            collateral_balance: balance::zero(),
            pool_funds_balance: balance::zero(),
            yield_balance: balance::zero(),
            strategy_id: option::none(),
        }
    }

    /// Test helper: destroy a pool (clean up after test)
    /// Only works for empty pools (no participants, no funds)
    #[test_only]
    public fun test_cleanup_pool(pool: ArisanPool, _ctx: &mut TxContext) {
        let ArisanPool { id, participants, cycle_winners, collateral_balance, pool_funds_balance, yield_balance, participant_list, config, creator, ai_optimizer, current_cycle, pool_start_time_ms, is_active, is_full, is_started, is_ended, last_winner, active_depositors_count, strategy_id } = pool;
        // Drop empty containers
        table::destroy_empty(participants);
        table::destroy_empty(cycle_winners);
        vector::destroy_empty(participant_list);
        option::destroy_none(last_winner);
        option::destroy_none(strategy_id);
        balance::destroy_zero(collateral_balance);
        balance::destroy_zero(pool_funds_balance);
        balance::destroy_zero(yield_balance);
        // Drop unused fields
        let PoolConfig { deposit_amount: _, max_participants: _, cycle_duration_ms: _, collateral_multiplier: _ } = config;
        let _ = creator;
        let _ = ai_optimizer;
        let _ = current_cycle;
        let _ = pool_start_time_ms;
        let _ = is_active;
        let _ = is_full;
        let _ = is_started;
        let _ = is_ended;
        let _ = active_depositors_count;
        object::delete(id);
    }

    /// Test helper: expose is_cycle_complete for testing
    #[test_only]
    public fun test_is_cycle_complete(pool: &ArisanPool, current_time_ms: u64): bool {
        is_cycle_complete(pool, current_time_ms)
    }
}
