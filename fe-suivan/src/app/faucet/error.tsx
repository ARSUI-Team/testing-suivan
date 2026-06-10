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
      eyebrow="error_faucet"
      title="Faucet failed to load"
      description="The faucet route or sponsor service is temporarily unavailable. Try again in a moment."
      reset={reset}
    />
  );
}
