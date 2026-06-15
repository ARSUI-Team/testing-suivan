"use client";

import "@mysten/dapp-kit/dist/index.css";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { networkConfig } from "@/config/networkConfig";
import { SUI_NETWORK } from "@/config/suiConstants";

export function SuiProvider({ children }: { children: ReactNode }) {
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
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={SUI_NETWORK}
        createClient={(_, config) =>
          new SuiJsonRpcClient({
            url: config.url ?? "",
            network: config.network ?? SUI_NETWORK,
          })
        }
      >
        {children}
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export function SuiWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WalletProvider
      autoConnect={false}
      preferredWallets={["Slush", "Sui Wallet", "Surf Wallet", "Nightly"]}
    >
      {children}
    </WalletProvider>
  );
}
