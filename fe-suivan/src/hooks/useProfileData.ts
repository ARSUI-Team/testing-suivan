"use client";

import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { SUI_FACTORY_ID } from "@/config/sui";
import { useAllPoolsWithInfo } from "@/hooks/useSuiContracts";

export interface ProfileBadge {
  name: string;
  description: string;
  icon: string;
  color: string;
  achieved: boolean;
}

export interface ProfileActivity {
  type: "join" | "win" | "create" | "badge";
  label: string;
  poolName: string;
  time: string;
}

export interface ProfileStats {
  pools: number;
  won: number;
  saved: number;
  badges: number;
}

export function useProfileData(userAddress: string | undefined) {
  const client = useSuiClient();
  const { pools, isLoading: poolsLoading } = useAllPoolsWithInfo();

  const { data: profileData, isLoading: dataLoading } = useQuery({
    queryKey: ["suivan", "profile", userAddress, pools?.length],
    queryFn: async () => {
      if (!userAddress || !pools || pools.length === 0) {
        return { stats: { pools: 0, won: 0, saved: 0, badges: 0 }, badges: [] as ProfileBadge[], activity: [] as ProfileActivity[] };
      }

      let userPoolCount = 0;
      let winCount = 0;
      let totalSaved = 0;
      const now = Date.now();

      for (const pool of pools) {
        try {
          const obj = await client.getObject({
            id: pool.address,
            options: { showContent: true },
          });
          const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
          if (!fields) continue;

          const rawParticipants = fields?.participants as { fields?: { value: { fields?: Record<string, unknown> }[] } } | undefined;
          const participantEntries = rawParticipants?.fields?.value ?? [];

          for (const entry of participantEntries) {
            const pFields = entry.fields;
            if (!pFields) continue;
            const addr = String(pFields.key || "");
            if (addr !== userAddress) continue;

            const value = pFields.value as Record<string, unknown> | undefined;
            if (!value) continue;

            userPoolCount++;
            const hasReceivedPayout = Boolean(value.has_received_payout);
            if (hasReceivedPayout) winCount++;

            const collateralAmount = Number(value.collateral_amount || 0);
            const poolFunds = Number(fields?.pool_funds_balance || 0);
            const depositAmount = Number(fields?.deposit_amount || 0);
            totalSaved += (collateralAmount + poolFunds + depositAmount) / 1_000_000;
          }
        } catch {
          continue;
        }
      }

      const badges: ProfileBadge[] = [
        {
          name: "Early Adopter",
          description: "Joined Suivan during testnet",
          icon: "Sparkles",
          color: "var(--success-soft)",
          achieved: userPoolCount > 0,
        },
        {
          name: "Pool Pioneer",
          description: "Created 3+ pools",
          icon: "Users",
          color: "var(--accent-soft)",
          achieved: userPoolCount >= 3,
        },
        {
          name: "Cycle Champion",
          description: "Won 5 cycles",
          icon: "Trophy",
          color: "var(--warn-soft)",
          achieved: winCount >= 5,
        },
        {
          name: "Whale Watcher",
          description: "Deposited 50k+ USDC",
          icon: "PiggyBank",
          color: "var(--success-soft)",
          achieved: totalSaved >= 50000,
        },
        {
          name: "Sui Native",
          description: "Completed 10 cycles",
          icon: "Zap",
          color: "var(--accent-soft)",
          achieved: winCount >= 10,
        },
        {
          name: "Community Pillar",
          description: "Referred 5 members",
          icon: "Award",
          color: "var(--purple-soft)",
          achieved: false,
        },
      ];

      const badgeCount = badges.filter((b) => b.achieved).length;

      const activity: ProfileActivity[] = [];
      if (userPoolCount > 0) {
        activity.push({
          type: "join",
          label: "Joined pool",
          poolName: "Suivan Pool",
          time: "Recently",
        });
      }
      if (winCount > 0) {
        activity.push({
          type: "win",
          label: "Won cycle",
          poolName: "Suivan Pool",
          time: "Recently",
        });
      }

      return {
        stats: {
          pools: userPoolCount,
          won: winCount,
          saved: totalSaved,
          badges: badgeCount,
        },
        badges,
        activity,
      };
    },
    enabled: !!userAddress && !poolsLoading && !!pools,
    staleTime: 30_000,
  });

  return useMemo(() => ({
    stats: profileData?.stats ?? { pools: 0, won: 0, saved: 0, badges: 0 },
    badges: profileData?.badges ?? [],
    activity: profileData?.activity ?? [],
    isLoading: poolsLoading || dataLoading,
  }), [profileData, poolsLoading, dataLoading]);
}
