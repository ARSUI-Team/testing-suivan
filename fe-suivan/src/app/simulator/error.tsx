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
      eyebrow="error_simulator"
      title="Simulator failed to load"
      description="The simulator hit a temporary app issue. Try again in a moment."
      reset={reset}
    />
  );
}
