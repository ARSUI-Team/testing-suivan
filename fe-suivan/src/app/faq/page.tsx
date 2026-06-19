"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";

const faqItems = [
  ["faq.q1", "faq.a1"],
  ["faq.q2", "faq.a2"],
  ["faq.q3", "faq.a3"],
  ["faq.q4", "faq.a4"],
  ["faq.q5", "faq.a5"],
  ["faq.q6", "faq.a6"],
  ["faq.q7", "faq.a7"],
  ["faq.q8", "faq.a8"],
  ["faq.q9", "faq.a9"],
  ["faq.q10", "faq.a10"],
  ["faq.q11", "faq.a11"],
  ["faq.q12", "faq.a12"],
  ["faq.q13", "faq.a13"],
  ["faq.q14", "faq.a14"],
  ["faq.q15", "faq.a15"],
  ["faq.q16", "faq.a16"],
] as const;

export default function FAQPage() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#f8672d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[10px_10px_0_#0a0a0a]">
            <HelpCircle className="size-4 text-[#0a0a0a]" />
            HELP CENTER
          </p>
          <h1
            className="gsap-up mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
          >
            {t("faq.title")}
          </h1>
          <p className="gsap-up mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#333333]">
            {t("faq.subtitle")}
          </p>
        </div>
      </section>

      <main className="px-5 pb-20 md:px-10 lg:px-12">
        <section className="mx-auto max-w-6xl">
          <div className="mt-12 grid gap-4">
            {faqItems.map(([questionId, answerId], index) => {
              const isOpen = openIndex === index;

              return (
                <article
                  className="border-[3px] border-[#0a0a0a] bg-grid-brutal shadow-[10px_10px_0_#0a0a0a]"
                  key={questionId}
                >
                  <button
                    className="flex min-h-[72px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#fdfdfa]"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    type="button"
                  >
                    <span className="flex items-center gap-4">
                      <span className="protocol-font border-[3px] border-[#0a0a0a] bg-[#f8672d] px-3 py-1 text-xs font-black text-[#0a0a0a]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-lg font-black tracking-[-0.02em] text-[#0a0a0a]">
                        {t(questionId)}
                      </span>
                    </span>
                    <span className="protocol-font text-2xl font-black text-[#0a0a0a]">{isOpen ? "-" : "+"}</span>
                  </button>

                  {isOpen ? (
                    <div className="border-t-[3px] border-[#0a0a0a] bg-[#fdfdfa] px-5 py-5">
                      <p className="max-w-4xl text-base font-semibold leading-8 text-[#0a0a0a]">
                        {t(answerId)}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-12 border-[4px] border-[#0a0a0a] bg-[#0a0a0a] p-6 shadow-[14px_14px_0_#38bdf8] md:p-8">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.2em] text-[#38bdf8]">
              community_channels
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2
                  className="text-4xl font-black tracking-[-0.05em]"
                  style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#fbf7ed" }}
                >
                  {t("faq.contactTitle")}
                </h2>
                <p className="mt-3 max-w-xl font-semibold leading-7 text-[#333333]">{t("faq.contactDesc")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className="protocol-font border-[3px] border-white bg-[#26A5E4] px-5 py-3 text-sm font-black text-white shadow-[6px_6px_0_#1a8ac7] transition hover:brightness-110"
                  href="https://t.me/sui_van"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Telegram
                </a>
                <a
                  className="protocol-font border-[3px] border-white bg-[#5865F2] px-5 py-3 text-sm font-black text-white shadow-[6px_6px_0_#4752c4] transition hover:brightness-110"
                  href="https://discord.gg/XxxM958bm"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
