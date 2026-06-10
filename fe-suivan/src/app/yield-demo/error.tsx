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
      eyebrow="error_yield"
      title="Yield demo failed to load"
      description="Yield data could not be refreshed from Sui. Try again in a moment."
      reset={reset}
    />
  );
}
