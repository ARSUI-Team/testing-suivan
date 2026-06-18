"use client";

import Link from "next/link";
import { ArrowUpRight, GitBranch, X, MessageCircle, Heart } from "lucide-react";
import SuivanLogo from "./SuivanLogo";
import { useLanguage } from "@/context/LanguageContext";

const links = [
  { label: "Pools", href: "/pools" },
  { label: "Faucet", href: "/faucet" },
  { label: "Simulator", href: "/simulator" },
  { label: "Yield", href: "/ai" },
  { label: "Profile", href: "/profile" },
  { label: "FAQ", href: "/faq" },
];

const protocolLinks = [
  { label: "Sui Network", href: "https://sui.io" },
  { label: "Walrus", href: "https://walrus.xyz" },
  { label: "zkLogin", href: "https://docs.sui.io/concepts/cryptography/zklogin" },
];

const communityLinks = [
  { label: "Telegram", href: "https://t.me/sui_van", Icon: MessageCircle },
  { label: "X / Twitter", href: "https://x.com/suivan_id", Icon: X },
  { label: "GitHub", href: "https://github.com/ARSUI-Team/testing-suivan", Icon: GitBranch },
];

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-ink)] px-5 py-16 md:px-10 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center border-[3px] border-[var(--brutal-accent)] bg-[var(--brutal-ink)]">
                <SuivanLogo className="size-10" size={40} />
              </span>
              <div>
                <h3 className="text-xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-bg)" }}>Suivan</h3>
                <p className="text-xs font-black tracking-[0.1em] uppercase" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-accent)" }}>Community Wealth Protocol</p>
              </div>
            </div>
            <p className="max-w-xs text-sm font-semibold leading-7" style={{ color: "var(--brutal-muted)" }}>
              {t("footer.tagline")}
            </p>
            <div className="mt-5 flex gap-2">
              {communityLinks.map((link) => (
                <a
                  className="grid size-9 place-items-center border-[3px] border-[var(--brutal-muted)] text-[var(--brutal-muted)] transition hover:border-[var(--brutal-accent)] hover:bg-[var(--brutal-accent)] hover:text-[var(--brutal-ink)]"
                  href={link.href}
                  key={link.label}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={link.label}
                >
                  <link.Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="protocol-font mb-4 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--brutal-accent)" }}>
              Product
            </h4>
            <div className="flex flex-col gap-2.5">
              {links.map((link) => (
                <Link
                  className="text-sm font-semibold transition hover:text-[var(--brutal-accent)]"
                  style={{ color: "var(--brutal-muted)" }}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="protocol-font mb-4 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--brutal-accent)" }}>
              Ecosystem
            </h4>
            <div className="flex flex-col gap-2.5">
              {protocolLinks.map((link) => (
                <a
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:text-[var(--brutal-accent)]"
                  style={{ color: "var(--brutal-muted)" }}
                  href={link.href}
                  key={link.label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                  <ArrowUpRight className="size-3" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 md:items-end md:justify-between">
            <div className="border-[3px] border-[var(--brutal-muted)] bg-[var(--brutal-ink)] p-4 shadow-[4px_4px_0_var(--brutal-muted)]">
              <p className="text-xs font-semibold leading-6" style={{ color: "var(--brutal-muted)" }}>
                {t("footer.builtFor")}
              </p>
              <a
                className="protocol-font mt-1 inline-flex items-center gap-1.5 text-sm font-black transition hover:text-[var(--brutal-bg)]"
                style={{ color: "var(--brutal-accent)", fontFamily: "'Bebas Neue', system-ui, sans-serif" }}
                href="https://sui.io"
                rel="noopener noreferrer"
                target="_blank"
              >
                Sui Overflow 2026
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t-[3px] border-[var(--brutal-muted)] pt-6 text-center text-xs font-medium md:flex-row md:items-center md:justify-between" style={{ color: "var(--brutal-muted)" }}>
          <span>&copy; 2026 Suivan. Community Wealth Protocol on Sui.</span>
          <span className="inline-flex items-center gap-1">
            Built with <Heart className="size-3" /> for the Sui ecosystem
          </span>
        </div>
      </div>
    </footer>
  );
}
