import { NextResponse } from "next/server";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "";

function getNetwork() {
  return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

export async function GET() {
  if (!FACTORY_ID) {
    return NextResponse.json({ error: "Factory not configured" }, { status: 501 });
  }

  try {
    const network = getNetwork();
    const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });

    const factoryObj = await client.getObject({
      id: FACTORY_ID,
      options: { showContent: true },
    });
    const factoryFields = (factoryObj.data?.content as { fields?: Record<string, unknown> })?.fields;
    const poolCount = Number((factoryFields?.pool_count as string) || "0");
    if (poolCount === 0) return NextResponse.json({ poolIds: [], count: 0 });

    const allPoolsTableId = (factoryFields?.all_pools as { fields?: { id?: { id?: string } } })?.fields?.id?.id;
    if (!allPoolsTableId) return NextResponse.json({ poolIds: [], count: 0 });

    const poolIds: string[] = [];
    for (let i = 0; i < poolCount; i++) {
      try {
        const entry = await client.getDynamicFieldObject({
          parentId: allPoolsTableId,
          name: { type: "u64", value: String(i) },
        });
        const value = (entry.data?.content as { fields?: { value?: string } })?.fields?.value;
        if (value) poolIds.push(value);
      } catch {}
    }

    return NextResponse.json({ poolIds, count: poolIds.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch pools", poolIds: [] }, { status: 500 });
  }
}
