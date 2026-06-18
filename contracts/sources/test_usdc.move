/// Module: test_usdc
/// Mock USDC coin for testing Archa on Sui testnet
/// Uses coin_registry for custom coin type creation
#[allow(lint(self_transfer))]
module suivan::test_usdc {
    use sui::coin::{Self, TreasuryCap};
    use sui::coin_registry;
    use sui::event;

    // ====== One-Time Witness ======
    public struct TEST_USDC has drop {}

    // ====== Events ======

    public struct FaucetMinted has copy, drop {
        recipient: address,
        amount: u64,
    }

    /// Create the USDC coin type — called once during publish
    fun init(otw: TEST_USDC, ctx: &mut TxContext) {
        let (currency_initializer, treasury_cap) = coin_registry::new_currency_with_otw(
            otw,
            6,                                          // decimals (same as real USDC)
            b"USDC".to_string(),                        // symbol
            b"USD Coin".to_string(),                    // name
            b"Mock USDC for Archa testing".to_string(), // description
            b"https://suivan.fun/logo.png".to_string(),  // icon_url
            ctx,
        );

        // Finalize registration — shares Currency object, deletes MetadataCap
        // We don't need MetadataCap for hackathon
        coin_registry::finalize_and_delete_metadata_cap(currency_initializer, ctx);

        // Transfer TreasuryCap to publisher — allows minting
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    /// Mint USDC tokens to any address — for faucet use
    /// Only the TreasuryCap holder can call this
    public fun mint(
        cap: &mut TreasuryCap<TEST_USDC>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(cap, amount, ctx);
        event::emit(FaucetMinted { recipient, amount });
        transfer::public_transfer(coin, recipient);
    }

    /// Faucet: mint 10,000 USDC to caller
    /// Convenience function for testing
    public fun mint_faucet(
        cap: &mut TreasuryCap<TEST_USDC>,
        ctx: &mut TxContext,
    ) {
        let amount = 10_000_000_000; // 10,000 USDC (6 decimals)
        let coin = coin::mint(cap, amount, ctx);
        event::emit(FaucetMinted { recipient: ctx.sender(), amount });
        transfer::public_transfer(coin, ctx.sender());
    }
}
