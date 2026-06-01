"use client";

import { useMemo, useState, createElement } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentAccount } from "@mysten/dapp-kit";
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

interface Participant {
  rank: number;
  address: string;
  tier: Tier;
  points: number;
  onTimeRate: number;
  totalYield: number;
  monthlyYield: number;
  collateralYield: number;
  lastPaymentDay: number;
  activePools: number;
}

const TIER_CONFIG: Record<
  Tier,
  { labelKey: string; minPoints: number; icon: typeof Star; color: string; multiplier: number }
> = {
  diamond: {
    labelKey: "leaderboard.tierDiamond",
    minPoints: 400,
    icon: Star,
    color: "var(--accent-soft)",
    multiplier: 2.0,
  },
  platinum: {
    labelKey: "leaderboard.tierPlatinum",
    minPoints: 300,
    icon: Trophy,
    color: "var(--purple-soft)",
    multiplier: 1.6,
  },
  gold: {
    labelKey: "leaderboard.tierGold",
    minPoints: 200,
    icon: Medal,
    color: "var(--warn-soft)",
    multiplier: 1.3,
  },
  silver: {
    labelKey: "leaderboard.tierSilver",
    minPoints: 100,
    icon: Medal,
    color: "var(--brutal-surface)",
    multiplier: 1.1,
  },
  bronze: {
    labelKey: "leaderboard.tierBronze",
    minPoints: 0,
    icon: Circle,
    color: "var(--danger-soft)",
    multiplier: 1.0,
  },
};

const POINTS_BREAKDOWN = [
  { range: "1st \u2013 10th", points: 100, color: "var(--success-soft)" },
  { range: "11th \u2013 15th", points: 75, color: "var(--accent-soft)" },
  { range: "16th \u2013 20th", points: 50, color: "var(--warn-soft)" },
  { range: "After 20th (Late)", points: 10, color: "var(--danger-soft)" },
];

const MOCK_PARTICIPANTS: Participant[] = [
  { rank: 1, address: "0x7a3b…c9d2", tier: "diamond", points: 485, onTimeRate: 100, totalYield: 3240, monthlyYield: 2100, collateralYield: 1140, lastPaymentDay: 3, activePools: 3 },
  { rank: 2, address: "0x1e4f…b8a7", tier: "diamond", points: 460, onTimeRate: 100, totalYield: 2980, monthlyYield: 1950, collateralYield: 1030, lastPaymentDay: 5, activePools: 2 },
  { rank: 3, address: "0xf2c8…3d6e", tier: "diamond", points: 425, onTimeRate: 100, totalYield: 2710, monthlyYield: 1800, collateralYield: 910, lastPaymentDay: 7, activePools: 2 },
  { rank: 4, address: "0x9b5d…1f4a", tier: "platinum", points: 380, onTimeRate: 100, totalYield: 2450, monthlyYield: 1650, collateralYield: 800, lastPaymentDay: 8, activePools: 3 },
  { rank: 5, address: "0x4c7e…2a9f", tier: "platinum", points: 355, onTimeRate: 100, totalYield: 2190, monthlyYield: 1500, collateralYield: 690, lastPaymentDay: 10, activePools: 2 },
  { rank: 6, address: "0xd8f1…5b0c", tier: "platinum", points: 320, onTimeRate: 100, totalYield: 1930, monthlyYield: 1350, collateralYield: 580, lastPaymentDay: 12, activePools: 1 },
  { rank: 7, address: "0x3a6c…7e8d", tier: "gold", points: 280, onTimeRate: 100, totalYield: 1670, monthlyYield: 1200, collateralYield: 470, lastPaymentDay: 14, activePools: 2 },
  { rank: 8, address: "0x6b2d…4f9e", tier: "gold", points: 250, onTimeRate: 100, totalYield: 1410, monthlyYield: 1050, collateralYield: 360, lastPaymentDay: 16, activePools: 1 },
  { rank: 9, address: "0xe7f8…1c3b", tier: "gold", points: 215, onTimeRate: 100, totalYield: 1150, monthlyYield: 900, collateralYield: 250, lastPaymentDay: 18, activePools: 1 },
  { rank: 10, address: "0x5c9a…3d2e", tier: "silver", points: 180, onTimeRate: 100, totalYield: 890, monthlyYield: 750, collateralYield: 140, lastPaymentDay: 19, activePools: 1 },
  { rank: 11, address: "0xab1c…8f4d", tier: "silver", points: 150, onTimeRate: 86, totalYield: 640, monthlyYield: 550, collateralYield: 90, lastPaymentDay: 20, activePools: 1 },
  { rank: 12, address: "0x2d3e…6a7b", tier: "silver", points: 115, onTimeRate: 71, totalYield: 410, monthlyYield: 370, collateralYield: 40, lastPaymentDay: 22, activePools: 1 },
  { rank: 13, address: "0x8f4a…1b2c", tier: "bronze", points: 85, onTimeRate: 57, totalYield: 230, monthlyYield: 210, collateralYield: 20, lastPaymentDay: 24, activePools: 1 },
  { rank: 14, address: "0x3e5f…7c8d", tier: "bronze", points: 50, onTimeRate: 43, totalYield: 120, monthlyYield: 110, collateralYield: 10, lastPaymentDay: 26, activePools: 1 },
  { rank: 15, address: "0x1a2b…9c0d", tier: "bronze", points: 20, onTimeRate: 29, totalYield: 45, monthlyYield: 40, collateralYield: 5, lastPaymentDay: 28, activePools: 0 },
];

