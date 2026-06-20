import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { fromHex, fromBase64 } from "@mysten/sui/utils";
import { randomBytes } from "crypto";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY || "";
const USDC_TYPE = process.env.NEXT_PUBLIC_USDC_TYPE || `${PACKAGE_ID}::test_usdc::TEST_USDC`;

let client: SuiJsonRpcClient | null = null;
function getClient() {
  if (!client) {
    const net = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
    client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(net), network: net });
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

async function executeTx(tx: Transaction, keypair: Ed25519Keypair) {
  const txBytes = await tx.build({ client: getClient() });
  const { bytes, signature } = await keypair.signTransaction(txBytes);
  return getClient().executeTransactionBlock({
    transactionBlock: bytes,
    signature: [signature],
    options: { showEffects: true },
  });
}

export async function POST(req: NextRequest) {
  if (!AGENT_SECRET_KEY || AGENT_SECRET_KEY === "your_agent_private_key_hex") {
    return NextResponse.json({ error: "Agent not configured" }, { status: 501 });
  }

  try {
    const { poolId, action, participantAddress } = await req.json();

    if (!poolId || !action) {
      return NextResponse.json({ error: "poolId and action required" }, { status: 400 });
    }

    const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(AGENT_SECRET_KEY));
    const agentAddr = keypair.toSuiAddress();
    const slashes: string[] = [];

    const tx = new Transaction();
    tx.setSender(agentAddr);

    switch (action) {
      case "start_pool": {
        const caps = await getClient().getOwnedObjects({
          owner: agentAddr,
          filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
          options: { showContent: true },
        });
        const capObj = caps.data.find(c => {
          const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
          return String(f?.pool_id || "") === poolId;
        });
        if (!capObj) return NextResponse.json({ error: "PoolAdminCap not delegated to agent" }, { status: 403 });

        const capId = capObj.data?.objectId || "";
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::start_pool`,
          arguments: [tx.object(capId), tx.object(poolId), tx.object("0x6")],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "select_winner": {
        const caps = await getClient().getOwnedObjects({
          owner: agentAddr,
          filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
          options: { showContent: true },
        });
        const capObj = caps.data.find(c => {
          const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
          return String(f?.pool_id || "") === poolId;
        });
        const capId = capObj?.data?.objectId || "";

        const poolObj = await getClient().getObject({ id: poolId, options: { showContent: true } });
        const fields = (poolObj.data?.content as { fields?: Record<string, unknown> })?.fields;
        const rawList = fields?.participant_list;
        const addresses: string[] = Array.isArray(rawList) ? rawList.map(String)
          : ((rawList as { fields?: { value?: string[] } })?.fields?.value ?? []);
        const tableId = (fields?.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;

        if (tableId) {
          for (const addr of addresses) {
            try {
              const e = await getClient().getDynamicFieldObject({
                parentId: tableId, name: { type: "address", value: addr },
              });
              const pv = (e.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
              if (pv && Boolean(pv.is_active) && !Boolean(pv.deposits_this_cycle)) {
                const slashTx = new Transaction(); slashTx.setSender(agentAddr);
                slashTx.moveCall({
                  target: `${PACKAGE_ID}::arisan_pool::slash_collateral`,
                  arguments: [slashTx.object(capId), slashTx.object(poolId), slashTx.pure.address(addr), slashTx.object("0x6")],
                  typeArguments: [USDC_TYPE],
                });
                slashTx.setGasBudget(20_000_000);
                const sr = await executeTx(slashTx, keypair);
                if (sr.effects?.status?.status === "success") slashes.push(`slash:${addr.slice(0, 6)}`);
              }
            } catch { /* skip */ }
          }
        }

        const seed = Array.from(randomBytes(16));
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::set_pool_seal_seed`,
          arguments: [tx.object(capId), tx.object(poolId), tx.pure.vector("u8", seed)],
          typeArguments: [USDC_TYPE],
        });
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::select_winner`,
          arguments: [tx.object(capId), tx.object(poolId), tx.object("0x6"), tx.object("0x8")],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "slash_collateral": {
        if (!participantAddress) return NextResponse.json({ error: "participantAddress required for slash" }, { status: 400 });
        const caps = await getClient().getOwnedObjects({
          owner: agentAddr,
          filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
          options: { showContent: true },
        });
        const capObj = caps.data.find(c => {
          const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
          return String(f?.pool_id || "") === poolId;
        });
        const capId = capObj?.data?.objectId || "";

        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::slash_collateral`,
          arguments: [tx.object(capId), tx.object(poolId), tx.pure.address(participantAddress), tx.object("0x6")],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      case "end_pool": {
        const caps = await getClient().getOwnedObjects({
          owner: agentAddr,
          filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
          options: { showContent: true },
        });
        const capObj = caps.data.find(c => {
          const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
          return String(f?.pool_id || "") === poolId;
        });
        const capId = capObj?.data?.objectId || "";

        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::end_pool`,
          arguments: [tx.object(capId), tx.object(poolId), tx.object("0x8")],
          typeArguments: [USDC_TYPE],
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    tx.setGasBudget(50_000_000);
    const result = await executeTx(tx, keypair);

    if (result.effects?.status?.status !== "success") {
      return NextResponse.json({
        ok: false,
        error: result.effects?.status?.error || "Tx failed",
        digest: result.digest,
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action, digest: result.digest, slashesLength: slashes.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
