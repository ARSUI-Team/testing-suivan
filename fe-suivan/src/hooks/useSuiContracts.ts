"use client";

import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SUI_PACKAGE_ID, SUI_FACTORY_ID, SUI_USDC_TYPE } from "@/config/sui";

// ─── Types ────────────────────────────────────────────────────────

export interface SuiPoolInfo {
  id: string;
  depositAmount: number;
  maxParticipants: number;
  currentParticipants: number;
  cycle: number;
  started: boolean;
  active: boolean;
  totalFunds: number;
  yield: number;
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
}

export interface ParticipantInfo {
  addr: string;
  collateralAmount: number;
  totalDeposited: number;
  missedPayments: number;
  hasReceivedPayout: boolean;
  isActive: boolean;
  joinedAt: number;
}

// ─── Helper ────────────────────────────────────────────────────────

function parsePoolFields(fields: Record<string, unknown>): SuiPoolInfo | null {
  try {
    return {
      id: String(fields.id || ""),
      depositAmount: Number(fields.deposit_amount || 0) / 1_000_000,
      maxParticipants: Number(fields.max_participants || 0),
      currentParticipants: Number(fields.current_participants || 0),
      cycle: Number(fields.cycle || 0),
      started: Boolean(fields.started),
      active: Boolean(fields.active),
      totalFunds: Number(fields.total_funds || 0) / 1_000_000,
      yield: Number(fields.yield_amount || 0) / 1_000_000,
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

      const obj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });

      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const raw = fields?.all_pools as { fields?: { value: { fields?: unknown }[] } } | undefined;
      const poolIds = raw?.fields?.value?.map((v: unknown) => String((v as { fields?: { value?: string } }).fields?.value)) ?? [];
      return poolIds as string[];
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
      return Number(fields?.collateral_amount || 0) / 1_000_000;
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
        totalDeposited: Number(fields.total_deposited || 0) / 1_000_000,
        missedPayments: Number(fields.missed_payments || 0),
        hasReceivedPayout: Boolean(fields.has_received_payout),
        isActive: Boolean(fields.is_active),
        joinedAt: Number(fields.joined_at || 0),
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
      const raw = fields?.participants as { fields?: { value: { fields?: unknown }[] } } | undefined;
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
        return Boolean(fields?.deposited_this_cycle);
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
      if (!poolAddress) return 0;
      const obj = await client.getObject({
        id: poolAddress,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      return Number(fields?.current_yield || 0) / 1_000_000;
    },
    enabled: !!poolAddress,
  });
  return { currentYield: data ?? 0, isLoading, refetch };
}

export function useUSDCBalance(address: string | undefined) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
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

  const createPool = (depositAmount: number, maxParticipants: number, cycleDurationDays: number, usdcCoinId: string) => {
    const tx = new Transaction();

    const requiredCollateral = Math.ceil(depositAmount * (maxParticipants - 1) * 1.25);
    const [collateralCoin] = tx.splitCoins(tx.object(usdcCoinId), [tx.pure.u64(requiredCollateral * 1_000_000)]);

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::arisan_factory::create_custom_pool`,
      arguments: [
        tx.object(SUI_FACTORY_ID),
        collateralCoin,
        tx.pure.u64(depositAmount * 1_000_000),
        tx.pure.u64(maxParticipants),
        tx.pure.u64(cycleDurationDays * 24 * 60 * 60 * 1000),
        tx.pure.u64(125),
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
    createPool,
    hash: txData?.digest,
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
