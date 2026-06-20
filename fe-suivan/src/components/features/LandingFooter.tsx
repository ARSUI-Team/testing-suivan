import Link from "next/link";
import Image from "next/image";
import RoscaMap from "@/components/features/RoscaMap";

const links = [
  { label: "Pools", href: "/pools" },
  { label: "Simulator", href: "/simulator" },
  { label: "Yield", href: "/ai" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: "/profile" },
  { label: "FAQ", href: "/faq" },
  { label: "Faucet", href: "/faucet" },
];

const communityLinks = [
  { label: "Discord", href: "https://discord.gg/XxxM958bm", socialClass: "social-discord", Icon: ({ className }: { className?: string }) => (
    <svg className={`social-svg ${className || ""}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
  ) },
  { label: "Telegram", href: "https://t.me/sui_van", socialClass: "social-telegram", Icon: ({ className }: { className?: string }) => (
    <svg className={`social-svg ${className || ""}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.41-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.63-2.87 7.96-3.42 3.79-1.58 4.58-1.85 5.09-1.86.11 0 .37.03.54.17.14.12.18.28.2.46z"/></svg>
  ) },
  { label: "Instagram", href: "https://www.instagram.com/suivan_id/", socialClass: "social-instagram", Icon: ({ className }: { className?: string }) => (
    <svg className={`social-svg ${className || ""}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
  ) },
  { label: "X / Twitter", href: "https://x.com/suivan_id", socialClass: "social-twitter", Icon: ({ className }: { className?: string }) => (
    <svg className={`social-svg ${className || ""}`} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  ) },
];

const Footer = () => {
  return (
    <footer className="border-t-[4px] border-[#0a0a0a] bg-[#0a0a0a] relative overflow-hidden">
      <div className="w-full h-2 bg-[#38bdf8]" />

      <div className="absolute top-20 right-6 w-20 h-20 border-[3px] border-[#38bdf8] opacity-15 hidden lg:block" />
      <div className="absolute bottom-20 left-8 w-8 h-32 border-l-[3px] border-[#f8672d] opacity-15 hidden lg:block" />

      <div className="mx-auto max-w-6xl px-5 py-14 md:px-10 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:items-start">
          {/* Column 1: Logo + Tagline */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 bg-[#f8672d] -z-10" />
                <div className="grid size-14 place-items-center bg-[#0a0a0a] border-[3px] border-[#38bdf8]">
                  <Image src="/suivan-logo.png" alt="Suivan" width={42} height={42} className="object-contain invert" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#f5f0eb" }}>SUIVAN</h3>
                <p className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#38bdf8" }}>Community Wealth Protocol</p>
              </div>
            </div>
            <p className="text-sm font-semibold leading-7 text-[#a8a49a]">
              The first programmable ROSCA protocol on Sui Move. Sponsored transactions, DeFi yield, and Seal RNG. Trustless, non-custodial, bringing DeFi to community savings worldwide.
            </p>
          </div>

          {/* Column 2: Product Links */}
          <div className="lg:pl-8">
            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#38bdf8]">Product</h4>
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  className="text-sm font-semibold transition hover:text-[#38bdf8] hover:translate-x-1 flex items-center text-[#a8a49a] duration-200"
                  href={link.href}
                  key={link.href}
                >
                  <span className="text-[#f8672d] mr-2 text-xs">&#8594;</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Community */}
          <div>
            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#f8672d]">Community</h4>
            <div className="flex flex-col gap-2.5">
              {communityLinks.map((link) => (
                <a
                  className="flex items-center gap-3 group/link"
                  href={link.href}
                  key={link.label}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={link.label}
                >
                  <div className={`social-container ${link.socialClass} shrink-0`}>
                    <link.Icon />
                  </div>
                  <span className="text-sm font-semibold text-[#a8a49a] group-hover/link:text-[#38bdf8] transition-colors duration-200">
                    {link.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Column 4: ROSCA Around the World */}
          <div className="lg:w-[280px] w-full">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f8672d] mb-2">ROSCA Around the World</p>
            <RoscaMap />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t-[2px] border-[#a8a49a]/20 pt-6 text-center md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-medium text-[#a8a49a]">&copy; 2026 Suivan. Community Wealth Protocol on Sui.</span>
          <div className="flex items-center justify-center gap-3">
            <span className="w-2 h-2 bg-[#38bdf8]" />
            <span className="w-2 h-2 bg-[#f8672d]" />
            <span className="w-2 h-2 bg-[#f5e642]" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
