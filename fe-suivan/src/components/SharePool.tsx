"use client";

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface SharePoolProps {
  poolAddress: string;
  poolName: string;
  monthlyDeposit: number;
  participants: number;
  maxParticipants: number;
  apy?: number;
}

const shareTargets = [
  {
    id: "twitter",
    label: "X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    id: "telegram",
    label: "Telegram",
    path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14.09.073.147.18.171.325.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347",
  },
];

export default function SharePool({
  poolAddress,
  poolName,
  monthlyDeposit,
  participants,
  maxParticipants,
  apy,
}: SharePoolProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://suivan.app";
  const poolUrl = `${baseUrl}/pools/${poolAddress}`;

  const shareText = `Join my ROSCA pool on Suivan. ${monthlyDeposit} USDC monthly deposit, ${participants}/${maxParticipants} participants${apy ? `, ${apy.toFixed(1)}% APY` : ""}. Built for Sui-native community savings.`;

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(poolUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(poolUrl)}&text=${encodeURIComponent(shareText)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${poolUrl}`)}`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(poolUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="protocol-font inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--foreground)] shadow-[3px_3px_0_var(--border)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-soft)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M8.7 13.3a3 3 0 1 0 0-2.6m0 2.6 6.6 3.4m-6.6-6 6.6-3.4m0 0a3 3 0 1 0 5.4-2.7 3 3 0 0 0-5.4 2.7Zm0 9.4a3 3 0 1 0 5.4 2.7 3 3 0 0 0-5.4-2.7Z" />
        </svg>
        Share
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close share modal"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--background)] shadow-[8px_8px_0_var(--border)]">
            <div className="flex items-start justify-between border-b-2 border-[var(--border)] bg-[var(--surface)] p-5">
              <div>
                <p className="protocol-font text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                  pool_invite
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                  Share {poolName}
                </h3>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  Invite people into a transparent Suivan savings cycle.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)] transition hover:-translate-y-0.5"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-[1.25rem] border-2 border-[var(--border)] bg-[var(--surface)] p-4 shadow-[4px_4px_0_var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)]">
                    <svg className="h-6 w-6 text-[var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M17 20H7m10 0v-2a5 5 0 0 0-10 0v2m10 0h5v-2a3 3 0 0 0-4-2.83M7 20H2v-2a3 3 0 0 1 4-2.83M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-[var(--foreground)]">{poolName}</p>
                    <p className="text-sm font-semibold text-[var(--muted)]">{monthlyDeposit} USDC per cycle</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="protocol-font rounded-full border-2 border-[var(--border)] bg-[var(--success-soft)] px-3 py-1 text-xs font-black text-[var(--foreground)]">
                        {participants}/{maxParticipants} joined
                      </span>
                      {apy && (
                        <span className="protocol-font rounded-full border-2 border-[var(--border)] bg-[var(--warn-soft)] px-3 py-1 text-xs font-black text-[var(--foreground)]">
                          {apy.toFixed(1)}% APY
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="protocol-font mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                  share via
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {shareTargets.map((target) => (
                    <a
                      key={target.id}
                      href={shareLinks[target.id as keyof typeof shareLinks]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-3 text-center font-bold text-[var(--foreground)] shadow-[3px_3px_0_var(--border)] transition hover:-translate-y-0.5"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] ${isDark ? "bg-[var(--surface-hover)]" : target.id === "twitter" ? "bg-slate-950 text-white" : target.id === "telegram" ? "bg-sky-400" : "bg-[#d9f8df]"}`}>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d={target.path} />
                        </svg>
                      </span>
                      <span className="text-xs">{target.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p className="protocol-font mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                  copy link
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={poolUrl}
                    readOnly
                    className="min-h-[46px] min-w-0 flex-1 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--muted)] outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className={`protocol-font min-h-[46px] rounded-2xl border-2 border-[var(--border)] px-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--foreground)] shadow-[3px_3px_0_var(--border)] transition hover:-translate-y-0.5 ${
                      copied ? "bg-[var(--success-soft)]" : "bg-[var(--accent)]"
                    }`}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.25rem] border-2 border-[var(--border)] bg-[var(--accent-soft)] p-4">
                <p className="protocol-font text-xs font-black uppercase tracking-[0.16em] text-[var(--foreground)]">
                  referral layer
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                  Future Suivan rewards can plug into this invite surface without changing the pool UI.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
