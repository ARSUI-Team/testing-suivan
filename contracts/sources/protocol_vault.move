/// Module: protocol_vault
/// Individual protocol vault for Archa yield strategy
/// Each vault represents a DeFi protocol (Scallop, NAVI, Cetus, etc.)
/// For hackathon: simulated yield per protocol
module archa::protocol_vault {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};

    use archa::test_usdc::TEST_USDC;

    // ====== Constants ======
    const E_INSUFFICIENT_SHARES: u64 = 300;
    const E_NOT_OWNER: u64 = 301;
    const E_INVALID_APY: u64 = 302;

    // ====== Structs ======

    /// ProtocolVault — one per DeFi protocol
    public struct ProtocolVault has key {
        id: UID,
        owner: address,
        protocol_name: String,
        apy: u64,                  // Basis points (e.g. 500 = 5%)
        total_assets: u64,         // Simulated total assets (including yield)
        total_shares: u64,
        shares: Table<address, u64>,
        funds: Balance<TEST_USDC>,
    }

    // ====== Events ======

    public struct VaultCreated has copy, drop {
        vault_id: ID,
        protocol_name: String,
        apy: u64,
    }

    public struct VaultDeposit has copy, drop {
        vault_id: ID,
        depositor: address,
        amount: u64,
        shares_minted: u64,
    }

    public struct VaultWithdraw has copy, drop {
        vault_id: ID,
        withdrawer: address,
        shares_burned: u64,
        amount: u64,
    }

    public struct VaultYieldSimulated has copy, drop {
        vault_id: ID,
        yield_amount: u64,
        new_total_assets: u64,
    }

    // ====== Functions ======

    /// Create a new protocol vault — called by deployer or admin
    public fun create_vault(
        protocol_name: String,
        apy: u64,
        ctx: &mut TxContext,
    ) {
        assert!(apy <= 5000, E_INVALID_APY);

        let vault_id = object::new(ctx);
        let vault = ProtocolVault {
            id: vault_id,
            owner: ctx.sender(),
            protocol_name,
            apy,
            total_assets: 0,
            total_shares: 0,
            shares: table::new(ctx),
            funds: balance::zero(),
        };

        event::emit(VaultCreated {
            vault_id: object::id(&vault),
            protocol_name: vault.protocol_name,
            apy,
        });

        transfer::share_object(vault);
    }

    /// Deposit USDC into vault
    public fun deposit(
        vault: &mut ProtocolVault,
        coin: Coin<TEST_USDC>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        let depositor = ctx.sender();

        let shares_to_mint = if (vault.total_shares == 0) {
            amount
        } else {
            amount * vault.total_shares / vault.total_assets
        };

        assert!(shares_to_mint > 0, E_INSUFFICIENT_SHARES);

        vault.total_assets = vault.total_assets + amount;
        vault.total_shares = vault.total_shares + shares_to_mint;

        if (table::contains(&vault.shares, depositor)) {
            let current = table::borrow_mut(&mut vault.shares, depositor);
            *current = *current + shares_to_mint;
        } else {
            table::add(&mut vault.shares, depositor, shares_to_mint);
        };

        balance::join(&mut vault.funds, coin::into_balance(coin));

        event::emit(VaultDeposit {
            vault_id: object::id(vault),
            depositor,
            amount,
            shares_minted: shares_to_mint,
        });
    }

    /// Withdraw USDC from vault by burning shares
    public fun withdraw(
        vault: &mut ProtocolVault,
        share_amount: u64,
        ctx: &mut TxContext,
    ): Coin<TEST_USDC> {
        let withdrawer = ctx.sender();

        assert!(table::contains(&vault.shares, withdrawer), E_INSUFFICIENT_SHARES);
        let my_shares = table::borrow_mut(&mut vault.shares, withdrawer);
        assert!(*my_shares >= share_amount, E_INSUFFICIENT_SHARES);

        let amount = if (vault.total_shares > 0) {
            share_amount * vault.total_assets / vault.total_shares
        } else {
            0
        };
        assert!(amount > 0, E_INSUFFICIENT_SHARES);

        *my_shares = *my_shares - share_amount;
        vault.total_shares = vault.total_shares - share_amount;
        vault.total_assets = vault.total_assets - amount;

        let withdrawn = coin::take(&mut vault.funds, amount, ctx);

        event::emit(VaultWithdraw {
            vault_id: object::id(vault),
            withdrawer,
            shares_burned: share_amount,
            amount,
        });

        withdrawn
    }

    /// Simulate yield — increases total_assets without adding actual coins
    /// Only owner can call
    public fun simulate_yield(
        vault: &mut ProtocolVault,
        ctx: &mut TxContext,
    ) {
        assert!(ctx.sender() == vault.owner, E_NOT_OWNER);

        if (vault.total_assets == 0) { return };

        // Monthly yield: total_assets * apy / 10000 / 12
        let yield_amount = vault.total_assets * vault.apy / 10000 / 12;
        if (yield_amount == 0) { return };

        vault.total_assets = vault.total_assets + yield_amount;

        event::emit(VaultYieldSimulated {
            vault_id: object::id(vault),
            yield_amount,
            new_total_assets: vault.total_assets,
        });
    }

    // ====== View Functions ======

    public fun get_protocol_name(vault: &ProtocolVault): String {
        vault.protocol_name
    }

    public fun get_apy(vault: &ProtocolVault): u64 {
        vault.apy
    }

    public fun get_total_assets(vault: &ProtocolVault): u64 {
        vault.total_assets
    }

    public fun get_actual_balance(vault: &ProtocolVault): u64 {
        balance::value(&vault.funds)
    }

    public fun get_shares(vault: &ProtocolVault, addr: address): u64 {
        if (table::contains(&vault.shares, addr)) {
            *table::borrow(&vault.shares, addr)
        } else {
            0
        }
    }

    // ====== TEST HELPERS ======

    #[test_only]
    public fun test_create_vault(apy: u64, ctx: &mut TxContext): ProtocolVault {
        ProtocolVault {
            id: object::new(ctx),
            owner: ctx.sender(),
            protocol_name: string::utf8(b"Test Protocol"),
            apy,
            total_assets: 0,
            total_shares: 0,
            shares: table::new(ctx),
            funds: balance::zero(),
        }
    }

    #[test_only]
    public fun test_cleanup_vault(vault: ProtocolVault, _ctx: &mut TxContext) {
        let ProtocolVault {
            id, owner: _, protocol_name: _, apy: _,
            total_assets: _, total_shares: _,
            shares, funds
        } = vault;
        table::drop(shares);
        balance::destroy_for_testing(funds);
        object::delete(id);
    }
}
