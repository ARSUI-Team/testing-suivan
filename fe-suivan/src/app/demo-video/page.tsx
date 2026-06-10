import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const demoVideoId = process.env.NEXT_PUBLIC_DEMO_VIDEO_ID || "";

const demoSteps = [
  {
    time: "00:00-00:20",
    title: "Hook",
    copy: "Suivan turns community savings trust into verifiable code on Sui.",
  },
  {
    time: "00:20-01:00",
    title: "Onboarding",
    copy: "Sign in, connect, and enter the protocol without needing prior crypto knowledge.",
  },
  {
    time: "01:00-01:40",
    title: "Create Pool",
    copy: "Choose pool parameters, review collateral, and create a testnet pool.",
  },
  {
    time: "01:40-02:20",
    title: "Join and Deposit",
    copy: "A participant joins, deposits for the active cycle, and receives a verifiable tx digest.",
  },
  {
    time: "02:20-02:50",
    title: "Winner and Claim",
    copy: "The lifecycle controller selects a winner and the participant claims final collateral plus yield.",
  },
  {
    time: "02:50-03:00",
    title: "Close",
    copy: "Community wealth, built on Sui, with gasless UX and an autonomous pool agent.",
  },
];

export default function DemoVideoPage() {
  return (
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <section className="px-5 pb-10 pt-32 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] shadow-[4px_4px_0_var(--brutal-ink)]">
            judge_demo
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <h1
                className="text-5xl font-black leading-[0.95] md:text-7xl"
                style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
              >
                Suivan Operation 1 Demo
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
                Three-minute walkthrough for the complete pool lifecycle: create, join, deposit, select winner, and claim.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["TVL", "Live"],
                ["Flow", "6 steps"],
                ["Chain", "Sui Testnet"],
                ["UX", "Gasless"],
              ].map(([label, value]) => (
                <div key={label} className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                  <p className="protocol-font text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brutal-muted)]">{label}</p>
                  <p className="mt-1 text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] shadow-[8px_8px_0_var(--brutal-ink)]">
            {demoVideoId ? (
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${demoVideoId}`}
                title="Suivan demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center bg-[var(--brutal-surface)] p-6 text-center">
                <p className="protocol-font text-xs font-black uppercase tracking-[0.18em] text-[var(--brutal-muted)]">video_pending</p>
                <h2 className="mt-3 text-4xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                  Add NEXT_PUBLIC_DEMO_VIDEO_ID
                </h2>
                <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--brutal-muted)]">
                  Once the YouTube demo is uploaded, set the video id and this page will render the live embed.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <Link
              href="/pools"
              className="protocol-font inline-flex min-h-[44px] w-full items-center justify-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-5 py-3 text-sm font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              Open Pools
            </Link>
            {demoSteps.map((step) => (
              <article key={step.time} className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="protocol-font text-[10px] font-black uppercase tracking-[0.14em] text-[var(--brutal-muted)]">{step.time}</p>
                <h3 className="mt-1 text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--brutal-muted)]">{step.copy}</p>
              </article>
            ))}
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
