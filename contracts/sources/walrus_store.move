/// Module: walrus_store
/// Walrus blob storage integration for Archa protocol
///
/// Provides off-chain metadata storage via Walrus blob references.
/// This module is ISOLATED from core pool financial logic:
/// - Pool lifecycle functions (join, deposit, select_winner, end) are untouched
/// - Walrus failure does NOT break pool execution
/// - Blob IDs default to empty string if no Walrus data linked
/// - All Walrus operations are in separate functions, never inside core pool flow
///
/// Architecture:
///   Core Protocol (frozen) → Optional Integration Layer → Walrus Storage Adapter
module archa::walrus_store {
    use sui::event;
    use std::string::{Self, String};
    use archa::arisan_pool::{Self, ArisanPool, PoolAdminCap};

    const E_NOT_POOL_ADMIN: u64 = 1100;
    const E_EMPTY_BLOB_ID: u64 = 1101;
    const E_POOL_ENDED: u64 = 1102;

    const BLOB_METADATA: u8 = 0;
    const BLOB_AGREEMENT: u8 = 1;
    const BLOB_CYCLE_HISTORY: u8 = 2;

    // ====== Events ======

    public struct WalrusBlobLinked has copy, drop {
        pool_id: ID,
        blob_id: String,
        blob_type: u8,
    }

    public struct WalrusBlobUpdated has copy, drop {
        pool_id: ID,
        old_blob_id: String,
        new_blob_id: String,
        blob_type: u8,
    }

    // ====== View Functions ======

    public fun pool_metadata_blob_id(pool: &ArisanPool): String {
        arisan_pool::walrus_metadata_blob_id(pool)
    }

    public fun cycle_history_blob_id(pool: &ArisanPool): String {
        arisan_pool::walrus_cycle_history_blob_id(pool)
    }

    public fun agreement_blob_id(pool: &ArisanPool): String {
        arisan_pool::walrus_agreement_blob_id(pool)
    }

    // ====== Entry Functions ======

    public fun link_pool_metadata(
        pool: &mut ArisanPool,
        cap: &PoolAdminCap,
        blob_id: String,
    ) {
        assert!(arisan_pool::pool_id_from_cap(cap) == object::id(pool), E_NOT_POOL_ADMIN);
        assert!(!arisan_pool::pool_is_ended(pool), E_POOL_ENDED);
        assert!(!string::is_empty(&blob_id), E_EMPTY_BLOB_ID);

        let old = arisan_pool::walrus_metadata_blob_id(pool);
        arisan_pool::set_walrus_metadata_blob_id(pool, blob_id);

        if (string::is_empty(&old)) {
            event::emit(WalrusBlobLinked {
                pool_id: object::id(pool),
                blob_id,
                blob_type: BLOB_METADATA,
            });
        } else {
            event::emit(WalrusBlobUpdated {
                pool_id: object::id(pool),
                old_blob_id: old,
                new_blob_id: blob_id,
                blob_type: BLOB_METADATA,
            });
        };
    }

    public fun link_agreement(
        pool: &mut ArisanPool,
        cap: &PoolAdminCap,
        blob_id: String,
    ) {
        assert!(arisan_pool::pool_id_from_cap(cap) == object::id(pool), E_NOT_POOL_ADMIN);
        assert!(!arisan_pool::pool_is_ended(pool), E_POOL_ENDED);
        assert!(!string::is_empty(&blob_id), E_EMPTY_BLOB_ID);

        let old = arisan_pool::walrus_agreement_blob_id(pool);
        arisan_pool::set_walrus_agreement_blob_id(pool, blob_id);

        if (string::is_empty(&old)) {
            event::emit(WalrusBlobLinked {
                pool_id: object::id(pool),
                blob_id,
                blob_type: BLOB_AGREEMENT,
            });
        } else {
            event::emit(WalrusBlobUpdated {
                pool_id: object::id(pool),
                old_blob_id: old,
                new_blob_id: blob_id,
                blob_type: BLOB_AGREEMENT,
            });
        };
    }

    public fun update_cycle_history(
        pool: &mut ArisanPool,
        cap: &PoolAdminCap,
        blob_id: String,
    ) {
        assert!(arisan_pool::pool_id_from_cap(cap) == object::id(pool), E_NOT_POOL_ADMIN);
        assert!(!string::is_empty(&blob_id), E_EMPTY_BLOB_ID);

        let old = arisan_pool::walrus_cycle_history_blob_id(pool);
        arisan_pool::set_walrus_cycle_history_blob_id(pool, blob_id);

        if (string::is_empty(&old)) {
            event::emit(WalrusBlobLinked {
                pool_id: object::id(pool),
                blob_id,
                blob_type: BLOB_CYCLE_HISTORY,
            });
        } else {
            event::emit(WalrusBlobUpdated {
                pool_id: object::id(pool),
                old_blob_id: old,
                new_blob_id: blob_id,
                blob_type: BLOB_CYCLE_HISTORY,
            });
        };
    }
}
