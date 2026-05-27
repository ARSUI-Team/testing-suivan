"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLanguage } from "@/context/LanguageContext";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowUpRight } from "lucide-react";
import SuivanLogo from "./SuivanLogo";

gsap.registerPlugin(ScrollTrigger);

const statusStats = [
  ["POOLS", "18+"],
  ["MEMBERS", "1,240+"],
  ["VOLUME", "$680K"],
  ["APY", "8.1%"],
] as const;

const steps = [
  {
    code: "01",
    title: "Join",
    copy: "Pick a ROSCA pool, inspect the terms, and join only after the cycle rules are clear.",
    color: "bg-[#dff8ff]",
    Icon: HandIcon,
  },
  {
    code: "02",
    title: "Contribute",
    copy: "Every member gets a simple cycle status: ready, pending, contributed, or paid out.",
    color: "bg-[#fff1c7]",
    Icon: CycleIcon,
  },
  {
    code: "03",
    title: "Rotate",
    copy: "Payouts rotate through the group while the frontend keeps progress visible.",
    color: "bg-[#d9f8df]",
    Icon: PotIcon,
  },
  {
    code: "04",
    title: "Earn",
    copy: "Idle funds can show APY signals without coupling the UI to unfinished contract logic.",
    color: "bg-[#e8e0ff]",
    Icon: YieldIcon,
  },
] as const;

const pools = [
  ["Global ROSCA", "12 members", "cycle 08 / 12", "8.1%"],
  ["Creator Circle", "20 members", "cycle 03 / 10", "7.4%"],
  ["Builder Guild", "40 members", "cycle 11 / 20", "6.8%"],
] as const;

