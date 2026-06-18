"use client";

import { useState, useCallback } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useSuccessToast } from "@/components/Toast";
import { useUSDCBalance } from "@/hooks/useSuiContracts";
import { FaucetCooldownButton } from "@/components/FaucetCooldownButton";
import {
  Droplets,
  Wallet,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Shield,
} from "lucide-react";

const LS_HISTORY_KEY = "suivan_faucet_history";
const SUISCAN_URL = "https://suiscan.xyz/testnet";

function loadClaimHistory(): ClaimRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClaimHistory(history: ClaimRecord[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }
}

export default function FaucetPage() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const address = account?.address;
  const isConnected = !!account;
  const successToast = useSuccessToast();

  const { balance: usdcBalance, refetch: refetchBalance } = useUSDCBalance(address);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [cooldown, setCooldown] = useState(0);
  const [claimHistory, setClaimHistory] = useState<ClaimRecord[]>(loadClaimHistory);

  const addToHistory = useCallback((record: ClaimRecord) => {
    setClaimHistory((h) => {
      const next = [record, ...h.slice(0, 9)];
      saveClaimHistory(next);
      return next;
    });
  }, []);

  const deleteFromHistory = useCallback((index: number) => {
    setClaimHistory((h) => {
      const next = h.filter((_, i) => i !== index);
      saveClaimHistory(next);
      return next;
    });
  }, []);

  // Called by FaucetCooldownButton after a successful claim.
  const handleClaimed = useCallback((digest?: string) => {
    addToHistory({ token: "usdc", amount: "500", time: Date.now(), txDigest: digest });
    refetchBalance();
    successToast(t("faucet.success"));
  }, [addToHistory, refetchBalance, successToast, t]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const timezone = Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(d)
      .find(p => p.type === "timeZoneName")?.value || "UTC";
    return `${time} ${timezone}`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#f8672d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[10px_10px_0_#0a0a0a]">
            <Droplets className="size-4 text-[#0a0a0a]" />
            {t("faucet.badge")}
          </p>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
          >
            {t("faucet.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#444444]">
            {t("faucet.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {!mounted ? null : !isConnected ? (
            <div className="relative mx-auto max-w-md border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[14px_14px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
                <div className="absolute pointer-events-none" style={{ top: "-10%", right: "-10%", width: "50%", height: "40%", background: "repeating-linear-gradient(45deg, #0a0a0a 0 2px, transparent 2px 10px)", opacity: 0.06, mixBlendMode: "multiply" }} />
                <div className="relative z-20 p-8 text-center">
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-12 h-4" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 7px, transparent 7px, transparent 12px, #0a0a0a 12px, #0a0a0a 13px, transparent 13px, transparent 18px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>auth</span>
                  </div>
                  <div className="mx-auto mb-6 grid size-16 place-items-center border-[3px] border-[#0a0a0a] bg-grid-brutal">
                    <Wallet className="size-7 text-[#0a0a0a]" />
                  </div>
                  <h2
                    className="text-2xl font-black leading-none"
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
                  >
                    {t("faucet.walletRequired")}
                  </h2>
                  <div className="mt-6 pt-3 border-t-[2px] border-[#0a0a0a] flex justify-between items-end">
                    <div className="w-8 h-3" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 5px, transparent 5px, transparent 8px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>required</span>
                  </div>
                </div>
              </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4 shadow-[12px_12px_0_#0a0a0a] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
                    <div className="relative z-20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-8 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px)" }} />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>balance</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[#0a0a0a] bg-[#fbf7ed]">
                        <Shield className="size-5 text-[#0a0a0a]" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>
                          {t("faucet.usdcLabel")}
                        </p>
                        <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>
                          {usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>

                  <a
                    href="https://faucet.testnet.sui.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group border-[3px] border-[#0a0a0a] bg-[#e0f4ff] p-4 shadow-[12px_12px_0_#0a0a0a] overflow-hidden transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
                    <div className="relative z-20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-8 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px)" }} />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>gas</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[#0a0a0a] bg-grid-brutal">
                        <ExternalLink className="size-5 text-[#0a0a0a]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>Get free SUI for gas</p>
                        <p className="text-lg font-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Open Sui Faucet</p>
                        <p className="text-xs font-semibold text-[#444444]">Covers gas fees on testnet</p>
                      </div>
                      <ExternalLink className="size-5 shrink-0 text-[#444444] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    </div>
                  </a>
                </div>
              </div>

              <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] p-6 shadow-[12px_12px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
                <div className="absolute pointer-events-none" style={{ top: "-10%", right: "-10%", width: "40%", height: "40%", background: "repeating-linear-gradient(45deg, #0a0a0a 0 1px, transparent 1px 6px)", opacity: 0.06 }} />
                <div className="relative z-20">
                <div className="flex justify-between items-center mb-4">
                  <div className="w-12 h-3" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 6px, transparent 6px, transparent 10px)" }} />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>claim</span>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid size-12 place-items-center border-[3px] border-[#0a0a0a] bg-[#ccfbf1]">
                    <Shield className="size-5 text-[#0a0a0a]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      {t("faucet.usdcLabel")}
                    </h2>
                    <p className="text-xs font-semibold text-[#444444]">{t("faucet.usdcDesc")}</p>
                  </div>
                </div>

                <FaucetCooldownButton variant="full" onClaimed={handleClaimed} />
              </div>

              <p className="protocol-font mb-3 mt-10 text-xs font-black uppercase tracking-[0.18em] text-[#444444]">
                {t("faucet.recentTitle")}
              </p>
              <div className="border-[3px] border-[#0a0a0a] bg-[#e8e1d9] shadow-[10px_10px_0_#0a0a0a]">
                {claimHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="mx-auto mb-3 size-6 text-[#444444]" />
                    <p className="text-sm font-semibold text-[#444444]">{t("faucet.recentEmpty")}</p>
                  </div>
                ) : (
                  <div className="divide-y-[3px] divide-[#0a0a0a]">
                    {claimHistory.map((rec, i) => (
                      <div key={i} className="group flex items-center gap-4 p-4">
                        <div className="grid size-10 shrink-0 place-items-center border-[3px] border-[#0a0a0a] bg-[#ccfbf1]">
                          <Shield className="size-4 text-[#0a0a0a]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm tracking-tight" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>
                            {rec.amount} USDC
                          </p>
                          <p className="text-xs font-semibold text-[#444444]">
                            {formatDate(rec.time)} · {formatTime(rec.time)}
                          </p>
                          <a
                            href={`${SUISCAN_URL}/tx/${rec.txDigest || "0x"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-[#444444] underline underline-offset-2 decoration-dotted hover:text-[#0a0a0a] hover:decoration-solid transition-colors"
                          >
                            <ExternalLink className="size-3 shrink-0" />
                            {rec.txDigest
                              ? `${rec.txDigest.slice(0, 16)}…${rec.txDigest.slice(-4)}`
                              : "View on SuiScan"}
                          </a>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-[#ccfbf1]" />
                        <button
                          onClick={() => deleteFromHistory(i)}
                          className="grid size-6 shrink-0 place-items-center border-[2px] border-transparent text-[#444444] opacity-0 transition-all hover:border-[#0a0a0a] hover:text-[#0a0a0a] group-hover:opacity-100"
                          title="Remove"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <Link
                  href="/pools"
                  className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-8 text-base font-black text-[#0a0a0a] shadow-[10px_10px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  {t("faucet.goToPools")}
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

interface ClaimRecord {
  token: string;
  amount: string;
  time: number;
  txDigest?: string;
}
