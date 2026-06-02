"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  Zap,
} from "lucide-react";

type ClaimStatus = "idle" | "loading" | "success" | "error";

const FAUCET_COOLDOWN_S = 30;
const LS_KEY = "suivan_faucet_claim";
const LS_HISTORY_KEY = "suivan_faucet_history";
const SUISCAN_URL = "https://suiscan.xyz/testnet";
const SUI_FAUCET_API = "https://faucet.testnet.sui.io/v1/gas";

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

  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [suiStatus, setSuiStatus] = useState<ClaimStatus>("idle");
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

  const handleClaimSui = useCallback(async () => {
    if (!address || suiStatus === "loading") return;
    setSuiStatus("loading");
    try {
      const res = await fetch(SUI_FAUCET_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
      });
      if (!res.ok) throw new Error(`Faucet API returned ${res.status}`);
      const data = await res.json();
      setSuiStatus("success");
      successToast("SUI sent! Check your wallet.");
      setTimeout(() => setSuiStatus("idle"), 3000);
    } catch (err) {
      setSuiStatus("error");
      errorToast(err instanceof Error ? err.message : "SUI faucet request failed");
      setTimeout(() => setSuiStatus("idle"), 3000);
    }
  }, [address, successToast, errorToast]);

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
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(94,200,255,0.34),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.24),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 shadow-[4px_4px_0_var(--brutal-ink)]">
            <Droplets className="size-4 text-[var(--brutal-ink)]" />
            <span className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("faucet.badge")}</span>
          </div>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
          >
            {t("faucet.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            {t("faucet.subtitle")}
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
                {t("faucet.walletRequired")}
              </h2>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="protocol-font mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--brutal-muted)]">
                  {t("faucet.balanceTitle")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-4 border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                    <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)]">
                      <Shield className="size-5 text-[var(--brutal-ink)]" />
                    </div>
                    <div>
                      <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        {t("faucet.usdcLabel")}
                      </p>
                      <p
                        className="text-2xl font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {usdcBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClaimSui}
                    disabled={suiStatus === "loading"}
                    className={`flex items-center gap-4 border-[3px] border-[var(--brutal-ink)] p-4 shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      suiStatus === "success"
                        ? "bg-[var(--success-soft)]"
                        : suiStatus === "error"
                        ? "bg-[var(--error-soft)]"
                        : "bg-[var(--accent-soft)] hover:bg-[var(--brutal-ink)]"
                    }`}
                  >
                    <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)]">
                      {suiStatus === "loading" ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
                      ) : (
                        <Zap className="size-5 text-[var(--brutal-ink)]" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        SUI for gas
                      </p>
                      <p
                        className="text-sm font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {suiStatus === "loading"
                          ? "Requesting..."
                          : suiStatus === "success"
                          ? "SUI sent!"
                          : suiStatus === "error"
                          ? "Try again"
                          : "Get free SUI →"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <p className="protocol-font mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--brutal-muted)]">
                {t("faucet.badge")}
              </p>

              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid size-12 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)]">
                    <Shield className="size-5 text-[var(--brutal-ink)]" />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-black"
                      style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                    >
                      {t("faucet.usdcLabel")}
                    </h2>
                    <p className="text-xs font-semibold text-[var(--brutal-muted)]">{t("faucet.usdcDesc")}</p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={handleClaimDirect}
                    disabled={cooldownActive || claimStatus === "loading" || isWalletClaiming || !faucetId}
                    className={`protocol-font relative w-full border-[3px] border-[var(--brutal-ink)] px-5 py-3 text-xs font-black shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      claimStatus === "success"
                        ? "bg-[var(--success-soft)] text-[var(--brutal-ink)]"
                        : cooldownActive
                        ? "bg-[var(--warn-soft)] text-[var(--brutal-ink)]"
                        : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-ink)] hover:text-[var(--brutal-accent)]"
                    }`}
                  >
                    {claimStatus === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
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
                      className="absolute bottom-0 left-0 h-1 bg-[var(--brutal-ink)] opacity-30 transition-all duration-1000"
                      style={{ width: `${(cooldown / FAUCET_COOLDOWN_S) * 100}%` }}
                    />
                  )}
                </div>
                {cooldownActive && (
                  <p className="mt-3 text-center text-[10px] font-semibold text-[var(--brutal-muted)]">
                    Next claim available in <strong className="text-[var(--brutal-ink)]">{String(Math.floor(cooldown / 3600)).padStart(2, "0")}:{String(Math.floor((cooldown % 3600) / 60)).padStart(2, "0")}:{String(cooldown % 60).padStart(2, "0")}</strong>. Need more USDC? Get SUI first above, then claim again.
                  </p>
                )}
              </div>

              <p className="protocol-font mb-3 mt-10 text-xs font-black uppercase tracking-[0.18em] text-[var(--brutal-muted)]">
                {t("faucet.recentTitle")}
              </p>
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] shadow-[4px_4px_0_var(--brutal-ink)]">
                {claimHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="mx-auto mb-3 size-6 text-[var(--brutal-muted)]" />
                    <p className="text-sm font-semibold text-[var(--brutal-muted)]">{t("faucet.recentEmpty")}</p>
                  </div>
                ) : (
                  <div className="divide-y-[3px] divide-[var(--brutal-ink)]">
                    {claimHistory.map((rec, i) => (
                      <div key={i} className="group flex items-center gap-4 p-4">
                        <div className="grid size-10 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)]">
                          <Shield className="size-4 text-[var(--brutal-ink)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm tracking-tight" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                            {rec.amount} USDC
                          </p>
                          <p className="text-[10px] font-semibold text-[var(--brutal-muted)]">
                            {formatDate(rec.time)} · {formatTime(rec.time)}
                          </p>
                          <a
                            href={`${SUISCAN_URL}/tx/${rec.txDigest || "0x"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--brutal-muted)] underline underline-offset-2 decoration-dotted hover:text-[var(--brutal-ink)] hover:decoration-solid transition-colors"
                          >
                            <ExternalLink className="size-3 shrink-0" />
                            {rec.txDigest
                              ? `${rec.txDigest.slice(0, 16)}…${rec.txDigest.slice(-4)}`
                              : "View on SuiScan"}
                          </a>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-[var(--success-soft)]" />
                        <button
                          onClick={() => deleteFromHistory(i)}
                          className="grid size-6 shrink-0 place-items-center border-[2px] border-transparent text-[var(--brutal-muted)] opacity-0 transition-all hover:border-[var(--brutal-ink)] hover:text-[var(--brutal-ink)] group-hover:opacity-100"
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
                  className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-8 text-base font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  {t("faucet.goToPools")}
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

interface ClaimRecord {
  token: string;
  amount: string;
  time: number;
  txDigest?: string;
}
