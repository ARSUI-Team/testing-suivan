"use client";

import dynamic from "next/dynamic";
import { ToastProvider } from "@/components/Toast";
import type { ReactNode } from "react";

const SuiProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiProvider })), { ssr: false });
const LifiSdkProvider = dynamic(() => import("@/providers/LifiProvider").then(m => ({ default: m.LifiSdkProvider })), { ssr: false });

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SuiProvider>
      <LifiSdkProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LifiSdkProvider>
    </SuiProvider>
  );
}
