"use client";

import { useState, useEffect, useMemo } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useProfileData } from "@/hooks/useProfileData";
import {
  User,
  Wallet,
  Users,
  Trophy,
  PiggyBank,
  Award,
  Activity,
  Copy,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

const BADGE_ICONS: Record<string, typeof Sparkles> = {
  Sparkles, Users, Trophy, PiggyBank, Zap, Award,
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const isConnected = !!account;
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const { stats: profileStats, badges, activity, isLoading } = useProfileData(account?.address);

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
      value: String(profileStats.pools),
      icon: Users,
      color: "#e0f4ff",
    },
    {
      label: t("profile.statsWon"),
      value: String(profileStats.won),
      icon: Trophy,
      color: "#fef9c3",
    },
    {
      label: t("profile.statsSaved"),
      value: `$${profileStats.saved.toLocaleString()}`,
      icon: PiggyBank,
      color: "#ccfbf1",
    },
    {
      label: t("profile.statsBadges"),
      value: String(profileStats.badges),
      icon: Award,
      color: "#ede9fe",
    },
  ];

  if (isConnected && isLoading) {
    return (
<main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
        <Header />
        <section className="px-5 pt-36 pb-20 md:px-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin border-2 border-[#0a0a0a] border-b-[#555555]" />
              <span className="protocol-font ml-4 text-sm font-black text-[#555555]">Loading Profile</span>
            </div>
          </div>
        </section>
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
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#f8672d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[10px_10px_0_#0a0a0a]">
            <User className="size-4 text-[#0a0a0a]" />
            {t("profile.badge")}
          </p>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
          >
            {t("profile.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#555555]">
            {t("profile.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {!mounted ? null : !isConnected ? (
            <div className="mx-auto max-w-md border-[4px] border-[#0a0a0a] bg-grid-brutal p-10 text-center shadow-[14px_14px_0_#0a0a0a]">
              <div className="mx-auto mb-6 grid size-16 place-items-center border-[3px] border-[#0a0a0a] bg-[#38bdf8]">
                <Wallet className="size-7 text-[#0a0a0a]" />
              </div>
              <h2
                className="text-3xl font-black"
                style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
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
                      className="border-[3px] border-[#0a0a0a] p-5 shadow-[10px_10px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                      style={{ background: stat.color }}
                    >
                      <Icon className="mb-2 size-5 text-[#0a0a0a]" />
                      <p
                        className="text-3xl font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                      >
                        {stat.value}
                      </p>
                      <p className="protocol-font mt-1 text-xs font-black uppercase tracking-[0.15em] text-[#0a0a0a]">
                        {stat.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {(profileStats.pools === 0 && profileStats.won === 0 && profileStats.saved === 0) && (
                <p className="mt-3 text-center text-xs font-semibold text-[#555555]">
                  Testnet profile — join a pool or create one to see your stats populate.
                </p>
              )}

              <div className="mb-8 mt-8 grid gap-8 lg:grid-cols-2">
                <div className="border-[3px] border-[#0a0a0a] bg-grid-brutal p-6 shadow-[10px_10px_0_#0a0a0a]">
                  <div className="mb-5 flex items-center gap-2">
                    <Wallet className="size-5 text-[#0a0a0a]" />
                    <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">
                      {t("profile.infoTitle")}
                    </h2>
                  </div>
                  <div className="space-y-4 divide-y-[2px] divide-[#0a0a0a]">
                    <div className="flex items-center justify-between gap-4 pt-0">
                      <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">
                        {t("profile.infoAddress")}
                      </span>
                      <button
                        onClick={copyAddress}
                        className="group inline-flex items-center gap-1.5 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] px-2.5 py-1 text-xs font-bold transition hover:bg-[#38bdf8]"
                      >
                        {copied ? (
                          <CheckCircle2 className="size-3 text-[#0a0a0a]" />
                        ) : (
                          <Copy className="size-3 text-[#0a0a0a]" />
                        )}
                        <span className="font-mono text-xs">{displayAddr}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">
                        {t("profile.infoNetwork")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 border-[2px] border-[#0a0a0a] bg-[#ccfbf1] px-2.5 py-1 text-xs font-black">
                        <span className="size-1.5 rounded-full bg-[#0a0a0a]" />
                        Sui Testnet
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">
                        {t("profile.infoMemberSince")}
                      </span>
                      <span className="text-xs font-bold">May 2026</span>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555]">
                        {t("profile.infoPools")}
                      </span>
                      <span className="text-xs font-bold">1 active · 2 total</span>
                    </div>
                  </div>
                </div>

                <div className="border-[3px] border-[#0a0a0a] bg-grid-brutal p-6 shadow-[10px_10px_0_#0a0a0a]">
                  <div className="mb-5 flex items-center gap-2">
                    <Activity className="size-5 text-[#0a0a0a]" />
                    <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">
                      {t("profile.activityTitle")}
                    </h2>
                  </div>
                  {activity.length === 0 ? (

                    <p className="col-span-full py-8 text-center text-sm font-semibold text-[#555555]">{t("profile.noActivity")}</p>
                  ) : (
                    <div className="space-y-3">
                      {activity.map((item, i) => {
                        const TypeIcon =
                          item.type === "join" || item.type === "create"
                            ? Users
                            : item.type === "win"
                              ? Trophy
                              : Award;
                        const typeColor =
                          item.type === "badge"
                            ? "#e0f4ff"
                            : item.type === "win"
                              ? "#fef9c3"
                              : "#ccfbf1";
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 border-[2px] border-[#0a0a0a] bg-[#fbf7ed] p-3"
                          >
                            <div
                              className="grid size-9 shrink-0 place-items-center border-[2px] border-[#0a0a0a]"
                              style={{ background: typeColor }}
                            >
                              <TypeIcon className="size-4 text-[#0a0a0a]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold" style={{ color: "#0a0a0a" }}>
                                {item.label}{" "}
                                <span className="text-[#555555]">{item.poolName}</span>
                              </p>
                              <p className="text-[11px] font-semibold text-[#555555]">{item.time}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <p className="protocol-font mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#555555]">
                {t("profile.nftTitle")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {badges.map((badge) => {
                  const Icon = BADGE_ICONS[badge.icon] ?? Shield;
                  return (
                    <div
                      key={badge.name}
                      className={`border-[3px] border-[#0a0a0a] p-4 text-center shadow-[10px_10px_0_#0a0a0a] transition ${
                        badge.achieved
                          ? "hover:-translate-x-0.5 hover:-translate-y-0.5"
                          : "opacity-40 grayscale"
                      }`}
                      style={{ background: badge.achieved ? badge.color : "#e8e1d9" }}
                    >
                      <div
                        className={`mx-auto mb-2 grid size-12 place-items-center border-[3px] border-[#0a0a0a] ${
                          badge.achieved ? "bg-[#fbf7ed]" : "bg-[#fbf7ed]"
                        }`}
                      >
                        <Icon className="size-5 text-[#0a0a0a]" />
                      </div>
                      <p
                        className="text-sm font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                      >
                        {badge.name}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#555555]">{badge.description}</p>
                      {!badge.achieved && badge.progress && (
                        <p className="mt-1 text-xs font-bold text-[#0a0a0a]">{badge.progress}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 text-center">
                <Link
                  href="/pools"
                  className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-8 text-base font-black text-[#0a0a0a] shadow-[10px_10px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  Explore Pools
                  <ArrowRight className="size-5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

    </main>
  );
}
