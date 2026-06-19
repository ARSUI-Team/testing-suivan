"use client";

import { createContext, ReactNode, useContext, useState } from "react";

export type Language = "en" | "id";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const en: Record<string, string> = {
  "nav.about": "ROSCA",
  "nav.howItWorks": "How It Works",
  "nav.advantages": "Why Sui",
  "nav.pools": "Pools",
  "nav.faucet": "Faucet",
  "nav.simulator": "Simulator",
  "nav.yield": "Yield Explorer",
  "nav.leaderboard": "Leaderboard",
  "nav.profile": "Profile",
  "nav.faq": "FAQ",

  "simulator.badge": "SIMULATOR",
  "simulator.title": "How much wallet balance do you need?",
  "simulator.subtitle": "Calculate exactly how much USDC + SUI you need before joining a ROSCA pool. No surprises, no hidden costs.",
  "simulator.poolConfig": "Pool Configuration",
  "simulator.depositLabel": "Monthly Deposit (USDC)",
  "simulator.participantsLabel": "Number of Participants",
  "simulator.cycleLabel": "Cycle Duration (days)",
  "simulator.gasSponsor": "Sponsored Transactions",
  "simulator.gasSponsorDesc": "First join is free — sponsored by Suivan. Subsequent tx ~0.0001 SUI each.",
  "simulator.breakdown": "Wallet Requirement Breakdown",
  "simulator.totalUpfront": "Total Upfront Needed",
  "simulator.needToPrepare": "You need to prepare",
  "simulator.deposit": "Cycle Deposit",
  "simulator.collateral": "Collateral (125%)",
  "simulator.gas": "Gas Fee",
  "simulator.gasFree": "First join sponsored",
  "simulator.usdc": "USDC",
  "simulator.sui": "SUI",
  "simulator.poolSummary": "Pool Summary",
  "simulator.totalPool": "Total Pool Value",
  "simulator.totalCycles": "Total Cycles",
  "simulator.poolDuration": "Pool Duration",
  "simulator.yourPosition": "Your Position",
  "simulator.youPay": "You Pay Per Cycle",
  "simulator.youEarn": "You Earn Total",
  "simulator.compareTitle": "Ultra-low gas on Sui",
  "simulator.compareDesc": "Sui tx cost ~0.0001 SUI (fractions of a cent). Ethereum L1 averages ~$1.50 per tx.",
  "simulator.suiFee": "Sui Fee",
  "simulator.ethFee": "Ethereum Fee",
  "simulator.savings": "Efficiency",
  "simulator.cta": "Explore Real Pools",
  "simulator.collateralNote": "125% of remaining contribution commitment, returned at cycle end",
  "simulator.collateralDetail": "Collateral protects all members. If you miss a payment, the deposit is deducted from your collateral. Unused collateral + proportional yield is returned when the pool ends.",

  "faucet.badge": "TEST FAUCET",
  "faucet.title": "Get Test Tokens",
  "faucet.subtitle": "Step 1: Get free SUI for gas. Step 2: Claim 500 USDC for testing. Then explore Suivan pools before mainnet.",
  "faucet.claimUsdc": "Claim 10,000 Test USDC",
  "faucet.claimSui": "Claim 1 Test SUI",
  "faucet.walletRequired": "Connect your wallet to claim test tokens.",
  "faucet.success": "Tokens claimed successfully!",
  "faucet.error": "Faucet request failed",
  "faucet.cooldown": "Cooldown active. Try again in {time}s.",
  "faucet.description": "All tokens on this page are testnet-only \u2014 no real value. Use them to simulate pool creation, joining, and yield scenarios.",
  "faucet.usdcLabel": "USDC (Testnet)",
  "faucet.usdcDesc": "USDC stablecoin for pool deposits and collateral",
  "faucet.suiLabel": "TEST_SUI",
  "faucet.suiDesc": "SUI for gas fees (first tx is sponsored)",
  "faucet.recentTitle": "Recent Claims",
  "faucet.recentEmpty": "No claims yet. Start by connecting your wallet and minting tokens.",
  "faucet.balanceTitle": "Your Balances",
  "faucet.goToPools": "Go to Pools",

  "profile.badge": "YOUR DASHBOARD",
  "profile.title": "Your Profile",
  "profile.subtitle": "Track your pool memberships, NFT badges, and on-chain activity.",
  "profile.connectPrompt": "Connect your wallet to view your Suivan profile.",
  "profile.statsPools": "Pools Joined",
  "profile.statsWon": "Cycles Won",
  "profile.statsSaved": "Total Saved",
  "profile.statsBadges": "Badges Earned",
  "profile.nftTitle": "Suivan Badges & NFTs",
  "profile.nftEmpty": "No badges yet. Join a pool to earn your first Suivan achievement NFT.",
  "profile.activityTitle": "Recent Activity",
  "profile.activityEmpty": "No recent activity. Your pool joins, cycle wins, and badge claims will appear here.",
  "profile.noActivity": "No activity yet. Join a pool to get started!",
  "profile.infoTitle": "Account Info",
  "profile.infoAddress": "Wallet Address",
  "profile.infoMemberSince": "Member Since",
  "profile.infoPools": "Active Pools",
  "profile.infoNetwork": "Network",
};

