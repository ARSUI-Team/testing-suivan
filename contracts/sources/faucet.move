/// Module: faucet
/// On-chain faucet with per-address cooldown for UI testing
#[allow(lint(self_transfer))]
///
/// ## Phase 1: Shared Faucet Object
/// TreasuryCaps are stored INSIDE the shared Faucet object.
/// Anyone can call entry functions directly from their wallet — no backend needed.
///
/// Deploy flow:
///   1. sui move publish → test_usdc::init creates TreasuryCap<TEST_USDC>
///   2. Publisher calls faucet::init_faucet(cap) → creates shared Faucet
///   3. Users call faucet::claim_test_usdc(faucet, clock) from wallet
///
/// ## Phase 2: Backend API (optional)
/// For production testnet with captcha/rate-limit, wrap in Express:
///   POST /api/faucet { address: "0x..." }
///   → signs & executes claim_test_usdc using deployer key
///   → returns { digest, amount }
module archa::faucet {
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, TreasuryCap};
    use sui::event;
    use archa::test_usdc::TEST_USDC;

    const E_COOLDOWN_ACTIVE: u64 = 1;

    /// Cooldown: 24 hours — serious rate-limited faucet
    const COOLDOWN_MS: u64 = 86_400_000;

    /// 500 TEST_USDC with 6 decimals = 500 * 10^6
    /// Enough for 1x join pool (12.5) + 5x deposits (50) + buffer
    const USDC_AMOUNT: u64 = 500_000_000;

    public struct Faucet has key {
        id: UID,
        usdc_cap: TreasuryCap<TEST_USDC>,
        last_claims: Table<address, u64>,
    }

    public struct Claimed has copy, drop {
        claimant: address,
        amount: u64,
        timestamp_ms: u64,
    }

    /// Initialize shared Faucet with TreasuryCap
    /// Called ONCE by deployer after publish
    public fun init_faucet(usdc_cap: TreasuryCap<TEST_USDC>, ctx: &mut TxContext) {
        let faucet = Faucet {
            id: object::new(ctx),
            usdc_cap,
            last_claims: table::new(ctx),
        };
        transfer::share_object(faucet);
    }

    /// Claim 500 TEST_USDC (30s cooldown per address)
    /// Call directly from frontend wallet or PTB:
    ///   tx.moveCall({ target: `${PACKAGE}::faucet::claim_test_usdc`,
    ///     arguments: [tx.object(FAUCET_ID), tx.object(CLOCK_ID)] })
    public fun claim_test_usdc(
        faucet: &mut Faucet,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let now = clock::timestamp_ms(clock);

        // Rate limit check
        if (table::contains(&faucet.last_claims, sender)) {
            let last = *table::borrow(&faucet.last_claims, sender);
            assert!(now >= last + COOLDOWN_MS, E_COOLDOWN_ACTIVE);
        };

        // Record claim time
        if (table::contains(&faucet.last_claims, sender)) {
            *table::borrow_mut(&mut faucet.last_claims, sender) = now;
        } else {
            table::add(&mut faucet.last_claims, sender, now);
        };

        // Mint TEST_USDC
        let coin = coin::mint(&mut faucet.usdc_cap, USDC_AMOUNT, ctx);
        transfer::public_transfer(coin, sender);

        event::emit(Claimed {
            claimant: sender,
            amount: USDC_AMOUNT,
            timestamp_ms: now,
        });
    }

    /// Get remaining cooldown for an address (in ms). 0 = can claim now.
    public fun cooldown_remaining(faucet: &Faucet, addr: address, clock: &Clock): u64 {
        if (!table::contains(&faucet.last_claims, addr)) {
            return 0
        };
        let last = *table::borrow(&faucet.last_claims, addr);
        let now = clock::timestamp_ms(clock);
        let elapsed = if (now > last) { now - last } else { 0 };
        if (elapsed >= COOLDOWN_MS) { 0 } else { COOLDOWN_MS - elapsed }
    }
}
