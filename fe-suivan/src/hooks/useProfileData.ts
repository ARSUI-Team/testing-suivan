"use client";

import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { SUI_FACTORY_ID } from "@/config/sui";

export interface ProfileBadge {
  name: string;
  description: string;
  icon: string;
  color: string;
  achieved: boolean;
  progress?: string;
}

export interface ProfileActivity {
  type: "join" | "win" | "create";
  label: string;
  poolName: string;
  time: string;
  poolAddress?: string;
}

export interface ProfileStats {
  pools: number;
  won: number;
  saved: number;
  yieldEarned: number;
}

export function useProfileData(userAddress: string | undefined) {
  const client = useSuiClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["suivan", "profile", userAddress, "v2"],
    queryFn: async () => {
      const empty = {
        stats: { pools: 0, won: 0, saved: 0, yieldEarned: 0 } as ProfileStats,
        badges: [] as ProfileBadge[],
        activity: [] as ProfileActivity[],
        memberSince: null as string | null,
      };

      if (!userAddress) return empty;

      const factoryObj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });
      const ff = (factoryObj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const poolCount = Number((ff?.pool_count as string) || "0");
      if (poolCount === 0) return empty;

      const tableId = (ff?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
      if (!tableId) return empty;

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

      let userPoolCount = 0;
      let createdCount = 0;
      let winCount = 0;
      let totalSaved = 0;
      let totalYieldEarned = 0;
      let firstJoinMs: number | null = null;
      const activity: ProfileActivity[] = [];

      for (const poolId of poolIds) {
        try {
          const obj = await client.getObject({
            id: poolId,
            options: { showContent: true },
          });
          const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
          if (!fields) continue;

          const rawList = fields?.participant_list;
          const participantList: string[] = Array.isArray(rawList)
            ? rawList.map(String)
            : ((rawList as { fields?: { value?: string[] } })?.fields?.value ?? []);

          if (!participantList.includes(userAddress)) continue;

          userPoolCount++;

          if (participantList[0] === userAddress) createdCount++;

          const poolStartMs = Number((fields?.pool_start_time_ms as string) || 0);
          if (poolStartMs > 0 && (!firstJoinMs || poolStartMs < firstJoinMs)) {
            firstJoinMs = poolStartMs;
          }

          const config = (fields?.config as { fields?: Record<string, unknown> })?.fields;
          const depositAmount = Number((config?.deposit_amount as string) || 0) / 1_000_000;
          const poolName = `Pool ${depositAmount} USDC`;

          const participantsTableId = (fields?.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
          if (participantsTableId) {
            try {
              const entry = await client.getDynamicFieldObject({
                parentId: participantsTableId,
                name: { type: "address", value: userAddress },
              });
              const pv = (entry.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
              if (pv) {
                const hasReceivedPayout = Boolean(pv.has_received_payout);
                if (hasReceivedPayout) {
                  winCount++;
                  activity.push({
                    type: "win",
                    label: "Won a cycle",
                    poolName,
                    time: poolStartMs > 0 ? new Date(poolStartMs).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently",
                    poolAddress: poolId,
                  });
                }

                const collateralAmount = Number(pv.collateral_amount || 0);
                const proportionalYield = Number(pv.proportional_yield_earned || 0);
                totalYieldEarned += proportionalYield / 1_000_000;
                totalSaved += collateralAmount / 1_000_000;
              }
            } catch { /* skip */ }
          }

          activity.push({
            type: createdCount > 0 && participantList[0] === userAddress ? "create" : "join",
            label: participantList[0] === userAddress ? "Created pool" : "Joined pool",
            poolName,
            time: poolStartMs > 0 ? new Date(poolStartMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
            poolAddress: poolId,
          });
        } catch { /* skip */ }
      }

      const badges: ProfileBadge[] = [
        {
          name: "Early Adopter",
          description: "Joined Suivan during testnet phase",
          icon: "Sparkles",
          color: "var(--success-soft)",
          achieved: userPoolCount > 0,
        },
        {
          name: "Pool Creator",
          description: "Created your own pool",
          icon: "Users",
          color: "var(--accent-soft)",
          achieved: createdCount >= 1,
          progress: createdCount === 0 ? "Create a pool to earn" : undefined,
        },
        {
          name: "Cycle Winner",
          description: "Won a ROSCA cycle",
          icon: "Trophy",
          color: "var(--warn-soft)",
          achieved: winCount >= 1,
          progress: winCount === 0 ? "Win a cycle to earn" : undefined,
        },
      ];

      return {
        stats: {
          pools: userPoolCount,
          won: winCount,
          saved: totalSaved,
          yieldEarned: totalYieldEarned,
        },
        badges,
        activity: activity.slice(0, 10),
        memberSince: firstJoinMs
          ? new Date(firstJoinMs).toLocaleDateString("en-US", { month: "long", year: "numeric" })
          : null,
      };
    },
    enabled: !!userAddress,
    staleTime: 30_000,
  });

  return useMemo(() => ({
    stats: profileData?.stats ?? { pools: 0, won: 0, saved: 0, yieldEarned: 0 },
    badges: profileData?.badges ?? [],
    activity: profileData?.activity ?? [],
    memberSince: profileData?.memberSince ?? null,
    isLoading,
  }), [profileData, isLoading]);
}
