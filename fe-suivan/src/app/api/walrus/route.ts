import { NextRequest, NextResponse } from "next/server";

const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space/v1";
const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, blobId, metadata } = body;

    if (action === "publish") {
      if (!metadata) {
        return NextResponse.json({ error: "metadata required" }, { status: 400 });
      }

      const res = await fetch(`${WALRUS_PUBLISHER}/blobs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!res.ok) {
        return NextResponse.json({
          error: `Walrus publish failed: ${res.status}`,
        }, { status: 502 });
      }

      const data = await res.json();
      const blobId_ = data.blobId || data.newlyCreated?.blobObject?.blobId;

      return NextResponse.json({ success: true, blobId: blobId_ });
    }

    if (action === "read") {
      if (!blobId) {
        return NextResponse.json({ error: "blobId required" }, { status: 400 });
      }

      const res = await fetch(`${WALRUS_AGGREGATOR}/blobs/${blobId}`);

      if (!res.ok) {
        return NextResponse.json({
          error: `Walrus read failed: ${res.status}`,
        }, { status: 502 });
      }

      const data = await res.json();
      return NextResponse.json({ success: true, metadata: data });
    }

    return NextResponse.json({ error: "Unknown action. Use 'publish' or 'read'." }, { status: 400 });
  } catch (err) {
    console.error("Walrus API error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Walrus API error",
    }, { status: 500 });
  }
}
