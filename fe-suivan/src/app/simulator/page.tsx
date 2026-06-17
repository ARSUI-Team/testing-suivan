"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowRight, Calculator, DollarSign, Users, Clock, ShieldCheck } from "lucide-react";

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
  const suiGasPerTx = 0.0001;
  const suiTotalGas = suiGasPerTx * (participants + 1);
  const ethGasPerTx = 1.50;
  const ethTotalGas = ethGasPerTx * (participants + 1);

  const presets = [10, 25, 50, 100];

  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]" />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#f8672d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#0a0a0a]">
            <Calculator className="size-4 text-[#0a0a0a]" />
            {t("simulator.badge")}
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>
            {t("simulator.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#555555]">
            {t("simulator.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-5">

            {/* Inputs Panel — Editorial Brutalism Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[8px_8px_0_#0a0a0a] overflow-hidden">
                {/* Grain texture overlay */}
                <div className="absolute inset-0 pointer-events-none z-10" style={{
                  backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)",
                  backgroundSize: "4px 4px",
                  opacity: 0.06,
                }} />
                {/* Geometric orb accent */}
                <div className="absolute pointer-events-none" style={{
                  top: "-10%", right: "-10%",
                  width: "55%", height: "40%",
                  background: "repeating-linear-gradient(45deg, #0a0a0a 0 2px, transparent 2px 10px)",
                  opacity: 0.08, mixBlendMode: "multiply",
                }} />

                <div className="relative z-20 p-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-[2px] border-[#0a0a0a]">
                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#0a0a0a] bg-[#f8672d] px-2 py-0.5 inline-block">Config</span>
                      <h2 className="mt-2 text-xl font-black text-[#0a0a0a] uppercase tracking-tight" style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}>
                        Pool Setup
                      </h2>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.15em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>v1.0</span>
                  </div>

                  {/* Deposit per Cycle */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.08em] text-[#555555]">
                        Contribution / Cycle
                      </label>
                      <span className="text-2xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                        {deposit} <span className="text-sm">USDC</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      step="5"
                      value={deposit}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                      className="w-full h-2 appearance-none cursor-pointer bg-[#e8e1d9] accent-[#0a0a0a] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-[#f8672d] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#0a0a0a] [&::-webkit-slider-thumb]:shadow-[2px_2px_0_#0a0a0a]"
                    />
                    <div className="mt-2 flex gap-1.5">
                      {presets.map((p) => (
                        <button
                          key={p}
                          onClick={() => setDeposit(p)}
                          className={`text-xs font-black uppercase tracking-[0.12em] border-[2px] border-[#0a0a0a] px-2.5 py-1 transition ${
                            deposit === p
                              ? "bg-[#f8672d] text-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a]"
                              : "bg-white text-[#555555] hover:bg-[#e8e1d9]"
                          }`}
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of Members */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.08em] text-[#555555]">
                        Group Size
                      </label>
                      <span className="text-2xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                        {participants}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      step="1"
                      value={participants}
                      onChange={(e) => setParticipants(Number(e.target.value))}
                      className="w-full h-2 appearance-none cursor-pointer bg-[#e8e1d9] accent-[#0a0a0a] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-[#f8672d] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#0a0a0a] [&::-webkit-slider-thumb]:shadow-[2px_2px_0_#0a0a0a]"
                    />
                    <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#555555]">
                      <span>2 people</span>
                      <span>50 people</span>
                    </div>
                  </div>

                  {/* Cycle Duration */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.08em] text-[#555555]">
                        Cycle Length
                      </label>
                      <span className="text-2xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                        {cycleDays}d
                      </span>
                    </div>
                    <input
                      type="range"
                      min="7"
                      max="90"
                      step="1"
                      value={cycleDays}
                      onChange={(e) => setCycleDays(Number(e.target.value))}
                      className="w-full h-2 appearance-none cursor-pointer bg-[#e8e1d9] accent-[#0a0a0a] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-[#f8672d] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#0a0a0a] [&::-webkit-slider-thumb]:shadow-[2px_2px_0_#0a0a0a]"
                    />
                    <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#555555]">
                      <span>1 week</span>
                      <span>3 months</span>
                    </div>
                  </div>

                  {/* Footer barcode */}
                  <div className="mt-6 pt-3 border-t-[2px] border-[#0a0a0a] flex justify-between items-end">
                    <div className="w-10 h-4" style={{
                      background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 6px, transparent 6px, transparent 10px, #0a0a0a 10px, #0a0a0a 11px, transparent 11px, transparent 15px, #0a0a0a 15px, #0a0a0a 19px, transparent 19px, transparent 22px)",
                    }} />
                    <span className="text-xs font-black uppercase tracking-[0.15em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>drag to adjust</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-3 space-y-6">

              {/* Total Upfront — editorial poster card */}
              <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[6px_6px_0_#0a0a0a] overflow-hidden">
                {/* Grain texture */}
                <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.04 }} />
                {/* Geometric accent */}
                <div className="absolute pointer-events-none" style={{ top: "-10%", right: "-10%", width: "45%", height: "35%", background: "repeating-linear-gradient(45deg, #0a0a0a 0 2px, transparent 2px 10px)", opacity: 0.06 }} />
                <div className="relative z-20 p-6">
                  {/* Header barcode */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-12 h-4" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 6px, transparent 6px, transparent 10px, #0a0a0a 10px, #0a0a0a 11px, transparent 11px, transparent 15px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>vol.01</span>
                  </div>
                  <p className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#555555] mb-1">{t("simulator.breakdown")}</p>
                  <p className="text-sm font-semibold text-[#555555]">{t("simulator.needToPrepare")}</p>
                  <p className="mt-2 text-6xl font-black tracking-[-0.05em] md:text-7xl" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", lineHeight: 0.9 }}>
                    {totalUpfront.toLocaleString()} <span className="text-2xl text-[#555555]">USDC</span>
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="border-[3px] border-[#0a0a0a] bg-white p-4 shadow-[3px_3px_0_#0a0a0a] relative overflow-hidden transition hover:-translate-y-0.5">
                      <div className="absolute pointer-events-none" style={{ bottom: "-25%", right: "-15%", width: "40%", height: "60%", background: "repeating-linear-gradient(45deg, #38bdf8 0 1px, transparent 1px 6px)", opacity: 0.1 }} />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#555555]">{t("simulator.deposit")}</span>
                      <p className="protocol-font mt-1 text-2xl font-black">{deposit} USDC</p>
                    </div>
                    <div className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4 shadow-[3px_3px_0_#0a0a0a] relative overflow-hidden transition hover:-translate-y-0.5">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#555555]">{t("simulator.collateral")} <span className="text-[#f8672d]">125%</span></span>
                      <p className="protocol-font mt-1 text-2xl font-black">{collateral} USDC</p>
                      <p className="mt-1 text-xs font-semibold leading-tight text-[#555555]">{t("simulator.collateralNote")}</p>
                    </div>
                                  <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4 shadow-[3px_3px_0_#0a0a0a] relative overflow-hidden transition hover:-translate-y-0.5">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#555555]">{t("simulator.gas")}</span>
                      <p className="protocol-font mt-1 text-2xl font-black">~{suiTotalGas.toFixed(4)} SUI</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#14b8a6]">~$0.00</p>
                    </div>
                  </div>

                  {/* Visual bar editorial style */}
                  <div className="mt-5">
                    <div className="flex h-10 border-[3px] border-[#0a0a0a] bg-white overflow-hidden">
                      <div className="flex items-center justify-center bg-[#f8672d] text-xs font-black text-white transition-all duration-300" style={{ width: `${(deposit / totalUpfront) * 100}%` }}>
                        {Math.round((deposit / totalUpfront) * 100)}%
                      </div>
                      <div className="flex items-center justify-center bg-[#0a0a0a] text-xs font-black text-[#fbf7ed] transition-all duration-300" style={{ width: `${(collateral / totalUpfront) * 100}%` }}>
                        {Math.round((collateral / totalUpfront) * 100)}%
                      </div>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] font-black uppercase tracking-[0.15em]">
                      <span className="text-[#f8672d]">{t("simulator.deposit")}</span>
                      <span className="text-[#0a0a0a]">{t("simulator.collateral")}</span>
                    </div>
                  </div>

                  {/* Collateral detail — inline */}
                  <div className="mt-5 pt-4 border-t-[2px] border-[#0a0a0a]">
                    <div className="flex gap-3">
                      <ShieldCheck className="size-4 text-[#f8672d] shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold leading-relaxed text-[#555555]">
                        Jaminan melindungi semua anggota. Jika kamu melewatkan pembayaran, setoran dipotong dari jaminan. Jaminan yang tidak digunakan + yield proporsional dikembalikan saat pool berakhir.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t-[2px] border-[#0a0a0a] flex justify-between items-end">
                    <div className="w-14 h-5" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 7px, transparent 7px, transparent 12px, #0a0a0a 12px, #0a0a0a 13px, transparent 13px, transparent 18px, #0a0a0a 18px, #0a0a0a 22px, transparent 22px, transparent 24px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#555555]" style={{ fontFamily: "'Courier New', monospace" }}>real-time calc</span>
                  </div>
                </div>
              </div>

              {/* Pool Summary + Position */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[5px_5px_0_#0a0a0a] overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "5px 5px", opacity: 0.03 }} />
                  <div className="relative z-10 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Users className="size-4 text-[#f8672d]" />
                      <h3 className="protocol-font text-xs font-black uppercase tracking-[0.15em]">{t("simulator.poolSummary")}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                        <span className="text-sm font-semibold text-[#555555]">{t("simulator.totalPool")}</span>
                        <span className="protocol-font text-lg font-black">{totalPool.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                        <span className="text-sm font-semibold text-[#555555]">{t("simulator.totalCycles")}</span>
                        <span className="protocol-font text-lg font-black">{totalCycles}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-[#555555]">{t("simulator.poolDuration")}</span>
                        <span className="protocol-font text-lg font-black">{poolDurationMonths} bulan ({poolDurationDays}h)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[5px_5px_0_#0a0a0a] overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "5px 5px", opacity: 0.03 }} />
                  <div className="relative z-10 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-[#f8672d]" />
                      <h3 className="protocol-font text-xs font-black uppercase tracking-[0.15em]">{t("simulator.yourPosition")}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                        <span className="text-sm font-semibold text-[#555555]">{t("simulator.youPay")}</span>
                        <span className="protocol-font text-lg font-black">{deposit} USDC</span>
                      </div>
                      <div className="flex justify-between border-b-[2px] border-[#0a0a0a] pb-2">
                        <span className="text-sm font-semibold text-[#555555]">{t("simulator.youEarn")}</span>
                        <span className="protocol-font text-lg font-black">{totalPool.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-[#555555]">{t("simulator.gas")}</span>
                        <span className="protocol-font text-lg font-black">~{suiGasPerTx.toFixed(4)} SUI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gas comparison */}
              <div className="relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[5px_5px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "5px 5px", opacity: 0.03 }} />
                <div className="relative z-10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="size-4 text-[#f8672d]" />
                    <h3 className="protocol-font text-xs font-black uppercase tracking-[0.15em]">{t("simulator.compareTitle")}</h3>
                  </div>
                  <p className="mb-5 text-sm font-semibold leading-6 text-[#555555]">{t("simulator.compareDesc")}</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4 text-center shadow-[3px_3px_0_#0a0a0a]">
                      <p className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("simulator.suiFee")}</p>
                      <p className="protocol-font text-2xl font-black">~{suiTotalGas.toFixed(4)} SUI</p>
                      <p className="protocol-font text-xs font-semibold text-[#14b8a6] mt-1">&lt; $0.01</p>
                    </div>
                    <div className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4 text-center shadow-[3px_3px_0_#0a0a0a]">
                      <p className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("simulator.ethFee")}</p>
                      <p className="protocol-font text-2xl font-black">${ethTotalGas.toFixed(2)}</p>
                      <p className="protocol-font text-xs font-semibold text-[#555555] mt-1">{participants + 1} tx</p>
                    </div>
                    <div className="border-[3px] border-[#0a0a0a] bg-[#e0f4ff] p-4 text-center shadow-[3px_3px_0_#0a0a0a]">
                      <p className="protocol-font text-[11px] font-black uppercase tracking-[0.15em] text-[#555555]">{t("simulator.savings")}</p>
                      <p className="protocol-font text-2xl font-black">~99.9%</p>
                      <p className="protocol-font text-xs font-semibold text-[#555555] mt-1">lebih hemat</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Link
                  href="/pools"
                  className="inline-flex h-14 items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-8 text-base font-black text-[#0a0a0a] shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                  style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.08em" }}
                >
                  {t("simulator.cta")}
                  <ArrowRight className="size-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
