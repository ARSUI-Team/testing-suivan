import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { fromHex } from "@mysten/sui/utils";

let client: SuiClient | null = null;
function getClient() {
  if (!client) {
    client = new SuiClient({ url: getFullnodeUrl("testnet") });
  }
  return client;
}

const SPONSOR_SECRET_KEY = process.env.SPONSOR_SECRET_KEY || "";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0xff8500790272c409da1deddf45e46236d4d77a1a7d250ca7728a113d4fc08edf";
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "0xc47d988a84759e85a5386390e4eef4227bc5634c249a3493c16425ede16c1624";
const USDC_TYPE = process.env.NEXT_PUBLIC_USDC_TYPE || "0xff8500790272c409da1deddf45e46236d4d77a1a7d250ca7728a113d4fc08edf::test_usdc::TEST_USDC";

interface SponsorRequest {
  action: "join_pool" | "create_pool" | "make_deposit";
  userAddress: string;
  poolId?: string;
  usdcCoinId?: string;
  depositAmount?: number;
  maxParticipants?: number;
  cycleDurationDays?: number;
  collateralAmount?: number;
  amount?: number;
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

    const keypair = Ed25519Keypair.fromSecretKey(fromHex(SPONSOR_SECRET_KEY));
    const sponsorAddress = keypair.toSuiAddress();

    const tx = new Transaction();

    switch (action) {
      case "create_pool": {
        if (!body.usdcCoinId || !body.depositAmount || !body.maxParticipants || !body.cycleDurationDays) {
          return NextResponse.json({ error: "Missing create_pool params: usdcCoinId, depositAmount, maxParticipants, cycleDurationDays" }, { status: 400 });
        }
        const requiredCollateral = Math.ceil(body.depositAmount * (body.maxParticipants - 1) * 1.25);
        const [collateralCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(requiredCollateral * 1_000_000)]);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_factory::create_custom_pool`,
          arguments: [
            tx.object(FACTORY_ID),
            collateralCoin,
            tx.pure.u64(body.depositAmount * 1_000_000),
            tx.pure.u64(body.maxParticipants),
            tx.pure.u64(body.cycleDurationDays * 24 * 60 * 60 * 1000),
            tx.pure.u64(125),
          ],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "join_pool": {
        if (!body.poolId || !body.usdcCoinId || !body.collateralAmount) {
          return NextResponse.json({ error: "Missing join_pool params: poolId, usdcCoinId, collateralAmount" }, { status: 400 });
        }
        const [collateralCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(body.collateralAmount * 1_000_000)]);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::join_pool`,
          arguments: [tx.object(body.poolId), collateralCoin],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "make_deposit": {
        if (!body.poolId || !body.usdcCoinId || !body.amount) {
          return NextResponse.json({ error: "Missing make_deposit params: poolId, usdcCoinId, amount" }, { status: 400 });
        }
        const [depositCoin] = tx.splitCoins(tx.object(body.usdcCoinId), [tx.pure.u64(body.amount * 1_000_000)]);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::make_deposit`,
          arguments: [tx.object(body.poolId), depositCoin],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Supported: create_pool, join_pool, make_deposit` }, { status: 400 });
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
