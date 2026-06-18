/// Module: test_sui
/// Mock SUI coin for testing Archa on Sui testnet
#[allow(lint(self_transfer))]
module suivan::test_sui {
    use sui::coin::{Self, TreasuryCap};
    use sui::coin_registry;
    use sui::event;

    public struct TEST_SUI has drop {}

    public struct FaucetMinted has copy, drop {
        recipient: address,
        amount: u64,
    }

    fun init(otw: TEST_SUI, ctx: &mut TxContext) {
        let (currency_initializer, treasury_cap) = coin_registry::new_currency_with_otw(
            otw,
            9,
            b"TEST_SUI".to_string(),
            b"Test SUI".to_string(),
            b"Mock SUI for Archa testing".to_string(),
            b"https://suivan.fun/logo.png".to_string(),
            ctx,
        );

        coin_registry::finalize_and_delete_metadata_cap(currency_initializer, ctx);
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    public fun mint(
        cap: &mut TreasuryCap<TEST_SUI>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(cap, amount, ctx);
        event::emit(FaucetMinted { recipient, amount });
        transfer::public_transfer(coin, recipient);
    }

    public fun mint_faucet(
        cap: &mut TreasuryCap<TEST_SUI>,
        ctx: &mut TxContext,
    ) {
        let amount = 1_000_000_000;
        let coin = coin::mint(cap, amount, ctx);
        event::emit(FaucetMinted { recipient: ctx.sender(), amount });
        transfer::public_transfer(coin, ctx.sender());
    }
}
