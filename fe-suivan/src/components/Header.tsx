"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun } from "lucide-react";
import ConnectSuiWallet from "./ConnectSuiWallet";
import SuivanLogo from "./SuivanLogo";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { label: t("nav.pools"), href: "/pools" },
    { label: t("nav.faucet"), href: "/faucet" },
    { label: t("nav.simulator"), href: "/simulator" },
    { label: t("nav.yield"), href: "/ai" },
    { label: t("nav.leaderboard"), href: "/leaderboard" },
    { label: t("nav.profile"), href: "/profile" },
    { label: t("nav.faq"), href: "/faq" },
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[999] px-4 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}
      data-lenis-prevent
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] px-4 py-2 shadow-[8px_8px_0_var(--brutal-ink)] transition-colors md:py-2.5"
        data-lenis-prevent
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden bg-[var(--brutal-bg)]">
            <SuivanLogo className="size-14" priority size={56} />
          </span>
          <div className="leading-none">
            <span className="block text-2xl font-black text-[var(--brutal-ink)] md:text-3xl" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.02em" }}>SUIVAN</span>
            <span className="mt-1 inline-block border-[2px] border-[var(--brutal-accent)] bg-[var(--brutal-accent)] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-[var(--brutal-bg)] md:text-[9px]">NO LOSS · JUST PROFIT</span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              className={`px-3.5 py-2 text-[11px] font-black transition-all ${
                isActive(item.href)
                  ? "bg-[var(--brutal-accent)] text-[var(--brutal-ink)]"
                  : "bg-[var(--brutal-bg)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-accent)] hover:text-[var(--brutal-ink)]"
              }`}
              href={item.href}
              key={item.href}
              style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.08em" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="grid size-9 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] text-[var(--brutal-ink)] shadow-[3px_3px_0_var(--brutal-ink)] transition hover:bg-[var(--brutal-accent)]"
            type="button"
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          <button
            aria-label="Switch language"
            className="grid size-9 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] text-[10px] font-black text-[var(--brutal-ink)] shadow-[3px_3px_0_var(--brutal-ink)] transition hover:bg-[var(--brutal-accent)]"
            onClick={() => setLanguage(language === "en" ? "id" : "en")}
            type="button"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}
          >
            {language === "en" ? "ID" : "EN"}
          </button>
          <ConnectSuiWallet variant="header" />
          <button
            aria-label="Toggle navigation menu"
            className="grid size-9 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] text-[var(--brutal-ink)] shadow-[3px_3px_0_var(--brutal-ink)] transition hover:bg-[var(--brutal-accent)] lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mx-auto mt-2 max-w-6xl border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-3 shadow-[8px_8px_0_var(--brutal-ink)]">
          <div className="grid gap-1">
            {navItems.map((item) => (
              <Link
                className={`px-4 py-3 text-sm font-black transition ${
                  isActive(item.href)
                    ? "bg-[var(--brutal-accent)] text-[var(--brutal-ink)]"
                    : "bg-[var(--brutal-bg)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-accent)] hover:text-[var(--brutal-ink)]"
                }`}
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.06em" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
