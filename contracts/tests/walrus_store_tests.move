/// Tests for walrus_store module
/// Verifies Walrus blob storage integration without touching core financial logic
#[test_only]
module archa::walrus_store_tests {
    use sui::test_scenario;
    use archa::arisan_pool::{Self, ArisanPool, PoolAdminCap};
    use archa::walrus_store;
    use std::string;

    const DEPOSIT_AMOUNT: u64 = 10_000_000;
    const CYCLE_DURATION_MS: u64 = 2_592_000_000;

    fun create_test_pool(scenario: &mut test_scenario::Scenario): (ArisanPool, PoolAdminCap) {
        arisan_pool::test_create_pool_for_unit_test(
            DEPOSIT_AMOUNT,
            5,
            CYCLE_DURATION_MS,
            125,
            scenario.ctx(),
        )
    }

    #[test]
    fun test_walrus_default_empty_blob_ids() {
        let mut scenario = test_scenario::begin(@0xA);
        let (pool, cap) = create_test_pool(&mut scenario);

        assert!(string::is_empty(&walrus_store::pool_metadata_blob_id(&pool)));
        assert!(string::is_empty(&walrus_store::cycle_history_blob_id(&pool)));
        assert!(string::is_empty(&walrus_store::agreement_blob_id(&pool)));

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_link_pool_metadata() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        walrus_store::link_pool_metadata(
            &mut pool,
            &cap,
            string::utf8(b"walrus_blob_abc123"),
        );

        assert!(!string::is_empty(&walrus_store::pool_metadata_blob_id(&pool)));
        assert!(walrus_store::pool_metadata_blob_id(&pool) == string::utf8(b"walrus_blob_abc123"));

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_link_agreement() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        walrus_store::link_agreement(
            &mut pool,
            &cap,
            string::utf8(b"agreement_blob_xyz789"),
        );

        assert!(!string::is_empty(&walrus_store::agreement_blob_id(&pool)));
        assert!(walrus_store::agreement_blob_id(&pool) == string::utf8(b"agreement_blob_xyz789"));

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_update_cycle_history() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        walrus_store::update_cycle_history(
            &mut pool,
            &cap,
            string::utf8(b"history_v1"),
        );

        assert!(walrus_store::cycle_history_blob_id(&pool) == string::utf8(b"history_v1"));

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    fun test_update_cycle_history_replaces_old() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        walrus_store::update_cycle_history(
            &mut pool,
            &cap,
            string::utf8(b"history_v1"),
        );

        walrus_store::update_cycle_history(
            &mut pool,
            &cap,
            string::utf8(b"history_v2"),
        );

        assert!(walrus_store::cycle_history_blob_id(&pool) == string::utf8(b"history_v2"));

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::walrus_store::E_EMPTY_BLOB_ID)]
    fun test_link_metadata_empty_blob_rejected() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        walrus_store::link_pool_metadata(
            &mut pool,
            &cap,
            string::utf8(b""),
        );

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::walrus_store::E_NOT_POOL_ADMIN)]
    fun test_link_metadata_wrong_cap() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, _cap) = create_test_pool(&mut scenario);

        let (other_pool, wrong_cap) = arisan_pool::test_create_pool_for_unit_test(
            DEPOSIT_AMOUNT, 2, CYCLE_DURATION_MS, 100, scenario.ctx()
        );

        walrus_store::link_pool_metadata(
            &mut pool,
            &wrong_cap,
            string::utf8(b"blob_id"),
        );

        arisan_pool::test_cleanup_pool(pool, _cap, scenario.ctx());
        arisan_pool::test_cleanup_pool(other_pool, wrong_cap, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::walrus_store::E_POOL_ENDED)]
    fun test_link_metadata_pool_ended() {
        let mut scenario = test_scenario::begin(@0xA);
        let (mut pool, cap) = create_test_pool(&mut scenario);

        arisan_pool::test_set_ended(&mut pool);

        walrus_store::link_pool_metadata(
            &mut pool,
            &cap,
            string::utf8(b"blob_id"),
        );

        arisan_pool::test_cleanup_pool(pool, cap, scenario.ctx());
        scenario.end();
    }
}
