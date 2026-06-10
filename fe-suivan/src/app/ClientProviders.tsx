"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/Toast";
import { useState, type ReactNode } from "react";

const SuiProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiProvider })), { ssr: false });
const SuiWalletProvider = dynamic(() => import("@/providers/SuiProvider").then(m => ({ default: m.SuiWalletProvider })), { ssr: false });

function routeNeedsWalletProvider(pathname: string | null) {
  return !!pathname && (
    pathname.startsWith("/pools") ||
    pathname.startsWith("/faucet") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/leaderboard")
  );
}

function routeNeedsSuiProvider(pathname: string | null) {
  return routeNeedsWalletProvider(pathname) || pathname === "/yield-demo";
}

export function ClientProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));
  const content = (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );

  if (!routeNeedsSuiProvider(pathname)) return content;

  return (
    <SuiProvider>
      {routeNeedsWalletProvider(pathname) ? (
        <SuiWalletProvider>
          {content}
        </SuiWalletProvider>
      ) : content}
    </SuiProvider>
  );
}
