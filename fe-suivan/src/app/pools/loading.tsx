"use client";

import LoadingSpinner from "@/components/LoadingSpinner";

export default function PoolsLoading() {
  return <LoadingSpinner fullScreen={true} message="Loading Pools" />;
}
