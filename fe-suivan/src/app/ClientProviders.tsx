"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/Toast";
import { useState, type ReactNode } from "react";

const SuiProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiProvider })), { ssr: false });
const SuiWalletProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiWalletProvider })), { ssr: false });

export function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SuiProvider>
      <SuiWalletProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryClientProvider>
      </SuiWalletProvider>
    </SuiProvider>
  );
}
