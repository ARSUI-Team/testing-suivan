import { NextResponse } from "next/server";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { fromHex, fromBase64 } from "@mysten/sui/utils";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515";
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID || "0x4484b70fdea8a4aefcfef9c6a33e13d975b2cde0ce6a2085cb8eb18cf5e6af32";
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY || "";

function getClient() {
  const net = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(net), network: net });
}

function parseSecretKey(raw: string) {
  if (raw.startsWith("suiprivkey")) {
    const b = fromBase64(raw.replace("suiprivkey", ""));
    return b.length >= 33 ? b.slice(1, 33) : b;
  }
  return fromHex(raw);
}

export async function GET() {
  if (!AGENT_SECRET_KEY) {
    return NextResponse.json({ configured: false, agentAddress: "", managedPools: [] });
  }

  try {
    const keypair = Ed25519Keypair.fromSecretKey(parseSecretKey(AGENT_SECRET_KEY));
    const agentAddr = keypair.toSuiAddress();

    const caps = await getClient().getOwnedObjects({
      owner: agentAddr,
      filter: { StructType: `${PACKAGE_ID}::arisan_pool::PoolAdminCap` },
      options: { showContent: true },
    });

    const managedPools = caps.data
      .map((c) => {
        const f = (c.data?.content as { fields?: Record<string, unknown> })?.fields;
        const pid = ((f?.pool_id as { id?: string })?.id) || String(f?.pool_id || "");
        return { poolId: pid };
      })
      .filter((p) => p.poolId);

    return NextResponse.json({
      configured: true,
      agentAddress: agentAddr,
      managedPools,
    });
  } catch {
    return NextResponse.json({ configured: false, agentAddress: "", managedPools: [] });
  }
}
