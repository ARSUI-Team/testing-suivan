"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const Hero = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const sectionOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <motion.section
      ref={ref}
      style={{ opacity: sectionOpacity }}
      className="w-full flex flex-col gap-10 lg:gap-12 px-6 md:px-12 lg:px-15 py-10 pt-28 relative min-h-screen justify-center overflow-hidden border-b-8 border-[#0a0a0a]"
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* 3D ROSCA Logo — first to appear */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 w-full h-full opacity-40 z-[-1] lg:z-[1] lg:opacity-100 flex items-center justify-center pointer-events-none"
      >
        <Image
          src="/rosca-3d.png"
          alt="ROSCA"
          width={600}
          height={600}
          className="w-full h-full object-cover lg:object-contain scale-[0.9] transform translate-y-25 lg:translate-y-5 lg:translate-x-[-1%]"
        />
      </motion.div>

      {/* Top row: ROSCA + description */}
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-0 relative w-full">
        {/* ROSCA — first */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:w-[60%] flex justify-center lg:justify-start"
        >
          <h1
            className="text-[80px] md:text-[110px] lg:text-[130px] leading-none text-[#0a0a0a] font-black scale-y-[1.5] lg:scale-y-[2] tracking-[-0.06em] lg:tracking-[-0.1em] whitespace-nowrap mt-10 lg:mt-0"
            style={{
              textShadow: "6px 6px 0px #38bdf8, 8px 8px 0px #0a0a0a",
              fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
            }}
          >
            ROSCA
          </h1>
        </motion.div>

        {/* Description — delayed */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full md:w-[80%] lg:w-[40%] text-center lg:text-left flex flex-col items-center lg:items-start"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-1.5 bg-[#0a0a0a]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] animate-[text-glitter_4s_ease-in-out_infinite]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              SUI OVERFLOW 2026
            </span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl text-[#0a0a0a] tracking-tighter font-bold">
            SOME FUNDS SAFER THAN OTHERS. ROSCA HAS EVOLVED BEYOND THE PHYSICAL.
            TO CIRCULATE & CREATE NEW DIGITAL WEALTH.
          </p>
          <Button asChild className="mt-8 px-10 h-14 lg:h-15 text-white text-lg lg:text-xl font-black bg-[#38bdf8] hover:bg-[#0a0a0a] hover:text-white transition-colors border-[4px] border-[#0a0a0a] shadow-[8px_8px_0_#0a0a0a] rounded-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>
            <Link href="/faq">HOW IT WORKS</Link>
          </Button>
        </motion.div>
      </div>

      {/* Bottom row: trapesium + ON SUI */}
      <div className="flex flex-col-reverse lg:flex-row items-center gap-10 lg:gap-0 relative mt-10 lg:mt-0 w-full">
        {/* Trapesium + text — delayed */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-full md:w-[80%] lg:w-[40%] flex flex-col gap-6 text-center lg:text-left"
        >
          <div className="w-full h-[80px] md:h-[120px] lg:h-[150px] overflow-hidden relative border-4 border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a]">
            <div className="flex w-max animate-[slideRight_8s_linear_infinite]">
              <Image
                src="/assets/orange-lines.webp"
                alt="lines"
                width={600}
                height={600}
                className="h-[80px] md:h-[120px] lg:h-[150px] min-w-full object-cover shrink-0"
              />
              <Image
                src="/assets/orange-lines.webp"
                alt="lines"
                width={600}
                height={600}
                className="h-[80px] md:h-[120px] lg:h-[150px] min-w-full object-cover shrink-0"
              />
            </div>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl text-[#0a0a0a] tracking-tighter font-bold">
            A CORE EXPRESSION OF TRUST IN MATH. IT&apos;S A PART OF YOUR ROSCA IT
            IS INSIDE ALL SUI.
          </p>
        </motion.div>

        {/* ON SUI — first */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:w-[60%] flex justify-center lg:justify-end"
        >
          <h1
            className="text-[55px] md:text-[105px] lg:text-[120px] leading-none text-[#0a0a0a] lg:text-right font-black scale-y-[1.5] lg:scale-y-[2] tracking-[-0.06em] lg:tracking-[-0.1em] whitespace-nowrap"
            style={{
              textShadow: "6px 6px 0px #38bdf8, 8px 8px 0px #0a0a0a",
              fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
            }}
          >
            ON SUI
          </h1>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Hero;
