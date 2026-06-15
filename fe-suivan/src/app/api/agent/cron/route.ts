import { NextResponse } from "next/server";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex, fromBase64 } from "@mysten/sui/utils";
import { randomBytes } from "crypto";

const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
const USDC_TYPE = process.env.NEXT_PUBLIC_USDC_TYPE || `${PACKAGE_ID}::test_usdc::TEST_USDC`;
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY || "";

function getClient() {
  const net = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(net), network: net });
}

function parseSecretKey(raw: string): Uint8Array {
  if (raw.startsWith("suiprivkey")) {
    const bytes = fromBase64(raw.replace("suiprivkey", ""));
    return bytes.length >= 33 ? bytes.slice(1, 33) : bytes;
  }
  return fromHex(raw);
}

async function getPoolIds(): Promise<string[]> {
  if (!FACTORY_ID) return [];
  const client = getClient();
  const factoryObj = await client.getObject({ id: FACTORY_ID, options: { showContent: true } });
  const fields = (factoryObj.data?.content as { fields?: Record<string, unknown> })?.fields;
  const poolCount = Number((fields?.pool_count as string) || "0");
  if (poolCount === 0) return [];

  const tableId = (fields?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
  if (!tableId) return [];

  const ids: string[] = [];
  for (let i = 0; i < poolCount; i++) {
    const entry = await client.getDynamicFieldObject({ parentId: tableId, name: { type: "u64", value: String(i) } });
    const val = (entry.data?.content as { fields?: { value?: string } })?.fields?.value;
    if (val) ids.push(val);
  }
  return ids;
}

async function getPoolFields(poolId: string) {
  const client = getClient();
  const obj = await client.getObject({ id: poolId, options: { showContent: true } });
  return (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
}

async function getParticipantSnapshots(fields: Record<string, unknown>): Promise<{ address: string; active: boolean; deposited: boolean }[]> {
  const client = getClient();
  const rawList = fields.participant_list;
  const addresses: string[] = Array.isArray(rawList)
    ? rawList.map(String)
    : ((rawList as { fields?: { value?: { fields?: { value?: string } }[] } })?.fields?.value?.map((v) => String((v as { fields?: { value?: string } })?.fields?.value || v)) ?? []);
  const tableId = (fields.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
  if (!tableId) return [];

  return Promise.all(addresses.map(async (addr) => {
    const entry = await client.getDynamicFieldObject({ parentId: tableId, name: { type: "address", value: addr } });
    const raw = (entry.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
    const val = (raw as { fields?: Record<string, unknown> } | undefined)?.fields ?? raw;
    return { address: addr, active: Boolean(val?.is_active), deposited: Boolean(val?.deposits_this_cycle) };
  }));
}

async function executeTx(tx: Transaction, keypair: Ed25519Keypair) {
  const txBytes = await tx.build({ client: getClient() });
  const { bytes, signature } = await keypair.signTransaction(txBytes);
  return getClient().executeTransactionBlock({ transactionBlock: bytes, signature: [signature], options: { showEffects: true } });
}

export async function GET() {
  if (!AGENT_SECRET_KEY || AGENT_SECRET_KEY === "your_agent_private_key_hex") {
    return NextResponse.json({ error: "Agent not configured" }, { status: 501 });
  }

  const poolIds = await getPoolIds();
  if (poolIds.length === 0) return NextResponse.json({ message: "No pools found", results: {} });

  const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(AGENT_SECRET_KEY));
  const agentAddr = keypair.toSuiAddress();
  const results: Record<string, string[]> = {};

  for (const poolId of poolIds) {
    const fields = await getPoolFields(poolId);
    if (!fields) continue;
    const config = (fields.config as { fields?: Record<string, unknown> })?.fields;

    const started = Boolean(fields.is_started);
    const ended = Boolean(fields.is_ended);
    const full = Boolean(fields.is_full);
    const currentCycle = Number(fields.current_cycle || 0);
    const startTime = Number(fields.pool_start_time_ms || 0);
    const cycleMs = Number(config?.cycle_duration_ms || 0);

    const executed: string[] = [];

    if (!started && full) {
      // Need to start pool
      const caps = await getClient().getOwnedObjects({
        owner: agentAddr,
        filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
        options: { showContent: true },
      });
      const capObj = caps.data.find(c => {
        const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
        return String(f?.pool_id || "") === poolId;
      });
      if (capObj) {
        const tx = new Transaction();
        tx.setSender(agentAddr);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::start_pool`,
          arguments: [tx.object(capObj.data?.objectId || ""), tx.object(poolId), tx.object("0x6")],
          typeArguments: [USDC_TYPE],
        });
        tx.setGasBudget(30_000_000);
        const r = await executeTx(tx, keypair);
        if (r.effects?.status?.status === "success") executed.push("start_pool");
      }
    } else if (started && !ended) {
      // Check if cycle deadline passed
      const hasDeadline = startTime > 0 && currentCycle > 0 && cycleMs > 0;
      const deadlineMs = hasDeadline ? startTime + currentCycle * cycleMs : 0;
      const now = Date.now();
      if (deadlineMs > 0 && now >= deadlineMs) {
        const participants = await getParticipantSnapshots(fields);
        const missing = participants.filter(p => p.active && !p.deposited);

        // Get caps for slash / select_winner
        const caps = await getClient().getOwnedObjects({
          owner: agentAddr,
          filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
          options: { showContent: true },
        });
        const capObj = caps.data.find(c => {
          const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
          return String(f?.pool_id || "") === poolId;
        });
        const capId = capObj?.data?.objectId;
        if (!capId) continue;

        // Slash missing participants
        for (const p of missing) {
          const tx = new Transaction();
          tx.setSender(agentAddr);
          tx.moveCall({
            target: `${PACKAGE_ID}::arisan_pool::slash_collateral`,
            arguments: [tx.object(capId), tx.object(poolId), tx.pure.address(p.address), tx.object("0x6")],
            typeArguments: [USDC_TYPE],
          });
          tx.setGasBudget(30_000_000);
          const r = await executeTx(tx, keypair);
          if (r.effects?.status?.status === "success") executed.push(`slash:${p.address.slice(0, 6)}`);
        }

        // Select winner
        const tx = new Transaction();
        tx.setSender(agentAddr);
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
        tx.setGasBudget(50_000_000);
        const r = await executeTx(tx, keypair);
        if (r.effects?.status?.status === "success") executed.push("select_winner");
      }
    }

    if (executed.length > 0) results[poolId] = executed;
  }

  return NextResponse.json({ checked: poolIds.length, acted: Object.keys(results).length, results, timestamp: Date.now() });
}
