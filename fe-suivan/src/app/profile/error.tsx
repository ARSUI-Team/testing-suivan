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
      eyebrow="error_profile"
      title="Profile failed to load"
      description="Wallet profile data could not be refreshed from Sui. Try again in a moment."
      reset={reset}
    />
  );
}
