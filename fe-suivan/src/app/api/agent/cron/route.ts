import { NextResponse } from "next/server";

const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";

async function getPoolIds(): Promise<string[]> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${site}/api/pools/list`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.poolIds as string[]) || [];
  } catch {
    return [];
  }
}

async function getAutomationStatus(poolId: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${site}/api/automation/status?poolId=${poolId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function executeAction(poolId: string, action: string, participant?: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${site}/api/agent/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolId, action, participantAddress: participant }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const results: Record<string, unknown[]> = {};
  const poolIds = await getPoolIds();

  if (poolIds.length === 0) {
    return NextResponse.json({ message: "No pools found", results: {} });
  }

  for (const poolId of poolIds) {
    const status = await getAutomationStatus(poolId);
    if (!status?.recommendedTransactions?.length) continue;

    const executed: string[] = [];
    for (const rec of status.recommendedTransactions as Array<{ function: string; participant?: string; runAfterSlashing?: boolean }>) {
      let action = rec.function;

      if (action === "start_pool") {
        const ok = await executeAction(poolId, "start_pool");
        if (ok) executed.push("start_pool");
      } else if (action === "slash_collateral" && rec.participant) {
        const ok = await executeAction(poolId, "slash_collateral", rec.participant);
        if (ok) executed.push(`slash_collateral:${rec.participant.slice(0, 6)}`);
      } else if (action === "select_winner") {
        const ok = await executeAction(poolId, "select_winner");
        if (ok) executed.push("select_winner");
      }
    }

    if (executed.length > 0) {
      results[poolId] = executed;
    }
  }

  return NextResponse.json({
    checked: poolIds.length,
    acted: Object.keys(results).length,
    results,
    timestamp: Date.now(),
  });
}
