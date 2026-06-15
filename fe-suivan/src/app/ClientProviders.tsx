"use client";

import dynamic from "next/dynamic";
import { ToastProvider } from "@/components/Toast";
import { type ReactNode } from "react";

const SuiProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiProvider })), { ssr: false });
const SuiWalletProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiWalletProvider })), { ssr: false });

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SuiProvider>
      <SuiWalletProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </SuiWalletProvider>
    </SuiProvider>
  );
}
