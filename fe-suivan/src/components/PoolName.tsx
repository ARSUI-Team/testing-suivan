"use client";

import { usePoolWalrusMetadata } from "@/hooks/usePoolWalrusMetadata";

interface PoolNameProps {
  blobId: string;
  fallback: string;
}

export function PoolName({ blobId, fallback }: PoolNameProps) {
  const { metadata } = usePoolWalrusMetadata(blobId || undefined);

  if (!blobId) {
    return <>{fallback}</>;
  }

  if (metadata?.name) {
    return <>{metadata.name}</>;
  }

  return <>{fallback}</>;
}
