"use client";

import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SUI_PACKAGE_ID, SUI_FACTORY_ID, SUI_USDC_TYPE, SUI_SUI_TYPE, SUI_CLOCK_ID } from "@/config/sui";
import { DEFAULT_COLLATERAL_MULTIPLIER, getRequiredCollateralAmount } from "@/lib/poolMath";
import { derivePoolLifecycle, type PoolLifecycleStatus } from "@/lib/poolLifecycle";

export type TransactionResult = {
  digest: string;
  objectChanges?: Array<{
    type: string;
    objectType?: string;
    objectId?: string;
  }>;
};

const CHAIN_POLL_INTERVAL_MS = 15_000;

// ─── Types ────────────────────────────────────────────────────────

export interface SuiPoolInfo {
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
  yield: number;
  collateralYield: number;
  cycleDurationMs: number;
  poolStartTimeMs: number;
  activeDepositors: number;
  pendingWinnerPayouts: number;
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
  cycleDurationMs: number;
  totalFunds: number;
  collateralBalance: number;
  status: PoolLifecycleStatus;
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
  pendingWinnerPayout: number;
  winnerPayoutClaimed: boolean;
}

// ─── Helper ────────────────────────────────────────────────────────

function parsePoolFields(fields: Record<string, unknown>): SuiPoolInfo | null {
  try {
    const id = ((fields?.id as { id?: string })?.id) || String(fields?.id || "");

    const config = (fields?.config as { fields?: Record<string, unknown> })?.fields;
    const depositAmount = Number((config?.deposit_amount as string) || 0) / 1_000_000;
    const maxParticipants = Number((config?.max_participants as string) || 0);

    // participant_list can be a plain array or { fields: { value: [...] } }
    const rawList = fields?.participant_list;
    const participantList: unknown[] = Array.isArray(rawList)
      ? rawList
      : ((rawList as { fields?: { value?: unknown[] } })?.fields?.value ?? []);

    // Balance fields can be a plain string or { fields: { value: "..." } }
    const readBalance = (val: unknown): number => {
      if (typeof val === "string" || typeof val === "number") return Number(val || 0);
      return Number(((val as { fields?: { value?: string } })?.fields?.value) || 0);
    };
    const poolFundsBalance = readBalance(fields?.pool_funds_balance) / 1_000_000;
    const collateralBalance = readBalance(fields?.collateral_balance) / 1_000_000;
    const yieldBalance = readBalance(fields?.yield_balance) / 1_000_000;
    const collateralYieldBalance = readBalance(fields?.collateral_yield_balance) / 1_000_000;
    const pendingWinnerPayouts = readBalance(fields?.winner_payout_balance) / 1_000_000;

    const cycleDurationMs = Number((config?.cycle_duration_ms as string) || 0);

    return {
      id,
      depositAmount,
      maxParticipants,
      currentParticipants: participantList.length,
      cycle: Number((fields?.current_cycle as string) || 0),
      started: Boolean(fields?.is_started),
      active: Boolean(fields?.is_active),
      isFull: Boolean(fields?.is_full),
      isEnded: Boolean(fields?.is_ended),
      totalFunds: poolFundsBalance,
      collateralBalance,
      yield: yieldBalance,
      collateralYield: collateralYieldBalance,
      cycleDurationMs,
      poolStartTimeMs: Number((fields?.pool_start_time_ms as string) || 0),
      activeDepositors: Number((fields?.active_depositors_count as string) || 0),
      pendingWinnerPayouts,
      gachaWinner: null as string | null,
      gachaPrize: yieldBalance,
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

      // Read pool_count and all_pools table ID from factory
      const factoryObj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });

      const factoryContent = factoryObj.data?.content as { fields?: Record<string, unknown> } | undefined;
      const factoryFields = factoryContent?.fields;
      const poolCount = Number((factoryFields?.pool_count as string) || "0");
      if (poolCount === 0) return [];

      const allPoolsTableId = (factoryFields?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
      if (!allPoolsTableId) return [];

      // Fetch each pool ID from the all_pools Table by index
      const poolIds: string[] = [];
      for (let i = 0; i < poolCount; i++) {
        try {
          const entry = await client.getDynamicFieldObject({
            parentId: allPoolsTableId,
            name: { type: "u64", value: String(i) },
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
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
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
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
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
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
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
  const totalLocked = pool.totalFunds + pool.collateralBalance + pool.pendingWinnerPayouts;
  const apy = pool.totalFunds > 0 ? (pool.yield / pool.totalFunds) * 100 * 12 : 8.5;
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

  const cycleDurationDays = pool.cycleDurationMs > 0
    ? Math.round(pool.cycleDurationMs / 86400000)
    : 30;

  return {
    id: index + 1,
    address: pool.id,
    name,
    depositAmount: pool.depositAmount,
    maxParticipants: pool.maxParticipants,
    currentParticipants: pool.currentParticipants,
    cycleDuration: cycleDurationDays,
    cycleDurationMs: pool.cycleDurationMs,
    totalFunds: totalLocked,
    collateralBalance: pool.collateralBalance,
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
      const maxParticipants = Number(config.max_participants as string || "0");
      return getRequiredCollateralAmount(
        depositAmount / 1_000_000,
        maxParticipants,
        collateralMultiplier,
      );
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

      // Get the participants table ID from the pool object
      const poolObj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (poolObj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const tableId = (fields?.participants as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
      if (!tableId) return null;

      // Get participant dynamic field from the table
      const obj = await client.getDynamicFieldObject({
        parentId: tableId,
        name: {
          type: "address",
          value: participantAddress,
        },
      });

      const rawValue = (obj.data?.content as { fields?: { value?: Record<string, unknown> } })?.fields?.value;
      if (!rawValue) return null;
      const pVal =
        (rawValue as { fields?: Record<string, unknown> }).fields ??
        rawValue;

      return {
        addr: participantAddress,
        collateralAmount: Number(pVal.collateral_amount || 0) / 1_000_000,
        missedPayments: Number(pVal.missed_payments || 0),
        hasReceivedPayout: Boolean(pVal.has_received_payout),
        isActive: Boolean(pVal.is_active),
        joinedAtMs: Number(pVal.joined_at_ms || 0),
        lastDepositCycle: Number(pVal.last_deposit_cycle || 0),
        depositsThisCycle: Boolean(pVal.deposits_this_cycle),
        proportionalYieldEarned: Number(pVal.proportional_yield_earned || 0) / 1_000_000,
        leaderboardScore: Number(pVal.leaderboard_score || 0),
        gachaClaimed: Boolean(pVal.gacha_claimed),
        pendingWinnerPayout: Number(pVal.pending_winner_payout || 0) / 1_000_000,
        winnerPayoutClaimed: Boolean(pVal.winner_payout_claimed),
      } as ParticipantInfo;
    },
    enabled: !!poolAddress && !!participantAddress,
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
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
      const raw = fields?.participant_list as string[] | { fields?: { value?: unknown[] } } | undefined;
      const addresses: string[] = Array.isArray(raw)
        ? raw
        : ((raw as { fields?: { value?: { fields?: { value?: string } }[] } })?.fields?.value?.map((v) => String((v as { fields?: { value?: string } })?.fields?.value || v)) ?? []);
      return { addresses, count: addresses.length };
    },
    enabled: !!poolAddress,
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
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
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
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
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
  });
  return { lastWinner: data, isLoading };
}

export function useCycleWinners(poolAddress: string | undefined, currentCycle: number) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suivan", "cycleWinners", poolAddress],
    queryFn: async () => {
      if (!poolAddress || currentCycle <= 0) return [] as { cycle: number; address: string }[];
      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const tableId = (fields?.cycle_winners as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
      if (!tableId) return [];

      const winners: { cycle: number; address: string }[] = [];
      for (let cycle = 1; cycle <= currentCycle; cycle++) {
        try {
          const entry = await client.getDynamicFieldObject({
            parentId: tableId,
            name: { type: "u64", value: String(cycle) },
          });
          const value = (entry.data?.content as { fields?: { value?: string } })?.fields?.value;
          if (value) winners.push({ cycle, address: value });
        } catch {
          // field may not exist yet
        }
      }
      return winners;
    },
    enabled: !!poolAddress && currentCycle > 0,
    refetchInterval: CHAIN_POLL_INTERVAL_MS,
  });
  return { cycleWinners: data, isLoading };
}

// ─── Write Hooks (useSignAndExecuteTransaction) ────────────────────

export function useJoinPool() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const joinPool = (
    poolId: string,
    collateralAmount: number,
    usdcCoinId: string,
    onSuccess?: (response: TransactionResult) => void,
  ) => {
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
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
        onSuccess?.(response);
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
  const client = useSuiClient();
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction<TransactionResult>({
    execute: async ({ bytes, signature }) => {
      const response = await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showObjectChanges: true,
        },
      });

      return {
        digest: response.digest,
        objectChanges: response.objectChanges?.map((change) => ({
          type: change.type,
          objectType: "objectType" in change ? change.objectType : undefined,
          objectId: "objectId" in change ? change.objectId : undefined,
        })),
      };
    },
  });
  const queryClient = useQueryClient();
  const [txResponse, setTxResponse] = useState<TransactionResult | null>(null);

  const COLLATERAL_MULTIPLIER = DEFAULT_COLLATERAL_MULTIPLIER;

  const createPool = (
    depositAmount: number,
    maxParticipants: number,
    cycleDurationMs: number,
    usdcCoinId: string,
    onSuccess?: (response: TransactionResult) => void,
    onError?: (error: Error) => void,
  ) => {
    const tx = new Transaction();

    const requiredCollateral = getRequiredCollateralAmount(
      depositAmount,
      maxParticipants,
      COLLATERAL_MULTIPLIER,
    );
    const [collateralCoin] = tx.splitCoins(tx.object(usdcCoinId), [tx.pure.u64(requiredCollateral * 1_000_000)]);

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_factory::create_custom_pool`,
      arguments: [
        tx.object(SUI_FACTORY_ID),
        collateralCoin,
        tx.pure.u64(depositAmount * 1_000_000),
        tx.pure.u64(maxParticipants),
        tx.pure.u64(cycleDurationMs),
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
      onError: (mutationError) => {
        onError?.(mutationError as Error);
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

export function useStartPool() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const startPool = (poolId: string, poolAdminCapId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::start_pool`,
      arguments: [
        tx.object(poolAdminCapId),
        tx.object(poolId),
        tx.object(SUI_CLOCK_ID),
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
    startPool,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useSelectWinner() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const selectWinner = (poolId: string, poolAdminCapId: string) => {
    const tx = new Transaction();

    const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)));

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::set_pool_seal_seed`,
      arguments: [
        tx.object(poolAdminCapId),
        tx.object(poolId),
        tx.pure.vector("u8", seed),
      ],
      typeArguments: [SUI_USDC_TYPE],
    });

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::select_winner`,
      arguments: [
        tx.object(poolAdminCapId),
        tx.object(poolId),
        tx.object(SUI_CLOCK_ID),
        tx.object("0x8"),
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
    selectWinner,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useEndPool() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const endPool = (poolId: string, poolAdminCapId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::end_pool`,
      arguments: [
        tx.object(poolAdminCapId),
        tx.object(poolId),
        tx.object("0x8"),
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
    endPool,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useTransferAdminCap() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const transferAdminCap = (poolAdminCapId: string, newOwnerAddress: string) => {
    const tx = new Transaction();

    tx.transferObjects([tx.object(poolAdminCapId)], tx.pure.address(newOwnerAddress));

    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
      },
    });
  };

  return {
    transferAdminCap,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useSlashCollateral() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const slashCollateral = (poolId: string, poolAdminCapId: string, participantAddress: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::slash_collateral`,
      arguments: [
        tx.object(poolAdminCapId),
        tx.object(poolId),
        tx.pure.address(participantAddress),
        tx.object(SUI_CLOCK_ID),
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
    slashCollateral,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useLinkPoolMetadata() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const linkMetadata = (
    poolId: string,
    blobId: string,
    poolAdminCapId: string,
    onSuccess?: (response: TransactionResult) => void,
    onError?: (error: Error) => void,
  ) => {
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
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: ["suivan"] });
        onSuccess?.({ digest: response.digest });
      },
      onError: (mutationError) => {
        onError?.(mutationError as Error);
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

export function useSetPoolSealSeed() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const setPoolSealSeed = (poolId: string, poolAdminCapId: string, seed: number[]) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::set_pool_seal_seed`,
      arguments: [
        tx.object(poolAdminCapId),
        tx.object(poolId),
        tx.pure("vector<u8>", seed),
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
    setPoolSealSeed,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

export function useClaimFinal() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const account = useCurrentAccount();

  const claimFinal = (poolId: string) => {
    if (!account?.address) return;
    const tx = new Transaction();
    const [claimCoin] = tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::claim_final`,
      arguments: [tx.object(poolId)],
      typeArguments: [SUI_USDC_TYPE],
    });
    tx.transferObjects([claimCoin], tx.pure.address(account.address));

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

export function useClaimWinnerPayout() {
  const { mutate: signAndExecute, isPending, data: txData, error } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  const claimWinnerPayout = (poolId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_pool::claim_winner_payout`,
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
    claimWinnerPayout,
    hash: txData?.digest,
    isPending,
    isSuccess: !!txData,
    error,
  };
}

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
