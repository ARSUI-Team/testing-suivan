"use client";

import { useQuery } from "@tanstack/react-query";

export interface DeepBookPoolInfo {
  poolKey: string;
  poolId: string;
  baseAsset: string;
  quoteAsset: string;
  baseDecimals: number;
  quoteDecimals: number;
  minSize: number;
  lotSize: number;
  tickSize: number;
}

export interface PoolOrderbookLevel {
  price: number;
  quantity: number;
}

export interface PoolOrderbook {
  bids: PoolOrderbookLevel[];
  asks: PoolOrderbookLevel[];
}

const INDEXER = "https://deepbook-indexer.testnet.mystenlabs.com";

const DEEPBOOK_POOLS: DeepBookPoolInfo[] = [
  {
    poolKey: "DEEP_SUI",
    poolId: "0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f",
    baseAsset: "DEEP", quoteAsset: "SUI",
    baseDecimals: 6, quoteDecimals: 9,
    minSize: 10_000_000, lotSize: 1_000_000, tickSize: 10_000_000,
  },
  {
    poolKey: "SUI_DBUSDC",
    poolId: "0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5",
    baseAsset: "SUI", quoteAsset: "DBUSDC",
    baseDecimals: 9, quoteDecimals: 6,
    minSize: 1_000_000_000, lotSize: 100_000_000, tickSize: 10,
  },
  {
    poolKey: "DEEP_DBUSDC",
    poolId: "0xe86b991f8632217505fd859445f9803967ac84a9d4a1219065bf191fcb74b622",
    baseAsset: "DEEP", quoteAsset: "DBUSDC",
    baseDecimals: 6, quoteDecimals: 6,
    minSize: 10_000_000, lotSize: 1_000_000, tickSize: 1_000_000,
  },
  {
    poolKey: "DBUSDT_DBUSDC",
    poolId: "0x83970bb02e3636efdff8c141ab06af5e3c9a22e2f74d7f02a9c3430d0d10c1ca",
    baseAsset: "DBUSDT", quoteAsset: "DBUSDC",
    baseDecimals: 6, quoteDecimals: 6,
    minSize: 1_000_000, lotSize: 100_000, tickSize: 1_000_000,
  },
  {
    poolKey: "WAL_SUI",
    poolId: "0x8c1c1b186c4fddab1ebd53e0895a36c1d1b3b9a77cd34e607bef49a38af0150a",
    baseAsset: "WAL", quoteAsset: "SUI",
    baseDecimals: 9, quoteDecimals: 9,
    minSize: 1_000_000_000, lotSize: 100_000_000, tickSize: 1_000,
  },
  {
    poolKey: "WAL_DBUSDC",
    poolId: "0xeb524b6aea0ec4b494878582e0b78924208339d360b62aec4a8ecd4031520dbb",
    baseAsset: "WAL", quoteAsset: "DBUSDC",
    baseDecimals: 9, quoteDecimals: 6,
    minSize: 1_000_000_000, lotSize: 100_000_000, tickSize: 1,
  },
  {
    poolKey: "DBTC_DBUSDC",
    poolId: "0x0dce0aa771074eb83d1f4a29d48be8248d4d2190976a5241f66b43ec18fa34de",
    baseAsset: "DBTC", quoteAsset: "DBUSDC",
    baseDecimals: 8, quoteDecimals: 6,
    minSize: 1_000, lotSize: 1_000, tickSize: 10_000_000,
  },
];

export function useDeepBookPools() {
  return useQuery({
    queryKey: ["deepbook", "pools"],
    queryFn: async () => {
      const res = await fetch(`${INDEXER}/get_pools`);
      if (!res.ok) throw new Error("Failed to fetch DeepBook pools");
      return res.json() as Promise<DeepBookPoolInfo[]>;
    },
    staleTime: 60_000,
  });
}

export function usePoolOrderbook(poolKey: string | null) {
  return useQuery({
    queryKey: ["deepbook", "orderbook", poolKey],
    queryFn: async (): Promise<PoolOrderbook> => {
      const res = await fetch(`${INDEXER}/orderbook/${poolKey}`);
      if (!res.ok) throw new Error(`Failed to fetch orderbook for ${poolKey}`);
      return res.json();
    },
    enabled: !!poolKey,
    refetchInterval: 30_000,
  });
}

export function usePoolTVL(poolKey: string | null) {
  const { data: orderbook } = usePoolOrderbook(poolKey);

  if (!orderbook) return { tvl: 0, bidDepth: 0, askDepth: 0, midPrice: 0, spread: 0 };

  const totalBidDepth = orderbook.bids.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const totalAskDepth = orderbook.asks.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const tvl = totalBidDepth + totalAskDepth;

  const bestBid = orderbook.bids.length > 0 ? orderbook.bids[0].price : 0;
  const bestAsk = orderbook.asks.length > 0 ? orderbook.asks[0].price : 0;
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
  const spread = bestBid > 0 && bestAsk > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;

  return { tvl, bidDepth: totalBidDepth, askDepth: totalAskDepth, midPrice, spread };
}

export function useHistoricVolume(poolKey: string | null, days = 7) {
  return useQuery({
    queryKey: ["deepbook", "volume", poolKey, days],
    queryFn: async () => {
      const now = Math.floor(Date.now() / 1000);
      const start = now - days * 86400;
      const res = await fetch(`${INDEXER}/historical_volume/${poolKey}?start_time=${start}&end_time=${now}`);
      if (!res.ok) throw new Error(`Failed to fetch volume for ${poolKey}`);
      return res.json() as Promise<{ timestamp: number; volume: number }[]>;
    },
    enabled: !!poolKey,
    staleTime: 300_000,
  });
}

export function getPoolInfo(poolKey: string): DeepBookPoolInfo | undefined {
  return DEEPBOOK_POOLS.find((p) => p.poolKey === poolKey);
}

export const ALL_POOL_KEYS = DEEPBOOK_POOLS.map((p) => p.poolKey);
export { DEEPBOOK_POOLS };
