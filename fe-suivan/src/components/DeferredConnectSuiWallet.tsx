"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const DeferredConnectSuiWalletModal = dynamic(() => import("./DeferredConnectSuiWalletModal"), { ssr: false });

interface DeferredConnectSuiWalletProps {
  scrolled?: boolean;
}

export default function DeferredConnectSuiWallet({ scrolled }: DeferredConnectSuiWalletProps) {
  const [enabled, setEnabled] = useState(false);

  if (enabled) {
    return <DeferredConnectSuiWalletModal scrolled={scrolled} />;
  }

  return (
    <button
      onClick={() => setEnabled(true)}
      className="inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 text-xs font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:bg-[var(--brutal-ink)] hover:text-[var(--brutal-accent)]"
      type="button"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      Connect Wallet
    </button>
  );
}
