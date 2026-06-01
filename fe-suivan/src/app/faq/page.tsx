"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
] as const;

export default function FAQPage() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <main className="px-5 pb-20 pt-32 md:px-10 lg:px-12">
        <section className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="protocol-font inline-flex border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_var(--brutal-ink)]">
                help_center
              </p>
              <h1
                className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
                style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
              >
                {t("faq.title")}
              </h1>
            </div>
            <p className="protocol-font max-w-2xl text-lg font-semibold leading-8 tracking-[0.1em] text-[var(--brutal-muted)]">
              {t("faq.subtitle")}
            </p>
          </div>

          <div className="mt-12 grid gap-4">
            {faqItems.map(([questionId, answerId], index) => {
              const isOpen = openIndex === index;

              return (
                <article
                  className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] shadow-[5px_5px_0_var(--brutal-ink)]"
                  key={questionId}
                >
                  <button
                    className="flex min-h-[72px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--brutal-surface)]"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    type="button"
                  >
                    <span className="flex items-center gap-4">
                      <span className="protocol-font border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] px-3 py-1 text-xs font-black">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-lg font-black tracking-[-0.02em] text-[var(--brutal-ink)]">
                        {t(questionId)}
                      </span>
                    </span>
                    <span className="protocol-font text-2xl font-black">{isOpen ? "-" : "+"}</span>
                  </button>

                  {isOpen ? (
                    <div className="border-t-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] px-5 py-5">
                      <p className="max-w-4xl text-base font-semibold leading-8 text-[var(--brutal-ink)]">
                        {t(answerId)}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-12 border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-ink)] p-6 text-[var(--brutal-bg)] shadow-[8px_8px_0_var(--brutal-accent)] md:p-8">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.2em] text-[var(--brutal-accent)]">
              community_channels
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2
                  className="text-4xl font-black tracking-[-0.05em]"
                  style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-bg)" }}
                >
                  {t("faq.contactTitle")}
                </h2>
                <p className="mt-3 max-w-xl font-semibold leading-7 text-[var(--brutal-bg)]">{t("faq.contactDesc")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className="protocol-font border-[3px] border-[var(--brutal-bg)] bg-[var(--brutal-bg)] px-5 py-3 text-sm font-black text-[var(--brutal-ink)] shadow-[3px_3px_0_var(--brutal-bg)] transition"
                  href="https://t.me/suivan"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Telegram
                </a>
                <a
                  className="protocol-font border-[3px] border-[var(--brutal-bg)] bg-transparent px-5 py-3 text-sm font-black text-[var(--brutal-bg)] transition"
                  href="https://discord.gg/suivan"
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

      <Footer />
    </div>
  );
}