const id: Record<string, string> = {
  "nav.about": "ROSCA",
  "nav.howItWorks": "Cara Kerja",
  "nav.advantages": "Mengapa Sui",
  "nav.pools": "Pool",
  "nav.faucet": "Faucet",
  "nav.simulator": "Simulator",
  "nav.yield": "Yield Explorer",
  "nav.leaderboard": "Papan Peringkat",
  "nav.profile": "Profil",
  "nav.faq": "FAQ",

  "simulator.badge": "SIMULATOR",
  "simulator.title": "Berapa saldo dompet yang dibutuhkan?",
  "simulator.subtitle": "Hitung persis berapa USDC + SUI yang Anda perlukan sebelum bergabung dengan pool ROSCA. Tanpa kejutan, tanpa biaya tersembunyi.",
  "simulator.poolConfig": "Konfigurasi Pool",
  "simulator.depositLabel": "Setoran per Siklus (USDC)",
  "simulator.participantsLabel": "Jumlah Peserta",
  "simulator.cycleLabel": "Durasi Siklus (hari)",
  "simulator.gasSponsor": "Transaksi Disponsori",
  "simulator.gasSponsorDesc": "Gabung pertama gratis — disponsori Suivan. Tx berikutnya ~0,0001 SUI per transaksi.",
  "simulator.breakdown": "Rincian Kebutuhan Dompet",
  "simulator.totalUpfront": "Total Dana Dibutuhkan",
  "simulator.needToPrepare": "Anda perlu menyiapkan",
  "simulator.deposit": "Setoran Siklus",
  "simulator.collateral": "Jaminan (125%)",
  "simulator.gas": "Biaya Gas",
  "simulator.gasFree": "Gabung pertama disponsori",
  "simulator.usdc": "USDC",
  "simulator.sui": "SUI",
  "simulator.poolSummary": "Ringkasan Pool",
  "simulator.totalPool": "Total Nilai Pool",
  "simulator.totalCycles": "Total Siklus",
  "simulator.poolDuration": "Durasi Pool",
  "simulator.yourPosition": "Posisi Anda",
  "simulator.youPay": "Bayar Per Siklus",
  "simulator.youEarn": "Total yang Anda Terima",
  "simulator.compareTitle": "Gas ultra-rendah di Sui",
  "simulator.compareDesc": "Biaya tx Sui ~0,0001 SUI (pecahan sen). Ethereum L1 rata-rata ~$1,50 per tx.",
  "simulator.suiFee": "Biaya Sui",
  "simulator.ethFee": "Biaya Ethereum",
  "simulator.savings": "Efisiensi",
  "simulator.cta": "Jelajahi Pool Nyata",
  "simulator.collateralNote": "125% dari sisa komitmen kontribusi, dikembalikan di akhir siklus",
  "simulator.collateralDetail": "Jaminan melindungi semua anggota. Jika kamu melewatkan pembayaran, setoran dipotong dari jaminan. Jaminan yang tidak digunakan + yield proporsional dikembalikan saat pool berakhir.",

  "faucet.badge": "FAUCET TEST",
  "faucet.title": "Dapatkan Token Tes",
  "faucet.subtitle": "Langkah 1: Dapatkan SUI gratis untuk gas. Langkah 2: Klaim 500 USDC untuk testing. Lalu jelajahi pool Suivan sebelum mainnet.",
  "faucet.claimUsdc": "Klaim 10,000 Test USDC",
  "faucet.claimSui": "Klaim 1 Test SUI",
  "faucet.walletRequired": "Hubungkan dompet Anda untuk klaim token tes.",
  "faucet.success": "Token berhasil diklaim!",
  "faucet.error": "Permintaan faucet gagal",
  "faucet.cooldown": "Cooldown aktif. Coba lagi dalam {time}s.",
  "faucet.description": "Semua token di halaman ini hanya testnet \u2014 tidak bernilai riil. Gunakan untuk simulasi pembuatan pool, join, dan yield.",
  "faucet.usdcLabel": "USDC (Testnet)",
  "faucet.usdcDesc": "Stablecoin USDC untuk deposit dan jaminan pool",
  "faucet.suiLabel": "TEST_SUI",
  "faucet.suiDesc": "SUI untuk biaya gas (transaksi pertama gratis)",
  "faucet.recentTitle": "Klaim Terbaru",
  "faucet.recentEmpty": "Belum ada klaim. Mulai dengan menghubungkan dompet Anda.",
  "faucet.balanceTitle": "Saldo Anda",
  "faucet.goToPools": "Ke Pools",

  "profile.badge": "DASHBOARD ANDA",
  "profile.title": "Profil Anda",
  "profile.subtitle": "Pantau keanggotaan pool, lencana NFT, dan aktivitas on-chain Anda.",
  "profile.connectPrompt": "Hubungkan dompet Anda untuk melihat profil Suivan.",
  "profile.statsPools": "Pool Diikuti",
  "profile.statsWon": "Siklus Menang",
  "profile.statsSaved": "Total Ditabung",
  "profile.statsBadges": "Lencana",
  "profile.nftTitle": "Lencana & NFT Suivan",
  "profile.nftEmpty": "Belum ada lencana. Gabung pool untuk dapatkan NFT pencapaian Suivan pertama Anda.",
  "profile.activityTitle": "Aktivitas Terbaru",
  "profile.activityEmpty": "Belum ada aktivitas. Join pool, menang siklus, dan klaim badge akan muncul di sini.",
  "profile.noActivity": "Belum ada aktivitas. Gabung pool untuk memulai!",
  "profile.infoTitle": "Info Akun",
  "profile.infoAddress": "Alamat Dompet",
  "profile.infoMemberSince": "Anggota Sejak",
  "profile.infoPools": "Pool Aktif",
  "profile.infoNetwork": "Jaringan",
};

const translations: Record<Language, Record<string, string>> = { en, id };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("suivan-language") as Language | null;
    return stored === "en" || stored === "id" ? stored : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("suivan-language", lang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[language]?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t } as LanguageContextType}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
