import { NextResponse } from "next/server";

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function POST() {
  try {
    const res = await fetch(`${BASE_URL}/api/agent/auto`, { method: "GET" });
    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent scan failed" }, { status: 500 });
  }
}
