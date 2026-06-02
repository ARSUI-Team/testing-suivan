"use client";

import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SUI_PACKAGE_ID, SUI_FACTORY_ID, SUI_USDC_TYPE, SUI_SUI_TYPE, SUI_CLOCK_ID } from "@/config/sui";

// ─── Types ────────────────────────────────────────────────────────

export interface SuiPoolInfo {
  id: string;
  depositAmount: number;
  maxParticipants: number;
  currentParticipants: number;
  cycle: number;
  started: boolean;
  active: boolean;
  isEnded: boolean;
  totalFunds: number;
  yield: number;
  collateralYield: number;
  gachaWinner: string | null;
  gachaPrize: number;
  walrusMetadataBlobId: string;
}

export interface FormattedPool {
  id: number;
  address: string;
  name: string;
  depositAmount: number;
  maxParticipants: number;
  currentParticipants: number;
  cycleDuration: number;
  totalFunds: number;
  status: "open" | "active" | "completed";
  apy: number;
  currentCycle: number;
  walrusMetadataBlobId: string;
}

export interface ParticipantInfo {
  addr: string;
  collateralAmount: number;
  missedPayments: number;
  hasReceivedPayout: boolean;
  isActive: boolean;
  joinedAtMs: number;
  lastDepositCycle: number;
  depositsThisCycle: boolean;
  proportionalYieldEarned: number;
  leaderboardScore: number;
  gachaClaimed: boolean;
}

// ─── Helper ────────────────────────────────────────────────────────

function parsePoolFields(fields: Record<string, unknown>): SuiPoolInfo | null {
  try {
    const id = String((fields?.id as { fields?: { id?: { fields?: { id?: string } } } })?.fields?.id?.fields?.id || fields?.id || "");
    const config = (fields?.config as { fields?: Record<string, unknown> })?.fields;
    const depositAmount = Number((config?.deposit_amount as string) || 0) / 1_000_000;
    const maxParticipants = Number((config?.max_participants as string) || 0);
    const participantList = (fields?.participant_list as { fields?: { value?: unknown[] } })?.fields?.value ?? [];
    const poolFundsBalance = Number(((fields?.pool_funds_balance as { fields?: { value?: string } })?.fields?.value) || 0) / 1_000_000;
    const yieldBalance = Number(((fields?.yield_balance as { fields?: { value?: string } })?.fields?.value) || 0) / 1_000_000;
    const collateralYieldBalance = Number(((fields?.collateral_yield_balance as { fields?: { value?: string } })?.fields?.value) || 0) / 1_000_000;

    // Read gacha winner from PoolInfo event or pool fields
    const gachaWinner = fields?.gacha_winner
      ? (fields.gacha_winner as { fields?: { vec?: string[] } })?.fields?.vec?.[0] ?? null
      : null;

    return {
      id,
      depositAmount,
      maxParticipants,
      currentParticipants: participantList.length,
      cycle: Number((fields?.current_cycle as string) || 0),
      started: Boolean(fields?.is_started),
      active: Boolean(fields?.is_active),
      isEnded: Boolean(fields?.is_ended),
      totalFunds: poolFundsBalance,
      yield: yieldBalance,
      collateralYield: collateralYieldBalance,
      gachaWinner,
      gachaPrize: yieldBalance, // cumulative yield becomes gacha pool
      walrusMetadataBlobId: String((fields?.walrus_metadata_blob_id as string) || ""),
    };
  } catch {
    return null;
  }
}

// ─── Read Hooks (useSuiClientQuery or useQuery + useSuiClient) ─────

export function useAllPools() {
  const client = useSuiClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["suivan", "allPools"],
    queryFn: async () => {
      if (!SUI_FACTORY_ID) return [];

      // Read pool_count from factory (Table-backed, scalable)
      const factoryObj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });

      const factoryFields = (factoryObj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const poolCount = Number((factoryFields?.pool_count as string) || "0");
      if (poolCount === 0) return [];

      // Fetch all pool IDs from the all_pools Table via dynamic fields
      const dynamicFields = await client.getDynamicFields({
        parentId: SUI_FACTORY_ID,
        limit: poolCount,
      });

      // Filter for all_pools Table entries (type contains "all_pools")
      const poolFieldIds = dynamicFields.data
        .filter((f) => f.name.type?.includes("all_pools"))
        .map((f) => f.name.value as string)
        .filter(Boolean);

      // If dynamic field filtering works, return the IDs
      if (poolFieldIds.length > 0) {
        return poolFieldIds;
      }

      // Fallback: fetch each pool by index from the Table
      const poolIds: string[] = [];
      for (let i = 0; i < poolCount; i++) {
        try {
          const entry = await client.getDynamicFieldObject({
            parentId: SUI_FACTORY_ID,
            name: {
              type: "u64",
              value: String(i),
            },
          });
          const value = (entry.data?.content as { fields?: { value?: string } })?.fields?.value;
          if (value) poolIds.push(value);
        } catch {
          // skip missing entries
        }
      }
      return poolIds;
    },
    enabled: !!SUI_FACTORY_ID,
  });

  return { poolAddresses: data, isLoading, error, refetch };
}

