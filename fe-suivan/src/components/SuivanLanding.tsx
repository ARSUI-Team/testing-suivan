"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLanguage } from "@/context/LanguageContext";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowUpRight, Sparkles, Shield, Users, Coins, Globe, Wallet, Zap, Database, BarChart3, Droplets } from "lucide-react";
import { useAllPoolsWithInfo } from "@/hooks/useSuiContracts";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { title: "feature1Title", desc: "feature1Desc", Icon: Wallet, gradient: "from-[#38bdf8] to-[#818cf8]", bg: "bg-[var(--accent-soft)]" },
  { title: "feature2Title", desc: "feature2Desc", Icon: Zap, gradient: "from-[#14b8a6] to-[#38bdf8]", bg: "bg-[var(--success-soft)]" },
  { title: "feature3Title", desc: "feature3Desc", Icon: BarChart3, gradient: "from-[#8b5cf6] to-[#38bdf8]", bg: "bg-[var(--purple-soft)]" },
  { title: "feature4Title", desc: "feature4Desc", Icon: Database, gradient: "from-[#f6c85f] to-[#14b8a6]", bg: "bg-[var(--warn-soft)]" },
] as const;

const steps = [
  { code: "01", title: "step1Title", copy: "step1Copy", color: "bg-[var(--accent-soft)]", borderColor: "border-[var(--accent-deep)]/30", Icon: GoogleLoginIcon },
  { code: "02", title: "step2Title", copy: "step2Copy", color: "bg-[var(--warn-soft)]", borderColor: "border-[var(--warn-deep)]/30", Icon: PoolPickIcon },
  { code: "03", title: "step3Title", copy: "step3Copy", color: "bg-[var(--success-soft)]", borderColor: "border-[var(--success-deep)]/30", Icon: ContributeIcon },
  { code: "04", title: "step4Title", copy: "step4Copy", color: "bg-[var(--purple-soft)]", borderColor: "border-[var(--purple-deep)]/30", Icon: YieldIcon },
] as const;

const trustPillars = [
  { title: "trust1", desc: "trust1Desc", Icon: Shield },
  { title: "trust2", desc: "trust2Desc", Icon: Coins },
  { title: "trust3", desc: "trust3Desc", Icon: Globe },
] as const;

