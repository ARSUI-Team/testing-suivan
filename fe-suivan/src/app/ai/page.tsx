"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useGsapEntrance } from "@/hooks/useGsapEntrance";

interface ProtocolYield {
  name: string;
  apy: number;
  tvl: number;
  riskScore: number;
  chain: string;
  source: string;
}

interface YieldData {
  protocols: ProtocolYield[];
  market: {
    volatilityIndex: number;
    trendDirection: string;
    suiRefGasPrice: number;
  };
  stats: {
    avgApy: number;
    maxApy: number;
    minApy: number;
    totalTvl: number;
    protocolCount: number;
  };
}

interface YieldRecommendation {
  bestSingleProtocol: { name: string; apy: number; tvl: number } | null;
  aiAdvantage: { expectedApy: number; riskReduction: string };
}

export default function YieldSignalsPage() {
  const [data, setData] = useState<YieldData | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<YieldRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const gsapRef = useGsapEntrance([data]);
  const { t } = useLanguage();

  const generateStrategy = useCallback(async () => {
    setLoadingRec(true);
    try {
      const res = await fetch("/api/yields/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ riskTolerance: "moderate" }) });
      const json = await res.json();
      if (json.success) setRecommendation(json.data);
    } catch { /* ignore */ } finally { setLoadingRec(false); }
  }, []);

  useEffect(() => {
    fetch("/api/yields")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) { setData(res.data); setTimestamp(res.timestamp); }
        else setError(res.error);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getRiskColor = (score: number) => {
    if (score <= 3) return "bg-[#ccfbf1]";
    if (score <= 5) return "bg-[#fef9c3]";
    return "bg-[#fee2e2]";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "bullish": return "↑";
      case "bearish": return "↓";
      default: return "→";
    }
  };

  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />
      <section ref={gsapRef} className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="gsap-up protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#f8672d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[12px_12px_0_#0a0a0a]">
            <BrainCircuit className="size-4" />
            {t("ai.badge")}
          </p>
          <h1 className="gsap-up mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>
            {t("ai.title")}
          </h1>
          <p className="gsap-up mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#555555]">
            {t("ai.subtitle")}
          </p>

          {loading && (
            <div className="mt-10 flex items-center justify-center py-16">
              <div className="h-12 w-12 animate-spin border-2 border-[#0a0a0a] border-b-[#555555]" />
              <span className="protocol-font ml-4 text-sm font-black text-[#555555]">{t("ai.loading")}</span>
            </div>
          )}

          {error && (
            <div className="mt-10 border-[3px] border-[#0a0a0a] bg-[#fee2e2] p-5 shadow-[12px_12px_0_#0a0a0a]">
              <p className="protocol-font text-xs font-black text-[#0a0a0a]">{t("ai.errorTitle")}</p>
              <p className="mt-2 font-semibold text-[#0a0a0a]">{error}</p>
            </div>
          )}

          {data && (
            <>
              <div className="gsap-up mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                   { label: t("ai.avgApy"), value: `${data.stats.avgApy.toFixed(2)}%`, bg: "#e0f4ff" },
                   { label: t("ai.maxApy"), value: `${data.stats.maxApy.toFixed(2)}%`, bg: "#ccfbf1" },
                   { label: t("ai.protocols"), value: String(data.stats.protocolCount), bg: "#fef9c3" },
                   { label: t("ai.totalTvl"), value: `$${(data.stats.totalTvl / 1e6).toFixed(1)}M`, bg: "#ccfbf1" },
                ].map(({ label, value, bg }, idx) => (
                  <div key={label} className="relative border-[3px] border-[#0a0a0a] p-4 shadow-[12px_12px_0_#0a0a0a] overflow-hidden" style={{ backgroundColor: bg }}>
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-2">
                        <div className="w-6 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px)" }} />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>{String(idx + 1).padStart(2, "0")}</span>
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>{label}</p>
                      <p className="mt-2 text-3xl font-black" style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="gsap-up mt-8 border-[3px] border-[#0a0a0a] bg-[#ffffff] p-5 shadow-[12px_12px_0_#0a0a0a]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{t("ai.protocolYields")}</h2>
                  <span className="protocol-font text-xs font-black tracking-[0.1em] text-[#555555]">
                    {t("ai.trend")}: {getTrendIcon(data.market.trendDirection)} {data.market.trendDirection}
                  </span>
                </div>
                <div className="space-y-2">
                  {[...data.protocols].sort((a, b) => b.apy - a.apy).map((p) => (
                    <div key={p.name} className="flex items-center justify-between border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-4 transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="protocol-font text-sm font-black text-[#0a0a0a]">{p.name}</p>
                          <p className="protocol-font text-xs font-black tracking-[0.1em] text-[#555555]">{p.chain}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="protocol-font text-lg font-black text-[#0a0a0a]">{p.apy.toFixed(2)}%</p>
                          <p className="protocol-font text-xs font-black tracking-[0.1em] text-[#555555]">${(p.tvl / 1e6).toFixed(1)}M TVL</p>
                        </div>
                        <span className={`protocol-font border-[3px] border-[#0a0a0a] px-3 py-1 text-xs font-black ${getRiskColor(p.riskScore)}`}>
                          L{p.riskScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#555555]">
                  <span className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] px-2 py-0.5">L1–L3 Low Risk</span>
                  <span className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] px-2 py-0.5">L4–L5 Medium Risk</span>
                  <span className="border-[3px] border-[#0a0a0a] bg-[#fee2e2] px-2 py-0.5">L6+ High Risk</span>
                </div>
                {timestamp && (
                  <div className="mt-4 pt-3 border-t-[2px] border-[#0a0a0a] flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>source</span>
                      <span className="text-[10px] font-semibold text-[#14b8a6]">Sui RPC testnet</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#0a0a0a]" style={{ fontFamily: "'Courier New', monospace" }}>
                      {new Date(timestamp).toLocaleString("en-GB", { hour12: false })} GMT
                    </span>
                  </div>
                )}
              </div>

              <div className="gsap-up mt-8 grid gap-4 md:grid-cols-2">
                <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] p-5 shadow-[12px_12px_0_#0a0a0a] overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.04 }} />
                  <div className="relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <div className="w-10 h-3" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>market</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>{t("ai.marketConditions")}</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#555555]">{t("ai.volatilityIndex")}</span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#0a0a0a]">
                        <span className={`inline-block size-2 rounded-full ${data.market.volatilityIndex <= 30 ? 'bg-[#ccfbf1]' : data.market.volatilityIndex <= 60 ? 'bg-[#fef9c3]' : 'bg-[#fee2e2]'}`} />
                        {data.market.volatilityIndex}/100
                        <span className="text-xs text-[#555555]">
                          {data.market.volatilityIndex <= 30 ? "Low" : data.market.volatilityIndex <= 60 ? "Mid" : "High"}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#555555]">{t("ai.gasPrice")}</span>
                      <span className="font-bold text-[#0a0a0a]">{data.market.suiRefGasPrice} MIST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#555555]">{t("ai.direction")}</span>
                      <span className="font-bold text-[#0a0a0a]">{data.market.trendDirection}</span>
                    </div>
                  </div>
                  </div>
                </div>
                <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] p-5 shadow-[12px_12px_0_#0a0a0a] overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.04 }} />
                  <div className="relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <div className="w-10 h-3" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>yield</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>{t("ai.yieldRecommendation")}</p>
                  <p className="mt-4 text-lg font-black text-[#0a0a0a]">
                    {t("ai.topProtocol")}: {[...data.protocols].sort((a, b) => b.apy - a.apy)[0]?.name || "N/A"} — {[...data.protocols].sort((a, b) => b.apy - a.apy)[0]?.apy.toFixed(2) || "0"}%
                  </p>
                  {recommendation ? (
                    <div className="mt-4 space-y-2">
                      <p className="protocol-font text-sm font-black text-[#0a0a0a]">
                        {t("ai.recommendedProtocol")}: {recommendation.bestSingleProtocol?.name} ({recommendation.bestSingleProtocol?.apy.toFixed(2)}%)
                      </p>
                      <p className="protocol-font text-xs font-black text-[#0a0a0a]">
                        {t("ai.expectedApy")}: {recommendation.aiAdvantage.expectedApy.toFixed(2)}% | {t("ai.riskReduction")}: {recommendation.aiAdvantage.riskReduction}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={generateStrategy}
                      disabled={loadingRec}
                      className="protocol-font mt-4 inline-flex border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-4 py-2 text-xs font-black text-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {loadingRec ? t("ai.loading") : t("ai.generateStrategy")}
                    </button>
                  )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-10">
            <Link
              className="protocol-font inline-flex border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-6 py-3 text-sm font-black text-[#0a0a0a] shadow-[12px_12px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
              href="/pools"
            >
              {t("ai.explorePools")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