export function usePoolInfo(poolAddress: string | undefined) {
  const client = useSuiClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["suivan", "poolInfo", poolAddress],
    queryFn: async () => {
      if (!poolAddress) return null;
      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      return parsePoolFields(fields ?? {});
    },
    enabled: !!poolAddress,
  });

  return { poolInfo: data, isLoading, error, refetch };
}

export function useAllPoolsWithInfo() {
  const { poolAddresses, isLoading: addrLoading, refetch: refetchAddrs } = useAllPools();
  const client = useSuiClient();
  const queryClient = useQueryClient();

  const { data: poolsData, isLoading: infoLoading } = useQuery({
    queryKey: ["suivan", "poolsInfo", poolAddresses],
    queryFn: async () => {
      if (!poolAddresses?.length) return [];
      const results = await Promise.allSettled(
        poolAddresses.map((id) =>
          client.getObject({ id, options: { showContent: true } })
        )
      );
      return results
        .map((r, i) => {
          if (r.status !== "fulfilled") return null;
          const fields = (r.value.data?.content as { fields?: Record<string, unknown> })?.fields;
          const pool = parsePoolFields(fields ?? {});
          if (!pool) return null;
          return formatPool(pool, i);
        })
        .filter((p): p is FormattedPool => p !== null);
    },
    enabled: !!poolAddresses?.length,
  });

  const refetch = async () => {
    await refetchAddrs();
    queryClient.invalidateQueries({ queryKey: ["suivan", "poolsInfo"] });
  };

  return {
    pools: poolsData,
    isLoading: addrLoading || infoLoading,
    refetch,
  };
}

function formatPool(pool: SuiPoolInfo, index: number): FormattedPool {
  const apy = pool.totalFunds > 0 ? (pool.yield / pool.totalFunds) * 100 * 12 : 8.5;
  let status: "open" | "active" | "completed" = "open";
  if (pool.started && pool.active) status = "active";
  else if (pool.started && !pool.active) status = "completed";
  else if (pool.currentParticipants < pool.maxParticipants) status = "open";

  let name = "Custom Pool";
  if (pool.depositAmount === 10) name = "Small Pool";
  else if (pool.depositAmount === 50) name = "Medium Pool";
  else if (pool.depositAmount === 100) name = "Large Pool";

  return {
    id: index + 1,
    address: pool.id,
    name,
    depositAmount: pool.depositAmount,
    maxParticipants: pool.maxParticipants,
    currentParticipants: pool.currentParticipants,
    cycleDuration: 30,
    totalFunds: pool.totalFunds,
    status,
    apy: Math.round(apy * 10) / 10,
    currentCycle: pool.cycle,
    walrusMetadataBlobId: pool.walrusMetadataBlobId,
  };
}

export function useRequiredCollateral(poolAddress: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "collateral", poolAddress],
    queryFn: async () => {
      if (!poolAddress) return 0;
      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const config = (fields?.config as { fields?: Record<string, unknown> })?.fields;
      if (!config) return 0;
      const depositAmount = Number(config.deposit_amount as string || "0");
      const collateralMultiplier = Number(config.collateral_multiplier as string || "0");
      return (depositAmount * collateralMultiplier / 100) / 1_000_000;
    },
    enabled: !!poolAddress,
  });
  return { collateral: data, isLoading };
}

