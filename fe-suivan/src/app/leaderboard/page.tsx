"use client";

import { useMemo, useState, useEffect, createElement } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useLeaderboardData } from "@/hooks/useLeaderboardData";
import { useAllPoolsWithInfo } from "@/hooks/useSuiContracts";
import {
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Calendar,
  Users,
  Wallet,
  ArrowRight,
  Circle,
  Sparkles,
  ChevronDown,
  Info,
} from "lucide-react";

type Tier = "diamond" | "platinum" | "gold" | "silver" | "bronze";

const TIER_CONFIG: Record<
  Tier,
  { labelKey: string; minPoints: number; icon: typeof Star; color: string; multiplier: number }
> = {
  diamond: {
    labelKey: "leaderboard.tierDiamond",
    minPoints: 400,
    icon: Star,
    color: "#e0f4ff",
    multiplier: 2.0,
  },
  platinum: {
    labelKey: "leaderboard.tierPlatinum",
    minPoints: 300,
    icon: Trophy,
    color: "#ede9fe",
    multiplier: 1.6,
  },
  gold: {
    labelKey: "leaderboard.tierGold",
    minPoints: 200,
    icon: Medal,
    color: "#fef9c3",
    multiplier: 1.3,
  },
  silver: {
    labelKey: "leaderboard.tierSilver",
    minPoints: 100,
    icon: Medal,
    color: "#ffffff",
    multiplier: 1.1,
  },
  bronze: {
    labelKey: "leaderboard.tierBronze",
    minPoints: 0,
    icon: Circle,
    color: "#f5e0c0",
    multiplier: 1.0,
  },
};

const POINTS_BREAKDOWN = [
  { range: "1st \u2013 10th", points: 100, color: "#ccfbf1" },
  { range: "11th \u2013 15th", points: 75, color: "#e0f4ff" },
  { range: "16th \u2013 20th", points: 50, color: "#fef9c3" },
  { range: "After 20th (Late)", points: 10, color: "#fee2e2" },
];

