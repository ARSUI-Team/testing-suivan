"use client";

import { Move } from "lucide-react";
import { motion } from "motion/react";

const words = [
  "SUI",
  "Walrus",
  "DeepBook",
  "Scallop",
  "Cetus",
  "Seal",
  "Aftermath",
  "Navi",
  "Bluefin",
  "Turbos",
];

const StripeMarquee = ({ className }: { className?: string }) => {
  return (
    <div
      className={`relative w-full lg:w-[110%] h-[150px] md:h-[200px] overflow-hidden flex items-center justify-center z-[3] ${className}`}
    >
      <div className="absolute w-full bg-[#f0c040] shadow-2xl border-y-[10px] border-black">
        <div className="w-full my-2 py-4 md:py-8 flex overflow-hidden">
          <motion.div
            className="flex w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 25,
            }}
          >
            {[...Array(2)].map((_, groupIndex) => (
              <div key={groupIndex} className="flex items-center">
                {words.map((word, i) => (
                  <div key={i} className="flex items-center gap-10 pr-10">
                    <span className="text-4xl md:text-7xl font-bold scale-y-[1.8] inline-block text-[#1a1a1a] tracking-[-0.05em] origin-center whitespace-nowrap">
                      {word}
                    </span>
                    <Move
                      className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] transform rotate-[-45deg] text-[#1a1a1a]"
                      strokeWidth={3}
                    />
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StripeMarquee;
