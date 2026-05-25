/// Module: arisan_factory
/// Factory for creating ArisanPool instances with predefined templates
module archa::arisan_factory {
    use sui::event;
    use sui::table::{Self, Table};
    use sui::coin::Coin;
    use std::string::{Self, String};

    use archa::test_usdc::TEST_USDC;
    use archa::arisan_pool;

    // ====== Constants ======
    const E_INVALID_TEMPLATE: u64 = 101;
    const E_TEMPLATE_INACTIVE: u64 = 102;

    // ====== Structs ======

    /// Pool template — predefined pool configurations
    public struct PoolTemplate has store, copy, drop {
        name: String,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        is_active: bool,
    }

    /// Factory admin capability — only holder can add templates
    public struct FactoryAdminCap has key, store { id: UID }

    /// The shared factory object — one per deployment
    /// NOTE: all_pools and user_pools are tracked via events for now.
    /// On-chain tracking requires architectural change (create_pool must return ID).
    public struct ArisanFactory has key {
        id: UID,
        owner: address,
        ai_optimizer: address,
        templates: vector<PoolTemplate>,
        all_pools: vector<ID>,
        user_pools: Table<address, vector<ID>>,
    }

    // ====== Events ======

    public struct FactoryCreated has copy, drop {
        factory_id: ID,
        owner: address,
    }

    public struct TemplateAdded has copy, drop {
        factory_id: ID,
        template_id: u64,
        name: String,
        deposit_amount: u64,
        max_participants: u64,
    }

    public struct PoolCreatedFromTemplate has copy, drop {
        factory_id: ID,
        creator: address,
        template_id: u64,
    }

    public struct PoolCreatedCustom has copy, drop {
        factory_id: ID,
        creator: address,
        deposit_amount: u64,
        max_participants: u64,
    }

    // ====== Init ======

    /// One-time witness for this module
    public struct ARISAN_FACTORY has drop {}

    /// Create factory + admin cap on package publish
    fun init(otw: ARISAN_FACTORY, ctx: &mut TxContext) {
        let factory_id = object::new(ctx);
        let factory = ArisanFactory {
            id: factory_id,
            owner: ctx.sender(),
            ai_optimizer: ctx.sender(),
            templates: vector[],
            all_pools: vector[],
            user_pools: table::new(ctx),
        };

        event::emit(FactoryCreated {
            factory_id: object::id(&factory),
            owner: ctx.sender(),
        });

        transfer::share_object(factory);

        let admin_cap = FactoryAdminCap { id: object::new(ctx) };
        transfer::public_transfer(admin_cap, ctx.sender());

        let ARISAN_FACTORY {} = otw;
    }

    // ====== Admin Functions ======

    /// Add a new pool template — requires FactoryAdminCap
    public fun add_template(
        _cap: &FactoryAdminCap,
        factory: &mut ArisanFactory,
        name: String,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
    ) {
        let template_id = vector::length(&factory.templates);
        let template = PoolTemplate {
            name,
            deposit_amount,
            max_participants,
            cycle_duration_ms,
            collateral_multiplier,
            is_active: true,
        };
        vector::push_back(&mut factory.templates, template);

        event::emit(TemplateAdded {
            factory_id: object::id(factory),
            template_id,
            name: template.name,
            deposit_amount,
            max_participants,
        });
    }

    /// Deactivate a template — requires FactoryAdminCap
    public fun deactivate_template(
        _cap: &FactoryAdminCap,
        factory: &mut ArisanFactory,
        template_id: u64,
    ) {
        assert!(template_id < vector::length(&factory.templates), E_INVALID_TEMPLATE);
        let template = vector::borrow_mut(&mut factory.templates, template_id);
        template.is_active = false;
    }

    /// Set ai_optimizer address — only owner
    public fun set_ai_optimizer(
        _cap: &FactoryAdminCap,
        factory: &mut ArisanFactory,
        new_optimizer: address,
    ) {
        factory.ai_optimizer = new_optimizer;
    }

    // ====== Pool Creation ======

    /// Create a pool from a predefined template
    /// Caller provides collateral Coin, factory reads template config
    public fun create_pool_from_template(
        factory: &mut ArisanFactory,
        collateral: Coin<TEST_USDC>,
        template_id: u64,
        ctx: &mut TxContext,
    ) {
        assert!(template_id < vector::length(&factory.templates), E_INVALID_TEMPLATE);

        let template = vector::borrow(&factory.templates, template_id);
        assert!(template.is_active, E_TEMPLATE_INACTIVE);

        let factory_id = object::id(factory);
        let creator = ctx.sender();

        // Delegate to arisan_pool::create_pool
        arisan_pool::create_pool(
            collateral,
            template.deposit_amount,
            template.max_participants,
            template.cycle_duration_ms,
            template.collateral_multiplier,
            string::utf8(b""),
            ctx,
        );

        event::emit(PoolCreatedFromTemplate {
            factory_id,
            creator,
            template_id,
        });
    }

    /// Create a pool with custom configuration
    public fun create_custom_pool(
        factory: &mut ArisanFactory,
        collateral: Coin<TEST_USDC>,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        ctx: &mut TxContext,
    ) {
        let factory_id = object::id(factory);
        let creator = ctx.sender();

        arisan_pool::create_pool(
            collateral,
            deposit_amount,
            max_participants,
            cycle_duration_ms,
            collateral_multiplier,
            string::utf8(b""),
            ctx,
        );

        event::emit(PoolCreatedCustom {
            factory_id,
            creator,
            deposit_amount,
            max_participants,
        });
    }

    // ====== View Functions ======

    public fun template_count(factory: &ArisanFactory): u64 {
        vector::length(&factory.templates)
    }

    public fun get_template(factory: &ArisanFactory, template_id: u64): PoolTemplate {
        assert!(template_id < vector::length(&factory.templates), E_INVALID_TEMPLATE);
        *vector::borrow(&factory.templates, template_id)
    }

    public fun get_all_pools(factory: &ArisanFactory): &vector<ID> {
        &factory.all_pools
    }

    public fun get_user_pools(factory: &ArisanFactory, user: address): vector<ID> {
        if (table::contains(&factory.user_pools, user)) {
            *table::borrow(&factory.user_pools, user)
        } else {
            vector[]
        }
    }

    /// Initialize default templates (Small/Medium/Large)
    public fun init_default_templates(
        cap: &FactoryAdminCap,
        factory: &mut ArisanFactory,
    ) {
        // Small: 10 USDC, 5 people, 30 days, 125% collateral
        add_template(cap, factory, string::utf8(b"Small Pool"), 10_000_000, 5, 2592000000, 125);
        // Medium: 50 USDC, 10 people, 30 days, 125% collateral
        add_template(cap, factory, string::utf8(b"Medium Pool"), 50_000_000, 10, 2592000000, 125);
        // Large: 100 USDC, 20 people, 30 days, 125% collateral
        add_template(cap, factory, string::utf8(b"Large Pool"), 100_000_000, 20, 2592000000, 125);
    }
}
