"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SuivanLogo from "./SuivanLogo";
import { useLanguage } from "@/context/LanguageContext";

const links = [
  { label: "ROSCA", href: "/#rosca" },
  { label: "Cycles", href: "/#cycles" },
  { label: "Pools", href: "/pools" },
  { label: "FAQ", href: "/faq" },
];

const communityLinks = [
  { label: "Telegram", href: "https://t.me/suivan" },
  { label: "Discord", href: "https://discord.gg/suivan" },
];

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t-2 border-slate-950 bg-slate-950 px-5 py-14 text-white md:px-10 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10">
              <SuivanLogo className="size-11" size={44} />
            </span>
            <div>
              <h3 className="text-2xl font-black">Suivan</h3>
              <p className="text-sm font-semibold text-sky-300">Community Wealth Protocol on Sui</p>
            </div>
          </div>
          <p className="max-w-xl font-medium leading-7 text-slate-300">
            {t("footer.tagline")}
          </p>
        </div>

        <div className="grid gap-6 md:justify-end">
          <div className="flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                className="protocol-font rounded-full border border-white/20 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-sky-400 hover:text-white"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {communityLinks.map((link) => (
              <a
                className="protocol-font rounded-full border border-white/20 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-sky-400 hover:text-white"
                href={link.href}
                key={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            className="protocol-font inline-flex w-fit items-center gap-2 rounded-full border-2 border-white bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-300"
            href="https://sui.io"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("footer.builtFor")}
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
