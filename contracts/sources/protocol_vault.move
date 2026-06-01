/// Module: protocol_vault
/// Individual protocol vault for Archa yield strategy
/// Real yield only — total_assets always equals actual balance (C-02 fix)
#[allow(unused_field)]
module archa::protocol_vault {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::String;

    const E_INSUFFICIENT_SHARES: u64 = 300;

    const MIN_SHARES_OFFSET: u64 = 1000;

    fun mul_div(a: u64, b: u64, c: u64): u64 {
        (((a as u128) * (b as u128) / (c as u128)) as u64)
    }

    public struct ProtocolVault<phantom CoinType> has key {
        id: UID,
        owner: address,
        protocol_name: String,
        total_assets: u64,
        total_shares: u64,
        shares: Table<address, u64>,
        funds: Balance<CoinType>,
    }

    public struct VaultCreated has copy, drop {
        vault_id: ID,
        protocol_name: String,
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

    // ====== Functions ======

    /// Create a new protocol vault — called by deployer or admin
    public fun create_vault<CoinType>(
        protocol_name: String,
        ctx: &mut TxContext,
    ) {
        let vault_id = object::new(ctx);
        let vault = ProtocolVault<CoinType> {
            id: vault_id,
            owner: ctx.sender(),
            protocol_name,
            total_assets: 0,
            total_shares: 0,
            shares: table::new(ctx),
            funds: balance::zero(),
        };

        event::emit(VaultCreated {
            vault_id: object::id(&vault),
            protocol_name: vault.protocol_name,
        });

        transfer::share_object(vault);
    }

    /// Deposit USDC into vault
    public fun deposit<CoinType>(
        vault: &mut ProtocolVault<CoinType>,
        coin: Coin<CoinType>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        let depositor = ctx.sender();

        let shares_to_mint = if (vault.total_shares == 0) {
            amount + MIN_SHARES_OFFSET
        } else {
            mul_div(amount, vault.total_shares, vault.total_assets)
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
    public fun withdraw<CoinType>(
        vault: &mut ProtocolVault<CoinType>,
        share_amount: u64,
        ctx: &mut TxContext,
    ): Coin<CoinType> {
        let withdrawer = ctx.sender();

        assert!(table::contains(&vault.shares, withdrawer), E_INSUFFICIENT_SHARES);
        let my_shares = table::borrow_mut(&mut vault.shares, withdrawer);
        assert!(*my_shares >= share_amount, E_INSUFFICIENT_SHARES);

        let amount = if (vault.total_shares > 0) {
            mul_div(share_amount, vault.total_assets, vault.total_shares)
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

    // ====== View Functions ======

    public fun get_protocol_name<CoinType>(vault: &ProtocolVault<CoinType>): String {
        vault.protocol_name
    }

    public fun get_total_assets<CoinType>(vault: &ProtocolVault<CoinType>): u64 {
        vault.total_assets
    }

    public fun get_actual_balance<CoinType>(vault: &ProtocolVault<CoinType>): u64 {
        balance::value(&vault.funds)
    }

    public fun get_shares<CoinType>(vault: &ProtocolVault<CoinType>, addr: address): u64 {
        if (table::contains(&vault.shares, addr)) {
            *table::borrow(&vault.shares, addr)
        } else {
            0
        }
    }

    // ====== TEST HELPERS ======

    #[test_only]
    public fun test_create_vault<CoinType>(ctx: &mut TxContext): ProtocolVault<CoinType> {
        ProtocolVault<CoinType> {
            id: object::new(ctx),
            owner: ctx.sender(),
            protocol_name: std::string::utf8(b"Test Protocol"),
            total_assets: 0,
            total_shares: 0,
            shares: table::new(ctx),
            funds: balance::zero(),
        }
    }

    #[test_only]
    public fun test_cleanup_vault<CoinType>(vault: ProtocolVault<CoinType>, _ctx: &mut TxContext) {
        let ProtocolVault<CoinType> {
            id, owner: _, protocol_name: _,
            total_assets: _, total_shares: _,
            shares, funds
        } = vault;
        table::drop(shares);
        balance::destroy_for_testing(funds);
        object::delete(id);
    }
}
