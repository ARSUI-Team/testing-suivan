"use client";

import "@mysten/dapp-kit/dist/index.css";

import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

const { networkConfig } = createNetworkConfig({
  testnet: {
    url: process.env.NEXT_PUBLIC_SUI_TESTNET_RPC_URL || getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  },
  mainnet: {
    url: process.env.NEXT_PUBLIC_SUI_MAINNET_RPC_URL || getJsonRpcFullnodeUrl("mainnet"),
    network: "mainnet",
  },
});

export function SuiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={(process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") || "testnet"}
        createClient={(_, config) => new SuiJsonRpcClient(config)}
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
