/// Module: arisan_pool
/// Core arisan (rotating savings) pool logic for Archa on Sui
///
/// Design decisions (from audit):
/// - G2: Per-pool PoolAdminCap for admin auth (SEC-AC-1 fix)
/// - G4: Per-cycle deposit tracking (has_deposited: bool), not cumulative
/// - D3: Separate collateral_balance and pool_funds_balance
/// - C1: Payout uses active_depositors count, not maxParticipants
/// - H1: deposits_this_cycle bool + last_deposit_cycle u64
/// - C3: end_pool_internal sets flags; TODO: withdraw from strategy before ending
#[allow(unused_field, lint(self_transfer))]
module archa::arisan_pool {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};



    // ====== Constants ======
    const E_POOL_NOT_ACTIVE: u64 = 0;
    const E_POOL_ALREADY_STARTED: u64 = 1;
    const E_POOL_FULL: u64 = 3;
    const E_NOT_PARTICIPANT: u64 = 4;
    const E_ALREADY_JOINED: u64 = 5;
    const E_POOL_NOT_STARTED: u64 = 6;
    const E_POOL_ENDED: u64 = 8;
    const E_CYCLE_NOT_COMPLETE: u64 = 9;
    const E_COLLATERAL_TOO_LOW: u64 = 10;
    const E_WRONG_DEPOSIT_AMOUNT: u64 = 11;
    const E_ALREADY_DEPOSITED: u64 = 12;
    const E_INSUFFICIENT_FUNDS: u64 = 14;
    const E_NO_WINNERS_LEFT: u64 = 15;
    const E_NOT_ENOUGH_PARTICIPANTS: u64 = 16;
    const E_WRONG_POOL_CAP: u64 = 17;
    const E_POOL_TOO_LARGE: u64 = 18;
    const E_POOL_NOT_ENDED: u64 = 19;
    const E_ALREADY_CLAIMED: u64 = 20;
    const E_WRONG_RECEIPT: u64 = 21;
    const E_DEPOSITS_INCOMPLETE: u64 = 22;
    const E_STRATEGY_ACTIVE: u64 = 23;
    const E_NO_SEAL_SEED: u64 = 24;

    // DES-OM-1 fix: maximum pool size cap to prevent gas timeout
    const MAX_POOL_SIZE: u64 = 50;

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
    public struct ArisanPool<phantom CoinType> has key {
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
        collateral_balance: Balance<CoinType>,  // Holds all collateral
        pool_funds_balance: Balance<CoinType>,   // Holds all deposits (for yield)
        yield_balance: Balance<CoinType>,        // Holds earned yield

        // Yield strategy reference (G3 Option A)
        strategy_id: Option<ID>,        // ID of YieldStrategy shared object

        // Walrus blob storage references (optional, never affects pool execution)
        walrus_metadata_blob_id: String,       // Pool metadata blob
        walrus_cycle_history_blob_id: String,  // Cycle history blob
        walrus_agreement_blob_id: String,      // Agreement/terms blob

        // Seal randomness seed (optional, additive — does not affect existing logic)
        seal_seed: Option<vector<u8>>,
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

    const SEED_SOURCE_SEAL: u8 = 1;

    public struct WinnerSelected has copy, drop {
        pool_id: ID,
        winner: address,
        cycle: u64,
        payout: u64,
        yield_bonus: u64,
        eligible_count: u64,
        seed_source: u8,
        total_pool_funds: u64,
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

    public struct CollateralClaimed has copy, drop {
        pool_id: ID,
        participant: address,
        amount: u64,
    }

    public struct PoolFundsDeployed has copy, drop {
        pool_id: ID,
        amount: u64,
    }

    public struct PoolFundsReturned has copy, drop {
        pool_id: ID,
        amount: u64,
        profit: u64,
    }

    public struct SealSeedSet has copy, drop {
        pool_id: ID,
    }

    public struct SealSeedCleared has copy, drop {
        pool_id: ID,
    }

    public struct CycleAdvanced has copy, drop {
        pool_id: ID,
        old_cycle: u64,
        new_cycle: u64,
        active_depositors: u64,
    }

    public struct AllCyclesCompleted has copy, drop {
        pool_id: ID,
        total_cycles: u64,
        total_yield: u64,
    }

    // ====== View Functions ======

    /// Get required collateral amount based on config
    public fun required_collateral<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        (((pool.config.deposit_amount as u128) * (pool.config.collateral_multiplier as u128) / 100) as u64)
    }

    /// Get total collateral held
    public fun total_collateral<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        balance::value(&pool.collateral_balance)
    }

    /// Get total pool funds (deposits)
    public fun total_pool_funds<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        balance::value(&pool.pool_funds_balance)
    }

    /// Get total yield earned
    public fun total_yield<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        balance::value(&pool.yield_balance)
    }

    /// Get current participant count
    public fun participant_count<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        vector::length(&pool.participant_list)
    }

    /// Get active depositors this cycle
    public fun active_depositors<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        pool.active_depositors_count
    }

    /// Check if an address is a participant
    public fun is_participant<CoinType>(pool: &ArisanPool<CoinType>, addr: address): bool {
        table::contains(&pool.participants, addr)
    }

    /// Get participant info
    public fun get_participant<CoinType>(pool: &ArisanPool<CoinType>, addr: address): Participant {
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
    public fun has_deposited_this_cycle<CoinType>(pool: &ArisanPool<CoinType>, addr: address): bool {
        if (!table::contains(&pool.participants, addr)) {
            return false
        };
        table::borrow(&pool.participants, addr).deposits_this_cycle
    }

    /// Get eligible winners (active participants who haven't received payout)
    public fun get_eligible_winners<CoinType>(pool: &ArisanPool<CoinType>): vector<address> {
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
    public fun pool_info<CoinType>(pool: &ArisanPool<CoinType>): PoolInfo {
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
    public fun get_participant_list<CoinType>(pool: &ArisanPool<CoinType>): &vector<address> {
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
    public fun get_cycle_winner<CoinType>(pool: &ArisanPool<CoinType>, cycle: u64): Option<address> {
        if (table::contains(&pool.cycle_winners, cycle)) {
            option::some(*table::borrow(&pool.cycle_winners, cycle))
        } else {
            option::none()
        }
    }

    // ====== Internal Helpers ======

    fun all_active_deposited<CoinType>(pool: &ArisanPool<CoinType>): bool {
        let len = vector::length(&pool.participant_list);
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow(&pool.participants, addr);
            if (participant.is_active && !participant.deposits_this_cycle) {
                return false
            };
            i = i + 1;
        };
        true
    }

    #[allow(unused_function)]
    fun count_remaining_winners<CoinType>(pool: &ArisanPool<CoinType>): u64 {
        let len = vector::length(&pool.participant_list);
        let mut count = 0u64;
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow(&pool.participants, addr);
            if (participant.is_active && !participant.has_received_payout) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    /// Internal: reset all participants' deposits_this_cycle to false
    fun reset_cycle_deposits<CoinType>(pool: &mut ArisanPool<CoinType>) {
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
    fun is_cycle_complete<CoinType>(pool: &ArisanPool<CoinType>, current_time_ms: u64): bool {
        if (pool.pool_start_time_ms == 0) { return false };
        if (current_time_ms < pool.pool_start_time_ms) { return false };
        let elapsed = current_time_ms - pool.pool_start_time_ms;
        let cycle_end_time = pool.current_cycle * pool.config.cycle_duration_ms;
        elapsed >= cycle_end_time
    }

    /// Internal: unbiased random index via rejection sampling (SEC-AR-1 fix)
    /// Eliminates modulo bias for small pool sizes (5-10 participants)
    fun unbiased_random_index(seed: u64, count: u64): u64 {
        if (count <= 1) { return 0 };
        let mut mask: u64 = 1;
        while (mask < count) {
            mask = mask * 2 + 1;
        };
        let mut s = seed;
        loop {
            let idx = s & mask;
            if (idx < count) {
                return idx
            };
            // XOR-shift re-hash — avoids overflow unlike LCG multiplication
            s = (s << 1) ^ s ^ 0x6969;
        }
    }

    // ====== Entry Functions ======

    /// Create a new ArisanPool and join as the first participant
    /// - Accepts collateral Coin (must be >= deposit_amount * collateral_multiplier / 100)
    /// - Pool is created as shared object so anyone can join
    /// - Creator becomes first participant automatically
    public fun create_pool<CoinType>(
        collateral: Coin<CoinType>,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        metadata_blob_id: String,
        ctx: &mut TxContext,
    ): ID {
        assert!(deposit_amount > 0, E_WRONG_DEPOSIT_AMOUNT);
        assert!(cycle_duration_ms > 0, E_WRONG_DEPOSIT_AMOUNT);
        assert!(collateral_multiplier >= 100, E_COLLATERAL_TOO_LOW);
        assert!(max_participants >= 2, E_NOT_ENOUGH_PARTICIPANTS);
        assert!(max_participants <= MAX_POOL_SIZE, E_POOL_TOO_LARGE);
        let required = (((deposit_amount as u128) * (collateral_multiplier as u128) / 100) as u64);
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

        let pool = ArisanPool<CoinType> {
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
            walrus_metadata_blob_id: metadata_blob_id,
            walrus_cycle_history_blob_id: string::utf8(b""),
            walrus_agreement_blob_id: string::utf8(b""),
            seal_seed: option::none(),
        };

        let pool_id = object::id(&pool);

        // Emit event
        event::emit(PoolCreated {
            pool_id,
            creator: sender,
            deposit_amount,
            max_participants,
            collateral_multiplier,
        });

        // Share the pool so anyone can access it
        transfer::share_object(pool);

        // Create per-pool PoolAdminCap and transfer to creator (SEC-AC-1 fix)
        let admin_cap = PoolAdminCap {
            id: object::new(ctx),
            pool_id,
        };
        transfer::public_transfer(admin_cap, sender);

        pool_id
    }

    /// Join an existing pool by providing collateral
    /// - Pool must be active and not started yet
    /// - Must not have already joined
    /// - Pool must not be full
    public fun join_pool<CoinType>(
        pool: &mut ArisanPool<CoinType>,
        collateral: Coin<CoinType>,
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
        let required = (((pool.config.deposit_amount as u128) * (pool.config.collateral_multiplier as u128) / 100) as u64);
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

    /// Start the pool — requires PoolAdminCap (SEC-AC-1 fix)
    /// - Requires at least 2 participants
    /// - Sets pool_start_time_ms, advances to cycle 1
    /// - Needs Clock for timestamp
    public fun start_pool<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        clock: &sui::clock::Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
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
    public fun make_deposit<CoinType>(
        pool: &mut ArisanPool<CoinType>,
        deposit: Coin<CoinType>,
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
    /// - Requires PoolAdminCap (SEC-AC-1 fix)
    /// - Payout transferred directly to winner address on-chain (H-02 fix)
    /// - No return value — winner receives funds immediately, admin cannot intercept
    public fun select_winner<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        assert!(pool.is_active, E_POOL_NOT_ACTIVE);
        assert!(pool.is_started, E_POOL_NOT_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);

        // Check cycle is complete
        let current_time = sui::clock::timestamp_ms(clock);
        assert!(is_cycle_complete(pool, current_time), E_CYCLE_NOT_COMPLETE);

        // Solvency check: all active participants must have deposited (S1-1 fix)
        assert!(all_active_deposited(pool), E_DEPOSITS_INCOMPLETE);

        // Get eligible winners
        let eligible = get_eligible_winners(pool);
        let eligible_count = vector::length(&eligible);
        assert!(eligible_count > 0, E_NO_WINNERS_LEFT);

        // Verifiable randomness via Seal threshold encryption (SEC-AR-1 fix)
        // Seal seed MUST be set before select_winner — enforced by abort
        // This prevents validator-influenced tx_context::digest() attacks
        assert!(pool.seal_seed.is_some(), E_NO_SEAL_SEED);
        let seal_bytes = option::borrow(&pool.seal_seed);
        let mut s = pool.current_cycle;
        let mut j = 0;
        let seal_len = vector::length(seal_bytes);
        while (j < seal_len) {
            let byte = (*vector::borrow(seal_bytes, j) as u64);
            s = (s << 5) ^ s ^ byte;
            j = j + 1;
        };
        let seed = s;
        let seed_source = SEED_SOURCE_SEAL;

        // Rejection sampling to eliminate modulo bias
        // Find smallest power of 2 >= eligible_count, then reject
        // samples that fall in the biased range
        let eligible_u64 = (eligible_count as u64);
        let winner_index = unbiased_random_index(seed, eligible_u64);
        let winner = *vector::borrow(&eligible, winner_index);

        // Clear seal seed after successful winner selection (read-first-then-clear pattern)
        pool.seal_seed = option::none();
        event::emit(SealSeedCleared { pool_id: object::id(pool) });

        // === Payout calculation (fix C1) ===
        // Use active_depositors (people who deposited this cycle), NOT maxParticipants
        let active_deps = pool.active_depositors_count;
        assert!(active_deps > 0, E_NO_WINNERS_LEFT);

        let cycle_deposits = (((pool.config.deposit_amount as u128) * (active_deps as u128)) as u64);

        // Check if this is the final winner (all will have received payout after this)
        let all_won = check_all_received_payout_before_mark(pool);

        // Yield bonus: if final winner, distribute ALL remaining yield;
        // otherwise distribute proportionally (1/active_deps share per cycle)
        let yield_value = balance::value(&pool.yield_balance);
        let yield_bonus = if (yield_value > 0 && active_deps > 0) {
            if (all_won) {
                yield_value
            } else {
                yield_value / active_deps
            }
        } else {
            0
        };

        let total_payout = (((cycle_deposits as u128) + (yield_bonus as u128)) as u64);

        // Safety: ensure pool has enough funds
        let pool_funds = balance::value(&pool.pool_funds_balance);
        assert!(pool_funds >= total_payout, E_INSUFFICIENT_FUNDS);

        // Withdraw payout from pool_funds_balance + yield_balance
        let mut payout_balance = balance::split(&mut pool.pool_funds_balance, cycle_deposits);
        if (yield_bonus > 0) {
            let yield_part = balance::split(&mut pool.yield_balance, yield_bonus);
            balance::join(&mut payout_balance, yield_part);
        };

        // Record winner — save cycle BEFORE incrementing
        let selected_cycle = pool.current_cycle;
        let participant = table::borrow_mut(&mut pool.participants, winner);
        table::add(&mut pool.cycle_winners, selected_cycle, winner);
        pool.last_winner = option::some(winner);

        // Create payout coin and transfer directly to winner (H-02 fix)
        // Winner receives funds immediately — admin cannot intercept
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, winner);

        // Mark winner + check if all participants have won → end pool
        if (all_won) {
            participant.has_received_payout = true;
            end_pool_internal(pool);
        } else {
            participant.has_received_payout = true;
            // Advance cycle
            let old_cycle = pool.current_cycle;
            pool.current_cycle = pool.current_cycle + 1;
            event::emit(CycleAdvanced {
                pool_id: object::id(pool),
                old_cycle,
                new_cycle: pool.current_cycle,
                active_depositors: pool.active_depositors_count,
            });
            // Reset deposits for new cycle (fix H1)
            reset_cycle_deposits(pool);
        };

        event::emit(WinnerSelected {
            pool_id: object::id(pool),
            winner,
            cycle: selected_cycle,
            payout: total_payout,
            yield_bonus,
            eligible_count,
            seed_source,
            total_pool_funds: balance::value(&pool.pool_funds_balance),
        });
    }

    // ====== Internal: check if all active participants received payout ======

    /// Check if this is the final winner — only 1 active participant hasn't won yet
    /// (called BEFORE setting has_received_payout = true on the winner)
    fun check_all_received_payout_before_mark<CoinType>(pool: &ArisanPool<CoinType>): bool {
        let len = vector::length(&pool.participant_list);
        let mut remaining = 0u64;
        let mut i = 0;
        while (i < len) {
            let addr = *vector::borrow(&pool.participant_list, i);
            let participant = table::borrow(&pool.participants, addr);
            if (participant.is_active && !participant.has_received_payout) {
                remaining = remaining + 1;
            };
            i = i + 1;
        };
        // If only 1 active participant hasn't won, this is the final winner
        remaining <= 1
    }

    /// End the pool — requires PoolAdminCap (SEC-AC-1 fix)
    /// - Sets is_ended flag, does NOT transfer coins internally
    /// - Participants call claim_collateral() individually
    public fun end_pool<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        _ctx: &mut TxContext,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        end_pool_internal(pool);
    }

    /// Internal: end pool without cap check — called by select_winner() when all won
    fun end_pool_internal<CoinType>(pool: &mut ArisanPool<CoinType>) {
        assert!(!pool.is_ended, E_POOL_ENDED);

        // Safety: cannot end pool while funds are deployed to yield strategy (H-04 fix)
        assert!(option::is_none(&pool.strategy_id), E_STRATEGY_ACTIVE);

        pool.is_active = false;
        pool.is_ended = true;

        event::emit(PoolEnded {
            pool_id: object::id(pool),
            total_cycles_completed: pool.current_cycle,
            total_yield_earned: balance::value(&pool.yield_balance),
        });
        event::emit(AllCyclesCompleted {
            pool_id: object::id(pool),
            total_cycles: pool.current_cycle,
            total_yield: balance::value(&pool.yield_balance),
        });
    }

    /// Claim collateral after pool ended (DES-FN-1 fix: PTB composable)
    /// - Pool must be ended
    /// - Caller must be an active participant with collateral
    /// - Returns collateral Coin to caller
    public fun claim_collateral<CoinType>(
        pool: &mut ArisanPool<CoinType>,
        ctx: &mut TxContext,
    ): Coin<CoinType> {
        assert!(pool.is_ended, E_POOL_NOT_ENDED);

        let sender = ctx.sender();
        assert!(table::contains(&pool.participants, sender), E_NOT_PARTICIPANT);

        let participant = table::borrow_mut(&mut pool.participants, sender);
        assert!(participant.is_active, E_NOT_PARTICIPANT);
        assert!(participant.collateral_amount > 0, E_ALREADY_CLAIMED);

        let return_amount = participant.collateral_amount;
        participant.collateral_amount = 0;

        let collateral_coin = coin::take(&mut pool.collateral_balance, return_amount, ctx);

        event::emit(CollateralClaimed {
            pool_id: object::id(pool),
            participant: sender,
            amount: return_amount,
        });

        collateral_coin
    }

    /// Slash collateral from a participant who missed payment
    /// - Requires PoolAdminCap (SEC-AC-1 fix)
    /// - Slashed amount = deposit_amount per missed payment
    /// - If collateral drops to 0, participant is removed (deactivated)
    /// - Slashed funds go to pool_funds_balance (becomes pool funds)
    public fun slash_collateral<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        participant_addr: address,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        assert!(pool.is_active, E_POOL_NOT_ACTIVE);
        assert!(pool.is_started, E_POOL_NOT_STARTED);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(is_cycle_complete(pool, sui::clock::timestamp_ms(clock)), E_CYCLE_NOT_COMPLETE);
        assert!(table::contains(&pool.participants, participant_addr), E_NOT_PARTICIPANT);

        // Cannot slash a participant who already deposited this cycle
        assert!(!table::borrow(&pool.participants, participant_addr).deposits_this_cycle, E_ALREADY_DEPOSITED);

        // Read participant state first, then decide action
        let slash_amount = pool.config.deposit_amount;
        let current_collateral = table::borrow(&pool.participants, participant_addr).collateral_amount;
        let is_active = table::borrow(&pool.participants, participant_addr).is_active;
        assert!(is_active, E_NOT_PARTICIPANT);
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

    // ====== Yield Integration Hooks (for DeepBook V3 / external yield modules) ======

    /// Hot potato receipt — MUST be consumed by return_pool_funds_from_yield()
    /// No abilities = cannot be stored, dropped, copied, or transferred
    /// If not consumed in same PTB → tx aborts (same pattern as DeepBook FlashLoan)
    public struct YieldWithdrawalReceipt {
        pool_id: ID,
        amount: u64,
    }

    /// Deposit yield profit into pool's yield_balance
    /// Called by external yield modules (e.g. deepbook_yield) after profitable arbitrage
    /// Requires PoolAdminCap to authorize
    /// public(package) — only callable within archa package (S1-2/H-03 fix)
    public(package) fun deposit_yield_balance<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        yield_balance: Balance<CoinType>,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        assert!(!pool.is_ended, E_POOL_ENDED);
        balance::join(&mut pool.yield_balance, yield_balance);
    }

    /// Deposit pool funds directly (for seeding or topping up pool_funds_balance)
    /// Does NOT require a receipt — this is for adding new funds, not returning borrowed ones
    /// public(package) — only callable within archa package
    public(package) fun deposit_pool_funds<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        funds: Coin<CoinType>,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        assert!(!pool.is_ended, E_POOL_ENDED);
        balance::join(&mut pool.pool_funds_balance, coin::into_balance(funds));
    }

    /// Withdraw pool funds for yield generation (flash loan / deposit to external protocol)
    /// Returns (Coin, YieldWithdrawalReceipt) — receipt MUST be consumed in same PTB
    /// YieldWithdrawalReceipt has no abilities → tx aborts if not returned
    /// public(package) — only callable within archa package (S1-2/H-03 fix)
    public(package) fun withdraw_pool_funds_for_yield<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        amount: u64,
        ctx: &mut TxContext,
    ): (Coin<CoinType>, YieldWithdrawalReceipt) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(amount > 0, E_WRONG_DEPOSIT_AMOUNT);
        assert!(balance::value(&pool.pool_funds_balance) >= amount, E_INSUFFICIENT_FUNDS);
        let receipt = YieldWithdrawalReceipt {
            pool_id: object::id(pool),
            amount,
        };
        event::emit(PoolFundsDeployed {
            pool_id: object::id(pool),
            amount,
        });
        (coin::take(&mut pool.pool_funds_balance, amount, ctx), receipt)
    }

    /// Return pool funds after yield operation
    /// Splits principal → pool_funds_balance, profit → yield_balance
    /// Consumes YieldWithdrawalReceipt (hot potato) — enforces return in same PTB
    /// public(package) — only callable within archa package (S1-2/H-03 fix)
    public(package) fun return_pool_funds_from_yield<CoinType>(
        cap: &PoolAdminCap,
        pool: &mut ArisanPool<CoinType>,
        mut coin: Coin<CoinType>,
        receipt: YieldWithdrawalReceipt,
        ctx: &mut TxContext,
    ) {
        assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
        assert!(receipt.pool_id == object::id(pool), E_WRONG_RECEIPT);
        assert!(!pool.is_ended, E_POOL_ENDED);
        assert!(coin::value(&coin) >= receipt.amount, E_INSUFFICIENT_FUNDS);
        let profit = coin::value(&coin) - receipt.amount;
        let principal = coin::split(&mut coin, receipt.amount, ctx);
        balance::join(&mut pool.pool_funds_balance, coin::into_balance(principal));
        if (profit > 0) {
            balance::join(&mut pool.yield_balance, coin::into_balance(coin));
        } else {
            coin::destroy_zero(coin);
        };
        event::emit(PoolFundsReturned {
            pool_id: object::id(pool),
            amount: receipt.amount,
            profit,
        });
        let YieldWithdrawalReceipt { pool_id: _, amount: _ } = receipt;
    }

    // ====== Walrus Blob Storage Accessors (package-only) ======

    public(package) fun walrus_metadata_blob_id<CoinType>(pool: &ArisanPool<CoinType>): String {
        pool.walrus_metadata_blob_id
    }

    public(package) fun walrus_cycle_history_blob_id<CoinType>(pool: &ArisanPool<CoinType>): String {
        pool.walrus_cycle_history_blob_id
    }

    public(package) fun walrus_agreement_blob_id<CoinType>(pool: &ArisanPool<CoinType>): String {
        pool.walrus_agreement_blob_id
    }

    public(package) fun set_walrus_metadata_blob_id<CoinType>(pool: &mut ArisanPool<CoinType>, blob_id: String) {
        pool.walrus_metadata_blob_id = blob_id;
    }

    public(package) fun set_walrus_cycle_history_blob_id<CoinType>(pool: &mut ArisanPool<CoinType>, blob_id: String) {
        pool.walrus_cycle_history_blob_id = blob_id;
    }

    public(package) fun set_walrus_agreement_blob_id<CoinType>(pool: &mut ArisanPool<CoinType>, blob_id: String) {
        pool.walrus_agreement_blob_id = blob_id;
    }

    // ====== Seal Randomness Seed Accessors (package-only, additive) ======

    public(package) fun set_seal_seed<CoinType>(pool: &mut ArisanPool<CoinType>, seed: vector<u8>) {
        pool.seal_seed = option::some(seed);
        event::emit(SealSeedSet { pool_id: object::id(pool) });
    }

    public(package) fun clear_seal_seed<CoinType>(pool: &mut ArisanPool<CoinType>) {
        pool.seal_seed = option::none();
    }

    public(package) fun has_seal_seed<CoinType>(pool: &ArisanPool<CoinType>): bool {
        pool.seal_seed.is_some()
    }

    public(package) fun borrow_seal_seed<CoinType>(pool: &ArisanPool<CoinType>): &vector<u8> {
        option::borrow(&pool.seal_seed)
    }

    public(package) fun pool_id_from_cap(cap: &PoolAdminCap): ID {
        cap.pool_id
    }

    public(package) fun pool_is_ended<CoinType>(pool: &ArisanPool<CoinType>): bool {
        pool.is_ended
    }

    // ====== Capability-based Auth (SEC-AC-1 fix) ======

    /// Per-pool admin capability — minted on pool creation, transferred to creator.
    /// Having this object IS the authorization — no sender check needed.
    /// Can be transferred to delegate admin rights.
    public struct PoolAdminCap has key, store {
        id: UID,
        pool_id: ID,
    }

    /// One-time witness for this module
    public struct ARISAN_POOL has drop {}

    fun init(otw: ARISAN_POOL, _ctx: &mut TxContext) {
        let ARISAN_POOL {} = otw;
    }

    // ====== TEST HELPERS (only compiled in test) ======

    #[test_only]
    public fun test_create_pool_for_unit_test<CoinType>(
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        ctx: &mut TxContext,
    ): (ArisanPool<CoinType>, PoolAdminCap) {
        let pool_id = object::new(ctx);
        let pool = ArisanPool<CoinType> {
            id: pool_id,
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
            is_active: true,
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
            walrus_metadata_blob_id: string::utf8(b""),
            walrus_cycle_history_blob_id: string::utf8(b""),
            walrus_agreement_blob_id: string::utf8(b""),
            seal_seed: option::none(),
        };
        let cap = PoolAdminCap {
            id: object::new(ctx),
            pool_id: object::id(&pool),
        };
        (pool, cap)
    }

    /// Test helper: destroy a pool + cap (clean up after test)
    /// Only works for empty pools (no participants, no funds)
    #[test_only]
    public fun test_cleanup_pool<CoinType>(pool: ArisanPool<CoinType>, cap: PoolAdminCap, _ctx: &mut TxContext) {
        let ArisanPool<CoinType> { id, participants, cycle_winners, collateral_balance, pool_funds_balance, yield_balance, participant_list, config, creator, ai_optimizer, current_cycle, pool_start_time_ms, is_active, is_full, is_started, is_ended, last_winner, active_depositors_count, strategy_id, walrus_metadata_blob_id, walrus_cycle_history_blob_id, walrus_agreement_blob_id, seal_seed } = pool;
        // Drop empty containers
        table::destroy_empty(participants);
        table::destroy_empty(cycle_winners);
        vector::destroy_empty(participant_list);
        option::destroy_none(last_winner);
        option::destroy_none(strategy_id);
        option::destroy_none(seal_seed);
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
        let _ = walrus_metadata_blob_id;
        let _ = walrus_cycle_history_blob_id;
        let _ = walrus_agreement_blob_id;
        let _ = seal_seed;
        object::delete(id);

        // Destroy PoolAdminCap
        let PoolAdminCap { id: cap_id, pool_id: _ } = cap;
        object::delete(cap_id);
    }

    /// Test helper: destroy pool with non-zero balances (drains all funds first)
    /// Use this for yield integration tests where pool has accumulated yield/funds
    #[test_only]
    public fun test_cleanup_pool_with_funds<CoinType>(pool: ArisanPool<CoinType>, cap: PoolAdminCap, _ctx: &mut TxContext) {
        let ArisanPool<CoinType> { id, participants, cycle_winners, mut collateral_balance, mut pool_funds_balance, mut yield_balance, participant_list, config, creator, ai_optimizer, current_cycle, pool_start_time_ms, is_active, is_full, is_started, is_ended, last_winner, active_depositors_count, strategy_id, walrus_metadata_blob_id, walrus_cycle_history_blob_id, walrus_agreement_blob_id, seal_seed } = pool;

        table::destroy_empty(participants);
        table::destroy_empty(cycle_winners);
        vector::destroy_empty(participant_list);
        option::destroy_none(last_winner);
        option::destroy_none(strategy_id);
        option::destroy_none(seal_seed);

        // Drain pool_funds_balance
        if (balance::value(&pool_funds_balance) > 0) {
            let _coin = coin::from_balance(pool_funds_balance, _ctx);
            transfer::public_transfer(_coin, creator);
        } else {
            balance::destroy_zero(pool_funds_balance);
        };

        // Drain yield_balance
        if (balance::value(&yield_balance) > 0) {
            let _coin = coin::from_balance(yield_balance, _ctx);
            transfer::public_transfer(_coin, creator);
        } else {
            balance::destroy_zero(yield_balance);
        };

        // Drain collateral_balance
        if (balance::value(&collateral_balance) > 0) {
            let _coin = coin::from_balance(collateral_balance, _ctx);
            transfer::public_transfer(_coin, creator);
        } else {
            balance::destroy_zero(collateral_balance);
        };

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
        let _ = walrus_metadata_blob_id;
        let _ = walrus_cycle_history_blob_id;
        let _ = walrus_agreement_blob_id;
        let _ = seal_seed;
        object::delete(id);

        let PoolAdminCap { id: cap_id, pool_id: _ } = cap;
        object::delete(cap_id);
    }

    /// Test helper: destroy only a PoolAdminCap (for expected_failure tests)
    #[test_only]
    public fun test_return_cap(cap: PoolAdminCap, ctx: &mut TxContext) {
        transfer::public_transfer(cap, ctx.sender());
    }

    /// Test helper: destroy a PoolAdminCap directly
    #[test_only]
    public fun test_destroy_cap(cap: PoolAdminCap) {
        let PoolAdminCap { id, pool_id: _ } = cap;
        object::delete(id);
    }

    /// Test helper: destroy only the pool part (keep cap alive separately)
    /// Only works for empty pools (no participants, no funds)
    #[test_only]
    public fun test_destroy_pool_only<CoinType>(pool: ArisanPool<CoinType>, _ctx: &mut TxContext) {
        let ArisanPool<CoinType> { id, participants, cycle_winners, collateral_balance, pool_funds_balance, yield_balance, participant_list, config, creator, ai_optimizer, current_cycle, pool_start_time_ms, is_active, is_full, is_started, is_ended, last_winner, active_depositors_count, strategy_id, walrus_metadata_blob_id, walrus_cycle_history_blob_id, walrus_agreement_blob_id, seal_seed } = pool;
        table::destroy_empty(participants);
        table::destroy_empty(cycle_winners);
        vector::destroy_empty(participant_list);
        option::destroy_none(last_winner);
        option::destroy_none(strategy_id);
        option::destroy_none(seal_seed);
        balance::destroy_zero(collateral_balance);
        balance::destroy_zero(pool_funds_balance);
        balance::destroy_zero(yield_balance);
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
        let _ = walrus_metadata_blob_id;
        let _ = walrus_cycle_history_blob_id;
        let _ = walrus_agreement_blob_id;
        let _ = seal_seed;
        object::delete(id);
    }

    /// Test helper: expose is_cycle_complete for testing
    #[test_only]
    public fun test_is_cycle_complete<CoinType>(pool: &ArisanPool<CoinType>, current_time_ms: u64): bool {
        is_cycle_complete(pool, current_time_ms)
    }

    /// Test helper: set pool as started with specific start time (for cycle completion tests)
    #[test_only]
    public fun test_set_started<CoinType>(pool: &mut ArisanPool<CoinType>, start_time_ms: u64) {
        pool.is_started = true;
        pool.current_cycle = 1;
        pool.pool_start_time_ms = start_time_ms;
    }

    /// Test helper: set pool as ended (for yield hook ended-pool tests)
    #[test_only]
    public fun test_set_ended<CoinType>(pool: &mut ArisanPool<CoinType>) {
        pool.is_ended = true;
        pool.is_active = false;
    }
}
