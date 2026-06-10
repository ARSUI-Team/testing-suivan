"use client";

import ConnectSuiWallet from "./ConnectSuiWallet";
import { SuiProvider, SuiWalletProvider } from "@/providers/SuiProvider";

interface DeferredConnectSuiWalletModalProps {
  scrolled?: boolean;
}

export default function DeferredConnectSuiWalletModal({ scrolled }: DeferredConnectSuiWalletModalProps) {
  return (
    <SuiProvider>
      <SuiWalletProvider>
        <ConnectSuiWallet initialModalOpen scrolled={scrolled} variant="header" />
      </SuiWalletProvider>
    </SuiProvider>
  );
}
