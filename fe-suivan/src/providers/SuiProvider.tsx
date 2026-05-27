"use client";

import "@mysten/dapp-kit/dist/index.css";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { networkConfig } from "@/config/networkConfig";

export function SuiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={(process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") || "testnet"}
        createClient={(_, config) => new SuiClient(config)}
      >
        <WalletProvider
          autoConnect
          preferredWallets={["Slush", "Sui Wallet", "Surf Wallet", "Nightly"]}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
