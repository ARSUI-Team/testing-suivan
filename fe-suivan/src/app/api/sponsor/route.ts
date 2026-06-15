import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { fromHex, fromBase64 } from "@mysten/sui/utils";
import { randomBytes } from "crypto";
import { getRequiredCollateralAmount } from "@/lib/poolMath";
import { checkRateLimit, checkReplayAttack, validateSponsorRequest } from "@/lib/rateLimiter";

let client: SuiJsonRpcClient | null = null;
function getClient() {
  if (!client) {
    client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" });
  }
  return client;
}

function parseSecretKey(raw: string): Uint8Array {
  if (raw.startsWith("suiprivkey")) {
    const bytes = fromBase64(raw.replace("suiprivkey", ""));
    return bytes.length >= 33 ? bytes.slice(1, 33) : bytes;
  }
  return fromHex(raw);
}

const SPONSOR_SECRET_KEY = process.env.SPONSOR_SECRET_KEY || "";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6";

const USDC_TYPE = process.env.NEXT_PUBLIC_USDC_TYPE || "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_usdc::TEST_USDC";
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558";
const FAUCET_ID = process.env.NEXT_PUBLIC_FAUCET_ID || "0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4";

const MAX_GAS_BUDGET = 50_000_000;

interface SponsorRequest {
  action: "claim_usdc" | "join_pool" | "create_pool" | "make_deposit" | "start_pool" | "select_winner" | "end_pool" | "slash_collateral";
  userAddress: string;
  poolId?: string;
  usdcCoinId?: string;
  depositAmount?: number;
  maxParticipants?: number;
  cycleDurationDays?: number;
  cycleDurationMs?: number;
  collateralAmount?: number;
  amount?: number;
  poolAdminCapId?: string;
  participantAddress?: string;
  nonce?: string;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    if (!SPONSOR_SECRET_KEY || SPONSOR_SECRET_KEY === "your_ed25519_private_key_hex") {
      return NextResponse.json({ error: "Sponsor not configured. Set SPONSOR_SECRET_KEY env var." }, { status: 501 });
    }

    const body: SponsorRequest = await req.json();

    const validationError = validateSponsorRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { action, userAddress } = body;

    const clientIp = getClientIp(req);

    const rateResult = checkRateLimit(clientIp, userAddress, action);
    if (!rateResult.ok) {
      return NextResponse.json(
        { error: rateResult.error, retryAfterMs: rateResult.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) } },
      );
    }

    if (body.nonce) {
      if (!checkReplayAttack(`${userAddress}:${body.nonce}`)) {
        return NextResponse.json({ error: "Replay detected: nonce already used" }, { status: 409 });
      }
    }

    const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(SPONSOR_SECRET_KEY));
    const sponsorAddress = keypair.toSuiAddress();

    const tx = new Transaction();

    switch (action) {
      case "claim_usdc": {
        tx.moveCall({
          target: `${PACKAGE_ID}::faucet::claim_test_usdc`,
          arguments: [tx.object(FAUCET_ID), tx.object("0x6")],
        });
        break;
      }

      case "create_pool": {
        if (!body.usdcCoinId || !body.depositAmount || !body.maxParticipants) {
          return NextResponse.json({ error: "Missing create_pool params: usdcCoinId, depositAmount, maxParticipants" }, { status: 400 });
        }
        const cycleMs = body.cycleDurationMs || (body.cycleDurationDays || 0) * 24 * 60 * 60 * 1000;
        if (!cycleMs) {
          return NextResponse.json({ error: "Missing cycleDurationMs or cycleDurationDays" }, { status: 400 });
        }
        const requiredCollateral = getRequiredCollateralAmount(body.depositAmount, body.maxParticipants, 125);
        const [collateralCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(requiredCollateral * 1_000_000)]);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_factory::create_custom_pool`,
          arguments: [
            tx.object(FACTORY_ID),
            collateralCoin,
            tx.pure.u64(body.depositAmount! * 1_000_000),
            tx.pure.u64(body.maxParticipants!),
            tx.pure.u64(cycleMs),
            tx.pure.u64(125),
          ],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "join_pool": {
        const [collateralCoin] = tx.splitCoins(tx.object(body.usdcCoinId!), [tx.pure.u64(body.collateralAmount! * 1_000_000)]);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::join_pool`,
          arguments: [tx.object(body.poolId!), collateralCoin],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "make_deposit": {
        const [depositCoin] = tx.splitCoins(tx.object(body.usdcCoinId!), [tx.pure.u64(body.amount! * 1_000_000)]);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::make_deposit`,
          arguments: [tx.object(body.poolId!), depositCoin],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "start_pool": {
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::start_pool`,
          arguments: [
            tx.object(body.poolAdminCapId!),
            tx.object(body.poolId!),
            tx.object("0x6"),
          ],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "select_winner": {
        const seed = Array.from(randomBytes(16));
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::set_pool_seal_seed`,
          arguments: [
            tx.object(body.poolAdminCapId!),
            tx.object(body.poolId!),
            tx.pure(seed),
          ],
          typeArguments: [USDC_TYPE],
        });
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::select_winner`,
          arguments: [
            tx.object(body.poolAdminCapId!),
            tx.object(body.poolId!),
            tx.object("0x6"),
            tx.object("0x8"),
          ],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "end_pool": {
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::end_pool`,
          arguments: [
            tx.object(body.poolAdminCapId!),
            tx.object(body.poolId!),
            tx.object("0x8"),
          ],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "slash_collateral": {
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::slash_collateral`,
          arguments: [
            tx.object(body.poolAdminCapId!),
            tx.object(body.poolId!),
            tx.pure.address(body.participantAddress!),
            tx.object("0x6"),
          ],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      default:
        return NextResponse.json({
          error: `Unknown action: ${action}. Supported: claim_usdc, create_pool, join_pool, make_deposit, start_pool, select_winner, end_pool, slash_collateral`,
        }, { status: 400 });
    }

    tx.setSender(userAddress);
    tx.setGasOwner(sponsorAddress);
    tx.setGasBudget(MAX_GAS_BUDGET);

    const txBytes = await tx.build({ client: getClient() });

    const { bytes, signature } = await keypair.signTransaction(txBytes);

    const result = await getClient().executeTransactionBlock({
      transactionBlock: bytes,
      signature: [signature],
      options: { showEffects: true },
    });

    if (result.effects?.status?.status !== "success") {
      return NextResponse.json({
        error: `Transaction failed: ${result.effects?.status?.error || "Unknown error"}`,
        digest: result.digest,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      digest: result.digest,
      sponsor: sponsorAddress,
    });
  } catch (err) {
    console.error("Sponsor error:", err);
    const message = err instanceof Error ? err.message : "Sponsor error";
    if (message.includes("upgrade") || message.includes("503")) {
      return NextResponse.json({ error: "Sui RPC unavailable. Try again later." }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
