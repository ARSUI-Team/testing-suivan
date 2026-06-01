"use client";

import { useEffect, useState } from "react";
import { LiFiWidget, WidgetEvent, widgetEvents } from "@lifi/widget";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ChainId, CoinKey, ChainType } from "@lifi/sdk";
import { useSuccessToast, useErrorToast } from "@/components/Toast";

interface CrossChainBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBridgeComplete?: () => void;
}

export function CrossChainBridgeModal({
  isOpen,
  onClose,
  onBridgeComplete,
}: CrossChainBridgeModalProps) {
  const account = useCurrentAccount();
  const [key, setKey] = useState(0);
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKey((k) => k + 1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSuccess = () => {
      successToast("Bridge Complete", "Funds have been bridged to your Sui wallet");
      onBridgeComplete?.();
      onClose();
    };
    const handleError = () => {
      errorToast("Bridge Failed", "The bridge transaction did not complete");
    };
    if (isOpen && account) {
      widgetEvents.on(WidgetEvent.RouteExecutionCompleted, handleSuccess);
      widgetEvents.on(WidgetEvent.RouteExecutionFailed, handleError);
    }
    return () => {
      widgetEvents.off(WidgetEvent.RouteExecutionCompleted, handleSuccess);
      widgetEvents.off(WidgetEvent.RouteExecutionFailed, handleError);
    };
  }, [isOpen, account, onBridgeComplete, onClose, successToast, errorToast]);

  if (!isOpen || !account) return null;

  const widgetConfig = {
    toChain: ChainId.SUI,
    toToken: CoinKey.SUI,
    toAddress: { address: account.address, chainType: ChainType.MVM },
    variant: "compact" as const,
    appearance: "dark" as const,
    subvariant: "split" as const,
    subvariantOptions: {
      split: {
        defaultTab: "bridge" as const,
      },
    },
    sdkConfig: {
      routeOptions: {
        order: "CHEAPEST" as const,
      },
    },
    hiddenUI: ["poweredBy" as const],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        key={key}
        className="relative w-full max-w-lg rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[8px_8px_0_var(--border)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            Bridge from other chains
          </h3>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--accent)] p-2 text-[var(--foreground)] transition hover:-translate-y-0.5"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-hidden rounded-xl">
          <LiFiWidget integrator="Suivan" config={widgetConfig} />
        </div>
      </div>
    </div>
  );
}
