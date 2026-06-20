"use client";

import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { SUI_FACTORY_ID } from "@/config/sui";

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

function resolveAddress(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    return String(v.value || v.id || v.address || "");
  }
  return "";
}

interface ParticipantRaw {
  address: string;
  missedPayments: number;
  leaderboardScore: number;
  hasReceivedPayout: boolean;
  isActive: boolean;
  pendingWinnerPayout: number;
  collateralAmount: number;
  proportionalYield: number;
}

export function useLeaderboardData() {
  const client = useSuiClient();

  const { data: participantsData, isLoading } = useQuery({
    queryKey: ["suivan", "leaderboard", "v2"],
    queryFn: async () => {
      const factoryObj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });
      const ff = (factoryObj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const poolCount = Number((ff?.pool_count as string) || "0");
      if (poolCount === 0) return [];

      const tableId = (ff?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
      if (!tableId) return [];

      const poolIds: string[] = [];
      for (let i = 0; i < poolCount; i++) {
        try {
          const e = await client.getDynamicFieldObject({
            parentId: tableId,
            name: { type: "u64", value: String(i) },
          });
          const v = (e.data?.content as { fields?: { value?: string } })?.fields?.value;
          if (v) poolIds.push(v);
        } catch { /* skip */ }
      }

      const allParticipants: ParticipantRaw[] = [];

      for (const poolId of poolIds) {
        try {
          const obj = await client.getObject({
            id: poolId,
            options: { showContent: true },
          });
          const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
          if (!fields) continue;

          const rawList = fields?.participant_list;
          const addresses: string[] = Array.isArray(rawList)
            ? rawList.map(String)
            : ((rawList as { fields?: { value?: string[] } })?.fields?.value ?? []);

          const participantsTableId = (fields?.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
          if (!participantsTableId) continue;

          for (const addr of addresses) {
            try {
              const entry = await client.getDynamicFieldObject({
                parentId: participantsTableId,
                name: { type: "address", value: addr },
              });
              const pv = (entry.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
              if (!pv) continue;

              allParticipants.push({
                address: addr,
                missedPayments: Number(pv.missed_payments || 0),
                leaderboardScore: Number(pv.leaderboard_score || 0),
                hasReceivedPayout: Boolean(pv.has_received_payout),
                isActive: Boolean(pv.is_active),
                pendingWinnerPayout: Number(pv.pending_winner_payout || 0),
                collateralAmount: Number(pv.collateral_amount || 0),
                proportionalYield: Number(pv.proportional_yield_earned || 0),
              });
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }

      const addressMap = new Map<string, {
        missedTotal: number;
        poolCount: number;
        totalScore: number;
        totalYield: number;
        hasWon: boolean;
      }>();

      for (const p of allParticipants) {
        const existing = addressMap.get(p.address) || {
          missedTotal: 0,
          poolCount: 0,
          totalScore: 0,
          totalYield: 0,
          hasWon: false,
        };
        existing.missedTotal += p.missedPayments;
        existing.poolCount += 1;
        existing.totalScore += p.leaderboardScore;
        existing.totalYield += (p.proportionalYield + p.pendingWinnerPayout) / 1_000_000;
        if (p.hasReceivedPayout) existing.hasWon = true;
        addressMap.set(p.address, existing);
      }

      const entries: LeaderboardEntry[] = [];
      for (const [addr, data] of addressMap) {
        const points = Math.min(500, data.totalScore);
        const t = computeTier(points);
        const onTimeRate = data.missedTotal === 0 ? 100 : Math.max(0, Math.round((1 - data.missedTotal / Math.max(data.poolCount * 2, 1)) * 100));

        entries.push({
          rank: 0,
          address: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
          tier: t,
          points,
          onTimeRate: Math.min(100, onTimeRate),
          totalYield: Math.round(data.totalYield * 100) / 100,
          monthlyYield: Math.round(data.totalYield / Math.max(data.poolCount, 1) * 100) / 100,
          collateralYield: Math.round(data.totalYield * 0.6 * 100) / 100,
          lastPaymentDay: Math.min(28, Math.max(1, 20 - data.missedTotal)),
          activePools: data.poolCount,
        });
      }

      entries.sort((a, b) => b.points - a.points);
      entries.forEach((e, i) => { e.rank = i + 1; });

      return entries;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return useMemo(() => ({
    participants: participantsData ?? [],
    isLoading,
  }), [participantsData, isLoading]);
}
