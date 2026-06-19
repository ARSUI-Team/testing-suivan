"use client";

import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { useAllPoolsWithInfo } from "@/hooks/useSuiContracts";

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
  const { pools, isLoading: poolsLoading } = useAllPoolsWithInfo();

  const { data: profileData, isLoading: dataLoading } = useQuery({
    queryKey: ["suivan", "profile", userAddress, pools?.length],
    queryFn: async () => {
      if (!userAddress || !pools || pools.length === 0) {
        return { stats: { pools: 0, won: 0, saved: 0, yieldEarned: 0 }, badges: [] as ProfileBadge[], activity: [] as ProfileActivity[] };
      }

      let userPoolCount = 0;
      let createdCount = 0;
      let winCount = 0;
      let totalSaved = 0;
      let totalYieldEarned = 0;
      let firstJoinMs: number | null = null;
      const activity: ProfileActivity[] = [];

      for (const pool of pools) {
        try {
          const obj = await client.getObject({
            id: pool.address,
            options: { showContent: true },
          });
          const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
          if (!fields) continue;

          const participantList = (fields?.participant_list as string[]) ?? [];
          if (!participantList.includes(userAddress)) continue;

          userPoolCount++;

          // Check if user is the creator (first participant)
          if (participantList[0] === userAddress) createdCount++;

          // Track first join time
          const poolStartMs = Number((fields?.pool_start_time_ms as string) || 0);
          if (poolStartMs > 0 && (!firstJoinMs || poolStartMs < firstJoinMs)) {
            firstJoinMs = poolStartMs;
          }

          // Read participants Table
          const participantsTableId = (fields?.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
          if (participantsTableId) {
            try {
              const entry = await client.getDynamicFieldObject({
                parentId: participantsTableId,
                name: { type: "address", value: userAddress },
              });
              const pVal = (entry.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
              if (pVal) {
                const hasReceivedPayout = Boolean(pVal.has_received_payout);
                if (hasReceivedPayout) winCount++;
                const collateralAmount = Number(pVal.collateral_amount || 0);
                const proportionalYield = Number(pVal.proportional_yield_earned || 0);
                totalYieldEarned += proportionalYield / 1_000_000;
                totalSaved += (collateralAmount / 1_000_000);

                if (hasReceivedPayout) {
                  activity.push({
                    type: "win",
                    label: "Won cycle",
                    poolName: pool.name || `Pool ${pool.address.slice(0, 6)}...${pool.address.slice(-4)}`,
                    time: new Date().toLocaleDateString(),
                    poolAddress: pool.address,
                  });
                }
              }
            } catch { /* skip */ }
          }

          // Add join/create activity
          activity.push({
            type: createdCount > 0 && participantList[0] === userAddress ? "create" : "join",
            label: createdCount > 0 && participantList[0] === userAddress ? "Created pool" : "Joined pool",
            poolName: pool.name || `Pool ${pool.address.slice(0, 6)}...${pool.address.slice(-4)}`,
            time: poolStartMs > 0 ? new Date(poolStartMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
            poolAddress: pool.address,
          });
        } catch {
          continue;
        }
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

      const badgeCount = badges.filter((b) => b.achieved).length;

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
    enabled: !!userAddress && !poolsLoading && !!pools,
    staleTime: 30_000,
  });

  return useMemo(() => ({
    stats: profileData?.stats ?? { pools: 0, won: 0, saved: 0, yieldEarned: 0 },
    badges: profileData?.badges ?? [],
    activity: profileData?.activity ?? [],
    memberSince: profileData?.memberSince ?? null,
    isLoading: poolsLoading || dataLoading,
  }), [profileData, poolsLoading, dataLoading]);
}
