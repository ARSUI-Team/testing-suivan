export interface PoolMetadata {
  name: string;
  description: string;
  coverImage?: string;
  memberCount?: number;
  createdAt: string;
  tags?: string[];
}

const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1";
const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space/v1";

export async function publishPoolMetadata(metadata: PoolMetadata): Promise<string | null> {
  try {
    const res = await fetch(`${WALRUS_PUBLISHER}/blobs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      console.error("Walrus publish failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.blobId || data.newlyCreated?.blobObject?.blobId || null;
  } catch (err) {
    console.error("Walrus publish error:", err);
    return null;
  }
}

export async function readPoolMetadata(blobId: string): Promise<PoolMetadata | null> {
  try {
    const res = await fetch(`${WALRUS_AGGREGATOR}/blobs/${blobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Walrus read error:", err);
    return null;
  }
}
