"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import { useUSDCBalance, useClaimUSDC } from "@/hooks/useSuiContracts";
import { useFaucetId } from "@/config/sui";
import {
  Droplets,
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Shield,
  Sparkles,
} from "lucide-react";

type ClaimStatus = "idle" | "loading" | "success" | "error";

const FAUCET_COOLDOWN_S = 86400;
const LS_KEY = "suivan_faucet_claim";
const LS_HISTORY_KEY = "suivan_faucet_history";
const SUISCAN_URL = "https://suiscan.xyz/testnet";

function getLastClaimTime(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(LS_KEY);
  return raw ? Number(raw) : 0;
}

function setLastClaimTime() {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, String(Date.now()));
  }
}

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
  const errorToast = useErrorToast();
  const faucetId = useFaucetId();

  const { balance: usdcBalance, refetch: refetchBalance } = useUSDCBalance(address);
  const { claimUSDC, isPending: isWalletClaiming, hash: txHash, error: claimError } = useClaimUSDC();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [cooldown, setCooldown] = useState(0);
  const [claimHistory, setClaimHistory] = useState<ClaimRecord[]>(loadClaimHistory);
  const lastSavedHash = useRef<string | undefined>(undefined);

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

  const cooldownActive = cooldown > 0;

  useEffect(() => {
    if (!cooldownActive || cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => {
        const next = c - 1;
        if (next <= 0) return 0;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownActive, cooldown]);

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    const last = getLastClaimTime();
    if (last) {
      const elapsed = Date.now() - last;
      const remaining = Math.max(0, FAUCET_COOLDOWN_S - Math.floor(elapsed / 1000));
      if (remaining > 0) {
        setCooldown(remaining);
      }
    }
  }, []);

  const onClaimSuccess = useCallback((digest?: string) => {
    setClaimStatus("success");
    setLastClaimTime();
    setCooldown(FAUCET_COOLDOWN_S);
    addToHistory({ token: "usdc", amount: "500", time: Date.now(), txDigest: digest || txHash });
    refetchBalance();
    successToast(t("faucet.success"));
    setTimeout(() => setClaimStatus((s) => (s === "success" ? "idle" : s)), 3000);
  }, [addToHistory, refetchBalance, successToast, t, txHash]);

  const trySponsor = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_usdc", userAddress: address }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Sponsor failed");
      const { digest } = await res.json();
      onClaimSuccess(digest);
    } catch (fallbackErr) {
      setClaimStatus("error");
      errorToast(fallbackErr instanceof Error ? fallbackErr.message : t("faucet.error"));
      setTimeout(() => setClaimStatus("idle"), 2500);
    }
  }, [address, errorToast, onClaimSuccess, t]);

  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!txHash || txHash === lastSavedHash.current) return;
    lastSavedHash.current = txHash;
    if (claimStatus !== "loading") return;
    onClaimSuccess(txHash);
  }, [txHash, claimStatus, onClaimSuccess]);

  // Watch for mutation errors to trigger sponsor fallback
  useEffect(() => {
    if (!claimError || claimStatus !== "loading") return;
    const msg = claimError.message;
    if (msg === lastErrorRef.current) return;
    lastErrorRef.current = msg;
    trySponsor();
  }, [claimError, claimStatus, trySponsor]);

  const handleClaimDirect = useCallback(() => {
    if (!address || cooldownActive || isWalletClaiming || !faucetId) return;

    const last = getLastClaimTime();
    if (last && Date.now() - last < FAUCET_COOLDOWN_S * 1000) {
      setCooldown(Math.ceil((FAUCET_COOLDOWN_S * 1000 - (Date.now() - last)) / 1000));
      errorToast("Please wait for cooldown to expire");
      return;
    }

    setClaimStatus("loading");
    lastSavedHash.current = undefined;
    lastErrorRef.current = null;
    claimUSDC(faucetId);
  }, [address, cooldownActive, isWalletClaiming, faucetId, claimUSDC, errorToast]);

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

                  <div className="relative border-[3px] border-[#0a0a0a] bg-[#ede9fe] p-4 shadow-[12px_12px_0_#0a0a0a] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
                    <div className="relative z-20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-8 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px)" }} />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>gas</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[#0a0a0a] bg-grid-brutal">
                        <Sparkles className="size-5 text-[#0a0a0a]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#444444]" style={{ fontFamily: "'Courier New', monospace" }}>Gas sponsored</p>
                        <p className="text-lg font-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Zero Gas Fees</p>
                        <p className="text-xs font-semibold text-[#444444]">All transactions sponsored by Suivan</p>
                      </div>
                    </div>
                    </div>
                  </div>
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

                <div className="relative">
                  <button
                    onClick={handleClaimDirect}
                    disabled={cooldownActive || claimStatus === "loading" || isWalletClaiming || !faucetId}
                    className={`protocol-font relative w-full border-[3px] border-[#0a0a0a] px-5 py-3 text-xs font-black shadow-[10px_10px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      claimStatus === "success"
                        ? "bg-[#ccfbf1] text-[#0a0a0a]"
                        : cooldownActive
                        ? "bg-[#fef9c3] text-[#0a0a0a]"
                        : "bg-[#38bdf8] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#38bdf8]"
                    }`}
                  >
                    {claimStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-transparent" />
                        Confirming in wallet...
                      </span>
                    ) : claimStatus === "success" ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="size-3.5" />
                        Minted 500 USDC!
                      </span>
                    ) : cooldownActive ? (
                      <span className="inline-flex items-center gap-2">
                        <Clock className="size-3.5" />
                        {String(Math.floor(cooldown / 3600)).padStart(2, "0")}:
                        {String(Math.floor((cooldown % 3600) / 60)).padStart(2, "0")}:
                        {String(cooldown % 60).padStart(2, "0")}
                      </span>
                    ) : (
                      <span>Claim 500 USDC →</span>
                    )}
                  </button>
                  {cooldownActive && (
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-[#0a0a0a] opacity-30 transition-all duration-1000"
                      style={{ width: `${(cooldown / FAUCET_COOLDOWN_S) * 100}%` }}
                    />
                  )}
                </div>
                {cooldownActive && (
                  <p className="mt-3 text-center text-xs font-semibold text-[#444444]">
                    Next claim available in <strong className="text-[#0a0a0a]">{String(Math.floor(cooldown / 3600)).padStart(2, "0")}:{String(Math.floor((cooldown % 3600) / 60)).padStart(2, "0")}:{String(cooldown % 60).padStart(2, "0")}</strong>. Come back after cooldown to claim more USDC.
                  </p>
                )}
                </div>
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
