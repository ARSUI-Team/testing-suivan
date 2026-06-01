/// Module: seal_randomness
/// Isolated Seal-based commit-reveal randomness layer for Archa.
///
/// Provides verifiable randomness through Seal's threshold encryption.
/// Completely independent from arisan_pool — no pool state, no payout,
/// no deposit, no solvency logic.
///
/// Lifecycle: commit → reveal → consume → destroy
/// - commit: Store encrypted randomness (from Seal key servers) on-chain
/// - reveal: Decrypt using verified derived keys → produce seed
/// - consume: Mark as consumed (replay protection)
/// - destroy: Clean up after consumption
#[allow(lint(public_entry))]
module archa::seal_randomness {
    use seal::bf_hmac_encryption::{Self, PublicKey, VerifiedDerivedKey};
    use seal::time;
    use sui::bls12381::G1;
    use sui::group_ops::Element;
    use sui::clock::Clock;
    use sui::event;

    const E_ALREADY_REVEALED: u64 = 0;
    const E_ALREADY_CONSUMED: u64 = 1;
    const E_NOT_REVEALED: u64 = 2;
    const E_DECRYPTION_FAILED: u64 = 3;
    const E_NOT_CONSUMED: u64 = 4;

    public struct SealCommit has key, store {
        id: UID,
        package_id: address,
        object_id: vector<u8>,
        encrypted_object_bytes: vector<u8>,
        revealed: bool,
        consumed: bool,
        committed_at_ms: u64,
        max_staleness_ms: u64,
        seed: Option<vector<u8>>,
    }

    public struct SealCommitted has copy, drop {
        commit_id: ID,
        package_id: address,
        object_id: vector<u8>,
        committed_at_ms: u64,
    }

    public struct SealRevealed has copy, drop {
        commit_id: ID,
        package_id: address,
    }

    public struct SealConsumed has copy, drop {
        commit_id: ID,
    }

    public fun commit_randomness(
        package_id: address,
        object_id: vector<u8>,
        encrypted_object_bytes: vector<u8>,
        max_staleness_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ): SealCommit {
        let _ = bf_hmac_encryption::parse_encrypted_object(encrypted_object_bytes);
        let now = sui::clock::timestamp_ms(clock);
        let commit = SealCommit {
            id: object::new(ctx),
            package_id,
            object_id,
            encrypted_object_bytes,
            revealed: false,
            consumed: false,
            committed_at_ms: now,
            max_staleness_ms,
            seed: option::none(),
        };
        event::emit(SealCommitted {
            commit_id: object::id(&commit),
            package_id,
            object_id,
            committed_at_ms: now,
        });
        commit
    }

    public fun seal_approve(
        commit: &SealCommit,
        derived_keys: &vector<Element<G1>>,
        public_keys: &vector<PublicKey>,
    ): vector<VerifiedDerivedKey> {
        bf_hmac_encryption::verify_derived_keys(
            derived_keys,
            commit.package_id,
            commit.object_id,
            public_keys,
        )
    }

    public fun reveal_randomness(
        commit: &mut SealCommit,
        derived_keys: &vector<Element<G1>>,
        public_keys: &vector<PublicKey>,
        clock: &Clock,
    ) {
        assert!(!commit.revealed, E_ALREADY_REVEALED);
        assert!(!commit.consumed, E_ALREADY_CONSUMED);
        let now = sui::clock::timestamp_ms(clock);
        time::check_staleness(now, commit.max_staleness_ms, clock);
        let encrypted_obj = bf_hmac_encryption::parse_encrypted_object(commit.encrypted_object_bytes);
        let verified_keys = bf_hmac_encryption::verify_derived_keys(
            derived_keys,
            commit.package_id,
            commit.object_id,
            public_keys,
        );
        let result = bf_hmac_encryption::decrypt(&encrypted_obj, &verified_keys, public_keys);
        assert!(result.is_some(), E_DECRYPTION_FAILED);
        commit.revealed = true;
        commit.seed = option::some(result.destroy_some());
        event::emit(SealRevealed {
            commit_id: object::id(commit),
            package_id: commit.package_id,
        });
    }

    public fun has_seed(commit: &SealCommit): bool {
        commit.revealed && !commit.consumed && commit.seed.is_some()
    }

    public fun borrow_seed(commit: &SealCommit): &vector<u8> {
        assert!(commit.revealed && !commit.consumed, E_NOT_REVEALED);
        option::borrow(&commit.seed)
    }

    public fun is_revealed(commit: &SealCommit): bool {
        commit.revealed
    }

    public fun is_consumed(commit: &SealCommit): bool {
        commit.consumed
    }

    public fun commit_id(commit: &SealCommit): ID {
        object::id(commit)
    }

    public fun package_id(commit: &SealCommit): address {
        commit.package_id
    }

    public fun committed_at(commit: &SealCommit): u64 {
        commit.committed_at_ms
    }

    public fun consume(commit: &mut SealCommit) {
        assert!(commit.revealed, E_NOT_REVEALED);
        assert!(!commit.consumed, E_ALREADY_CONSUMED);
        commit.consumed = true;
        event::emit(SealConsumed { commit_id: object::id(commit) });
    }

    public fun destroy(commit: SealCommit) {
        assert!(commit.consumed, E_NOT_CONSUMED);
        let SealCommit {
            id,
            package_id: _,
            object_id: _,
            encrypted_object_bytes: _,
            revealed: _,
            consumed: _,
            committed_at_ms: _,
            max_staleness_ms: _,
            seed: _,
        } = commit;
        object::delete(id);
    }

    #[allow(lint(share_owned))]
    public entry fun create_and_share(
        package_id: address,
        object_id: vector<u8>,
        encrypted_object_bytes: vector<u8>,
        max_staleness_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let commit = commit_randomness(package_id, object_id, encrypted_object_bytes, max_staleness_ms, clock, ctx);
        transfer::share_object(commit);
    }

    #[test_only]
    public fun test_destroy_unconsumed(commit: SealCommit) {
        let SealCommit {
            id,
            package_id: _,
            object_id: _,
            encrypted_object_bytes: _,
            revealed: _,
            consumed: _,
            committed_at_ms: _,
            max_staleness_ms: _,
            seed: _,
        } = commit;
        object::delete(id);
    }

    #[test_only]
    public fun test_set_revealed(commit: &mut SealCommit, seed_bytes: vector<u8>) {
        commit.revealed = true;
        commit.seed = option::some(seed_bytes);
    }
}
