"use client";

import { useQuery } from "@tanstack/react-query";

export interface PoolMetadata {
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
}

const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1";

export function usePoolWalrusMetadata(blobId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["suivan", "walrus", blobId],
    queryFn: async (): Promise<PoolMetadata | null> => {
      if (!blobId || blobId === "") return null;
      try {
        const res = await fetch(`${AGGREGATOR}/blobs/${blobId}`);
        if (!res.ok) return null;
        const text = await res.text();
        const parsed = JSON.parse(text);
        return {
          name: parsed.name || "Custom Pool",
          description: parsed.description || "",
          imageUrl: parsed.imageUrl || "",
          creator: parsed.creator || "",
        };
      } catch {
        return null;
      }
    },
    enabled: !!blobId && blobId !== "",
    staleTime: 5 * 60 * 1000,
  });

  return { metadata: data ?? null, isLoading, error, refetch };
}

export async function publishPoolMetadata(name: string, description: string, creator: string, imageUrl?: string): Promise<string | null> {
  try {
    const res = await fetch("/api/walrus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        metadata: { name, description, creator, imageUrl: imageUrl || "" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.blobId || null;
  } catch {
    return null;
  }
}
