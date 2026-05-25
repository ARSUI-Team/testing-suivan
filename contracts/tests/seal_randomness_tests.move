#[test_only]
module archa::seal_randomness_tests {
    use sui::test_scenario;
    use sui::clock::{Self, Clock};
    use archa::seal_randomness::{Self, SealCommit};

    const PACKAGE_ID: address = @0x0;
    const OBJECT_ID: vector<u8> = x"01020304";
    const MAX_STALENESS_MS: u64 = 30_000;

    fun valid_encrypted_object_bytes(): vector<u8> {
        x"00000000000000000000000000000000000000000000000000000000000000000020381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f40903034401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab96b7d726ecf6f7036ee3557cd6c7b93a49b231070e8eecada9cfa157e40e3f02e5d3fcdba72804cc9504a82bbaa13ed4a83a0e2c6219d7e45125cf57fd10cbab957a977b02008812277be43199222d173eed91b480ce4c8cda5aea008ef884e77c990311136486a7daf8e2d99c0389ae40319714ffef1212ffcb456f0de08a7fa1bb185c936f9efe86fb5e32232d5e433230d04b1f2b27614b3b5b13f04db7d5c3b995e7e02e036315d5a9515d050595ea15b326ebcd510baf50463afd6517b5895d0756e39878bd656bd98418df11556d1ced740c7f839d97b81ee60238b3221fb45adfb0a5d1e4aec4f777271e5674bd7ded20421aa929755426501ba8366e465f5ebb861722b2909e5ac2e8608abd885014f2fb6006dd5896ab76ea243dea0d6d6ff4c3396b010de6062eb2dcb2f86bca32f83c9301200000000000000000000000000000000000000000000000000000000000000001184b788b4f5168aff51c0e6da7e2970caa02386c4dc179666ef4c6296807cda9"
    }

    fun create_commit(scenario: &mut test_scenario::Scenario): SealCommit {
        let mut clock_ctx = tx_context::dummy();
        let clock = clock::create_for_testing(&mut clock_ctx);
        let commit = seal_randomness::commit_randomness(
            PACKAGE_ID,
            OBJECT_ID,
            valid_encrypted_object_bytes(),
            MAX_STALENESS_MS,
            &clock,
            scenario.ctx(),
        );
        clock::destroy_for_testing(clock);
        commit
    }

    #[test]
    fun test_commit_randomness_initial_state() {
        let mut scenario = test_scenario::begin(@0xA);
        let commit = create_commit(&mut scenario);

        assert!(!seal_randomness::is_revealed(&commit));
        assert!(!seal_randomness::is_consumed(&commit));
        assert!(!seal_randomness::has_seed(&commit));
        assert!(seal_randomness::package_id(&commit) == PACKAGE_ID);
        assert!(seal_randomness::committed_at(&commit) == 0);

        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::seal_randomness::E_NOT_REVEALED)]
    fun test_consume_before_reveal_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);
        seal_randomness::consume(&mut commit);
        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::seal_randomness::E_ALREADY_REVEALED)]
    fun test_reveal_twice_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);

        seal_randomness::test_set_revealed(&mut commit, vector[1u8]);

        let mut clock_ctx = tx_context::dummy();
        let clock = clock::create_for_testing(&mut clock_ctx);
        let derived_keys: vector<sui::group_ops::Element<sui::bls12381::G1>> = vector[];
        let public_keys: vector<seal::bf_hmac_encryption::PublicKey> = vector[];
        seal_randomness::reveal_randomness(&mut commit, &derived_keys, &public_keys, &clock);
        clock::destroy_for_testing(clock);

        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::seal_randomness::E_ALREADY_CONSUMED)]
    fun test_consume_twice_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);

        seal_randomness::test_set_revealed(&mut commit, vector[1u8]);
        seal_randomness::consume(&mut commit);
        seal_randomness::consume(&mut commit);

        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = archa::seal_randomness::E_NOT_CONSUMED)]
    fun test_destroy_before_consume_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        let commit = create_commit(&mut scenario);
        seal_randomness::destroy(commit);
        scenario.end();
    }

    #[test]
    fun test_destroy_consumed_succeeds() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);

        seal_randomness::test_set_revealed(&mut commit, vector[1u8]);
        seal_randomness::consume(&mut commit);

        assert!(seal_randomness::is_consumed(&commit));
        seal_randomness::destroy(commit);
        scenario.end();
    }

    #[test]
    fun test_has_seed_false_when_not_revealed() {
        let mut scenario = test_scenario::begin(@0xA);
        let commit = create_commit(&mut scenario);
        assert!(!seal_randomness::has_seed(&commit));
        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    fun test_has_seed_false_when_consumed() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);
        seal_randomness::test_set_revealed(&mut commit, vector[1u8, 2u8, 3u8]);
        seal_randomness::consume(&mut commit);
        assert!(!seal_randomness::has_seed(&commit));
        seal_randomness::destroy(commit);
        scenario.end();
    }

    #[test]
    fun test_has_seed_true_when_revealed() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);
        seal_randomness::test_set_revealed(&mut commit, vector[42u8]);
        assert!(seal_randomness::has_seed(&commit));
        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    fun test_borrow_seed_returns_bytes() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);
        seal_randomness::test_set_revealed(&mut commit, vector[10u8, 20u8, 30u8]);
        let seed_bytes = seal_randomness::borrow_seed(&commit);
        assert!(*vector::borrow(seed_bytes, 0) == 10u8);
        assert!(*vector::borrow(seed_bytes, 1) == 20u8);
        assert!(*vector::borrow(seed_bytes, 2) == 30u8);
        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    #[expected_failure]
    fun test_commit_invalid_encrypted_object_fails() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut clock_ctx = tx_context::dummy();
        let clock = clock::create_for_testing(&mut clock_ctx);
        let commit = seal_randomness::commit_randomness(
            PACKAGE_ID,
            OBJECT_ID,
            vector[0xFFu8, 0xFFu8, 0xFFu8],
            MAX_STALENESS_MS,
            &clock,
            scenario.ctx(),
        );
        clock::destroy_for_testing(clock);
        seal_randomness::test_destroy_unconsumed(commit);
        scenario.end();
    }

    #[test]
    fun test_replay_protection_full_lifecycle() {
        let mut scenario = test_scenario::begin(@0xA);
        let mut commit = create_commit(&mut scenario);

        assert!(!seal_randomness::is_revealed(&commit));
        assert!(!seal_randomness::is_consumed(&commit));
        assert!(!seal_randomness::has_seed(&commit));

        seal_randomness::test_set_revealed(&mut commit, vector[1u8, 2u8, 3u8, 4u8]);

        assert!(seal_randomness::is_revealed(&commit));
        assert!(!seal_randomness::is_consumed(&commit));
        assert!(seal_randomness::has_seed(&commit));

        seal_randomness::consume(&mut commit);

        assert!(seal_randomness::is_consumed(&commit));
        assert!(!seal_randomness::has_seed(&commit));

        seal_randomness::destroy(commit);
        scenario.end();
    }
}
