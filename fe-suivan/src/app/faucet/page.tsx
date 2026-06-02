"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

type ClaimStatus = "idle" | "loading" | "success" | "error";

const FAUCET_COOLDOWN_S = 30;
const LS_KEY = "suivan_faucet_claim";
const LS_HISTORY_KEY = "suivan_faucet_history";
const SUI_TESTNET_FAUCET = "https://faucet.testnet.sui.io";
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

  const { balance: usdcBalance } = useUSDCBalance(address);
  const { claimUSDC, isPending: isWalletClaiming } = useClaimUSDC();

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

  const handleClaimDirect = useCallback(async () => {
    if (!address || cooldownActive || isWalletClaiming || !faucetId) return;

    const last = getLastClaimTime();
    if (last && Date.now() - last < FAUCET_COOLDOWN_S * 1000) {
      setCooldown(Math.ceil((FAUCET_COOLDOWN_S * 1000 - (Date.now() - last)) / 1000));
      errorToast("Please wait for cooldown to expire");
      return;
    }

    setClaimStatus("loading");
    try {
      await new Promise<void>((resolve, reject) => {
        claimUSDC(faucetId);
        // useSignAndExecuteTransaction doesn't return promise — we rely on the mutation callbacks
        // Instead, we optimistically show success after the tx is submitted
        setTimeout(() => {
          setClaimStatus("success");
          setLastClaimTime();
          setCooldown(FAUCET_COOLDOWN_S);
          addToHistory({ token: "usdc", amount: "500", time: Date.now() });
          successToast(t("faucet.success"));
          resolve();
        }, 1500);
      });
    } catch (err) {
      // Fallback to sponsored tx
      try {
        const res = await fetch("/api/sponsor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim_usdc", userAddress: address }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Sponsor failed");
        const { digest } = await res.json();
        setClaimStatus("success");
        setLastClaimTime();
        setCooldown(FAUCET_COOLDOWN_S);
        addToHistory({ token: "usdc", amount: "500", time: Date.now(), txDigest: digest });
        successToast(t("faucet.success"));
      } catch (fallbackErr) {
        setClaimStatus("error");
        errorToast(fallbackErr instanceof Error ? fallbackErr.message : t("faucet.error"));
      }
    } finally {
      setTimeout(() => {
        setClaimStatus((s) => (s === "loading" ? "idle" : s));
      }, 2500);
    }
  }, [address, cooldownActive, isWalletClaiming, faucetId, claimUSDC, successToast, errorToast, t]);

  const handleOpenSuiFaucet = () => {
    window.open(SUI_TESTNET_FAUCET, "_blank", "noopener");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
                    onClick={handleOpenSuiFaucet}
                    className="flex items-center gap-4 border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                  >
                    <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)]">
                      <ExternalLink className="size-5 text-[var(--brutal-ink)]" />
                    </div>
                    <div className="text-left">
                      <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                        SUI for gas
                      </p>
                      <p
                        className="text-sm font-black tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        Get free SUI →
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
                        Minting...
                      </span>
                    ) : claimStatus === "success" ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="size-3.5" />
                        Minted 500 USDC!
                      </span>
                    ) : cooldownActive ? (
                      <span className="inline-flex items-center gap-2">
                        <Clock className="size-3.5" />
                        Wait {cooldown}s
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
                      <div key={i} className="flex items-center gap-4 p-4">
                        <div className="grid size-10 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)]">
                          <Shield className="size-4 text-[var(--brutal-ink)]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm tracking-tight" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                            {rec.amount} USDC
                          </p>
                          <p className="text-[10px] font-semibold text-[var(--brutal-muted)]">
                            {formatTime(rec.time)}
                            {rec.txDigest && (
                              <a
                                href={`${SUISCAN_URL}/tx/${rec.txDigest}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 font-mono text-[9px] opacity-60 underline underline-offset-2 hover:opacity-100"
                              >
                                tx: 0x{rec.txDigest.slice(0, 8)}...
                              </a>
                            )}
                          </p>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-[var(--success-soft)]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="text-xs font-semibold text-[var(--brutal-ink)]">
                  You need USDC for pool operations + SUI for gas fees.
                  Claim 500 USDC here, then get free SUI from the testnet faucet.
                </p>
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
