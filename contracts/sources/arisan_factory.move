/// Module: arisan_factory
/// Factory for creating ArisanPool instances with predefined templates
module suivan::arisan_factory {
    use sui::event;
    use sui::table::{Self, Table};
    use sui::coin::Coin;
    use std::string::{Self, String};

    use suivan::arisan_pool;

    // ====== Constants ======
    const E_INVALID_TEMPLATE: u64 = 101;
    const E_TEMPLATE_INACTIVE: u64 = 102;
    const E_FACTORY_PAUSED: u64 = 103;
    const E_TOO_MANY_POOLS: u64 = 104;

    const MAX_POOLS_PER_USER: u64 = 100;

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

    /// Factory admin capability — only holder can add templates/pause
    public struct FactoryAdminCap has key, store { id: UID }

    /// The shared factory object — one per deployment
    /// Tracks all pools and per-user pools on-chain.
    /// all_pools uses Table<u64, ID> instead of vector<ID> for scalability
    public struct ArisanFactory has key {
        id: UID,
        owner: address,
        ai_optimizer: address,
        templates: vector<PoolTemplate>,
        all_pools: Table<u64, ID>,
        pool_count: u64,
        user_pools: Table<address, vector<ID>>,
        paused: bool,
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
        pool_id: ID,
    }

    public struct PoolCreatedCustom has copy, drop {
        factory_id: ID,
        creator: address,
        deposit_amount: u64,
        max_participants: u64,
        pool_id: ID,
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
            all_pools: table::new(ctx),
            pool_count: 0,
            user_pools: table::new(ctx),
            paused: false,
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

    /// Pause factory — prevents new pool creation
    public fun pause(_cap: &FactoryAdminCap, factory: &mut ArisanFactory) {
        factory.paused = true;
    }

    /// Unpause factory — allows new pool creation
    public fun unpause(_cap: &FactoryAdminCap, factory: &mut ArisanFactory) {
        factory.paused = false;
    }

    // ====== Pool Creation ======

    /// Create a pool from a predefined template
    /// Caller provides collateral Coin, factory reads template config
    public fun create_pool_from_template<CoinType>(
        factory: &mut ArisanFactory,
        collateral: Coin<CoinType>,
        deposit_coin: Coin<CoinType>,
        template_id: u64,
        delegate_to: Option<address>,
        ctx: &mut TxContext,
    ) {
        assert!(!factory.paused, E_FACTORY_PAUSED);
        assert!(template_id < vector::length(&factory.templates), E_INVALID_TEMPLATE);

        let template = vector::borrow(&factory.templates, template_id);
        assert!(template.is_active, E_TEMPLATE_INACTIVE);

        let factory_id = object::id(factory);
        let creator = ctx.sender();

        // Delegate to arisan_pool::create_pool
        let pool_id = arisan_pool::create_pool(
            collateral,
            deposit_coin,
            template.deposit_amount,
            template.max_participants,
            template.cycle_duration_ms,
            template.collateral_multiplier,
            string::utf8(b""),
            delegate_to,
            ctx,
        );

        // Track pool on-chain using Table (scalable — no unbounded vector growth)
        let pool_index = factory.pool_count;
        table::add(&mut factory.all_pools, pool_index, pool_id);
        factory.pool_count = factory.pool_count + 1;

        if (table::contains(&factory.user_pools, creator)) {
            let user_pools = table::borrow_mut(&mut factory.user_pools, creator);
            assert!(vector::length(user_pools) < MAX_POOLS_PER_USER, E_TOO_MANY_POOLS);
            vector::push_back(user_pools, pool_id);
        } else {
            let mut new_list = vector[];
            vector::push_back(&mut new_list, pool_id);
            table::add(&mut factory.user_pools, creator, new_list);
        };

        event::emit(PoolCreatedFromTemplate {
            factory_id,
            creator,
            template_id,
            pool_id,
        });
    }

    /// Create a pool with custom configuration
    public fun create_custom_pool<CoinType>(
        factory: &mut ArisanFactory,
        collateral: Coin<CoinType>,
        deposit_coin: Coin<CoinType>,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        metadata_blob_id: String,
        delegate_to: Option<address>,
        ctx: &mut TxContext,
    ) {
        assert!(!factory.paused, E_FACTORY_PAUSED);

        let factory_id = object::id(factory);
        let creator = ctx.sender();

        let pool_id = arisan_pool::create_pool(
            collateral,
            deposit_coin,
            deposit_amount,
            max_participants,
            cycle_duration_ms,
            collateral_multiplier,
            metadata_blob_id,
            delegate_to,
            ctx,
        );

        // Track pool on-chain using Table (scalable — no unbounded vector growth)
        let pool_index = factory.pool_count;
        table::add(&mut factory.all_pools, pool_index, pool_id);
        factory.pool_count = factory.pool_count + 1;

        if (table::contains(&factory.user_pools, creator)) {
            let user_pools = table::borrow_mut(&mut factory.user_pools, creator);
            assert!(vector::length(user_pools) < MAX_POOLS_PER_USER, E_TOO_MANY_POOLS);
            vector::push_back(user_pools, pool_id);
        } else {
            let mut new_list = vector[];
            vector::push_back(&mut new_list, pool_id);
            table::add(&mut factory.user_pools, creator, new_list);
        };

        event::emit(PoolCreatedCustom {
            factory_id,
            creator,
            deposit_amount,
            max_participants,
            pool_id,
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

    /// Get pool ID by index (for paginated frontend queries)
    public fun get_pool_by_index(factory: &ArisanFactory, index: u64): ID {
        *table::borrow(&factory.all_pools, index)
    }

    /// Get total number of pools created through this factory
    public fun pool_count(factory: &ArisanFactory): u64 {
        factory.pool_count
    }

    /// Check if factory is paused
    public fun is_paused(factory: &ArisanFactory): bool {
        factory.paused
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
