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
      eyebrow="error_ai"
      title="AI yield signals failed to load"
      description="The AI signal service or Sui RPC may be congested. Try again in a moment."
      reset={reset}
    />
  );
}
