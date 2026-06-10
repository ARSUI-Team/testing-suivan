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
      eyebrow="error_pools"
      title="Pools failed to load"
      description="Failed to load pool data from Sui. The network may be congested; try again in 30 seconds."
      reset={reset}
    />
  );
}