export function useParticipantInfo(poolAddress: string | undefined, participantAddress: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suivan", "participant", poolAddress, participantAddress],
    queryFn: async () => {
      if (!poolAddress || !participantAddress) return null;

      // Get dynamic field for participant
      const obj = await client.getDynamicFieldObject({
        parentId: poolAddress,
        name: {
          type: "address",
          value: participantAddress,
        },
      });

      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields?.value as Record<string, unknown> | undefined;
      if (!fields) return null;

      return {
        addr: participantAddress,
        collateralAmount: Number(fields.collateral_amount || 0) / 1_000_000,
        missedPayments: Number(fields.missed_payments || 0),
        hasReceivedPayout: Boolean(fields.has_received_payout),
        isActive: Boolean(fields.is_active),
        joinedAtMs: Number(fields.joined_at_ms || 0),
        lastDepositCycle: Number(fields.last_deposit_cycle || 0),
        depositsThisCycle: Boolean(fields.deposits_this_cycle),
        proportionalYieldEarned: Number(fields.proportional_yield_earned || 0) / 1_000_000,
        leaderboardScore: Number(fields.leaderboard_score || 0),
        gachaClaimed: Boolean(fields.gacha_claimed),
      } as ParticipantInfo;
    },
    enabled: !!poolAddress && !!participantAddress,
  });
  return { participantInfo: data, isLoading, refetch };
}

export function useParticipantList(poolAddress: string | undefined) {
  const client = useSuiClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suivan", "participantList", poolAddress],
    queryFn: async () => {
      if (!poolAddress) return { addresses: [] as string[], count: 0 };

      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const raw = fields?.participant_list as { fields?: { value: { fields?: unknown }[] } } | undefined;
      const addresses = raw?.fields?.value?.map((v: unknown) => String((v as { fields?: { value?: string } }).fields?.value)) ?? [];
      return { addresses, count: addresses.length };
    },
    enabled: !!poolAddress,
  });

  return {
    participantAddresses: data?.addresses ?? [],
    participantCount: data?.count ?? 0,
    isLoading,
    refetch,
  };
}

export function useHasDepositedThisCycle(poolAddress: string | undefined, userAddress: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "hasDeposited", poolAddress, userAddress],
    queryFn: async () => {
      if (!poolAddress || !userAddress) return false;
      try {
        const obj = await client.getDynamicFieldObject({
          parentId: poolAddress,
          name: { type: "address", value: userAddress },
        });
        const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields?.value as Record<string, unknown>;
        return Boolean(fields?.deposits_this_cycle);
      } catch {
        return false;
      }
    },
    enabled: !!poolAddress && !!userAddress,
  });
  return { hasDeposited: data, isLoading };
}

export function useCurrentYield(poolAddress: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suivan", "currentYield", poolAddress],
    queryFn: async () => {
      if (!poolAddress) return { cumulative: 0, collateral: 0, total: 0 };
      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const cumulative = Number(((fields?.yield_balance as { fields?: { value?: string } })?.fields?.value) || "0") / 1_000_000;
      const collateral = Number(((fields?.collateral_yield_balance as { fields?: { value?: string } })?.fields?.value) || "0") / 1_000_000;
      return { cumulative, collateral, total: cumulative + collateral };
    },
    enabled: !!poolAddress,
  });
  return { currentYield: data ?? { cumulative: 0, collateral: 0, total: 0 }, isLoading, refetch };
}

export function useUSDCBalance(address: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suivan", "usdcBalance", address],
    queryFn: async () => {
      if (!address) return 0;
      const coins = await client.getCoins({
        owner: address,
        coinType: SUI_USDC_TYPE,
      });
      let total = 0;
      for (const coin of coins.data) {
        total += Number(coin.balance);
      }
      return total / 1_000_000;
    },
    enabled: !!address,
    staleTime: 0,
    refetchInterval: 3000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  return { balance: data ?? 0, isLoading, refetch };
}

export function useSUIBalance(address: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "suiBalance", address],
    queryFn: async () => {
      if (!address) return 0;
      const coins = await client.getCoins({
        owner: address,
        coinType: SUI_SUI_TYPE,
      });
      let total = 0;
      for (const coin of coins.data) {
        total += Number(coin.balance);
      }
      return total / 1_000_000_000;
    },
    enabled: !!address,
  });
  return { balance: data ?? 0, isLoading };
}

export function useUserUSDCcoins(address: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "usdcCoins", address],
    queryFn: async () => {
      if (!address) return [];
      const coins = await client.getCoins({
        owner: address,
        coinType: SUI_USDC_TYPE,
      });
      return coins.data.map((c) => ({
        coinObjectId: c.coinObjectId,
        balance: Number(c.balance) / 1_000_000,
      }));
    },
    enabled: !!address,
  });
  return { coins: data ?? [], isLoading };
}

