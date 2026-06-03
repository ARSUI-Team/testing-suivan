"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowRight, Calculator, DollarSign, Users, Clock, ShieldCheck, Zap } from "lucide-react";

export default function SimulatorPage() {
  const { t } = useLanguage();
  const [deposit, setDeposit] = useState(25);
  const [participants, setParticipants] = useState(10);
  const [cycleDays, setCycleDays] = useState(30);

  const collateral = useMemo(() => Math.ceil(deposit * (participants - 1) * 1.25), [deposit, participants]);
  const totalUpfront = deposit + collateral;
  const totalPool = deposit * participants;
  const totalCycles = participants;
  const poolDurationDays = cycleDays * participants;
  const poolDurationMonths = Math.round(poolDurationDays / 30);
  const ethGasPerTx = 5.50;
  const suiGasPerTx = 0;
  const ethTotalGas = ethGasPerTx * (participants + 1);
  const savings = ethTotalGas - suiGasPerTx;

  const presets = [10, 25, 50, 100];

  return (
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(94,200,255,0.34),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.24),transparent_26%)]" />
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 shadow-[4px_4px_0_var(--brutal-ink)]">
            <Calculator className="size-4 text-[var(--brutal-ink)]" />
            <span className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("simulator.badge")}</span>
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
            {t("simulator.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            {t("simulator.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-5">

            {/* Inputs Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                <div className="mb-6 flex items-center gap-2">
                  <DollarSign className="size-5 text-[var(--brutal-ink)]" />
                  <h2 className="protocol-font text-sm font-black uppercase tracking-[0.18em]">{t("simulator.poolConfig")}</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="protocol-font text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.depositLabel")}</label>
                      <span className="protocol-font text-2xl font-black">{deposit} USDC</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      step="5"
                      value={deposit}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                      className="w-full h-2 appearance-none cursor-pointer bg-[var(--brutal-surface)] accent-[var(--brutal-ink)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-[var(--brutal-accent)] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[var(--brutal-ink)] [&::-webkit-slider-thumb]:shadow-[2px_2px_0_var(--brutal-ink)]"
                    />
                    <div className="mt-2 flex gap-2">
                      {presets.map((p) => (
                        <button
                          key={p}
                          onClick={() => setDeposit(p)}
                          className={`protocol-font border-[3px] border-[var(--brutal-ink)] px-3 py-1 text-xs font-black transition ${
                            deposit === p
                              ? "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)]"
                              : "bg-[var(--brutal-bg)] text-[var(--brutal-muted)]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="protocol-font text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.participantsLabel")}</label>
                      <span className="protocol-font text-2xl font-black">{participants}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      step="1"
                      value={participants}
                      onChange={(e) => setParticipants(Number(e.target.value))}
                      className="w-full h-2 appearance-none cursor-pointer bg-[var(--brutal-surface)] accent-[var(--brutal-ink)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-[var(--brutal-accent)] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[var(--brutal-ink)] [&::-webkit-slider-thumb]:shadow-[2px_2px_0_var(--brutal-ink)]"
                    />
                    <div className="mt-1 flex justify-between text-xs text-[var(--brutal-muted)]">
                      <span>2</span>
                      <span>50</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="protocol-font text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.cycleLabel")}</label>
                      <span className="protocol-font text-2xl font-black">{cycleDays}d</span>
                    </div>
                    <input
                      type="range"
                      min="7"
                      max="90"
                      step="1"
                      value={cycleDays}
                      onChange={(e) => setCycleDays(Number(e.target.value))}
                      className="w-full h-2 appearance-none cursor-pointer bg-[var(--brutal-surface)] accent-[var(--brutal-ink)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-[var(--brutal-accent)] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[var(--brutal-ink)] [&::-webkit-slider-thumb]:shadow-[2px_2px_0_var(--brutal-ink)]"
                    />
                    <div className="mt-1 flex justify-between text-xs text-[var(--brutal-muted)]">
                      <span>7d</span>
                      <span>90d</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="size-5 text-[var(--brutal-ink)]" />
                  <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("simulator.gasSponsor")}</h3>
                </div>
                <p className="text-sm font-semibold leading-6 text-[var(--brutal-muted)]">{t("simulator.gasSponsorDesc")}</p>
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-3 space-y-6">

              {/* Total Upfront */}
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.breakdown")}</p>
                <p className="protocol-font mt-4 text-sm font-black tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.needToPrepare")}</p>
                <p className="mt-1 text-5xl font-black tracking-[-0.04em] md:text-6xl">
                  {totalUpfront.toLocaleString()} <span className="text-2xl">USDC</span>
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                    <p className="protocol-font text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.deposit")}</p>
                    <p className="protocol-font mt-1 text-2xl font-black">{deposit} USDC</p>
                  </div>
                  <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                    <p className="protocol-font text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.collateral")}</p>
                    <p className="protocol-font mt-1 text-2xl font-black">{collateral} USDC</p>
                     <p className="mt-1 text-[10px] font-semibold text-[var(--brutal-muted)]">{t("simulator.collateralNote")}</p>
                     <div className="mt-2 rounded border-[2px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-2 text-[9px] font-semibold leading-relaxed text-[var(--brutal-muted)]">
                       Collateral protects all members. If you miss a payment, the deposit is deducted from your collateral. Unused collateral + proportional yield is returned when the pool ends.
                     </div>
                  </div>
                  <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                    <p className="protocol-font text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.gas")}</p>
                    <p className="protocol-font mt-1 text-2xl font-black">{t("simulator.gasFree")}</p>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="mt-6 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-1">
                  <div className="flex h-8">
                    <div
                      className="flex items-center justify-center bg-[var(--brutal-accent)] text-xs font-black text-[var(--brutal-ink)] transition-all duration-300"
                      style={{ width: `${(deposit / totalUpfront) * 100}%` }}
                    >
                      {Math.round((deposit / totalUpfront) * 100)}%
                    </div>
                    <div
                      className="flex items-center justify-center bg-[var(--brutal-ink)] text-xs font-black text-[var(--brutal-bg)] transition-all duration-300"
                      style={{ width: `${(collateral / totalUpfront) * 100}%` }}
                    >
                      {Math.round((collateral / totalUpfront) * 100)}%
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between px-1">
                    <span className="protocol-font text-[10px] font-black text-[var(--brutal-ink)]">{t("simulator.deposit")}</span>
                    <span className="protocol-font text-[10px] font-black text-[var(--brutal-ink)]">{t("simulator.collateral")}</span>
                  </div>
                </div>
              </div>

              {/* Pool Summary + Position */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-4 flex items-center gap-2">
                    <Users className="size-5 text-[var(--brutal-ink)]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("simulator.poolSummary")}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b-[3px] border-[var(--brutal-ink)] pb-2">
                      <span className="text-sm font-semibold text-[var(--brutal-muted)]">{t("simulator.totalPool")}</span>
                      <span className="protocol-font text-lg font-black">{totalPool.toLocaleString()} USDC</span>
                    </div>
                    <div className="flex justify-between border-b-[3px] border-[var(--brutal-ink)] pb-2">
                      <span className="text-sm font-semibold text-[var(--brutal-muted)]">{t("simulator.totalCycles")}</span>
                      <span className="protocol-font text-lg font-black">{totalCycles}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[var(--brutal-muted)]">{t("simulator.poolDuration")}</span>
                      <span className="protocol-font text-lg font-black">{poolDurationMonths} mo ({poolDurationDays}d)</span>
                    </div>
                  </div>
                </div>

                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck className="size-5 text-[var(--brutal-ink)]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("simulator.yourPosition")}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b-[3px] border-[var(--brutal-ink)] pb-2">
                      <span className="text-sm font-semibold text-[var(--brutal-muted)]">{t("simulator.youPay")}</span>
                      <span className="protocol-font text-lg font-black">{deposit} USDC</span>
                    </div>
                    <div className="flex justify-between border-b-[3px] border-[var(--brutal-ink)] pb-2">
                      <span className="text-sm font-semibold text-[var(--brutal-muted)]">{t("simulator.youEarn")}</span>
                      <span className="protocol-font text-lg font-black">{totalPool.toLocaleString()} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[var(--brutal-muted)]">{t("simulator.gas")}</span>
                      <span className="protocol-font text-lg font-black">{t("simulator.gasFree")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sui vs Ethereum */}
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-6 shadow-[4px_4px_0_var(--brutal-ink)]">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="size-5 text-[var(--brutal-ink)]" />
                  <h3 className="protocol-font text-xs font-black uppercase tracking-[0.18em]">{t("simulator.compareTitle")}</h3>
                </div>
                <p className="mb-5 text-sm font-semibold leading-6 text-[var(--brutal-muted)]">{t("simulator.compareDesc")}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] p-5 text-center shadow-[4px_4px_0_var(--brutal-ink)]">
                    <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.suiFee")}</p>
                    <p className="protocol-font text-3xl font-black">$0.00</p>
                  </div>
                  <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--danger-soft)] p-5 text-center shadow-[4px_4px_0_var(--brutal-ink)]">
                    <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.ethFee")}</p>
                    <p className="protocol-font text-3xl font-black">${ethTotalGas.toFixed(2)}</p>
                  </div>
                  <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)] p-5 text-center shadow-[4px_4px_0_var(--brutal-ink)]">
                    <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.1em] text-[var(--brutal-muted)]">{t("simulator.savings")}</p>
                    <p className="protocol-font text-3xl font-black">${savings.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Link
                  href="/pools"
                  className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-8 text-base font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  {t("simulator.cta")}
                  <ArrowRight className="size-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