const CURRENT_CYCLE = {
  number: 3,
  deadline: 20,
  drawing: 25,
  participants: 15,
  monthlyContribution: 100,
  totalPot: 1500,
  collateralPool: 45000,
};

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const isConnected = !!account;
  const [showRules, setShowRules] = useState(false);

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
    if (!account) return null;
    const idx = Math.floor(Math.random() * 5) + 1;
    return MOCK_PARTICIPANTS[idx];
  }, [account]);

  const stats = useMemo(() => {
    const totalPools = [...new Set(MOCK_PARTICIPANTS.map((p) => p.activePools))].reduce((a, b) => a + b, 0) + 3;
    const totalMembers = MOCK_PARTICIPANTS.length;
    const totalYieldDistributed = MOCK_PARTICIPANTS.reduce((s, p) => s + p.totalYield, 0);
    const avgApy = 12.4;
    return { totalPools, totalMembers, totalYieldDistributed, avgApy };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_var(--brutal-ink)]">
            <Trophy className="size-4" />
            {t("leaderboard.badge")}
          </p>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
          >
            {t("leaderboard.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            {t("leaderboard.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
            <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="size-5 text-[var(--brutal-ink)]" />
                <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">{t("leaderboard.cycleTitle")}</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b-[2px] border-[var(--brutal-ink)] pb-2">
                  <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.cycleDeadline")}</span>
                  <span className="inline-flex items-center gap-1.5 border-[2px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] px-2.5 py-1 text-xs font-black">
                    <Calendar className="size-3" />
                    20th
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-[2px] border-[var(--brutal-ink)] pb-2">
                  <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.cycleDrawing")}</span>
                  <span className="inline-flex items-center gap-1.5 border-[2px] border-[var(--brutal-ink)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-black">
                    <Sparkles className="size-3" />
                    25th
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-[2px] border-[var(--brutal-ink)] pb-2">
                  <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.cyclePot")}</span>
                  <span
                    className="text-lg font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                  >
                    ${CURRENT_CYCLE.totalPot.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-[var(--brutal-muted)]">
                    {CURRENT_CYCLE.participants} participants &times; ${CURRENT_CYCLE.monthlyContribution}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="size-5 text-[var(--brutal-ink)]" />
                <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">Tiers &amp; Multipliers</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {tierInfo.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <div
                      key={tier.key}
                      className="border-[2px] border-[var(--brutal-ink)] p-3 text-center"
                      style={{ background: tier.color }}
                    >
                      <Icon className="mx-auto mb-1 size-5 text-[var(--brutal-ink)]" />
                      <p
                        className="text-sm font-black leading-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {tier.label}
                      </p>
                      <p className="protocol-font mt-0.5 text-[9px] font-black text-[var(--brutal-muted)]">
                        {tier.minPoints}+ pts
                      </p>
                      <p className="protocol-font mt-0.5 text-[9px] font-black text-[var(--brutal-ink)]">
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
              { label: t("leaderboard.statPools"), value: String(stats.totalPools), bg: "var(--brutal-bg)" },
              { label: t("leaderboard.statUsers"), value: String(stats.totalMembers), bg: "var(--success-soft)" },
              { label: t("leaderboard.statEarned"), value: `$${stats.totalYieldDistributed.toLocaleString()}`, bg: "var(--accent-soft)" },
              { label: t("leaderboard.statAvgApy"), value: `${stats.avgApy}%`, bg: "var(--warn-soft)" },
            ].map(({ label, value, bg }) => (
              <div className="border-[3px] border-[var(--brutal-ink)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]" style={{ backgroundColor: bg }} key={label}>
                <p className="protocol-font text-xs font-black tracking-[0.1em] text-[var(--brutal-muted)]">{label}</p>
                <p
                  className="mt-2 text-3xl font-black tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {isConnected && userRank && (
            <div className="mt-8 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="size-5 text-[var(--brutal-ink)]" />
                <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">{t("leaderboard.yourRank")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-5">
                <div className="flex items-center gap-3 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3">
                  <span className="protocol-font text-[9px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.rank")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                  >
                    #{userRank.rank}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3">
                  <span className="protocol-font text-[9px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.yourTier")}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="grid size-7 place-items-center border-[2px] border-[var(--brutal-ink)]" style={{ background: TIER_CONFIG[userRank.tier].color }}>
                      {createElement(TIER_CONFIG[userRank.tier].icon, { className: "size-4 text-[var(--brutal-ink)]" })}
                    </div>
                    <span
                      className="text-lg font-black"
                      style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                    >
                      {t(TIER_CONFIG[userRank.tier].labelKey)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3">
                  <span className="protocol-font text-[9px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.yourPoints")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                  >
                    {userRank.points}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3">
                  <span className="protocol-font text-[9px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.onTime")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                  >
                    {userRank.onTimeRate}%
                  </span>
                </div>
                <div className="flex items-center gap-3 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3">
                  <span className="protocol-font text-[9px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.yourYield")}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                  >
                    ${userRank.totalYield}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-5 text-[var(--brutal-ink)]" />
              <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">Leaderboard</h2>
            </div>
            <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] shadow-[6px_6px_0_var(--brutal-ink)]">
              <div className="hidden border-b-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-4 md:grid md:grid-cols-[40px_1fr_100px_100px_100px_100px_100px]">
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.rank")}</span>
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.member")}</span>
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.tier")}</span>
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.points")}</span>
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.onTime")}</span>
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.yield")}</span>
                <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">{t("leaderboard.pools")}</span>
              </div>
              {MOCK_PARTICIPANTS.map((p, i) => {
                const TierIcon = TIER_CONFIG[p.tier].icon;
                return (
                  <div
                    key={p.address}
                    className="grid items-center gap-3 border-b-[3px] border-[var(--brutal-ink)] p-4 last:border-b-0 md:grid-cols-[40px_1fr_100px_100px_100px_100px_100px]"
                  >
                    <span className="protocol-font flex size-7 items-center justify-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] text-xs font-black">
                      {i + 1}
                    </span>
                    <div>
                      <span className="protocol-font text-sm font-bold text-[var(--brutal-ink)]">
                        {p.address}
                      </span>
                      {isConnected && i < 5 && (
                        <span className="ml-2 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-1.5 py-0.5 text-[8px] font-black uppercase">Top</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="grid size-6 shrink-0 place-items-center border-[2px] border-[var(--brutal-ink)]"
                        style={{ background: TIER_CONFIG[p.tier].color }}
                      >
                        <TierIcon className="size-3 text-[var(--brutal-ink)]" />
                      </div>
                      <span
                        className="text-sm font-black"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {t(TIER_CONFIG[p.tier].labelKey)}
                      </span>
                    </div>
                    <span className="protocol-font text-sm font-black text-[var(--brutal-ink)]">{p.points}</span>
                    <span
                      className={`protocol-font inline-flex w-fit items-center gap-1 border-[2px] border-[var(--brutal-ink)] px-2 py-0.5 text-[10px] font-black ${
                        p.onTimeRate >= 100
                          ? "bg-[var(--success-soft)]"
                          : p.onTimeRate >= 70
                            ? "bg-[var(--warn-soft)]"
                            : "bg-[var(--danger-soft)]"
                      }`}
                    >
                      {p.onTimeRate}%
                    </span>
                    <span className="protocol-font text-sm font-black text-[var(--success)]">
                      ${p.totalYield}
                    </span>
                    <span className="protocol-font text-[11px] text-[var(--brutal-muted)]">
                      {p.activePools}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => setShowRules(!showRules)}
              className="protocol-font inline-flex w-full items-center justify-between border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:bg-[var(--brutal-accent)]"
            >
              <span className="flex items-center gap-2">
                <Info className="size-4" />
                {t("leaderboard.rulesTitle")}
              </span>
              <ChevronDown className={`size-4 transition ${showRules ? "rotate-180" : ""}`} />
            </button>
            {showRules && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-5 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className="size-4 text-[var(--brutal-ink)]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesPayment")}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[var(--brutal-muted)]">{t("leaderboard.rulesPaymentDesc")}</p>
                </div>
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-5 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-3 flex items-center gap-2">
                    <Star className="size-4 text-[var(--brutal-ink)]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesPoints")}</h3>
                  </div>
                  <div className="space-y-2">
                    {POINTS_BREAKDOWN.map((pb) => (
                      <div key={pb.range} className="flex items-center justify-between border-[2px] border-[var(--brutal-ink)] px-3 py-1.5" style={{ background: pb.color }}>
                        <span className="text-[11px] font-bold">{pb.range}</span>
                        <span className="protocol-font text-xs font-black">+{pb.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-5 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-[var(--brutal-ink)]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesDrawing")}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[var(--brutal-muted)]">{t("leaderboard.rulesDrawingDesc")}</p>
                </div>
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-5 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="size-4 text-[var(--brutal-ink)]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("leaderboard.rulesYield")}</h3>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[var(--brutal-muted)]">{t("leaderboard.rulesYieldDesc")}</p>
                  <div className="mt-3 space-y-1.5">
                    {tierInfo.map((tier) => (
                      <div key={tier.key} className="flex items-center justify-between border-[2px] border-[var(--brutal-ink)] px-2.5 py-1" style={{ background: tier.color }}>
                        <span className="text-[10px] font-bold">{tier.label}</span>
                        <span className="protocol-font text-[10px] font-black">{tier.multiplier}x yield multiplier</span>
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
              className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-8 text-base font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
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
