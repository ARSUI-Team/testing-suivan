import { NextResponse } from "next/server";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SUI_AGENT_ADDRESS, SUI_PACKAGE_ID } from "@/config/suiConstants";
import { derivePoolLifecycle } from "@/lib/poolLifecycle";

type ParticipantSnapshot = {
  address: string;
  active: boolean;
  depositedThisCycle: boolean;
};

function getNetwork() {
  return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

function readParticipantList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  const nested = (value as { fields?: { value?: unknown[] } })?.fields?.value;
  return Array.isArray(nested) ? nested.map(String) : [];
}

export async function GET(request: Request) {
  const poolId = new URL(request.url).searchParams.get("poolId");
  if (!poolId) {
    return NextResponse.json({ error: "poolId query parameter is required" }, { status: 400 });
  }

  try {
    const network = getNetwork();
    const client = new SuiJsonRpcClient({
      network,
      url: getJsonRpcFullnodeUrl(network),
    });
    const poolObject = await client.getObject({
      id: poolId,
      options: { showContent: true },
    });
    const fields = (poolObject.data?.content as { fields?: Record<string, unknown> })?.fields;
    if (!fields) {
      return NextResponse.json({ error: "Pool object not found" }, { status: 404 });
    }

    const config = (fields.config as { fields?: Record<string, unknown> })?.fields;
    const participantAddresses = readParticipantList(fields.participant_list);
    const participantsTableId =
      (fields.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;

    const participants: ParticipantSnapshot[] = participantsTableId
      ? await Promise.all(
          participantAddresses.map(async (address) => {
            const participantObject = await client.getDynamicFieldObject({
              parentId: participantsTableId,
              name: { type: "address", value: address },
            });
            const rawValue = (
              participantObject.data?.content as {
                fields?: { value?: Record<string, unknown> };
              }
            )?.fields?.value;
            const value =
              (rawValue as { fields?: Record<string, unknown> } | undefined)?.fields ??
              rawValue;
            return {
              address,
              active: Boolean(value?.is_active),
              depositedThisCycle: Boolean(value?.deposits_this_cycle),
            };
          }),
        )
      : [];

    const lifecycle = derivePoolLifecycle({
      started: Boolean(fields.is_started),
      active: Boolean(fields.is_active),
      ended: Boolean(fields.is_ended),
      full: Boolean(fields.is_full),
      currentCycle: Number(fields.current_cycle || 0),
      poolStartTimeMs: Number(fields.pool_start_time_ms || 0),
      cycleDurationMs: Number(config?.cycle_duration_ms || 0),
    });
    const missingDeposits = participants
      .filter((participant) => participant.active && !participant.depositedThisCycle)
      .map((participant) => participant.address);

    const recommendedTransactions: Array<Record<string, unknown>> = [];
    if (lifecycle.nextAction === "start_pool") {
      recommendedTransactions.push({ function: "start_pool", requiresAdminCap: true });
    } else if (lifecycle.nextAction === "resolve_cycle") {
      for (const participant of missingDeposits) {
        recommendedTransactions.push({
          function: "slash_collateral",
          participant,
          requiresAdminCap: true,
        });
      }
      recommendedTransactions.push({
        function: "select_winner",
        requiresAdminCap: true,
        runAfterSlashing: missingDeposits.length > 0,
      });
    }

    const agentCaps = await client.getOwnedObjects({
      owner: SUI_AGENT_ADDRESS,
      filter: { StructType: `${SUI_PACKAGE_ID}::arisan_pool::PoolAdminCap` },
      options: { showContent: true },
    });
    const delegatedToAgent = agentCaps.data.some((cap) => {
      const capFields = (cap.data?.content as { fields?: Record<string, unknown> })?.fields;
      return String(capFields?.pool_id || "") === poolId;
    });

    return NextResponse.json({
      poolId,
      network,
      checkedAtMs: Date.now(),
      lifecycle,
      activeParticipants: participants.filter((participant) => participant.active).length,
      depositedParticipants: participants.filter(
        (participant) => participant.active && participant.depositedThisCycle,
      ).length,
      missingDeposits,
      delegatedToAgent,
      recommendedTransactions,
      executionMode: "planner_only",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect pool";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
