"use client";

import LoadingSpinner from "@/components/LoadingSpinner";

export default function AILoading() {
  return <LoadingSpinner fullScreen={true} message="Initializing AI Optimizer" />;
}
