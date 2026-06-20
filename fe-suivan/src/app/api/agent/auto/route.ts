import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { fromHex, fromBase64 } from "@mysten/sui/utils";
import { randomBytes } from "crypto";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6";
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "0x70a934372b9508ca92e8b0ed11ca4bfb0a42d17d27c6fb7838f195b5cc74714d";
const USDC_TYPE = `${PACKAGE_ID}::test_usdc::TEST_USDC`;
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY || "";

let lastRunAt = 0;
const MIN_INTERVAL_MS = 10_000;

const agentLog: Array<{ ts: number; msg: string }> = [];
function log(msg: string) {
  const entry = { ts: Date.now(), msg };
  agentLog.push(entry);
  if (agentLog.length > 100) agentLog.shift();
  console.log(`[AUTO-AGENT] ${msg}`);
}

function getClient() {
  const net = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(net), network: net });
}

function parseSecretKey(raw: string) {
  if (raw.startsWith("suiprivkey")) {
    const b = fromBase64(raw.replace("suiprivkey", ""));
    return b.length >= 33 ? b.slice(1, 33) : b;
  }
  return fromHex(raw);
}

async function executeTx(tx: Transaction, keypair: Ed25519Keypair) {
  const txBytes = await tx.build({ client: getClient() });
  const { bytes, signature } = await keypair.signTransaction(txBytes);
  return getClient().executeTransactionBlock({
    transactionBlock: bytes, signature: [signature], options: { showEffects: true },
  });
}

