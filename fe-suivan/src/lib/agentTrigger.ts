type StartPoolResponse = {
  ok: boolean;
  digest?: string;
  error?: string;
  status?: number;
};

export async function triggerPoolStart(poolId: string, delayMs = 3000): Promise<StartPoolResponse> {
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }

  try {
    const res = await fetch("/api/agent/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start_pool", poolId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}`, status: res.status };
    }

    return { ok: true, digest: data.digest };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: msg };
  }
}
