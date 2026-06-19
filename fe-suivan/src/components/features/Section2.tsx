"use client";

import { ArrowDownIcon } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const problems = [
  { title: "Run-away Risk", desc: "Participants flee after getting the first turn" },
  { title: "Idle Money", desc: "Collected funds don't generate anything" },
  { title: "Manual Records", desc: "Easy to manipulate and not transparent" },
  { title: "Limited Scale", desc: "Only possible with family or close friends" },
];

const solutions = [
  { title: "Collateral System", desc: "Deposit collateral upfront, returned + yield if consistent" },
  { title: "Yield Engine", desc: "Composable DeFi yield across DeepBook V3 and Sui protocols" },
  { title: "100% On-Chain", desc: "Everything recorded on blockchain, cannot be manipulated" },
  { title: "Global Scale", desc: "ROSCA with anyone, anywhere in the world" },
];

const Section2 = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rotation = useTransform(scrollYProgress, [0.05, 0.25], [0, -180]);
  const scrollLeft = useTransform(scrollYProgress, [0, 0.3, 0.6], ["-20%", "0%", "5%"]);
  const scrollRight = useTransform(scrollYProgress, [0, 0.3, 0.6], ["20%", "0%", "-5%"]);

  return (
    <section ref={ref} className="w-full min-h-screen flex flex-col justify-start bg-[#38bdf8] relative z-[2] border-t-8 border-[#0a0a0a]">
      {/* Geometric accents */}

      {/* Arrow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          style={{ rotate: rotation }}
          className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-[#0a0a0a] border-[8px] md:border-[12px] border-[#38bdf8] flex items-center justify-center shadow-[4px_4px_0_#000]"
        >
          <ArrowDownIcon className="w-8 h-8 md:w-10 md:h-10 text-[#38bdf8]" strokeWidth={3} />
        </motion.div>
      </div>

      {/* Main Heading — appears first, centered */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="pt-14 md:pt-20 pb-10 px-6 md:px-12 w-full text-center"
      >
        <h1 className="text-[24px] md:text-[38px] lg:text-[48px] leading-[1.1] text-white font-black scale-y-[1.1] md:scale-y-[1.3] lg:scale-y-[1.6] tracking-[-0.02em] lg:tracking-[-0.03em]"
          style={{ textShadow: "3px 3px 0px #0a0a0a" }}>
          TRADITIONAL FINANCE MEETS BLOCKCHAIN
        </h1>
      </motion.div>

      {/* Rest of content */}
      <div
        className="pb-16 px-6 md:px-12 flex flex-col gap-12 md:gap-16 relative w-full"
      >

        {/* Traditional Problems Section */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-[20px] md:text-[30px] lg:text-[38px] leading-[1.1] text-white font-black scale-y-[1.1] md:scale-y-[1.2] lg:scale-y-[1.4] tracking-[-0.02em]" style={{ textShadow: "3px 3px 0px #0a0a0a" }}>
              Traditional ROSCA Problems
            </h2>
          </div>
          <p className="text-white/60 text-[10px] md:text-xs font-semibold uppercase tracking-[0.15em] mb-6">
            Common issues that occur
          </p>
          <div className="overflow-hidden w-full flex justify-start">
            <motion.div style={{ x: scrollLeft }} className="flex gap-4 w-max">
              {problems.map((p, i) => (
                <div key={i} className="shrink-0 w-[170px] md:w-[190px] aspect-square bg-[#fdfdfa] border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] p-3 flex flex-col justify-between relative overflow-hidden transition-transform duration-300 ease-out hover:scale-105 hover:shadow-[8px_8px_0_#0a0a0a]">
                  {/* Grain texture */}
                  <div className="absolute inset-0 pointer-events-none z-10" style={{
                    backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)",
                    backgroundSize: "4px 4px",
                    opacity: 0.08,
                  }} />
                  {/* Geometric orb */}
                  <div className="absolute pointer-events-none" style={{
                    top: "-10%", right: "-10%",
                    width: "55%", height: "40%",
                    background: "repeating-linear-gradient(45deg, #0a0a0a 0 2px, transparent 2px 10px)",
                    opacity: 0.1, mixBlendMode: "multiply",
                  }} />
                  {/* Content */}
                  <div className="relative z-20 flex flex-col gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ff2d55] bg-[#0a0a0a] px-1.5 py-0.5 inline-block w-fit">Problem 0{i + 1}</span>
                    <h3 className="text-sm font-black text-[#0a0a0a] uppercase tracking-tight leading-tight" style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}>{p.title}</h3>
                  </div>
                  {/* Footer */}
                  <div className="relative z-20 flex flex-col gap-1">
                    <p className="text-[10px] text-[#0a0a0a] font-medium leading-tight opacity-80">{p.desc}</p>
                    <div className="flex justify-between items-end pt-1.5 border-t-[2px] border-[#0a0a0a]">
                      <div className="w-6 h-3" style={{
                        background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 7px, #0a0a0a 7px, #0a0a0a 8px, transparent 8px, transparent 11px)",
                      }} />
                      <span className="text-[6px] font-black uppercase tracking-[0.15em] text-[#666]" style={{ fontFamily: "'Courier New', monospace" }}>vol.0{i + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Suivan Solution Section */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-3 mb-1">
            <h2 className="text-[20px] md:text-[30px] lg:text-[38px] leading-[1.1] text-white font-black scale-y-[1.1] md:scale-y-[1.2] lg:scale-y-[1.4] tracking-[-0.02em]" style={{ textShadow: "3px 3px 0px #0a0a0a" }}>
              Suivan&apos;s Solution
            </h2>
          </div>
          <p className="text-white/60 text-[10px] md:text-xs font-semibold uppercase tracking-[0.15em] mb-6">
            DeFi + Blockchain for ROSCA
          </p>
          <div className="overflow-hidden w-full flex justify-end">
            <motion.div style={{ x: scrollRight }} className="flex gap-4 w-max">
              {solutions.map((s, i) => (
                <div key={i} className="shrink-0 w-[170px] md:w-[190px] aspect-square bg-[#fdfdfa] border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] p-3 flex flex-col justify-between relative overflow-hidden transition-transform duration-300 ease-out hover:scale-105 hover:shadow-[8px_8px_0_#0a0a0a]">
                  {/* Grain texture */}
                  <div className="absolute inset-0 pointer-events-none z-10" style={{
                    backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)",
                    backgroundSize: "4px 4px",
                    opacity: 0.08,
                  }} />
                  {/* Geometric orb */}
                  <div className="absolute pointer-events-none" style={{
                    top: "-10%", right: "-10%",
                    width: "55%", height: "40%",
                    background: "repeating-linear-gradient(45deg, #0a0a0a 0 2px, transparent 2px 10px)",
                    opacity: 0.1, mixBlendMode: "multiply",
                  }} />
                  {/* Content */}
                  <div className="relative z-20 flex flex-col gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00e060] bg-[#0a0a0a] px-1.5 py-0.5 inline-block w-fit">Solution 0{i + 1}</span>
                    <h3 className="text-sm font-black text-[#0a0a0a] uppercase tracking-tight leading-tight" style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}>{s.title}</h3>
                  </div>
                  {/* Footer */}
                  <div className="relative z-20 flex flex-col gap-1">
                    <p className="text-[10px] text-[#0a0a0a] font-medium leading-tight opacity-80">{s.desc}</p>
                    <div className="flex justify-between items-end pt-1.5 border-t-[2px] border-[#0a0a0a]">
                      <div className="w-6 h-3" style={{
                        background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 7px, #0a0a0a 7px, #0a0a0a 8px, transparent 8px, transparent 11px)",
                      }} />
                      <span className="text-[6px] font-black uppercase tracking-[0.15em] text-[#666]" style={{ fontFamily: "'Courier New', monospace" }}>vol.0{i + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;
