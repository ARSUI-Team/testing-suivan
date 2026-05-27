"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import ConnectSuiWallet from "./ConnectSuiWallet";
import SuivanLogo from "./SuivanLogo";
import { useLanguage, Language } from "@/context/LanguageContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { label: t("nav.pools"), href: "/pools" },
    { label: t("nav.aiYield"), href: "/ai" },
    { label: t("nav.demo"), href: "/demo" },
    { label: t("nav.leaderboard"), href: "/leaderboard" },
    { label: t("nav.faq"), href: "/faq" },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-[200] px-4 py-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border-2 border-slate-950 bg-white/90 px-4 py-3 shadow-[5px_5px_0_#06111f] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-slate-950 shadow-sm shadow-sky-500/20">
            <SuivanLogo className="size-10" priority size={40} />
          </span>
          <div className="leading-none">
            <span className="block text-lg font-black text-slate-950">Suivan</span>
            <span className="protocol-font block text-xs font-bold text-sky-600">Community Wealth Protocol</span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              className="protocol-font rounded-full px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-[#dff8ff] hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="protocol-font text-[10px] font-black text-sky-600">{language}</span>
          <button
            aria-label="Switch language"
            className="protocol-font grid size-10 place-items-center rounded-full border-2 border-slate-950 text-xs font-black text-slate-950 transition hover:bg-[#dff8ff]"
            onClick={() => {
              const next = language === "en" ? "id" : "en";
              setLanguage(next);
            }}
            type="button"
          >
            {language === "en" ? "ID" : "EN"}
          </button>
          <ConnectSuiWallet variant="header" />
          <Link
            href="/pools"
            className="protocol-font inline-flex h-11 items-center gap-2 rounded-full border-2 border-slate-950 bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-500 hover:text-slate-950"
          >
            Explore
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <button
          aria-label="Toggle navigation menu"
          className="grid size-11 place-items-center rounded-full border-2 border-slate-950 text-slate-950 md:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {menuOpen ? (
        <div className="mx-auto mt-3 max-w-6xl rounded-2xl border-2 border-slate-950 bg-white p-4 shadow-[5px_5px_0_#06111f] md:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link
                className="protocol-font rounded-lg px-4 py-3 text-sm font-bold text-slate-700 hover:bg-sky-50"
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-3">
              <button
                aria-label="Switch language"
                className="protocol-font mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 hover:bg-sky-50"
                onClick={() => setLanguage(language === "en" ? "id" : "en")}
                type="button"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                {language === "en" ? "Bahasa Indonesia" : "English"}
              </button>
              <ConnectSuiWallet variant="default" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
