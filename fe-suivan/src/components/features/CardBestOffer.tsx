"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";

const CardBestOffer = () => {
  const [hovered, setHovered] = useState(false);
  const { scrollYProgress } = useScroll();
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const router = useRouter();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute w-[80%] md:w-[45%] lg:w-[300px] h-fit z-[3] top-[-120%] lg:top-[-100%] left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-8 flex flex-col"
      style={{
        background: "#f5f5f0",
        border: "5px solid #0a0a0a",
        boxShadow: hovered
          ? "25px 25px 0 -5px #f5e642, 25px 25px 0 0 #000"
          : "8px 8px 0 #0a0a0a",
        transform: hovered
          ? "perspective(1000px) rotateX(5deg) rotateY(1deg) scale(1.05)"
          : "perspective(1000px) rotateX(10deg) rotateY(-10deg)",
        transition: "all 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Spinning badge */}
      <motion.div
        style={{ rotate }}
        className="absolute -top-6 -right-4 sm:-top-10 sm:-right-8 md:-top-14 md:-right-14 w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-[#0a0a0a] rounded-full flex items-center justify-center z-20 animate-[glitter_3s_ease-in-out_infinite]"
      >
        <svg className="absolute w-full h-full animate-[spin_15s_linear_infinite]" viewBox="0 0 100 100">
          <path id="textPath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
          <text className="text-[9.5px] font-medium fill-[#f5e642] tracking-[0.1em]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <textPath href="#textPath" startOffset="0%">
              Rotating Savings and Credit Association · Rotating Savings and Credit Association ·
            </textPath>
          </text>
        </svg>
        <ArrowUpRight className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-[#f5e642] z-10" strokeWidth={2.5} />
      </motion.div>

      {/* Photo Header */}
      <div className="relative overflow-hidden flex items-end flex-shrink-0"
        style={{
          height: 170,
          background: "#f5e642",
          borderBottom: "5px solid #0a0a0a",
        }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(0,0,0,0.12) 8px, rgba(0,0,0,0.12) 10px)",
        }} />
        {/* Giant watermark */}
        <div className="absolute pointer-events-none select-none"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "7rem", lineHeight: 0.85,
            color: "rgba(0,0,0,0.08)",
            right: -8, bottom: -10,
            letterSpacing: "-0.02em",
          }}>
          18
        </div>
        {/* Status badge */}
        <div className="absolute z-20"
          style={{
            top: 14, left: 14,
            background: "#00e060",
            border: "3px solid #0a0a0a",
            boxShadow: "3px 3px 0 #0a0a0a",
            fontSize: "0.55rem", fontWeight: 800,
            letterSpacing: "0.18em", padding: "3px 8px",
            textTransform: "uppercase",
          }}>
          LIVE
        </div>
        {/* Avatar */}
        <div style={{
          width: 64, height: 64,
          background: "#0a0a0a",
          border: "5px solid #0a0a0a",
          borderBottom: "none", borderLeft: "none",
          marginLeft: 20, position: "relative", zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          <Image src="/sui-logo-icon.png" alt="SUI" width={48} height={48} className="object-contain"
            style={{ filter: "brightness(0) invert(1)" }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 0" }}>
        <p style={{
          fontSize: "0.55rem", fontWeight: 700,
          letterSpacing: "0.2em", color: "#a8a49a",
          textTransform: "uppercase", marginBottom: 2,
        }}>
          ecosystem::sui
        </p>
        <h3 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "2rem", lineHeight: 0.9,
          color: "#0a0a0a", letterSpacing: "-0.01em",
          marginBottom: 8,
        }}>
          Sui DeFi Partner
        </h3>
        <p style={{
          fontSize: "0.68rem", fontWeight: 500,
          color: "#0a0a0a",
          borderLeft: "5px solid #f8672d",
          paddingLeft: 10, lineHeight: 1.55,
          marginBottom: 12,
        }}>
          18.7% top APY · 10+ protocols · Real-time
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderTop: "3px solid #0a0a0a", flexShrink: 0,
      }}>
        {[
          { value: "18.7", label: "TOP APY %" },
          { value: "10+", label: "PARTNERS" },
          { value: "LIVE", label: "STATUS" },
        ].map((stat, si) => (
          <div key={stat.label} style={{
            padding: "10px 8px",
            borderRight: si < 2 ? "3px solid #0a0a0a" : "none",
            textAlign: "center",
          }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.5rem", lineHeight: 1,
              color: "#0a0a0a", display: "block",
            }}>{stat.value}</span>
            <span style={{
              fontSize: "0.45rem", fontWeight: 700,
              letterSpacing: "0.15em", color: "#a8a49a",
              textTransform: "uppercase", display: "block",
              marginTop: 3,
            }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      <button
        onClick={() => router.push("/ai")}
        className="font-brutal"
        style={{
          display: "block", width: "100%",
          padding: "13px 13px",
          background: "#0a0a0a",
          color: "#f5e642",
          border: "none",
          borderTop: "5px solid #0a0a0a",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "1rem", letterSpacing: "0.2em",
          cursor: "pointer", textAlign: "center",
          transition: "background 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#f5e642"; e.currentTarget.style.color = "#0a0a0a"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#f5e642"; }}
      >
        THE BEST ECOSYSTEM
      </button>
    </div>
  );
};

export default CardBestOffer;
