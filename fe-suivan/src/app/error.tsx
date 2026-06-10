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
      eyebrow="error"
      title="Something went wrong"
      description="Suivan hit a temporary app or network issue. Try again in a moment."
      reset={reset}
    />
  );
}
