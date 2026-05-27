"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
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

export default function YieldSignalsPage() {
  const [data, setData] = useState<YieldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gsapRef = useGsapEntrance([data]);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/yields")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.error);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getRiskColor = (score: number) => {
    if (score <= 3) return "bg-[#d9f8df] text-green-700";
    if (score <= 5) return "bg-[#fff1c7] text-yellow-700";
    return "bg-[#ffe0d8] text-red-700";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "bullish": return "↑";
      case "bearish": return "↓";
      default: return "→";
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf7ed] text-slate-950">
      <Header />
      <section ref={gsapRef} className="px-5 pb-20 pt-32 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="gsap-up mb-5 inline-flex rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] shadow-[4px_4px_0_#06111f]">
            {t("ai.badge")}
          </div>
          <h1 className="gsap-up max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {t("ai.title")}
          </h1>
          <p className="gsap-up mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
            {t("ai.subtitle")}
          </p>

          {loading && (
            <div className="mt-10 flex items-center justify-center py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-950 border-b-sky-400" />
              <span className="protocol-font ml-4 text-sm font-black text-slate-500">{t("ai.loading")}</span>
            </div>
          )}

          {error && (
            <div className="mt-10 rounded-[1.5rem] border-2 border-slate-950 bg-[#ffe0d8] p-5 shadow-[5px_5px_0_#06111f]">
              <p className="protocol-font text-xs font-black text-red-700">{t("ai.errorTitle")}</p>
              <p className="mt-2 font-semibold text-slate-700">{error}</p>
            </div>
          )}

          {data && (
            <>
              <div className="gsap-up mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border-2 border-slate-950 bg-white p-4 shadow-[4px_4px_0_#06111f]">
                  <p className="protocol-font text-xs font-black text-slate-400">{t("ai.avgApy")}</p>
                  <p className="protocol-font mt-2 text-3xl font-black text-slate-950">{data.stats.avgApy.toFixed(2)}%</p>
                </div>
                <div className="rounded-2xl border-2 border-slate-950 bg-[#d9f8df] p-4 shadow-[4px_4px_0_#06111f]">
                  <p className="protocol-font text-xs font-black text-slate-500">{t("ai.maxApy")}</p>
                  <p className="protocol-font mt-2 text-3xl font-black text-slate-950">{data.stats.maxApy.toFixed(2)}%</p>
                </div>
                <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4 shadow-[4px_4px_0_#06111f]">
                  <p className="protocol-font text-xs font-black text-slate-500">{t("ai.protocols")}</p>
                  <p className="protocol-font mt-2 text-3xl font-black text-slate-950">{data.stats.protocolCount}</p>
                </div>
                <div className="rounded-2xl border-2 border-slate-950 bg-[#fff1c7] p-4 shadow-[4px_4px_0_#06111f]">
                  <p className="protocol-font text-xs font-black text-slate-500">{t("ai.totalTvl")}</p>
                  <p className="protocol-font mt-2 text-3xl font-black text-slate-950">${(data.stats.totalTvl / 1e6).toFixed(1)}M</p>
                </div>
              </div>

              <div className="gsap-up mt-8 rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-[-0.04em]">{t("ai.protocolYields")}</h2>
                  <span className="protocol-font text-xs font-black text-slate-400">
                    {t("ai.trend")}: {getTrendIcon(data.market.trendDirection)} {data.market.trendDirection}
                  </span>
                </div>
                <div className="space-y-2">
                  {data.protocols.map((p) => (
                    <div key={p.name} className="flex items-center justify-between rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4 transition hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="protocol-font text-sm font-black text-slate-950">{p.name}</p>
                          <p className="protocol-font text-xs font-black text-slate-400">{p.chain}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="protocol-font text-lg font-black text-slate-950">{p.apy.toFixed(2)}%</p>
                          <p className="protocol-font text-xs font-black text-slate-400">${(p.tvl / 1e6).toFixed(1)}M TVL</p>
                        </div>
                        <span className={`protocol-font rounded-full border-2 border-slate-950 px-3 py-1 text-xs font-black ${getRiskColor(p.riskScore)}`}>
                          L{p.riskScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="gsap-up mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border-2 border-slate-950 bg-[#dff8ff] p-5 shadow-[5px_5px_0_#06111f]">
                  <p className="protocol-font text-xs font-black uppercase text-sky-700">{t("ai.marketConditions")}</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">{t("ai.volatilityIndex")}</span>
                      <span className="protocol-font font-black">{data.market.volatilityIndex}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">{t("ai.gasPrice")}</span>
                      <span className="protocol-font font-black">{data.market.suiRefGasPrice} MIST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">{t("ai.direction")}</span>
                      <span className="protocol-font font-black">{data.market.trendDirection}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border-2 border-slate-950 bg-[#d9f8df] p-5 shadow-[5px_5px_0_#06111f]">
                  <p className="protocol-font text-xs font-black uppercase text-teal-700">{t("ai.yieldRecommendation")}</p>
                  <p className="mt-4 text-lg font-black text-slate-950">
                    {t("ai.topProtocol")}: {data.protocols[0]?.name || "N/A"} — {data.protocols[0]?.apy.toFixed(2) || "0"}%
                  </p>
                  <Link
                    href="/api/yields/recommend"
                    className="protocol-font mt-4 inline-flex rounded-full border-2 border-slate-950 bg-sky-400 px-4 py-2 text-xs font-black text-slate-950 shadow-[3px_3px_0_#06111f] transition hover:-translate-y-0.5"
                  >
                    {t("ai.generateStrategy")}
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="mt-10">
            <Link
              className="protocol-font inline-flex rounded-full border-2 border-slate-950 bg-sky-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5"
              href="/pools"
            >
              {t("ai.explorePools")}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
