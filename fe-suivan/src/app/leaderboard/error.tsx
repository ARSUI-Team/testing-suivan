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
      eyebrow="error_leaderboard"
      title="Leaderboard failed to load"
      description="Leaderboard data could not be refreshed from the network. Try again in a moment."
      reset={reset}
    />
  );
}
