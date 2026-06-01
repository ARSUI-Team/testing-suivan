"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import {
  Droplets,
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRight,
  Zap,
  Shield,
} from "lucide-react";

type ClaimToken = "usdc" | "sui";
type ClaimStatus = "idle" | "loading" | "success" | "error";

interface ClaimRecord {
  token: ClaimToken;
  amount: string;
  time: number;
  txDigest?: string;
}

const FAUCET_COOLDOWN = 30;
const BALANCE_ITEMS = [
  {
    key: "usdc" as const,
    label: "TEST_USDC",
    icon: Shield,
    color: "var(--success-soft)",
    amount: "0.00",
    decimals: 2,
  },
  {
    key: "sui" as const,
    label: "TEST_SUI",
    icon: Zap,
    color: "var(--accent-soft)",
    amount: "0.00",
    decimals: 4,
  },
];

export default function FaucetPage() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const isConnected = !!account;
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [activeToken, setActiveToken] = useState<ClaimToken>("usdc");
  const [lastClaimTime, setLastClaimTime] = useState<number>(0);
  const [cooldown, setCooldown] = useState(0);
  const [claimHistory, setClaimHistory] = useState<ClaimRecord[]>([]);
  const [balances, setBalances] = useState({ usdc: 0, sui: 0 });
  const [simulateBalance, setSimulateBalance] = useState(0);

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

  const handleClaim = useCallback(
    async (token: ClaimToken) => {
      if (!account || cooldownActive) return;

      setActiveToken(token);
      setClaimStatus("loading");

      try {
        await new Promise((r) => setTimeout(r, 1800));
        const success = Math.random() > 0.15;

        if (success) {
          const amount = token === "usdc" ? "10,000" : "1";
          setClaimStatus("success");
          setLastClaimTime(Date.now());
          setCooldown(FAUCET_COOLDOWN);
          setSimulateBalance((b) => b + (token === "usdc" ? 10000 : 1));
          setBalances((b) => ({
            ...b,
            [token]: b[token] + (token === "usdc" ? 10000 : 1),
          }));
          setClaimHistory((h) => [
            {
              token,
              amount,
              time: Date.now(),
              txDigest: `DummyTx${Math.random().toString(36).slice(2, 10)}`,
            },
            ...h.slice(0, 9),
          ]);
          successToast(t("faucet.success"));
        } else {
          setClaimStatus("error");
          errorToast(t("faucet.error"));
        }
      } catch {
        setClaimStatus("error");
        errorToast(t("faucet.error"));
      } finally {
        setTimeout(() => {
          if (claimStatus !== "loading") return;
          setClaimStatus("idle");
        }, 2500);
      }
    },
    [account, cooldownActive, claimStatus, successToast, errorToast, t],
  );

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
                  {BALANCE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-4 border-[3px] border-[var(--brutal-ink)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]"
                        style={{ background: item.color }}
                      >
                        <div className="grid size-12 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)]">
                          <Icon className="size-5 text-[var(--brutal-ink)]" />
                        </div>
                        <div>
                          <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em] text-[var(--brutal-muted)]">
                            {item.label}
                          </p>
                          <p
                            className="text-2xl font-black tracking-tight"
                            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                          >
                            {balances[item.key].toLocaleString("en-US", {
                              minimumFractionDigits: item.decimals,
                              maximumFractionDigits: item.decimals,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="protocol-font mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--brutal-muted)]">
                {t("faucet.badge")}
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5">
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
                  <button
                    onClick={() => handleClaim("usdc")}
                    disabled={cooldownActive || claimStatus === "loading"}
                    className={`protocol-font w-full border-[3px] border-[var(--brutal-ink)] px-5 py-3 text-xs font-black shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      claimStatus === "success" && activeToken === "usdc"
                        ? "bg-[var(--success-soft)] text-[var(--brutal-ink)]"
                        : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-ink)] hover:text-[var(--brutal-accent)]"
                    }`}
                  >
                    {claimStatus === "loading" && activeToken === "usdc" ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
                        Minting...
                      </span>
                    ) : claimStatus === "success" && activeToken === "usdc" ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="size-3.5" />
                        Minted!
                      </span>
                    ) : (
                      t("faucet.claimUsdc")
                    )}
                  </button>
                </div>

                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid size-12 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)]">
                      <Zap className="size-5 text-[var(--brutal-ink)]" />
                    </div>
                    <div>
                      <h2
                        className="text-xl font-black"
                        style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
                      >
                        {t("faucet.suiLabel")}
                      </h2>
                      <p className="text-xs font-semibold text-[var(--brutal-muted)]">{t("faucet.suiDesc")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaim("sui")}
                    disabled={cooldownActive || claimStatus === "loading"}
                    className={`protocol-font w-full border-[3px] border-[var(--brutal-ink)] px-5 py-3 text-xs font-black shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      claimStatus === "success" && activeToken === "sui"
                        ? "bg-[var(--success-soft)] text-[var(--brutal-ink)]"
                        : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-ink)] hover:text-[var(--brutal-accent)]"
                    }`}
                  >
                    {claimStatus === "loading" && activeToken === "sui" ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
                        Minting...
                      </span>
                    ) : claimStatus === "success" && activeToken === "sui" ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="size-3.5" />
                        Minted!
                      </span>
                    ) : (
                      t("faucet.claimSui")
                    )}
                  </button>
                </div>
              </div>

              {cooldownActive && (
                <div className="mt-6 inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] px-4 py-2 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <Clock className="size-4 text-[var(--brutal-ink)]" />
                  <span className="protocol-font text-xs font-black uppercase tracking-[0.15em]">
                    {t("faucet.cooldown", { time: cooldown })}
                  </span>
                </div>
              )}

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
                        <div
                          className={`grid size-10 shrink-0 place-items-center border-[3px] border-[var(--brutal-ink)] ${
                            rec.token === "usdc" ? "bg-[var(--success-soft)]" : "bg-[var(--accent-soft)]"
                          }`}
                        >
                          {rec.token === "usdc" ? (
                            <Shield className="size-4 text-[var(--brutal-ink)]" />
                          ) : (
                            <Zap className="size-4 text-[var(--brutal-ink)]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm tracking-tight" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                            {rec.amount} {rec.token === "usdc" ? "TEST_USDC" : "TEST_SUI"}
                          </p>
                          <p className="text-[10px] font-semibold text-[var(--brutal-muted)]">
                            {formatTime(rec.time)}
                            {rec.txDigest && (
                              <span className="ml-3 font-mono text-[9px] opacity-60">tx: 0x{rec.txDigest.slice(0, 8)}...</span>
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
                <p className="text-xs font-semibold text-[var(--brutal-ink)]">{t("faucet.description")}</p>
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