export default function SuivanLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [yieldProtocols, setYieldProtocols] = useState<any[]>([]);
  const [yieldError, setYieldError] = useState(false);
  const { pools: poolsData, isLoading: poolsLoading } = useAllPoolsWithInfo();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/yields")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          const sorted = [...data.data.protocols].sort((a: any, b: any) => b.apy - a.apy);
          setYieldProtocols(sorted.slice(0, 7));
        } else {
          setYieldError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setYieldError(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1.0 });
    let frame: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    const fallback = setTimeout(() => {
      document.querySelectorAll(".suivan-pop, .suivan-feature, .suivan-card, .suivan-reveal, .suivan-trust").forEach((el) => el.classList.add("gsap-done"));
    }, 3000);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      clearTimeout(fallback);
    };
  }, []);

  const realPools = useMemo(() => {
    if (!poolsData) return [];
    return poolsData.slice(0, 4).map((p: any) => {
      const progress = Math.min(100, ((p.currentCycle || 1) / p.maxParticipants) * 100);
      const cycleLabel = `cycle ${String(p.currentCycle || 1).padStart(2, "0")} / ${p.maxParticipants}`;
      return {
        name: p.name || `Pool #${String(p.address).slice(0, 6)}...`,
        members: `${p.currentParticipants} members`,
        cycle: cycleLabel,
        apy: `${(p.apy || 0).toFixed(1)}%`,
        progress,
      };
    });
  }, [poolsData]);

  const stats = useMemo(() => {
    if (!poolsData) return { tvl: 0, activePools: 0, participants: 0, cycles: 0 };
    const tvl = poolsData.reduce((sum: number, p: any) => sum + (p.totalFunds || 0), 0);
    const participants = poolsData.reduce((sum: number, p: any) => sum + (p.currentParticipants || 0), 0);
    const cycles = poolsData.reduce((sum: number, p: any) => sum + (p.currentCycle || 0), 0);
    return { tvl, activePools: poolsData.length, participants, cycles };
  }, [poolsData]);

  useGSAP(
    () => {
      ScrollTrigger.normalizeScroll(true);
      const ctx = gsap.context(() => {
        const markDone = (selector: string) => {
          gsap.utils.toArray<HTMLElement>(selector).forEach((el) => {
            if (el) el.classList.add("gsap-done");
          });
        };

        gsap.from(".suivan-pop", {
          y: 42, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.07,
          onComplete: () => markDone(".suivan-pop"),
        });

        gsap.from(".suivan-feature", {
          y: 30, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.08,
          scrollTrigger: { trigger: ".suivan-features-grid", start: "top 80%", fastScrollEnd: true },
          onComplete: () => markDone(".suivan-feature"),
        });

        gsap.from(".suivan-card", {
          y: 28, rotate: -1, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.07,
          scrollTrigger: { trigger: ".suivan-flow", start: "top 76%", fastScrollEnd: true },
          onComplete: () => markDone(".suivan-card"),
        });

        gsap.to(".suivan-mascot", {
          y: -20, rotate: 1.5, ease: "none",
          scrollTrigger: { trigger: ".suivan-hero", start: "top top", end: "bottom top", scrub: 0.5 },
        });

        gsap.to(".suivan-float-bg", {
          y: -40, ease: "none",
          scrollTrigger: { trigger: ".suivan-hero", start: "top top", end: "bottom top", scrub: 0.8 },
        });

        gsap.utils.toArray<HTMLElement>(".suivan-reveal").forEach((el) => {
          gsap.from(el, {
            y: 34, opacity: 0, duration: 0.6, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 82%", fastScrollEnd: true },
            onComplete: () => { if (el) el.classList.add("gsap-done"); },
          });
        });

        gsap.utils.toArray<HTMLElement>(".suivan-trust").forEach((el) => {
          gsap.from(el, {
            scale: 0.92, opacity: 0, duration: 0.5, ease: "back.out(1.4)",
            scrollTrigger: { trigger: el, start: "top 85%", fastScrollEnd: true },
            onComplete: () => { if (el) el.classList.add("gsap-done"); },
          });
        });
      }, rootRef);

      return () => ctx.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="suivan-brutal" style={{ background: "var(--brutal-bg)" }}>
      <HeroSection />
      <PoweredBySui />
      <HowItWorks />
      <LivePools />
      <TrustSection />
      <CTASection />
    </div>
  );

  function HeroSection() {
    return (
      <section className="suivan-hero relative isolate overflow-hidden px-5 pb-20 pt-32 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <div className="suivan-pop brutal-badge mb-5">
                <span className="text-[var(--ink)]">{t("landing.badge")}</span>
              </div>

              <h1 className="suivan-pop max-w-3xl font-black leading-[0.88] tracking-[-0.04em]">
                <span className="block text-5xl md:text-6xl lg:text-7xl text-left">
                  Global ROSCA Pools.
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl mt-1 text-left">
                  No Loss Just Profit
                </span>
                <span className="block text-2xl md:text-3xl lg:text-4xl mt-3 font-bold tracking-[0.08em] text-left" style={{ color: "var(--brutal-muted)" }}>
                  Zero Gas - Real Yield - CrossChain
                </span>
              </h1>

              <p className="suivan-pop mt-6 max-w-lg text-base font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
                {t("landing.subtitle")}
              </p>

              <div className="suivan-pop mt-8 flex flex-wrap gap-4">
                <Link className="brutal-btn" href="/pools">
                  {t("landing.explore")}
                  <ArrowUpRight className="size-4" />
                </Link>
                <a className="brutal-btn-outline" href="#how">
                  {t("landing.how")}
                </a>
                <Link className="brutal-btn-outline" href="/faucet" style={{ background: "var(--brutal-accent)" }}>
                  <Droplets className="size-4" />
                  Faucet
                </Link>
              </div>

              <div className="suivan-pop mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-3 text-center shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                    {stats.activePools || "—"}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brutal-muted)]">Active Pools</p>
                </div>
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-3 text-center shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                    {stats.participants || "—"}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brutal-muted)]">Participants</p>
                </div>
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-3 text-center shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="text-lg font-black leading-none" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                    {stats.tvl >= 1000 ? `$${(stats.tvl / 1000).toFixed(1)}K` : `$${stats.tvl.toFixed(0)}`}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brutal-muted)]">TVL</p>
                </div>
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-3 text-center shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                    {stats.cycles || "—"}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brutal-muted)]">Cycles</p>
                </div>
              </div>
            </div>

            <div className="suivan-pop relative w-full lg:mt-12">
              {yieldError ? (
                <div className="flex items-center justify-center rounded-[4px] border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-8 shadow-[6px_6px_0_var(--brutal-ink)]" style={{ minHeight: 380 }}>
                  <p className="text-sm font-bold text-[var(--brutal-muted)]">Yield data temporarily unavailable</p>
                </div>
              ) : yieldProtocols.length < 7 ? (
                <div className="flex items-center justify-center" style={{ minHeight: 380 }}>
                  <YieldCardSkeleton />
                </div>
              ) : (
                <div className="cylinder-stage">
                  <div className="cylinder-scene">
                    {(() => {
                      const count = yieldProtocols.length;
                      const angleStep = 360 / count;
                      return yieldProtocols.map((p: any, i: number) => (
                        <div key={p.name} className="cylinder-face" style={{ transform: `rotateY(${i * angleStep}deg) translateZ(${window.innerWidth < 1024 ? 180 : 300}px)` }}>
                          <CylinderCard p={p} t={t} />
                        </div>
                      ));
                    })()}
                  </div>
                  <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--brutal-muted)] text-center">
                    Live from DeFiLlama · Hover to pause
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="suivan-pop mx-auto mt-20 w-full overflow-hidden bg-[var(--brutal-surface)] py-6 marquee-outer">
            <div className="marquee-track">
              <MarqueeContent />
              <MarqueeContent />
            </div>
          </div>
        </div>
      </section>
    );
  }

  function PoweredBySui() {
    return (
      <section className="relative isolate overflow-hidden px-5 py-20 md:px-10 lg:px-12" style={{ background: "var(--brutal-bg)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="suivan-reveal mb-12 flex flex-col items-center text-center">
            <span className="brutal-badge mb-4">{t("landing.whyBadge")}</span>
            <h2 className="max-w-2xl text-5xl font-black leading-[0.88] tracking-[-0.03em] md:text-6xl lg:text-7xl">
              {t("landing.whyTitle")}{" "}
              <span style={{ color: "var(--brutal-accent)" }}>{t("landing.whySui")}</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
              {t("landing.whyDesc")}
            </p>
          </div>

          <div className="suivan-features-grid grid gap-4 md:grid-cols-2 auto-rows-fr">
            {features.map(({ title, desc, Icon }) => (
              <div className="suivan-feature brutal-card flex items-start gap-4 p-5 h-full" key={title}>
                <div className="grid size-14 shrink-0 place-items-center border-[3px] border-[var(--ink)]" style={{ background: "var(--brutal-accent)" }}>
                  <Icon className="size-6" style={{ color: "var(--ink)" }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black tracking-[-0.02em]">{t(`landing.${title}`)}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6" style={{ color: "var(--brutal-muted)" }}>
                    {t(`landing.${desc}`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function HowItWorks() {
    return (
      <section id="how" className="suivan-flow px-5 py-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="suivan-reveal mb-12 flex flex-col items-center text-center">
            <h2 className="max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.03em] md:text-6xl lg:text-7xl">
              {t("landing.sectionTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
              {t("landing.sectionSub")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
            {steps.map(({ code, title, copy, Icon }) => (
              <article className="suivan-card brutal-card relative p-6 h-full transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1" key={title}>
                <div className="absolute -right-2 -top-2 grid size-8 place-items-center border-[3px] border-[var(--ink)] text-xs font-black shadow-[3px_3px_0_var(--ink)]" style={{ background: "var(--brutal-bg)" }}>
                  {code}
                </div>
                <div className="mb-6">
                  <Icon />
                </div>
                <h3 className="text-3xl font-black tracking-[-0.04em]">
                  {t(`landing.${title}`)}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6" style={{ color: "var(--brutal-muted)" }}>
                  {t(`landing.${copy}`)}
                </p>
                <div className="mt-6 h-1 transition-all duration-200" style={{ width: "48px", background: "var(--yellow)", border: "2px solid var(--ink)" }} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function LivePools() {
    const showSkeleton = poolsLoading && realPools.length === 0;
    const showEmpty = !poolsLoading && realPools.length === 0;
    const displayPools = realPools.length > 0 ? realPools : showEmpty ? [{ name: "Sui Creators Circle", members: "12 members", cycle: "cycle 08 / 12", apy: "8.1%", progress: 82 }] : [];
    return (
      <section className="px-5 py-20 md:px-10 lg:px-12" style={{ background: "var(--brutal-ink)", color: "var(--brutal-bg)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="suivan-reveal mb-12 flex flex-col items-center text-center">
            <span className="mb-4 inline-block border-[3px] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] shadow-[4px_4px_0_rgba(245,240,235,0.2)]" style={{ background: "color-mix(in srgb, var(--brutal-bg) 12%, transparent)", color: "var(--brutal-accent)", borderColor: "color-mix(in srgb, var(--brutal-bg) 30%, transparent)" }}>
              {t("landing.poolsBadge")}
            </span>
            <h2 className="max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.03em] md:text-6xl lg:text-7xl">
              {t("landing.poolsTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
              {t("landing.poolsDesc")}
            </p>
          </div>

          <div className="grid gap-4">
            {showSkeleton ? (
              <div className="p-8 text-center border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] shadow-[8px_8px_0_var(--brutal-ink)]">
                <div className="mx-auto mb-4 h-3 w-48 bg-[var(--brutal-ink)] animate-pulse opacity-20" />
                <div className="mx-auto h-3 w-32 bg-[var(--brutal-ink)] animate-pulse opacity-20" />
              </div>
            ) : (
              displayPools.map((pool) => (
                <article className="suivan-reveal p-5 md:p-6" key={pool.name} style={{ background: "var(--brutal-bg)", border: "4px solid var(--brutal-ink)", boxShadow: "8px 8px 0 var(--brutal-ink)", color: "var(--brutal-ink)" }}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#e8180a", fontFamily: "var(--font-bebas)" }}>
                        object::pool
                      </p>
                      <h3 className="mt-1.5 text-xl font-black md:text-2xl">{pool.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="border-[3px] border-[var(--brutal-ink)] px-3 py-2 text-[11px] font-black" style={{ color: "var(--brutal-ink)" }}>{pool.members}</span>
                      <span className="border-[3px] border-[var(--brutal-ink)] px-3 py-2 text-[11px] font-black" style={{ color: "var(--brutal-ink)" }}>{pool.cycle}</span>
                      <span className="border-[3px] px-3 py-2 text-[11px] font-black" style={{ borderColor: "var(--brutal-accent)", background: "var(--brutal-accent)", color: "var(--brutal-ink)" }}>{pool.apy}</span>
                    </div>
                  </div>
                  <div className="mt-4 h-2" style={{ background: "var(--brutal-surface)", border: "3px solid var(--brutal-ink)" }}>
                    <div className="h-full transition-all duration-700" style={{ width: `${pool.progress}%`, background: "var(--brutal-accent)" }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-black" style={{ color: "var(--brutal-muted)", fontFamily: "var(--font-bebas)" }}>
                    <span>cycle progress</span>
                    <span>{pool.progress}%</span>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="suivan-reveal mt-8 text-center">
            <Link className="brutal-btn" href="/pools">
              {t("landing.explore")}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  function TrustSection() {
    return (
      <section className="px-5 py-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="suivan-reveal mb-12 flex flex-col items-center text-center">
            <span className="brutal-badge mb-4" style={{ background: "var(--green)" }}>{t("landing.trustBadge")}</span>
            <h2 className="max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.03em] md:text-6xl lg:text-7xl">
              {t("landing.trustTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
              {t("landing.trustDesc")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 auto-rows-fr">
            {trustPillars.map(({ title, desc, Icon }) => (
              <div className="suivan-trust brutal-card p-6 h-full" key={title}>
                <div className="mb-5 grid size-14 place-items-center border-[3px] border-[var(--ink)]" style={{ background: "var(--green)" }}>
                  <Icon className="size-6" style={{ color: "var(--ink)" }} />
                </div>
                <h3 className="text-xl font-black tracking-[-0.02em]">{t(`landing.${title}`)}</h3>
                <p className="mt-2 text-sm font-semibold leading-6" style={{ color: "var(--brutal-muted)" }}>
                  {t(`landing.${desc}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function CTASection() {
    return (
      <section className="px-5 pb-24 pt-8 md:px-10 lg:px-12" style={{ background: "var(--brutal-bg)" }}>
        <div className="mx-auto max-w-6xl p-8 md:p-12 lg:p-16" style={{ background: "var(--brutal-bg)", color: "var(--brutal-ink)", border: "5px solid var(--brutal-ink)", boxShadow: "12px 12px 0 var(--brutal-ink)" }}>
          <div className="mx-auto max-w-2xl text-center">
            <span className="brutal-badge mb-4">{t("landing.ctaBadge")}</span>

            <h2 className="text-5xl font-black leading-[0.88] tracking-[-0.03em] md:text-6xl lg:text-7xl">
              {t("landing.ctaTitle")}
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-base font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
              {t("landing.ctaDesc")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link className="brutal-btn" href="/pools">
                {t("landing.ctaButton")}
                <Sparkles className="size-4" />
              </Link>
              <Link className="brutal-btn-outline" href="/simulator">
                <Users className="size-4" />
                Try Simulator
              </Link>
              <Link className="brutal-btn-outline" href="/faucet" style={{ background: "var(--brutal-accent)" }}>
                <Droplets className="size-4" />
                Faucet
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

function MarqueeContent() {
  const sponsors = [
    { name: "Sui Overflow 2026", role: "Presented by Sui Foundation", href: "https://sui.io" },
    { name: "Walrus", role: "Headline Partner & Track Sponsor", href: "https://walrus.xyz" },
    { name: "DeepBook", role: "Track Sponsor", href: "https://deepbook.tech" },
    { name: "OpenZeppelin", role: "Prize Sponsor", href: "https://openzeppelin.com" },
    { name: "OtterSec", role: "Prize Sponsor", href: "https://osec.io" },
    { name: "Scallop", role: "Award Sponsor", href: "https://scallop.io" },
  ];
  return (
    <div className="flex items-center gap-6 shrink-0" aria-hidden="true">
      {[...sponsors, ...sponsors].map((s, i) => (
        <div key={i} className="flex items-center gap-4 border-r-[2px] border-[var(--brutal-ink)] pr-6">
          <span className="whitespace-nowrap text-lg font-black tracking-tight text-[var(--brutal-ink)]">{s.name}</span>
          <span className="whitespace-nowrap text-xs font-bold tracking-[0.12em] uppercase text-[var(--brutal-ink)]">{s.role}</span>
        </div>
      ))}
    </div>
  );
}

function GoogleLoginIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="20" y="28" width="56" height="52" rx="12" className="fill-[var(--brutal-card)] stroke-[var(--brutal-ink)]" strokeWidth="4.5" />
      <circle cx="48" cy="50" r="12" className="fill-[var(--accent-soft)] stroke-[var(--brutal-ink)]" strokeWidth="4" />
      <path d="M42 50l4 4 8-8" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 68c4-6 12-10 20-10s16 4 20 10" className="stroke-[var(--brutal-ink)]" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 80h24" className="stroke-[var(--brutal-ink)]" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 18v-4M40 20l3-3M56 20l-3-3" className="stroke-[var(--brutal-ink)]" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PoolPickIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="48" cy="42" r="22" className="fill-[var(--brutal-card)] stroke-[var(--brutal-ink)]" strokeWidth="4.5" />
      <path d="M36 42h24M48 30v24" className="stroke-[var(--brutal-ink)]" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="48" cy="42" r="6" className="fill-[var(--warn)] stroke-[var(--brutal-ink)]" strokeWidth="3" />
      <path d="M30 72c0-10 8-18 18-18s18 8 18 18" className="fill-[var(--warn-soft)] stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="48" cy="72" r="4" className="fill-[var(--walrus-teal)] stroke-[var(--brutal-ink)]" strokeWidth="2.5" />
      <path d="M14 72h68" className="stroke-[var(--brutal-ink)]" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function ContributeIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="22" y="22" width="52" height="52" rx="10" className="fill-[var(--brutal-card)] stroke-[var(--brutal-ink)]" strokeWidth="4.5" />
      <path d="M34 38h28M34 48h28M34 58h16" className="stroke-[var(--brutal-ink)]" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="70" cy="30" r="12" className="fill-[var(--success-soft)] stroke-[var(--brutal-ink)]" strokeWidth="3.5" />
      <path d="M66 30l3 3 5-6" className="stroke-[var(--walrus-teal)]" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 76h44" className="stroke-[var(--brutal-ink)]" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function YieldIcon() {
  return (
    <svg className="h-16 w-16" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M20 72h58" className="stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 66V50h13v16" className="fill-[var(--accent-soft)] stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinejoin="round" />
      <path d="M43 66V36h13v30" className="fill-[var(--success-soft)] stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 66V26h13v40" className="fill-[var(--purple-soft)] stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 31c13 3 27-2 40-15" className="stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinecap="round" />
      <path d="M63 16h13v13" className="stroke-[var(--brutal-ink)]" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="78" cy="18" r="6" className="fill-[var(--warn)] stroke-[var(--brutal-ink)]" strokeWidth="3" />
    </svg>
  );
}

function YieldCardSkeleton() {
  return (
    <div className="w-full border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] shadow-[6px_6px_0_var(--brutal-ink)] p-6 animate-pulse text-center">
      <div className="h-3 w-28 bg-[var(--brutal-ink)] mx-auto mb-5 opacity-20" />
      <div className="h-12 w-36 bg-[var(--brutal-ink)] mx-auto mb-3 opacity-20" />
      <div className="h-3 w-24 bg-[var(--brutal-ink)] mx-auto mb-5 opacity-20" />
      <div className="h-px bg-[var(--brutal-ink)] mb-4 opacity-20" />
      <div className="flex justify-center gap-8">
        <div className="h-6 w-16 bg-[var(--brutal-ink)] opacity-20" />
        <div className="h-6 w-16 bg-[var(--brutal-ink)] opacity-20" />
        <div className="h-6 w-16 bg-[var(--brutal-ink)] opacity-20" />
      </div>
    </div>
  );
}

function CylinderCard({ p, t }: { p: any; t: (key: string, params?: Record<string, string | number>) => string }) {
  const init = p.name.charAt(0).toUpperCase();
  const apyFormatted = (typeof p.apy === "number" ? p.apy : parseFloat(p.apy)).toFixed(1);
  const tvlFormatted = p.tvl >= 1_000_000_000 ? `$${(p.tvl / 1_000_000_000).toFixed(1)}B` : p.tvl >= 1_000_000 ? `$${(p.tvl / 1_000_000).toFixed(1)}M` : p.tvl >= 1_000 ? `$${(p.tvl / 1_000).toFixed(1)}K` : `$${p.tvl}`;
  const riskLabel = p.riskScore <= 2 ? "Low" : p.riskScore <= 4 ? "Mid" : "High";
  const riskColor = p.riskScore <= 2 ? "#00e060" : p.riskScore <= 4 ? "#f6c85f" : "#e8180a";
  const defiSlug = p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="prof-card-can">
      <div className="prof-header-can">
        <div className="prof-header-num-can">{apyFormatted.split(".")[0]}</div>
        <div className="prof-avatar-can">{init}</div>
        <div className="prof-badge-can" style={{ background: riskColor, color: "var(--brutal-ink)" }}>
          L{p.riskScore} · {riskLabel}
        </div>
      </div>
      <div className="prof-body-can">
        <p className="prof-handle-can">{p.name.toUpperCase().replace(" PROTOCOL", "").replace(" FINANCE", "")}::YIELD</p>
        <h3 className="prof-name-can">{p.name}</h3>
        <p className="prof-bio-can">{t("landing.cylinderDesc", { chain: p.chain })}</p>
      </div>
      <div className="prof-stats-can">
        <div className="pstat-can">
          <span className="psv-can">{apyFormatted}%</span>
          <span className="psl-can">APY</span>
        </div>
        <div className="pstat-can">
          <span className="psv-can">{tvlFormatted}</span>
          <span className="psl-can">TVL</span>
        </div>
        <div className="pstat-can">
          <span className="psv-can">{p.source === "defillama" ? t("landing.cylinderLive") : "SIM"}</span>
          <span className="psl-can">{t("landing.cylinderSource")}</span>
        </div>
      </div>
      <a className="prof-btn-can" href={`https://defillama.com/protocol/${defiSlug}`} target="_blank" rel="noopener noreferrer">
        {t("landing.cylinderSupply", { name: p.name.split(" ")[0] })}
      </a>
    </div>
  );
}
