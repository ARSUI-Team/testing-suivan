"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

// Types
export interface ProtocolYield {
  name: string;
  address: string;
  apy: number;
  tvl: number;
  riskScore: number;
  lastUpdated: string;
}

export interface MarketCondition {
  volatilityIndex: number;
  trendDirection: "bullish" | "bearish" | "neutral";
  gasPrice: number;
}

export interface AllocationStrategy {
  protocol: string;
  address: string;
  percentage: number;
  expectedYield: number;
}

export interface YieldRecommendation {
  recommendedProtocol: string;
  recommendedAddress: string;
  expectedApy: number;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  reasoning: string[];
  allocation: AllocationStrategy[];
}

export interface YieldsResponse {
  success: boolean;
  data: {
    protocols: ProtocolYield[];
    market: MarketCondition;
    stats: {
      avgApy: number;
      maxApy: number;
      minApy: number;
      totalTvl: number;
      protocolCount: number;
    };
  };
  timestamp: string;
}

export interface RecommendationResponse {
  success: boolean;
  data: {
    recommendation: YieldRecommendation;
    riskTolerance: string;
    generatedAt: string;
  };
}

export interface StrategyResponse {
  success: boolean;
  data: {
    optimalStrategy: YieldRecommendation;
    protocols: {
      name: string;
      address: string;
      apy: number;
      tvl: number;
      riskScore: number;
    }[];
    bestSingleProtocol: {
      name: string;
      apy: number;
    };
    aiAdvantage: {
      diversifiedApy: number;
      singleProtocolApy: number;
      riskReduction: string;
    };
    timestamp: string;
  };
}

// Hook to fetch current yields
export function useYields() {
  return useQuery<YieldsResponse>({
    queryKey: ["yields"],
    queryFn: async () => {
      const res = await fetch("/api/yields");
      if (!res.ok) throw new Error("Failed to fetch yields");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook to get AI recommendation
export function useAIRecommendation(riskTolerance: "conservative" | "moderate" | "aggressive" = "moderate") {
  return useQuery<RecommendationResponse>({
    queryKey: ["recommendation", riskTolerance],
    queryFn: async () => {
      const res = await fetch("/api/yields/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskTolerance }),
      });
      if (!res.ok) throw new Error("Failed to get recommendation");
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook to get optimal strategy
export function useOptimalStrategy(riskTolerance: string = "moderate") {
  return useQuery<StrategyResponse>({
    queryKey: ["strategy", riskTolerance],
    queryFn: async () => {
      const res = await fetch(`/api/strategy?risk=${riskTolerance}`);
      if (!res.ok) throw new Error("Failed to fetch strategy");
      return res.json();
    },
    refetchInterval: 60000,
  });
}

// Hook for strategy analysis mutation
export function useStrategyAnalysis() {
  return useMutation({
    mutationFn: async ({
      currentAllocation,
      riskTolerance,
    }: {
      currentAllocation: AllocationStrategy[];
      riskTolerance: string;
    }) => {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAllocation, riskTolerance }),
      });
      if (!res.ok) throw new Error("Failed to analyze strategy");
      return res.json();
    },
  });
}

// Combined hook for AI dashboard
export function useAIDashboard() {
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "moderate" | "aggressive">("moderate");

  const yieldsQuery = useYields();
  const strategyQuery = useOptimalStrategy(riskTolerance);
  const recommendationQuery = useAIRecommendation(riskTolerance);

  const refetchAll = useCallback(() => {
    yieldsQuery.refetch();
    strategyQuery.refetch();
    recommendationQuery.refetch();
  }, [yieldsQuery, strategyQuery, recommendationQuery]);

  return {
    riskTolerance,
    setRiskTolerance,
    yields: yieldsQuery.data?.data,
    strategy: strategyQuery.data?.data,
    recommendation: recommendationQuery.data?.data?.recommendation,
    isLoading: yieldsQuery.isLoading || strategyQuery.isLoading || recommendationQuery.isLoading,
    error: yieldsQuery.error || strategyQuery.error || recommendationQuery.error,
    refetchAll,
  };
}
