"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      eyebrow="error_yield_explorer"
      title="Yield Explorer failed to load"
      description="The Sui RPC or DeFiLlama data source may be temporarily unavailable. Please try again in a moment."
      reset={reset}
    />
  );
}