function isVersionConflict(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("needs to be rebuilt") || msg.includes("is unavailable for consumption") || msg.includes("InvalidTxVersion");
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function executeWithRetry(
  buildTx: () => Transaction,
  keypair: Ed25519Keypair,
  actionName: string,
  maxRetries = 3,
): Promise<{ success: boolean; digest?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const tx = buildTx();
      const r = await executeTx(tx, keypair);
      if (r.effects?.status?.status === "success") {
        return { success: true, digest: r.digest };
      }
      log(`${actionName} attempt ${attempt + 1}: tx failed — ${r.effects?.status?.error || "unknown error"}`);
      return { success: false };
    } catch (err) {
      if (isVersionConflict(err) && attempt < maxRetries) {
        const delay = 2000 + Math.random() * 2000 * (attempt + 1);
        log(`${actionName} attempt ${attempt + 1}: version conflict, retrying in ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }
      log(`${actionName} attempt ${attempt + 1}: fatal — ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
      return { success: false };
    }
  }
  return { success: false };
}

async function findPoolAdminCap(agentAddr: string, poolId: string) {
  const caps = await getClient().getOwnedObjects({
    owner: agentAddr,
    filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
    options: { showContent: true },
  });
  const found = caps.data.find(c => {
    const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
    const pid = ((f?.pool_id as { id?: string })?.id) || String(f?.pool_id || "");
    return pid === poolId;
  });
  return found?.data?.objectId || null;
}

// ─── Handle single pool ───

async function handlePool(poolId: string, keypair: Ed25519Keypair, agentAddr: string) {
  const client = getClient();
  const actions: string[] = [];

  const obj = await client.getObject({ id: poolId, options: { showContent: true } });
  const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
  if (!fields) return actions;

  const config = (fields.config as { fields?: Record<string, unknown> })?.fields;
  const started = Boolean(fields.is_started);
  const ended = Boolean(fields.is_ended);
  const isActive = Boolean(fields.is_active);
  const currentCycle = Number(fields.current_cycle || 0);
  const startTime = Number(fields.pool_start_time_ms || 0);
  const cycleMs = Number(config?.cycle_duration_ms || 0);
  const full = Boolean(fields.is_full);

  const capId = await findPoolAdminCap(agentAddr, poolId);

  // If not started and full → start
  if (!started && full && capId) {
    const r = await executeWithRetry(
      () => {
        const tx = new Transaction(); tx.setSender(agentAddr);
        tx.moveCall({
          target: `${PACKAGE_ID}::arisan_pool::start_pool`,
          arguments: [tx.object(capId), tx.object(poolId), tx.object("0x6")],
          typeArguments: [USDC_TYPE],
        });
        tx.setGasBudget(30_000_000);
        return tx;
      },
      keypair,
      `start_pool:${poolId.slice(0,6)}`,
    );
    if (r.success) actions.push("start_pool");
    return actions;
  }

  // If active, check deadline
  if (started && !ended && isActive && currentCycle > 0 && startTime > 0 && cycleMs > 0) {
    const deadlineMs = startTime + currentCycle * cycleMs;
    if (Date.now() < deadlineMs) return actions; // deadline not reached

    // Get participant snapshots for slash
    const rawList = fields.participant_list;
    const addresses: string[] = Array.isArray(rawList) ? rawList.map(String)
      : ((rawList as { fields?: { value?: { fields?: { value?: string } }[] } })?.fields?.value?.map(
        (v: unknown) => String((v as { fields?: { value?: string } })?.fields?.value || v)
      ) ?? []);
    const tableId = (fields.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;

    if (tableId && capId) {
      const participants = await Promise.all(
        addresses.map(async (addr) => {
          const e = await client.getDynamicFieldObject({
            parentId: tableId, name: { type: "address", value: addr },
          });
          const raw = (e.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
          const val = (raw as { fields?: Record<string, unknown> } | undefined)?.fields ?? raw;
          return { address: addr, active: Boolean(val?.is_active), deposited: Boolean(val?.deposits_this_cycle) };
        }),
      );
      const missing = participants.filter(p => p.active && !p.deposited);

      for (const p of missing) {
        const r = await executeWithRetry(
          () => {
            const tx = new Transaction(); tx.setSender(agentAddr);
            tx.moveCall({
              target: `${PACKAGE_ID}::arisan_pool::slash_collateral`,
              arguments: [tx.object(capId), tx.object(poolId), tx.pure.address(p.address), tx.object("0x6")],
              typeArguments: [USDC_TYPE],
            });
            tx.setGasBudget(20_000_000);
            return tx;
          },
          keypair,
          `slash:${poolId.slice(0,6)}:${p.address.slice(0,6)}`,
        );
        if (r.success) actions.push(`slash:${p.address.slice(0, 6)}`);
      }
    }

    // Select winner
    if (capId) {
      const r = await executeWithRetry(
        () => {
          const tx = new Transaction(); tx.setSender(agentAddr);
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
          return tx;
        },
        keypair,
        `select_winner:${poolId.slice(0,6)}`,
      );
      if (r.success) actions.push("select_winner");
    }
  }

  return actions;
}

// ─── GET: auto-run all pools ───

export async function GET() {
  if (!AGENT_SECRET_KEY || AGENT_SECRET_KEY === "your_agent_private_key_hex") {
    return NextResponse.json({ error: "Agent not configured" }, { status: 501 });
  }

  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return NextResponse.json({ error: "Rate limited", retryAfterMs: MIN_INTERVAL_MS - (now - lastRunAt) }, { status: 429 });
  }
  lastRunAt = now;

  try {
    const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(AGENT_SECRET_KEY));
    const agentAddr = keypair.toSuiAddress();
    log(`Starting scan — agent: ${agentAddr.slice(0, 6)}`);

    // Get all pool IDs from factory
  const factoryObj = await getClient().getObject({ id: FACTORY_ID, options: { showContent: true } });
  const ff = (factoryObj.data?.content as { fields?: Record<string, unknown> })?.fields;
  const poolCount = Number((ff?.pool_count as string) || "0");
  if (poolCount === 0) return NextResponse.json({ message: "No pools", results: {} });

  const tableId = (ff?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
  if (!tableId) return NextResponse.json({ message: "No pools table", results: {} });

  const poolIds: string[] = [];
  for (let i = 0; i < poolCount; i++) {
    const e = await getClient().getDynamicFieldObject({ parentId: tableId, name: { type: "u64", value: String(i) } });
    const v = (e.data?.content as { fields?: { value?: string } })?.fields?.value;
    if (v) poolIds.push(v);
  }

  const results: Record<string, string[]> = {};
  for (const pid of poolIds) {
    try {
      const actions = await handlePool(pid, keypair, agentAddr);
      if (actions.length > 0) {
        results[pid] = actions;
        log(`Pool ${pid.slice(0, 6)} ← ${actions.join(", ")}`);
      }
    } catch (e) {
      log(`Pool ${pid.slice(0, 6)} error: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  }

  log(`Scan complete — checked ${poolIds.length}, acted ${Object.keys(results).length}`);
  return NextResponse.json({
    checked: poolIds.length,
    acted: Object.keys(results).length,
    results,
    agentLog: agentLog.slice(-20),
    timestamp: Date.now(),
  });
  } catch (e) {
    log(`FATAL: ${e instanceof Error ? e.message : "Unknown"}`);
    return NextResponse.json({ error: "Agent scan failed", detail: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

// ─── POST: single pool manual trigger ───

export async function POST(req: NextRequest) {
  if (!AGENT_SECRET_KEY || AGENT_SECRET_KEY === "your_agent_private_key_hex") {
    return NextResponse.json({ error: "Agent not configured" }, { status: 501 });
  }

  const { poolId, action } = await req.json().catch(() => ({}));
  if (!poolId || !action) {
    return NextResponse.json({ error: "poolId and action required" }, { status: 400 });
  }

  const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(AGENT_SECRET_KEY));
  const agentAddr = keypair.toSuiAddress();
  const capId = await findPoolAdminCap(agentAddr, poolId);

  if (!capId) {
    return NextResponse.json({ error: "PoolAdminCap not delegated to agent" }, { status: 403 });
  }

  const tx = new Transaction(); tx.setSender(agentAddr);

  if (action === "start_pool") {
    tx.moveCall({
      target: `${PACKAGE_ID}::arisan_pool::start_pool`,
      arguments: [tx.object(capId), tx.object(poolId), tx.object("0x6")],
      typeArguments: [USDC_TYPE],
    });
  } else if (action === "select_winner") {
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
  } else {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  tx.setGasBudget(50_000_000);
  const result = await executeTx(tx, keypair);

  if (result.effects?.status?.status !== "success") {
    return NextResponse.json({ ok: false, error: result.effects?.status?.error, digest: result.digest }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action, digest: result.digest });
}
