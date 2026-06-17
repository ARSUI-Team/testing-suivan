"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun } from "lucide-react";
import DeferredConnectSuiWallet from "./DeferredConnectSuiWallet";
import SuivanLogo from "./SuivanLogo";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const ConnectSuiWallet = dynamic(() => import("./ConnectSuiWallet"), { ssr: false });

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;
  const needsWalletProvider = (
    pathname.startsWith("/pools") ||
    pathname.startsWith("/faucet") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/leaderboard")
  );

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
      className="fixed inset-x-0 top-0 z-[999] flex items-center justify-between px-4 py-4 backdrop-blur-sm"
      data-lenis-prevent
    >
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <SuivanLogo className="size-10" priority size={40} />
        <span className="flex flex-col items-start leading-none">
          <span
            className="text-2xl font-black text-[#0a0a0a] dark:text-[#f5f0eb]"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", letterSpacing: "0.02em" }}
          >
            SUIVAN
          </span>
          <span className="text-[8px] font-semibold uppercase tracking-[0.3em] text-[#38bdf8]">
            COMMUNITY WEALTH PROTOCOL
          </span>
        </span>
      </Link>

      <div className="hidden items-center gap-1 lg:flex">
        {navItems.map((item) => (
          <Link
            className={`px-3 py-2 text-[11px] font-black border-[2px] transition-colors ${
              isActive(item.href)
                ? "bg-[#0a0a0a] text-[#38bdf8] border-[#0a0a0a] dark:bg-[#38bdf8] dark:text-[#0a0a0a] dark:border-[#38bdf8]"
                : "bg-transparent text-[#0a0a0a] border-transparent hover:bg-[#0a0a0a] hover:text-[#38bdf8] dark:text-[#f5f0eb] dark:hover:bg-[#38bdf8] dark:hover:text-[#0a0a0a]"
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
          className="grid size-9 place-items-center border-[3px] border-[#0a0a0a] bg-white dark:bg-[#1a1a1a] text-[#0a0a0a] dark:text-[#f5f0eb] dark:border-[#f5f0eb] shadow-[4px_4px_0_#0a0a0a] dark:shadow-[4px_4px_0_#f5f0eb] transition hover:bg-[#38bdf8] dark:hover:bg-[#38bdf8]"
          type="button"
        >
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </button>
        <button
          aria-label="Switch language"
          className="grid size-9 place-items-center border-[3px] border-[#0a0a0a] bg-white dark:bg-[#1a1a1a] text-[10px] font-black text-[#0a0a0a] dark:text-[#f5f0eb] dark:border-[#f5f0eb] shadow-[4px_4px_0_#0a0a0a] dark:shadow-[4px_4px_0_#f5f0eb] transition hover:bg-[#38bdf8] dark:hover:bg-[#38bdf8]"
          onClick={() => setLanguage(language === "en" ? "id" : "en")}
          type="button"
          style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}
        >
          {language === "en" ? "ID" : "EN"}
        </button>
        {needsWalletProvider ? (
          <ConnectSuiWallet variant="header" />
        ) : (
          <DeferredConnectSuiWallet scrolled />
        )}
        <button
          aria-label="Toggle navigation menu"
          className="grid size-9 place-items-center border-[3px] border-[#0a0a0a] bg-white dark:bg-[#1a1a1a] text-[#0a0a0a] dark:text-[#f5f0eb] dark:border-[#f5f0eb] shadow-[4px_4px_0_#0a0a0a] dark:shadow-[4px_4px_0_#f5f0eb] transition hover:bg-[#38bdf8] dark:hover:bg-[#38bdf8] lg:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute inset-x-4 top-full mt-2 border-[4px] border-[#0a0a0a] bg-[#fbf7ed] dark:bg-[#0d0d0d] dark:border-[#f5f0eb] p-3 shadow-[8px_8px_0_#0a0a0a] dark:shadow-[8px_8px_0_#f5f0eb]">
          <div className="grid gap-1">
            {navItems.map((item) => (
              <Link
                className={`px-4 py-3 text-sm font-black transition ${
                  isActive(item.href)
                    ? "bg-[#0a0a0a] text-[#38bdf8] dark:bg-[#38bdf8] dark:text-[#0a0a0a]"
                    : "bg-transparent text-[#0a0a0a] dark:text-[#f5f0eb] hover:bg-[#0a0a0a] hover:text-[#38bdf8] dark:hover:bg-[#38bdf8] dark:hover:text-[#0a0a0a]"
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