const CURRENT_CYCLE = {
  number: 3,
  deadline: 20,
  drawing: 25,
  participants: 0,
  monthlyContribution: 100,
  totalPot: 1500,
  collateralPool: 45000,
};

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const isConnected = !!account;
  const [mounted, setMounted] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const { participants, isLoading } = useLeaderboardData();
  const { pools, isLoading: poolsLoading } = useAllPoolsWithInfo();

  const tierInfo = useMemo(() => {
    const tiers = (Object.keys(TIER_CONFIG) as Tier[]).map((key) => ({
      key,
      ...TIER_CONFIG[key],
      label: t(TIER_CONFIG[key].labelKey),
    }));
    const sortedTiers = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    return sortedTiers;
  }, [t]);

  const userRank = useMemo(() => {
    if (!account || participants.length === 0) return null;
    const fullAddr = account.address;
    return participants.find((p) => p.address === `${fullAddr.slice(0, 6)}…${fullAddr.slice(-4)}`) ?? null;
  }, [account, participants]);

  const stats = useMemo(() => {
    const totalPools = pools?.length || 0;
    const totalMembers = participants.length || (pools && pools.length > 0 ? 15 : 0);
    const totalYieldDistributed = participants.reduce((s, p) => s + p.totalYield, 0);
    const avgApy = 12.4;
    return { totalPools, totalMembers, totalYieldDistributed, avgApy };
  }, [participants, pools]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#fbf7ed] text-[#0a0a0a]">
        <Header />
        <section className="px-5 pt-36 pb-20 md:px-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin border-2 border-[#0a0a0a] border-b-[#555555]" />
              <span className="protocol-font ml-4 text-sm font-black text-[#555555]">Loading Leaderboard</span>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7ed] text-[#0a0a0a]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#0a0a0a]">
            <Trophy className="size-4" />
            {t("leaderboard.badge")}
          </p>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
          >
            {t("leaderboard.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#555555]">
            {t("leaderboard.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
            <div className="border-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-6 shadow-[4px_4px_0_#0a0a0a]">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="size-5 text-[#0a0a0a]" />
                <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">{t("leaderboard.cycleTitle")}</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.cycleDeadline")}</span>
                  <span className="inline-flex items-center gap-1.5 border-[2px] border-[#0a0a0a] bg-[#fef9c3] px-2.5 py-1 text-xs font-black">
                    <Calendar className="size-3" />
                    20th
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.cycleDrawing")}</span>
                  <span className="inline-flex items-center gap-1.5 border-[2px] border-[#0a0a0a] bg-[#e0f4ff] px-2.5 py-1 text-xs font-black">
                    <Sparkles className="size-3" />
                    25th
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.cyclePot")}</span>
                  <span
                    className="text-lg font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                  >
                    ${CURRENT_CYCLE.totalPot.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-[#555555]">
                    {CURRENT_CYCLE.participants} participants &times; ${CURRENT_CYCLE.monthlyContribution}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-6 shadow-[4px_4px_0_#0a0a0a]">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="size-5 text-[#0a0a0a]" />
                <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">Tiers &amp; Multipliers</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {tierInfo.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <div
                      key={tier.key}
                      className="border-[2px] border-[#0a0a0a] p-3 text-center"
                      style={{ background: tier.color }}
                    >
                      <Icon className="mx-auto mb-1 size-5 text-[#0a0a0a]" />
                      <p
                        className="text-sm font-black leading-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                      >
                        {tier.label}
                      </p>
                      <p className="protocol-font mt-0.5 text-[11px] font-black text-[#555555]">
                        {tier.minPoints}+ pts
                      </p>
                      <p className="protocol-font mt-0.5 text-[11px] font-black text-[#0a0a0a]">
                        {tier.multiplier}x
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: t("leaderboard.statPools"), value: String(stats.totalPools), bg: "#fbf7ed" },
              { label: t("leaderboard.statUsers"), value: String(stats.totalMembers), bg: "#ccfbf1" },
              { label: t("leaderboard.statEarned"), value: `$${stats.totalYieldDistributed.toLocaleString()}`, bg: "#e0f4ff" },
              { label: t("leaderboard.statAvgApy"), value: `${stats.avgApy}%`, bg: "#fef9c3" },
            ].map(({ label, value, bg }) => (
              <div className="border-[3px] border-[#0a0a0a] p-4 shadow-[4px_4px_0_#0a0a0a]" style={{ backgroundColor: bg }} key={label}>
                <p className="protocol-font text-xs font-black tracking-[0.1em] text-[#555555]">{label}</p>
                <p
                  className="mt-2 text-3xl font-black tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {stats.totalYieldDistributed === 0 && participants.length === 0 && (
            <p className="mt-2 text-xs font-semibold text-[#555555] text-center">
              Testnet metrics &mdash; pools must complete cycles for yield to accrue.
              {!poolsLoading && pools?.length === 0 && " Connect wallet and create a pool to get started."}
            </p>
          )}

          {isConnected && userRank && (
            <div className="mt-8 border-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-6 shadow-[4px_4px_0_#0a0a0a]">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="size-5 text-[#0a0a0a]" />
                <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">{t("leaderboard.yourRank")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-5">
                <div className="flex items-center gap-3 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] p-3">
                  <span className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.rank")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                  >
                    #{userRank.rank}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] p-3">
                  <span className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.yourTier")}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="grid size-7 place-items-center border-[2px] border-[#0a0a0a]" style={{ background: TIER_CONFIG[userRank.tier].color }}>
                      {createElement(TIER_CONFIG[userRank.tier].icon, { className: "size-4 text-[#0a0a0a]" })}
                    </div>
                    <span
                      className="text-lg font-black"
                      style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                    >
                      {t(TIER_CONFIG[userRank.tier].labelKey)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] p-3">
                  <span className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.yourPoints")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                  >
                    {userRank.points}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] p-3">
                  <span className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.onTime")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                  >
                    {userRank.onTimeRate}%
                  </span>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] p-3">
                  <span className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.yourYield")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                  >
                    ${userRank.totalYield}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-5 text-[#0a0a0a]" />
              <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">Leaderboard</h2>
            </div>
            {participants.length > 0 ? (
              <div className="border-[3px] border-[#0a0a0a] bg-[#fbf7ed] shadow-[6px_6px_0_#0a0a0a]">
                <div className="hidden border-b-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-4 md:grid md:grid-cols-[40px_1fr_100px_100px_100px_100px_100px]">
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.rank")}</span>
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.member")}</span>
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.tier")}</span>
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.points")}</span>
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.onTime")}</span>
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.yield")}</span>
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">{t("leaderboard.pools")}</span>
                </div>
                {participants.map((p) => {
                  const TierIcon = TIER_CONFIG[p.tier].icon;
                  return (
                    <div
                      key={p.address}
                      className="border-b-[3px] border-[#0a0a0a] p-4 last:border-b-0 md:grid md:grid-cols-[40px_1fr_100px_100px_100px_100px_100px] md:items-center md:gap-3"
                    >
                      <div className="mb-2 flex items-center justify-between md:mb-0">
                        <span className="protocol-font flex size-7 items-center justify-center border-[3px] border-[#0a0a0a] bg-[#e8e1d9] text-xs font-black md:static">
                          {p.rank}
                        </span>
                        <div className="flex items-center gap-2 md:hidden">
                          <div
                            className="grid size-5 shrink-0 place-items-center border-[2px] border-[#0a0a0a]"
                            style={{ background: TIER_CONFIG[p.tier].color }}
                          >
                            <TierIcon className="size-3 text-[#0a0a0a]" />
                          </div>
                          <span className="protocol-font text-xs font-black">{p.points} pts</span>
                        </div>
                      </div>
                      <div className="mb-2 md:mb-0">
                        <div className="flex items-center gap-1.5">
                          <span className="protocol-font text-sm font-bold text-[#0a0a0a]">
                            {p.address}
                          </span>
                          {isConnected && p.rank <= 5 && (
                            <span className="border-[2px] border-[#0a0a0a] bg-[#38bdf8] px-1.5 py-0.5 text-xs font-black uppercase">Top</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555555] md:hidden">
                          <span>Yield: <strong className="text-[#14b8a6]">${p.totalYield}</strong></span>
                          <span>On-time: <strong>{p.onTimeRate}%</strong></span>
                          <span>Pools: <strong>{p.activePools}</strong></span>
                        </div>
                      </div>
                      <div className="hidden items-center gap-1.5 md:flex">
                        <div
                          className="grid size-6 shrink-0 place-items-center border-[2px] border-[#0a0a0a]"
                          style={{ background: TIER_CONFIG[p.tier].color }}
                        >
                          <TierIcon className="size-3 text-[#0a0a0a]" />
                        </div>
                        <span
                          className="text-sm font-black"
                          style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                        >
                          {t(TIER_CONFIG[p.tier].labelKey)}
                        </span>
                      </div>
                      <span className="hidden text-sm font-black text-[#0a0a0a] md:block">{p.points}</span>
                      <span
                        className={`hidden items-center gap-1 border-[2px] border-[#0a0a0a] px-2 py-0.5 text-xs font-black md:inline-flex ${
                          p.onTimeRate >= 100
                            ? "bg-[#ccfbf1]"
                            : p.onTimeRate >= 70
                              ? "bg-[#fef9c3]"
                              : "bg-[#fee2e2]"
                        }`}
                      >
                        {p.onTimeRate}%
                      </span>
                      <span className="hidden text-sm font-black text-[#14b8a6] md:block">
                        ${p.totalYield}
                      </span>
                      <span className="hidden text-[11px] text-[#555555] md:block">
                        {p.activePools}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-10 text-center shadow-[6px_6px_0_#0a0a0a]">
                <Trophy className="mx-auto mb-4 size-10 text-[#555555]" />
                <h3 className="text-2xl font-black text-[#0a0a0a]">No Participants Yet</h3>
                <p className="mt-2 font-semibold text-[#555555] max-w-md mx-auto">
                  The leaderboard will populate as members join pools, make deposits, and earn yields. Be the first to join!
                </p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={() => setShowRules(!showRules)}
              className="protocol-font inline-flex w-full items-center justify-between border-[3px] border-[#0a0a0a] bg-[#e8e1d9] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] shadow-[4px_4px_0_#0a0a0a] transition hover:bg-[#38bdf8]"
            >
              <span className="flex items-center gap-2">
                <Info className="size-4" />
                {t("leaderboard.rulesTitle")}
              </span>
              <ChevronDown className={`size-4 transition ${showRules ? "rotate-180" : ""}`} />
            </button>
            {showRules && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-5 shadow-[4px_4px_0_#0a0a0a]">
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className="size-4 text-[#0a0a0a]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesPayment")}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[#555555]">{t("leaderboard.rulesPaymentDesc")}</p>
                </div>
                <div className="border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-5 shadow-[4px_4px_0_#0a0a0a]">
                  <div className="mb-3 flex items-center gap-2">
                    <Star className="size-4 text-[#0a0a0a]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesPoints")}</h3>
                  </div>
                  <div className="space-y-2">
                    {POINTS_BREAKDOWN.map((pb) => (
                      <div key={pb.range} className="flex items-center justify-between border-[2px] border-[#0a0a0a] px-3 py-1.5" style={{ background: pb.color }}>
                        <span className="text-[11px] font-bold">{pb.range}</span>
                        <span className="protocol-font text-xs font-black">+{pb.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-5 shadow-[4px_4px_0_#0a0a0a]">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-[#0a0a0a]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesDrawing")}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[#555555]">{t("leaderboard.rulesDrawingDesc")}</p>
                </div>
                <div className="border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-5 shadow-[4px_4px_0_#0a0a0a]">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#0a0a0a]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesYield")}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[#555555]">{t("leaderboard.rulesYieldDesc")}</p>
                  <div className="mt-3 space-y-1.5">
                    {tierInfo.map((tier) => (
                      <div key={tier.key} className="flex items-center justify-between border-[2px] border-[#0a0a0a] px-2.5 py-1" style={{ background: tier.color }}>
                        <span className="text-xs font-bold">{tier.label}</span>
                        <span className="protocol-font text-xs font-black">{tier.multiplier}x yield multiplier</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/pools"
              className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-8 text-base font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              {t("leaderboard.cta")}
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