export function useLastWinner(poolAddress: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "lastWinner", poolAddress],
    queryFn: async () => {
      if (!poolAddress) return undefined;
      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      return fields?.last_winner as string | undefined;
    },
    enabled: !!poolAddress,
  });
  return { lastWinner: data, isLoading };
}

// ─── Write Hooks (useSignAndExecuteTransaction) ────────────────────

export function useJoinPool() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const joinPool = (poolId: string, collateralAmount: number, usdcCoinId: string) => {
    const tx = new Transaction();

    const [collateralCoin] = tx.splitCoins(tx.object(usdcCoinId), [tx.pure.u64(collateralAmount * 1_000_000)]);

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::join_pool`,
      arguments: [
        tx.object(poolId),
        collateralCoin,
      ],
      typeArguments: [SUI_USDC_TYPE],
    });

    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
      },
    });
  };

  return {
    joinPool,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useCreatePool() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [txResponse, setTxResponse] = useState<any>(null);

  const COLLATERAL_MULTIPLIER = 125;

  const createPool = (
    depositAmount: number,
    maxParticipants: number,
    cycleDurationDays: number,
    usdcCoinId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess?: (response: any) => void,
  ) => {
    const tx = new Transaction();

    const requiredCollateral = Math.ceil(depositAmount * maxParticipants * COLLATERAL_MULTIPLIER / 100);
    const [collateralCoin] = tx.splitCoins(tx.object(usdcCoinId), [tx.pure.u64(requiredCollateral * 1_000_000)]);

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_factory::create_custom_pool`,
      arguments: [
        tx.object(SUI_FACTORY_ID),
        collateralCoin,
        tx.pure.u64(depositAmount * 1_000_000),
        tx.pure.u64(maxParticipants),
        tx.pure.u64(cycleDurationDays * 24 * 60 * 60 * 1000),
        tx.pure.u64(COLLATERAL_MULTIPLIER),
      ],
      typeArguments: [SUI_USDC_TYPE],
    });

    signAndExecute({ transaction: tx }, {
      onSuccess: (response) => {
        setTxResponse(response);
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
        onSuccess?.(response);
      },
    });
  };

  return {
    createPool,
    hash: txData?.digest,
    txResponse,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useMakeDeposit() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const makeDeposit = (poolId: string, amount: number, usdcCoinId: string) => {
    const tx = new Transaction();

    const [depositCoin] = tx.splitCoins(tx.object(usdcCoinId), [tx.pure.u64(amount * 1_000_000)]);

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::make_deposit`,
      arguments: [
        tx.object(poolId),
        depositCoin,
      ],
      typeArguments: [SUI_USDC_TYPE],
    });

    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
      },
    });
  };

  return {
    makeDeposit,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useLinkPoolMetadata() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const linkMetadata = (poolId: string, blobId: string, poolAdminCapId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::walrus_store::link_pool_metadata`,
      arguments: [
        tx.object(poolId),
        tx.object(poolAdminCapId),
        tx.pure.string(blobId),
      ],
      typeArguments: [SUI_USDC_TYPE],
    });
    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
      },
    });
  };

  return {
    linkMetadata,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useClaimFinal() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const claimFinal = (poolId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::claim_final`,
      arguments: [tx.object(poolId)],
      typeArguments: [SUI_USDC_TYPE],
    });

    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
      },
    });
  };

  return {
    claimFinal,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

// ─── Faucet ────────────────────────────────────────────────────────

export function useClaimUSDC() {
  const { mutate: signAndExecute, isPending, data, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const claimUSDC = (faucetId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::faucet::claim_test_usdc`,
      arguments: [tx.object(faucetId), tx.object(SUI_CLOCK_ID)],
    });
    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
      },
    });
  };

  return { claimUSDC, hash: data?.digest, isPending, isSuccess: !!data, error };
}

export function useLeaderboardScore(poolAddress: string | undefined, userAddress: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "leaderboard", poolAddress, userAddress],
    queryFn: async () => {
      if (!poolAddress || !userAddress) return 0;
      const obj = await client.getDynamicFieldObject({
        parentId: poolAddress,
        name: { type: "address", value: userAddress },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields?.value as Record<string, unknown>;
      return Number(fields?.leaderboard_score || 0);
    },
    enabled: !!poolAddress && !!userAddress,
  });
  return { leaderboardScore: data ?? 0, isLoading };
}
