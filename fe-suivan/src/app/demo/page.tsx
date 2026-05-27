"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowRight, Check, Users, Wallet, Trophy, Gift } from "lucide-react";

interface Step {
  icon: typeof Users;
  title: string;
  subtitle: string;
  detail: string;
  action: string;
}

const steps: Step[] = [
  {
    icon: Wallet,
    title: "Connect",
    subtitle: "zkLogin — No Wallet Required",
    detail: "Sign in with Google via zkLogin. Suivan creates a Sui wallet for you automatically. No seed phrases, no browser extensions, no gas fees for first join.",
    action: "Try Google Login",
  },
  {
    icon: Users,
    title: "Join a Pool",
    subtitle: "Pick Your ROSCA Circle",
    detail: "Browse available pools (Small: 10 USDC, Medium: 50 USDC, Large: 100 USDC). Deposit collateral once — your commitment to the group. Sponsored transaction means you pay ZERO gas.",
    action: "Sponsored Join",
  },
  {
    icon: Wallet,
    title: "Contribute Monthly",
    subtitle: "Automatic Cycle Deposits",
    detail: "Each cycle, deposit your share. Suivan tracks deposits per cycle — no double-deposit exploits. Miss a payment? Collateral is slashed proportionally.",
    action: "Make Deposit",
  },
  {
    icon: Trophy,
    title: "Win the Pot",
    subtitle: "Random Selection, Fair Payout",
    detail: "One participant wins the pool each cycle. Selection uses on-chain entropy (tx digest + timestamp). Winner receives all cycle deposits + yield bonus.",
    action: "Select Winner",
  },
  {
    icon: Gift,
    title: "Settle & Earn Yield",
    subtitle: "AI-Optimized Returns",
    detail: "Idle pool funds are routed to Sui DeFi protocols (Cetus, NAVI, Scallop) for yield. APY signals from DeFiLlama — real data, real returns. After all cycles complete, collateral is returned.",
    action: "View Yield Dashboard",
  },
];

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const { t } = useLanguage();
  const current = steps[activeStep];
  const Icon = current.icon;

  return (
    <main className="min-h-screen bg-[#fbf7ed] text-slate-950">
      <Header />
      <section className="px-5 pb-20 pt-32 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font mb-3 inline-flex rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-950 shadow-[4px_4px_0_#06111f]">
            {t("demo.badge")}
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {t("demo.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-500">
            {t("demo.subtitle")}
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-5">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <button
                  key={step.title}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${
                    isActive
                      ? "border-teal-500 bg-teal-50 shadow-[4px_4px_0_#14b8a6]"
                      : isDone
                        ? "border-slate-950 bg-white opacity-60 shadow-[3px_3px_0_#06111f]"
                        : "border-slate-200 bg-white opacity-40 hover:opacity-70"
                  }`}
                  onClick={() => setActiveStep(i)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                        isDone
                          ? "bg-teal-500 text-white"
                          : isActive
                            ? "bg-slate-950 text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isDone ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <StepIcon className="size-4 text-slate-500" />
                  </div>
                  <p className="protocol-font mt-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {t("demo.step")} {i + 1}
                  </p>
                  <p className="mt-1 text-sm font-black">{t(`demo.step${i + 1}Title`)}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[2rem] border-2 border-slate-950 bg-white p-8 shadow-[8px_8px_0_#06111f] md:p-12">
            <Icon className="size-10 text-teal-500" />
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">{t(`demo.step${activeStep + 1}Title`)}</h2>
            <p className="protocol-font mt-1 text-sm font-bold text-teal-600">
              {t(`demo.step${activeStep + 1}Sub`)}
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">
              {t(`demo.step${activeStep + 1}Detail`)}
            </p>
            <Link
              href={activeStep === 0 ? "/" : activeStep === 1 ? "/pools" : activeStep === 4 ? "/ai" : "/pools"}
              className="protocol-font mt-8 inline-flex h-12 items-center gap-2 rounded-full border-2 border-slate-950 bg-slate-950 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-500 hover:text-slate-950"
            >
              {t(`demo.step${activeStep + 1}Action`)}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#06111f]">
              <p className="protocol-font text-xs font-black text-teal-500">sui_native</p>
              <p className="mt-2 text-lg font-black">{t("demo.feature1Title")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("demo.feature1Desc")}</p>
            </div>
            <div className="rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#06111f]">
              <p className="protocol-font text-xs font-black text-teal-500">ai_yield</p>
              <p className="mt-2 text-lg font-black">{t("demo.feature2Title")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("demo.feature2Desc")}</p>
            </div>
            <div className="rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#06111f]">
              <p className="protocol-font text-xs font-black text-teal-500">walrus_storage</p>
              <p className="mt-2 text-lg font-black">{t("demo.feature3Title")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("demo.feature3Desc")}</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