export default function SuivanLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    const frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from(".suivan-pop", {
          y: 42,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
        });

        gsap.from(".suivan-card", {
          y: 28,
          rotate: -1.5,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".suivan-flow",
            start: "top 76%",
          },
        });

        gsap.to(".suivan-mascot", {
          y: -24,
          rotate: 2,
          ease: "none",
          scrollTrigger: {
            trigger: ".suivan-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.utils.toArray<HTMLElement>(".suivan-reveal").forEach((el) => {
          gsap.from(el, {
            y: 34,
            opacity: 0,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 82%",
            },
          });
        });
      }, rootRef);

      return () => ctx.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="bg-[#fbf7ed] text-slate-950">
      <section className="suivan-hero relative isolate overflow-hidden px-5 pb-16 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(94,200,255,0.34),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.24),transparent_26%),linear-gradient(180deg,#fbf7ed,#f5fbff)]" />
        <div className="absolute left-4 top-28 -z-10 h-24 w-24 rounded-full border border-slate-950/10 md:left-16" />
        <div className="absolute bottom-12 right-8 -z-10 h-32 w-32 rounded-[2rem] border border-slate-950/10 rotate-12" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="suivan-pop mb-5 inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-4 py-2 shadow-[4px_4px_0_#06111f]">
              <SuivanLogo className="size-5" size={20} />
              <span className="protocol-font text-xs font-black uppercase tracking-[0.18em]">
                {t("landing.badge")}
              </span>
            </div>

            <h1 className="suivan-pop max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl lg:text-8xl">
              {t("landing.title")}
            </h1>

            <p className="suivan-pop mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
              {t("landing.subtitle")}
            </p>

            <div className="suivan-pop mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-slate-950 bg-sky-400 px-6 text-sm font-black text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5"
                href="/pools"
              >
                {t("landing.explore")}
                <ArrowUpRight className="size-4" />
              </Link>
              <a
                className="inline-flex h-12 items-center rounded-full border-2 border-slate-950 bg-white px-6 text-sm font-black text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5"
                href="#how"
              >
                {t("landing.how")}
              </a>
            </div>
          </div>

          <div className="suivan-pop suivan-mascot mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border-2 border-slate-950 bg-white p-4 shadow-[10px_10px_0_#06111f]">
              <div className="rounded-[1.5rem] bg-[#dff8ff] p-5">
                <MascotScene />
                <div className="mt-5 rounded-2xl border-2 border-slate-950 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="protocol-font text-xs font-black uppercase text-slate-400">
                        pool_object
                      </p>
                      <p className="mt-1 text-xl font-black">Sui Creators Circle</p>
                    </div>
                    <span className="protocol-font rounded-full border-2 border-slate-950 bg-[#fff1c7] px-3 py-1 text-sm font-black">
                      8.1%
                    </span>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full border-2 border-slate-950 bg-slate-100">
                    <div className="h-full w-[82%] bg-teal-400" />
                  </div>
                  <div className="protocol-font mt-3 flex justify-between text-xs font-black text-slate-500">
                    <span>cycle 08 / 12</span>
                    <span>9 / 12 members</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="suivan-pop mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4">
          {statusStats.map(([label, value]) => (
            <div className="rounded-2xl border-2 border-slate-950 bg-white p-4 shadow-[4px_4px_0_#06111f]" key={label}>
              <p className="protocol-font text-xs font-black text-slate-400">{t(label === "POOLS" ? "landing.statPools" : label === "MEMBERS" ? "landing.statMembers" : label === "VOLUME" ? "landing.statVolume" : "landing.statApy")}</p>
              <p className="protocol-font mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="suivan-flow px-5 py-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="suivan-reveal mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="protocol-font text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                cycle_state
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-none tracking-[-0.05em] md:text-6xl">
                {t("landing.sectionTitle")}
              </h2>
            </div>
            <p className="max-w-sm text-base font-semibold leading-7 text-slate-600">
              {t("landing.sectionSub")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ code, title, copy, color, Icon }) => (
              <article className={`suivan-card rounded-[1.75rem] border-2 border-slate-950 ${color} p-5 shadow-[6px_6px_0_#06111f]`} key={title}>
                <div className="mb-8 flex items-center justify-between">
                  <Icon />
                  <span className="protocol-font text-sm font-black">{code}</span>
                </div>
                <h3 className="text-3xl font-black tracking-[-0.04em]">{t(title === "Join" ? "landing.step1Title" : title === "Contribute" ? "landing.step2Title" : title === "Rotate" ? "landing.step3Title" : "landing.step4Title")}</h3>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{t(title === "Join" ? "landing.step1Copy" : title === "Contribute" ? "landing.step2Copy" : title === "Rotate" ? "landing.step3Copy" : "landing.step4Copy")}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-5 py-20 text-white md:px-10 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="suivan-reveal">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.22em] text-sky-300">
              {t("landing.walrusBadge")}
            </p>
            <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.05em] md:text-6xl">
              {t("landing.walrusTitle")}
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-slate-300">
              {t("landing.walrusDesc")}
            </p>
          </div>

          <div className="grid gap-4">
            {pools.map(([name, members, cycle, apy]) => (
              <article className="suivan-reveal rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5" key={name}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="protocol-font text-xs font-black uppercase text-sky-300">object::pool</p>
                    <h3 className="mt-2 text-2xl font-black">{name}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[members, cycle, apy].map((item) => (
                      <span className="protocol-font rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 lg:px-12">
        <div className="suivan-reveal mx-auto grid max-w-6xl gap-6 rounded-[2rem] border-2 border-slate-950 bg-white p-6 shadow-[8px_8px_0_#06111f] md:grid-cols-[0.8fr_1.2fr] md:p-8">
          <TrustIcon />
          <div>
            <p className="protocol-font text-xs font-black uppercase tracking-[0.22em] text-teal-700">
              {t("landing.trustBadge")}
            </p>
            <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.05em] md:text-6xl">
              {t("landing.trustTitle")}
            </h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-slate-600">
              {t("landing.trustDesc")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function HandIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M28 57c8-10 17-14 28-10l8 3c5 2 7 8 4 13-4 8-14 12-26 10l-18-3" fill="#fff" stroke="#06111f" strokeWidth="4" strokeLinecap="round" />
      <path d="M27 58l-10 3 7 18 12-5" fill="#61d7ff" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M47 47l8-19 10 4-7 19" fill="#fff1c7" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M39 52h20" stroke="#06111f" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CycleIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="48" cy="48" r="28" fill="#fff" stroke="#06111f" strokeWidth="4" />
      <path d="M47 20c13 0 25 9 28 22" stroke="#14b8a6" strokeWidth="8" strokeLinecap="round" />
      <path d="M49 76c-13 0-25-9-28-22" stroke="#61d7ff" strokeWidth="8" strokeLinecap="round" />
      <path d="M58 42l17 1-10-13" fill="#14b8a6" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M38 54l-17-1 10 13" fill="#61d7ff" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function PotIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M24 40h48l-6 33H30l-6-33Z" fill="#fff" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M34 40c0-9 6-16 14-16s14 7 14 16" stroke="#06111f" strokeWidth="4" strokeLinecap="round" />
      <circle cx="38" cy="55" r="4" fill="#14b8a6" />
      <circle cx="50" cy="55" r="4" fill="#61d7ff" />
      <circle cx="58" cy="66" r="4" fill="#f6c85f" />
      <path d="M20 73h56" stroke="#06111f" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function YieldIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M20 72h58" stroke="#06111f" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 66V50h13v16" fill="#61d7ff" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M43 66V36h13v30" fill="#14b8a6" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 66V26h13v40" fill="#fff1c7" stroke="#06111f" strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 31c13 3 27-2 40-15" stroke="#06111f" strokeWidth="4" strokeLinecap="round" />
      <path d="M63 16h13v13" stroke="#06111f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MascotScene() {
  return (
    <svg className="h-auto w-full" viewBox="0 0 360 260" fill="none" aria-hidden="true">
      <rect x="24" y="28" width="312" height="190" rx="28" fill="#fbf7ed" stroke="#06111f" strokeWidth="5" />
      <path d="M76 156c16-28 38-42 67-42s51 14 67 42" fill="#fff" />
      <circle cx="143" cy="88" r="36" fill="#61d7ff" stroke="#06111f" strokeWidth="5" />
      <path d="M129 88h.1M157 88h.1" stroke="#06111f" strokeWidth="7" strokeLinecap="round" />
      <path d="M132 105c9 8 22 8 31 0" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
      <path d="M84 162c17-32 41-48 72-48 28 0 51 16 68 48v38H84v-38Z" fill="#14b8a6" stroke="#06111f" strokeWidth="5" />
      <path d="M219 93h74" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
      <path d="M219 118h56" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
      <path d="M219 143h74" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
      <circle cx="264" cy="67" r="20" fill="#fff1c7" stroke="#06111f" strokeWidth="5" />
      <path d="M56 70l16-16M61 49l5 26" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
      <path d="M292 184l18 18M313 184l-24 18" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function TrustIcon() {
  return (
    <svg className="h-auto w-full max-w-sm" viewBox="0 0 320 260" fill="none" aria-hidden="true">
      <rect x="20" y="34" width="280" height="178" rx="32" fill="#dff8ff" stroke="#06111f" strokeWidth="5" />
      <path d="M78 104h164M78 138h116M78 172h140" stroke="#06111f" strokeWidth="7" strokeLinecap="round" />
      <path d="M226 62l32 18v36c0 26-14 47-32 56-18-9-32-30-32-56V80l32-18Z" fill="#14b8a6" stroke="#06111f" strokeWidth="5" strokeLinejoin="round" />
      <path d="M211 116l11 11 22-29" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="64" cy="66" r="14" fill="#fff1c7" stroke="#06111f" strokeWidth="5" />
      <path d="M48 224h224" stroke="#06111f" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
