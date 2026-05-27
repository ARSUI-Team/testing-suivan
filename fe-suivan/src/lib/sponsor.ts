export interface SponsorResult {
  digest: string;
  success: boolean;
  error?: string;
}

export interface SponsorJoinPoolParams {
  action: "join_pool";
  poolId: string;
  userAddress: string;
  collateralAmount: number;
  usdcCoinId: string;
}

export interface SponsorCreatePoolParams {
  action: "create_pool";
  userAddress: string;
  depositAmount: number;
  maxParticipants: number;
  cycleDurationDays: number;
  collateralAmount: number;
  usdcCoinId: string;
}

export interface SponsorMakeDepositParams {
  action: "make_deposit";
  poolId: string;
  userAddress: string;
  amount: number;
  usdcCoinId: string;
}

type SponsorParams = SponsorJoinPoolParams | SponsorCreatePoolParams | SponsorMakeDepositParams;

export async function executeSponsoredTransaction(params: SponsorParams): Promise<SponsorResult> {
  try {
    const res = await fetch("/api/sponsor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Sponsor request failed" }));
      return { digest: "", success: false, error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { digest: data.digest, success: true };
  } catch (err) {
    return { digest: "", success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
