import React from "react";
import { Users, Shield, TrendingUp, Sparkles, Gift } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: Users,
    title: "Join or Create",
    desc: "Browse active pools or create your own. Set deposit amount, group size, and cycle length.",
    color: "#38bdf8",
  },
  {
    icon: Shield,
    title: "Stake Collateral",
    desc: "Lock 125% of remaining commitment as collateral. Protects the pool if someone defaults. Returned in full when pool completes.",
    color: "#0d9488",
  },
  {
    icon: TrendingUp,
    title: "Contribute",
    desc: "Pay your share each cycle. Funds are deployed to DeepBook V3 for flash loan arbitrage, earning yield while they wait.",
    color: "#f8672d",
  },
  {
    icon: Sparkles,
    title: "Win the Pot",
    desc: "One winner per cycle via verifiable Seal RNG. Receive all pooled contributions. Every participant gets one turn to win.",
    color: "#8b5cf6",
  },
  {
    icon: Gift,
    title: "Claim Yield",
    desc: "Pool ends: collateral returned. Two yield streams: proportional collateral yield + gacha jackpot from accumulated cycle yield. Weighted by your score.",
    color: "#14b8a6",
  },
];

const Section3 = () => {
  return (
    <section className="w-full min-h-screen flex flex-col gap-10 md:gap-16 relative z-[2] pt-28 md:pt-35 px-6 md:px-12 lg:px-15 bg-[#fbf7ed] border-t-8 border-[#0a0a0a] bg-grid-brutal">
      <div className="flex flex-col items-center text-center mb-4">
        <span className="text-[14px] font-black uppercase tracking-[0.25em] text-[#f8672d] mb-4 bg-[#0a0a0a] px-4 py-2 inline-block">
          HOW TO PLAY SUIVAN
        </span>
      </div>

      <div
        className="flex flex-col md:flex-row w-full max-w-5xl mx-auto border-4 border-[#0a0a0a] shadow-[8px_8px_0_#0a0a0a] overflow-hidden"
        style={{ height: 320 }}
      >
        <div className="flex h-[86%] w-full overflow-hidden">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group h-full flex-1 flex flex-col items-center justify-end relative cursor-pointer transition-all duration-300 ease-out hover:flex-[2.5]"
              style={{ background: step.color, minWidth: 0 }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
                <step.icon className="w-8 h-8 text-white shrink-0" strokeWidth={2.5} />
                <span className="text-white font-black text-sm md:text-base uppercase tracking-tight leading-tight">
                  {step.title}
                </span>
                <span className="text-white/80 text-[10px] md:text-xs font-medium leading-tight max-w-[180px]">
                  {step.desc}
                </span>
              </div>
              <span className="text-white font-black text-xl md:text-2xl opacity-30 group-hover:opacity-0 transition-opacity duration-300 mb-4">
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto border-4 border-[#0a0a0a] bg-white flex flex-wrap items-center justify-center gap-3 px-4 py-3 -mt-[3px] sm:flex-nowrap sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a]">5 Steps</span>
          <span className="w-1 h-4 bg-[#0a0a0a] hidden sm:block" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a]">Fully On-Chain</span>
        </div>
        <Link
          href="/simulator"
          className="text-xs font-black uppercase tracking-[0.15em] bg-[#f8672d] text-white px-5 py-2.5 border-[2px] border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#f8672d] hover:shadow-[5px_5px_0_#0a0a0a] hover:-translate-y-0.5 transition-all duration-200"
        >
          Try Simulator
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a]">Verifiable</span>
          <span className="w-1 h-4 bg-[#0a0a0a] hidden sm:block" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a]">Low Gas</span>
        </div>
      </div>
    </section>
  );
};

export default Section3;
