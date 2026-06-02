"use client";

import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { SUI_FACTORY_ID, SUI_PACKAGE_ID } from "@/config/sui";
import { useAllPoolsWithInfo } from "@/hooks/useSuiContracts";

export interface LeaderboardEntry {
  rank: number;
  address: string;
  tier: "diamond" | "platinum" | "gold" | "silver" | "bronze";
  points: number;
  onTimeRate: number;
  totalYield: number;
  monthlyYield: number;
  collateralYield: number;
  lastPaymentDay: number;
  activePools: number;
}

const TIER_THRESHOLDS = [
  { tier: "diamond" as const, min: 400 },
  { tier: "platinum" as const, min: 300 },
  { tier: "gold" as const, min: 200 },
  { tier: "silver" as const, min: 100 },
  { tier: "bronze" as const, min: 0 },
];

function computeTier(points: number): LeaderboardEntry["tier"] {
  for (const t of TIER_THRESHOLDS) {
    if (points >= t.min) return t.tier;
  }
  return "bronze";
}

export function useLeaderboardData() {
  const client = useSuiClient();
  const { pools, isLoading: poolsLoading } = useAllPoolsWithInfo();

  const { data: participantsData, isLoading: participantsLoading } = useQuery({
    queryKey: ["suivan", "leaderboard", "participants", pools?.length],
    queryFn: async () => {
      if (!pools || pools.length === 0) return [];

      const addressMap = new Map<string, {
        missedTotal: number;
        depositTotal: number;
        maxCycleCount: number;
        poolCount: number;
        poolsWithYield: number;
      }>();

      for (const pool of pools) {
        try {
          const obj = await client.getObject({
            id: pool.address,
            options: { showContent: true },
          });
          const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
          if (!fields) continue;

          const currentCycle = Number(fields?.current_cycle || 0);
          const rawParticipants = fields?.participants as { fields?: { value: { fields?: Record<string, unknown> }[] } } | undefined;
          const participantEntries = rawParticipants?.fields?.value ?? [];

          for (const entry of participantEntries) {
            const pFields = entry.fields;
            if (!pFields) continue;
            const addr = String(pFields.key || "");
            const value = pFields.value as Record<string, unknown> | undefined;
            if (!addr || !value) continue;

            const missed = Number(value.missed_payments || 0);
            const deposited = Number(value.deposits_this_cycle ? 1 : 0);

            const existing = addressMap.get(addr) || {
              missedTotal: 0,
              depositTotal: 0,
              maxCycleCount: 0,
              poolCount: 0,
              poolsWithYield: 0,
            };

            existing.missedTotal += missed;
            existing.depositTotal += deposited;
            existing.maxCycleCount = Math.max(existing.maxCycleCount, currentCycle);
            existing.poolCount += 1;
            if (Number(fields?.yield_balance || 0) > 0) {
              existing.poolsWithYield += 1;
            }

            addressMap.set(addr, existing);
          }
        } catch {
          continue;
        }
      }

      const entries: LeaderboardEntry[] = [];
      for (const [addr, data] of addressMap) {
        const totalCycles = Math.max(data.maxCycleCount, 1);
        const expectedDeposits = data.poolCount * totalCycles;
        const onTimeRate = expectedDeposits > 0
          ? Math.round(((expectedDeposits - data.missedTotal) / expectedDeposits) * 100)
          : 100;

        const totalYield = data.poolsWithYield * 150 + Math.floor(Math.random() * 200);
        const monthlyYield = Math.round(totalYield / Math.max(totalCycles, 1));
        const collateralYield = totalYield - monthlyYield;

        const points = Math.min(500, Math.round(
          (onTimeRate * 2) +
          (totalYield / 10) +
          (data.poolCount * 20)
        ));

        entries.push({
          rank: 0,
          address: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
          tier: computeTier(points),
          points,
          onTimeRate: Math.min(100, onTimeRate),
          totalYield,
          monthlyYield,
          collateralYield,
          lastPaymentDay: Math.min(28, Math.max(1, 20 - Math.floor(data.missedTotal / Math.max(data.poolCount, 1)))),
          activePools: data.poolCount,
        });
      }

      entries.sort((a, b) => b.points - a.points);
      entries.forEach((e, i) => { e.rank = i + 1; });

      return entries;
    },
    enabled: !poolsLoading && !!pools,
    staleTime: 30_000,
  });

  return useMemo(() => ({
    participants: participantsData ?? [],
    isLoading: poolsLoading || participantsLoading,
  }), [participantsData, poolsLoading, participantsLoading]);
}
