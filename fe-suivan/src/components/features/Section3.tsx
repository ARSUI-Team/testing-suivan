import React from "react";
import { Shield, TrendingUp, Wallet, Sparkles, Gift } from "lucide-react";
import Link from "next/link";

const steps = [
  { icon: Wallet, title: "Pick a Pool", desc: "Choose a ROSCA pool by contribution tier and participant count. Adjust to your funds, use the simulator menu", color: "#264653" },
  { icon: Shield, title: "Stake Collateral", desc: "Deposit 125% collateral upfront. Returns + yield at the end. Calculate collateral in simulator menu", color: "#2a9d8f" },
  { icon: TrendingUp, title: "Contribute Monthly", desc: "ROSCA participants pay monthly contributions as determined by the pool. Deposited funds will seek short-term yield by AI", color: "#e9c46a" },
  { icon: Sparkles, title: "Get Your Turn", desc: "Random winner via Seal RNG. Receive all deposits + yield. Each month's winner is different until 1 ROSCA cycle is completed", color: "#f4a261" },
  { icon: Gift, title: "Bonus Yield", desc: "Pool ends: collateral returned + yield shared to all", color: "#e76f51" },
];

const Section3 = () => {
  return (
    <section className="w-full min-h-screen flex flex-col gap-10 md:gap-16 relative z-[2] pt-28 md:pt-35 px-6 md:px-12 lg:px-15 bg-[#fbf7ed] border-t-8 border-[#0a0a0a] bg-grid-brutal">
      <div className="flex flex-col items-center text-center mb-4">
        <span className="text-[14px] font-black uppercase tracking-[0.25em] text-[#f8672d] mb-4 bg-[#0a0a0a] px-4 py-2 inline-block">HOW TO PLAY SUIVAN</span>
      </div>

      <div className="flex flex-col md:flex-row w-full max-w-5xl mx-auto border-4 border-[#0a0a0a] shadow-[8px_8px_0_#0a0a0a] overflow-hidden"
        style={{ height: 320 }}>
        <div className="flex h-[86%] w-full overflow-hidden">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group h-full flex-1 flex flex-col items-center justify-end relative cursor-pointer transition-all duration-300 ease-out hover:flex-[2.5]"
              style={{ background: step.color, minWidth: 0 }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
                <step.icon className="w-8 h-8 text-white shrink-0" strokeWidth={2.5} />
                <span className="text-white font-black text-sm md:text-base uppercase tracking-tight leading-tight">{step.title}</span>
                <span className="text-white/80 text-[10px] md:text-xs font-medium leading-tight max-w-[160px]">{step.desc}</span>
              </div>
              <span className="text-white font-black text-xl md:text-2xl opacity-30 group-hover:opacity-0 transition-opacity duration-300 mb-4">0{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats footer */}
      <div className="w-full max-w-5xl mx-auto border-4 border-[#0a0a0a] bg-white flex flex-wrap items-center justify-center gap-3 px-4 py-3 -mt-[3px] sm:flex-nowrap sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a] animate-[text-glitter-orange_4s_ease-in-out_infinite]" style={{ animationDelay: "0s" }}>5 Steps</span>
          <span className="w-1 h-4 bg-[#0a0a0a] hidden sm:block" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a] animate-[text-glitter-orange_4s_ease-in-out_infinite]" style={{ animationDelay: "1s" }}>Fully On-Chain</span>
        </div>
        <Link
          href="/simulator"
          className="text-xs font-black uppercase tracking-[0.15em] bg-[#f8672d] text-white px-5 py-2.5 border-[2px] border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#f8672d] hover:shadow-[5px_5px_0_#0a0a0a] hover:-translate-y-0.5 transition-all duration-200"
        >
          Try Simulator
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a] animate-[text-glitter-orange_4s_ease-in-out_infinite]" style={{ animationDelay: "2s" }}>AI-Powered</span>
          <span className="w-1 h-4 bg-[#0a0a0a] hidden sm:block" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#a8a49a] animate-[text-glitter-orange_4s_ease-in-out_infinite]" style={{ animationDelay: "3s" }}>Low Gas</span>
        </div>
      </div>
    </section>
  );
};

export default Section3;
