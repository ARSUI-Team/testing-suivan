"use client";

import { motion } from "motion/react";

const advantages = [
  { name: "ANTI-RUN", role: "ANTI RUNAWAY", desc: "125% collateral guarantees commitment. Running away means losing your deposit + yield.", stat: "125%", statLabel: "COLLATERAL" },
  { name: "LOW GAS", role: "ULTRA LOW GAS FEE", desc: "Built on Sui with sub-second finality. Transaction fees under $0.001 per operation.", stat: "$0.001", statLabel: "PER TX" },
  { name: "ON-CHAIN", role: "100% TRANSPARENT", desc: "All transactions and yield recorded on Sui blockchain. Verifiable by anyone anytime.", stat: "100%", statLabel: "AUDITABLE" },
  { name: "2X YIELD", role: "DUAL STREAMS", desc: "Collateral yield (proportional) + cumulative yield (gacha jackpot). Two independent reward systems from one pool.", stat: "2", statLabel: "SOURCES" },
  { name: "YIELD", role: "AUTO YIELD", desc: "DeepBook V3 flash loan arbitrage auto-deploys pool funds. Real DeFi yield, fully automated.", stat: "24/7", statLabel: "RUNNING" },
];

const Section4 = () => {
  return (
    <section className="w-full py-20 lg:py-24 px-6 md:px-12 lg:px-15 bg-[#f8672d] border-t-8 border-[#0a0a0a] overflow-hidden">
      <div className="flex flex-col items-center text-center mb-12">
        <span className="text-[14px] font-black uppercase tracking-[0.25em] text-[#fbf7ed] mb-4 bg-[#0a0a0a] px-4 py-2 inline-block">ADVANTAGES</span>
        <h2 className="text-[32px] md:text-[48px] lg:text-[60px] leading-[0.9] text-[#fbf7ed] font-black scale-y-[1.3] md:scale-y-[1.6] tracking-[-0.04em]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", textShadow: "3px 3px 0px #0a0a0a" }}>
          Why Choose Suivan?
        </h2>
      </div>

      <motion.div
        className="flex w-max items-stretch"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
      >
        {[...Array(2)].map((_, groupIndex) => (
          <div key={groupIndex} className="flex items-stretch gap-8 md:gap-12 lg:gap-16 pr-8 md:pr-12 lg:pr-16">
            {advantages.map((adv, i) => (
              <div key={i} className="shrink-0 relative group" style={{ width: 260, height: 180 }}>
                {/* Main Card */}
                <div className="absolute inset-0 bg-[#fbf7ed] border-4 border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] z-20 flex items-center justify-center transition-all duration-300 group-hover:bg-[#38bdf8] group-hover:shadow-[10px_10px_0_#0a0a0a]">
                  <div className="text-center px-4">
                    <span className="block text-3xl font-black text-[#0a0a0a] leading-none scale-y-[1.5] tracking-[-0.05em]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}>
                      {adv.name}
                    </span>
                    <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#0a0a0a] mt-1">{adv.role}</span>
                  </div>
                </div>

                {/* Expanded Card Below */}
                <div className="absolute left-0 right-0 top-[160px] bg-[#38bdf8] border-4 border-[#0a0a0a] border-t-0 z-10 flex flex-col items-center justify-center px-4 py-4 transition-all duration-300 group-hover:h-[140px] group-hover:shadow-[10px_10px_0_#0a0a0a] h-0 overflow-hidden">
                  <p className="text-[11px] font-semibold text-[#0a0a0a] leading-tight text-center mb-3">{adv.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{adv.stat}</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#fbf7ed] bg-[#0a0a0a] px-2 py-0.5">{adv.statLabel}</span>
                  </div>
                </div>

                {/* Shadow bottom layer */}
                <div className="absolute left-1 top-2 right-1 bottom-0 bg-[#0a0a0a] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </section>
  );
};

export default Section4;
