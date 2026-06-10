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
      eyebrow="error_faq"
      title="FAQ failed to load"
      description="This page hit a temporary loading issue. Try again in a moment."
      reset={reset}
    />
  );
}
