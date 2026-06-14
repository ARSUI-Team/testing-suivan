"use client";

import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SUI_FACTORY_ID } from "@/config/sui";
import { derivePoolLifecycle, type PoolLifecycleStatus } from "@/lib/poolLifecycle";

export interface PublicPool {
  id: number;
  address: string;
  name: string;
  depositAmount: number;
  maxParticipants: number;
  currentParticipants: number;
  cycleDuration: number;
  totalFunds: number;
  collateralBalance: number;
  status: PoolLifecycleStatus;
  apy: number;
  currentCycle: number;
  walrusMetadataBlobId: string;
}

interface ParsedPool {
  id: string;
  depositAmount: number;
  maxParticipants: number;
  currentParticipants: number;
  cycle: number;
  started: boolean;
  active: boolean;
  isFull: boolean;
  isEnded: boolean;
  totalFunds: number;
  collateralBalance: number;
  pendingWinnerPayouts: number;
  yield: number;
  cycleDurationMs: number;
  poolStartTimeMs: number;
  walrusMetadataBlobId: string;
}

function getPublicSuiClient() {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const url = network === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";
  return new SuiJsonRpcClient({ url, network });
}

function readBalance(value: unknown): number {
  if (typeof value === "string" || typeof value === "number") return Number(value || 0);
  return Number(((value as { fields?: { value?: string } })?.fields?.value) || 0);
}

function parsePoolFields(fields: Record<string, unknown>): ParsedPool | null {
  try {
    const id = ((fields?.id as { id?: string })?.id) || String(fields?.id || "");
    const config = (fields?.config as { fields?: Record<string, unknown> })?.fields;
    const rawList = fields?.participant_list;
    const participantList: unknown[] = Array.isArray(rawList)
      ? rawList
      : ((rawList as { fields?: { value?: unknown[] } })?.fields?.value ?? []);

    return {
      id,
      depositAmount: Number((config?.deposit_amount as string) || 0) / 1_000_000,
      maxParticipants: Number((config?.max_participants as string) || 0),
      currentParticipants: participantList.length,
      cycle: Number((fields?.current_cycle as string) || 0),
      started: Boolean(fields?.is_started),
      active: Boolean(fields?.is_active),
      isFull: Boolean(fields?.is_full),
      isEnded: Boolean(fields?.is_ended),
      totalFunds: readBalance(fields?.pool_funds_balance) / 1_000_000,
      collateralBalance: readBalance(fields?.collateral_balance) / 1_000_000,
      pendingWinnerPayouts: readBalance(fields?.winner_payout_balance) / 1_000_000,
      yield: readBalance(fields?.yield_balance) / 1_000_000,
      cycleDurationMs: Number((config?.cycle_duration_ms as string) || 0),
      poolStartTimeMs: Number((fields?.pool_start_time_ms as string) || 0),
      walrusMetadataBlobId: String((fields?.walrus_metadata_blob_id as string) || ""),
    };
  } catch {
    return null;
  }
}

function formatPool(pool: ParsedPool, index: number): PublicPool {
  const { status } = derivePoolLifecycle({
    started: pool.started,
    active: pool.active,
    ended: pool.isEnded,
    full: pool.isFull,
    currentCycle: pool.cycle,
    poolStartTimeMs: pool.poolStartTimeMs,
    cycleDurationMs: pool.cycleDurationMs,
  });

  let name = "Custom Pool";
  if (pool.depositAmount === 10) name = "Small Pool";
  else if (pool.depositAmount === 50) name = "Medium Pool";
  else if (pool.depositAmount === 100) name = "Large Pool";

  const apy = pool.totalFunds > 0 ? (pool.yield / pool.totalFunds) * 100 * 12 : 8.5;

  return {
    id: index + 1,
    address: pool.id,
    name,
    depositAmount: pool.depositAmount,
    maxParticipants: pool.maxParticipants,
    currentParticipants: pool.currentParticipants,
    cycleDuration: pool.cycleDurationMs > 0 ? Math.round(pool.cycleDurationMs / 86_400_000) : 30,
    totalFunds: pool.totalFunds + pool.collateralBalance + pool.pendingWinnerPayouts,
    collateralBalance: pool.collateralBalance,
    status,
    apy: Math.round(apy * 10) / 10,
    currentCycle: pool.cycle,
    walrusMetadataBlobId: pool.walrusMetadataBlobId,
  };
}

export function usePublicPoolsWithInfo() {
  const client = useMemo(() => getPublicSuiClient(), []);

  const { data: poolAddresses, isLoading: addressLoading } = useQuery({
    queryKey: ["suivan", "publicPoolAddresses"],
    queryFn: async () => {
      if (!SUI_FACTORY_ID) return [];
      const factoryObj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });
      const factoryFields = (factoryObj.data?.content as { fields?: Record<string, unknown> } | undefined)?.fields;
      const poolCount = Number((factoryFields?.pool_count as string) || "0");
      const allPoolsTableId = (factoryFields?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
      if (!poolCount || !allPoolsTableId) return [];

      const ids: string[] = [];
      for (let i = 0; i < poolCount; i++) {
        try {
          const entry = await client.getDynamicFieldObject({
            parentId: allPoolsTableId,
            name: { type: "u64", value: String(i) },
          });
          const value = (entry.data?.content as { fields?: { value?: string } })?.fields?.value;
          if (value) ids.push(value);
        } catch {
          // Missing dynamic fields should not block rendering public pool data.
        }
      }
      return ids;
    },
    enabled: !!SUI_FACTORY_ID,
  });

  const { data: pools, isLoading: poolLoading } = useQuery({
    queryKey: ["suivan", "publicPoolsInfo", poolAddresses],
    queryFn: async () => {
      if (!poolAddresses?.length) return [];
      const results = await Promise.allSettled(
        poolAddresses.map((id) => client.getObject({ id, options: { showContent: true } })),
      );
      return results
        .map((result, index) => {
          if (result.status !== "fulfilled") return null;
          const fields = (result.value.data?.content as { fields?: Record<string, unknown> })?.fields;
          const pool = parsePoolFields(fields ?? {});
          return pool ? formatPool(pool, index) : null;
        })
        .filter((pool): pool is PublicPool => pool !== null);
    },
    enabled: !!poolAddresses?.length,
  });

  return {
    pools,
    isLoading: addressLoading || poolLoading,
  };
}
