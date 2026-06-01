"use client";

import { useState, useMemo } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import {
  User,
  Wallet,
  Users,
  Trophy,
  PiggyBank,
  Award,
  Activity,
  ExternalLink,
  Copy,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

interface Badge {
  name: string;
  description: string;
  icon: typeof Shield;
  color: string;
  achieved: boolean;
}

const MOCK_BADGES: Badge[] = [
  {
    name: "Early Adopter",
    description: "Joined Suivan during testnet",
    icon: Sparkles,
    color: "var(--success-soft)",
    achieved: true,
  },
  {
    name: "Pool Pioneer",
    description: "Created 3+ pools",
    icon: Users,
    color: "var(--accent-soft)",
    achieved: false,
  },
  {
    name: "Cycle Champion",
    description: "Won 5 cycles",
    icon: Trophy,
    color: "var(--warn-soft)",
    achieved: false,
  },
  {
    name: "Whale Watcher",
    description: "Deposited 50k+ USDC",
    icon: PiggyBank,
    color: "var(--success-soft)",
    achieved: false,
  },
  {
    name: "Sui Native",
    description: "Completed 10 cycles",
    icon: Zap,
    color: "var(--accent-soft)",
    achieved: false,
  },
  {
    name: "Community Pillar",
    description: "Referred 5 members",
    icon: Award,
    color: "var(--purple-soft)",
    achieved: false,
  },
];

interface ActivityItem {
  type: "join" | "win" | "create" | "badge";
  label: string;
  poolName: string;
  time: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    type: "join",
    label: "Joined pool",
    poolName: "Arisan Ceria #12",
    time: "2 hours ago",
  },
  {
    type: "badge",
    label: "Earned badge",
    poolName: "Early Adopter",
    time: "2 hours ago",
  },
];

export default function ProfilePage() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const isConnected = !!account;
  const [copied, setCopied] = useState(false);

  const displayAddr = useMemo(() => {
    if (!account?.address) return "";
    return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
  }, [account]);

  const copyAddress = () => {
    if (!account?.address) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    {
      label: t("profile.statsPools"),
      value: "3",
      icon: Users,
      color: "var(--accent-soft)",
    },
    {
      label: t("profile.statsWon"),
      value: "1",
      icon: Trophy,
      color: "var(--warn-soft)",
    },
    {
      label: t("profile.statsSaved"),
      value: "$2,400",
      icon: PiggyBank,
      color: "var(--success-soft)",
    },
    {
      label: t("profile.statsBadges"),
      value: "1",
      icon: Award,
      color: "var(--purple-soft)",
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 shadow-[4px_4px_0_var(--brutal-ink)]">
            <User className="size-4 text-[var(--brutal-ink)]" />
            <span className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("profile.badge")}</span>
          </div>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
          >
            {t("profile.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            {t("profile.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {!isConnected ? (
            <div className="mx-auto max-w-md border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-10 text-center shadow-[8px_8px_0_var(--brutal-ink)]">
              <div className="mx-auto mb-6 grid size-16 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)]">
                <Wallet className="size-7 text-[var(--brutal-ink)]" />
              </div>
              <h2
                className="text-3xl font-black"
                style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
              >
                {t("profile.connectPrompt")}
              </h2>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="border-[3px] border-[var(--brutal-ink)] p-5 shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                      style={{ background: stat.color }}
                    >
                      <Icon className="mb-2 size-5 text-[var(--brutal-ink)]" />
                      <p
                        className="text-3xl font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {stat.value}
                      </p>
                      <p className="protocol-font mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-ink)]">
                        {stat.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mb-8 mt-8 grid gap-8 lg:grid-cols-2">
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-5 flex items-center gap-2">
                    <Wallet className="size-5 text-[var(--brutal-ink)]" />
                    <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">
                      {t("profile.infoTitle")}
                    </h2>
                  </div>
                  <div className="space-y-4 divide-y-[2px] divide-[var(--brutal-ink)]">
                    <div className="flex items-center justify-between gap-4 pt-0">
                      <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        {t("profile.infoAddress")}
                      </span>
                      <button
                        onClick={copyAddress}
                        className="group inline-flex items-center gap-1.5 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] px-2.5 py-1 text-[10px] font-bold transition hover:bg-[var(--brutal-accent)]"
                      >
                        {copied ? (
                          <CheckCircle2 className="size-3 text-[var(--brutal-ink)]" />
                        ) : (
                          <Copy className="size-3 text-[var(--brutal-ink)]" />
                        )}
                        <span className="font-mono text-[10px]">{displayAddr}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        {t("profile.infoNetwork")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 border-[2px] border-[var(--brutal-ink)] bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-black">
                        <span className="size-1.5 rounded-full bg-[var(--brutal-ink)]" />
                        Sui Testnet
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        {t("profile.infoMemberSince")}
                      </span>
                      <span className="text-xs font-bold">May 2026</span>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        {t("profile.infoPools")}
                      </span>
                      <span className="text-xs font-bold">1 active · 2 total</span>
                    </div>
                  </div>
                </div>

                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-5 flex items-center gap-2">
                    <Activity className="size-5 text-[var(--brutal-ink)]" />
                    <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">
                      {t("profile.activityTitle")}
                    </h2>
                  </div>
                  {MOCK_ACTIVITY.length === 0 ? (
                    <p className="py-8 text-center text-sm font-semibold text-[var(--brutal-muted)]">
                      {t("profile.activityEmpty")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {MOCK_ACTIVITY.map((item, i) => {
                        const TypeIcon =
                          item.type === "join" || item.type === "create"
                            ? Users
                            : item.type === "win"
                              ? Trophy
                              : Award;
                        const typeColor =
                          item.type === "badge"
                            ? "var(--accent-soft)"
                            : item.type === "win"
                              ? "var(--warn-soft)"
                              : "var(--success-soft)";
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3"
                          >
                            <div
                              className="grid size-9 shrink-0 place-items-center border-[2px] border-[var(--brutal-ink)]"
                              style={{ background: typeColor }}
                            >
                              <TypeIcon className="size-4 text-[var(--brutal-ink)]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold" style={{ color: "var(--brutal-ink)" }}>
                                {item.label}{" "}
                                <span className="text-[var(--brutal-muted)]">{item.poolName}</span>
                              </p>
                              <p className="text-[9px] font-semibold text-[var(--brutal-muted)]">{item.time}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <p className="protocol-font mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--brutal-muted)]">
                {t("profile.nftTitle")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {MOCK_BADGES.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.name}
                      className={`border-[3px] border-[var(--brutal-ink)] p-4 text-center shadow-[4px_4px_0_var(--brutal-ink)] transition ${
                        badge.achieved
                          ? "hover:-translate-x-0.5 hover:-translate-y-0.5"
                          : "opacity-40 grayscale"
                      }`}
                      style={{ background: badge.achieved ? badge.color : "var(--brutal-surface)" }}
                    >
                      <div
                        className={`mx-auto mb-2 grid size-12 place-items-center border-[3px] border-[var(--brutal-ink)] ${
                          badge.achieved ? "bg-[var(--brutal-bg)]" : "bg-[var(--brutal-bg)]"
                        }`}
                      >
                        <Icon className="size-5 text-[var(--brutal-ink)]" />
                      </div>
                      <p
                        className="text-sm font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {badge.name}
                      </p>
                      <p className="mt-1 text-[9px] font-semibold text-[var(--brutal-muted)]">{badge.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 text-center">
                <Link
                  href="/pools"
                  className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-8 text-base font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  Explore Pools
                  <ArrowRight className="size-5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
