import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { fromHex, fromBase64 } from "@mysten/sui/utils";
import { getRequiredCollateralAmount } from "@/lib/poolMath";
import {
  SUI_FACTORY_ID,
  SUI_FAUCET_ID,
  SUI_NETWORK,
  SUI_PACKAGE_ID,
  SUI_USDC_TYPE,
} from "@/config/suiConstants";

let client: SuiJsonRpcClient | null = null;
function getClient() {
  if (!client) {
    client = new SuiJsonRpcClient({
      url: getJsonRpcFullnodeUrl(SUI_NETWORK),
      network: SUI_NETWORK,
    });
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

interface SponsorRequest {
  action: "claim_usdc" | "join_pool" | "create_pool" | "make_deposit" | "start_pool" | "select_winner" | "end_pool" | "slash_collateral";
  userAddress: string;
  poolId?: string;
  usdcCoinId?: string;
  depositAmount?: number;
  maxParticipants?: number;
  cycleDurationDays?: number;
  collateralAmount?: number;
  amount?: number;
  poolAdminCapId?: string;
  participantAddress?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!SPONSOR_SECRET_KEY) {
      return NextResponse.json({ error: "Sponsor not configured. Set SPONSOR_SECRET_KEY env var." }, { status: 501 });
    }

    const body: SponsorRequest = await req.json();
    const { action, userAddress } = body;

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress required" }, { status: 400 });
    }

    const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(SPONSOR_SECRET_KEY));
    const sponsorAddress = keypair.toSuiAddress();

    const tx = new Transaction();

    switch (action) {
      case "claim_usdc": {
        if (SUI_NETWORK === "mainnet" || !SUI_FAUCET_ID) {
          return NextResponse.json(
            { error: "The test token faucet is disabled on mainnet." },
            { status: 400 },
          );
        }
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::faucet::claim_test_usdc`,
          arguments: [tx.object(SUI_FAUCET_ID), tx.object("0x6")],
        });
        break;
      }

      case "create_pool": {
        if (!body.usdcCoinId || !body.depositAmount || !body.maxParticipants || !body.cycleDurationDays) {
          return NextResponse.json({ error: "Missing create_pool params: usdcCoinId, depositAmount, maxParticipants, cycleDurationDays" }, { status: 400 });
        }
        const requiredCollateral = getRequiredCollateralAmount(body.depositAmount, body.maxParticipants, 125);
        const [collateralCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(requiredCollateral * 1_000_000)]);
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_factory::create_custom_pool`,
          arguments: [
            tx.object(SUI_FACTORY_ID),
            collateralCoin,
            tx.pure.u64(body.depositAmount * 1_000_000),
            tx.pure.u64(body.maxParticipants),
            tx.pure.u64(body.cycleDurationDays * 24 * 60 * 60 * 1000),
            tx.pure.u64(125),
          ],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      case "join_pool": {
        if (!body.poolId || !body.usdcCoinId || !body.collateralAmount) {
          return NextResponse.json({ error: "Missing join_pool params: poolId, usdcCoinId, collateralAmount" }, { status: 400 });
        }
        const [collateralCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(body.collateralAmount * 1_000_000)]);
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_pool::join_pool`,
          arguments: [tx.object(body.poolId), collateralCoin],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      case "make_deposit": {
        if (!body.poolId || !body.usdcCoinId || !body.amount) {
          return NextResponse.json({ error: "Missing make_deposit params: poolId, usdcCoinId, amount" }, { status: 400 });
        }
        const [depositCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(body.amount * 1_000_000)]);
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_pool::make_deposit`,
          arguments: [tx.object(body.poolId), depositCoin],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      case "start_pool": {
        if (!body.poolId || !body.poolAdminCapId) {
          return NextResponse.json({ error: "Missing start_pool params: poolId, poolAdminCapId" }, { status: 400 });
        }
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_pool::start_pool`,
          arguments: [
            tx.object(body.poolAdminCapId),
            tx.object(body.poolId),
            tx.object("0x6"),
          ],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      case "select_winner": {
        if (!body.poolId || !body.poolAdminCapId) {
          return NextResponse.json({ error: "Missing select_winner params: poolId, poolAdminCapId" }, { status: 400 });
        }
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_pool::select_winner`,
          arguments: [
            tx.object(body.poolAdminCapId),
            tx.object(body.poolId),
            tx.object("0x6"),
            tx.object("0x8"),
          ],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      case "end_pool": {
        if (!body.poolId || !body.poolAdminCapId) {
          return NextResponse.json({ error: "Missing end_pool params: poolId, poolAdminCapId" }, { status: 400 });
        }
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_pool::end_pool`,
          arguments: [
            tx.object(body.poolAdminCapId),
            tx.object(body.poolId),
            tx.object("0x8"),
          ],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      case "slash_collateral": {
        if (!body.poolId || !body.poolAdminCapId || !body.participantAddress) {
          return NextResponse.json({ error: "Missing slash_collateral params: poolId, poolAdminCapId, participantAddress" }, { status: 400 });
        }
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::arisan_pool::slash_collateral`,
          arguments: [
            tx.object(body.poolAdminCapId),
            tx.object(body.poolId),
            tx.pure.address(body.participantAddress),
            tx.object("0x6"),
          ],
          typeArguments: [SUI_USDC_TYPE],
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Supported: claim_usdc, create_pool, join_pool, make_deposit, start_pool, select_winner, end_pool, slash_collateral` }, { status: 400 });
    }

    tx.setSender(userAddress);
    tx.setGasOwner(sponsorAddress);
    tx.setGasBudget(10_000_000);

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
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      digest: result.digest,
      sponsor: sponsorAddress,
    });
  } catch (err) {
    console.error("Sponsor error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Sponsor error",
    }, { status: 500 });
  }
}
