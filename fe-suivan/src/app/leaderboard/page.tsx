"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentAccount } from "@mysten/dapp-kit";

const MOCK_LEADERBOARD = [
  { rank: 1, address: "0x1234...5678", totalEarned: 1250.5, poolsJoined: 5, winRate: 80 },
  { rank: 2, address: "0x2345...6789", totalEarned: 980.25, poolsJoined: 4, winRate: 75 },
  { rank: 3, address: "0x3456...7890", totalEarned: 750, poolsJoined: 3, winRate: 66 },
  { rank: 4, address: "0x4567...8901", totalEarned: 620.75, poolsJoined: 4, winRate: 50 },
  { rank: 5, address: "0x5678...9012", totalEarned: 540.3, poolsJoined: 3, winRate: 66 },
];

const STATS = [
  ["USERS", "156"],
  ["POOLS", "23"],
  ["EARNED", "$45.7K"],
  ["AVG APY", "9.2%"],
] as const;

type SortKey = "totalEarned" | "poolsJoined" | "winRate";

export default function LeaderboardPage() {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const address = account?.address || "";
  const [sortBy, setSortBy] = useState<SortKey>("totalEarned");
  const sortedLeaderboard = [...MOCK_LEADERBOARD].sort((a, b) => b[sortBy] - a[sortBy]);
  const userRank = isConnected ? Math.floor(Math.random() * 50) + 11 : null;
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#fbf7ed] text-slate-950">
      <Header />

      <section className="px-5 pb-12 pt-32 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#06111f]">
            {t("leaderboard.badge")}
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {t("leaderboard.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
            {t("leaderboard.subtitle")}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {STATS.map(([label, value]) => (
              <div className="rounded-2xl border-2 border-slate-950 bg-white p-4 shadow-[4px_4px_0_#06111f]" key={label}>
                <p className="protocol-font text-xs font-black text-slate-400">{t(label === "USERS" ? "leaderboard.statUsers" : label === "POOLS" ? "leaderboard.statPools" : label === "EARNED" ? "leaderboard.statEarned" : "leaderboard.statAvgApy")}</p>
                <p className="protocol-font mt-2 text-3xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="rounded-full border-2 border-slate-950 bg-white p-1 shadow-[4px_4px_0_#06111f]">
              {(["totalEarned", "poolsJoined", "winRate"] as const).map((key) => (
                <button
                  className={`protocol-font rounded-full px-4 py-2 text-xs font-black uppercase transition ${
                    sortBy === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-[#dff8ff]"
                  }`}
                  key={key}
                  onClick={() => setSortBy(key)}
                  type="button"
                >
                  {key === "totalEarned" ? t("leaderboard.sortEarned") : key === "poolsJoined" ? t("leaderboard.sortPools") : t("leaderboard.sortWinRate")}
                </button>
              ))}
            </div>

            {isConnected && userRank ? (
              <div className="protocol-font rounded-full border-2 border-slate-950 bg-[#fff1c7] px-4 py-2 text-xs font-black shadow-[4px_4px_0_#06111f]">
                {t("leaderboard.you")} #{userRank} {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border-2 border-slate-950 bg-white shadow-[6px_6px_0_#06111f]">
            {sortedLeaderboard.map((user) => (
              <div
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b-2 border-slate-950 p-4 last:border-b-0 md:grid-cols-[auto_1fr_auto_auto_auto]"
                key={user.address}
              >
                <span className="protocol-font rounded-full border-2 border-slate-950 bg-[#dff8ff] px-3 py-1 text-xs font-black">
                  R{user.rank}
                </span>
                <span className="protocol-font text-sm font-bold text-slate-950">{user.address}</span>
                <span className="protocol-font text-sm font-black text-teal-700">${user.totalEarned.toFixed(2)}</span>
                <span className="protocol-font hidden text-sm font-black text-slate-500 md:block">{user.poolsJoined} {t("leaderboard.pools")}</span>
                <span className="protocol-font hidden rounded-full bg-[#fff1c7] px-3 py-1 text-xs font-black text-slate-950 md:block">
                  {user.winRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
