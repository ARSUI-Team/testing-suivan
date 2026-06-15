type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  maxRequests: number;   // max requests per window
  windowMs: number;      // window duration in ms
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
};

const ACTION_CONFIGS: Record<string, RateLimitConfig> = {
  claim_usdc:     { maxRequests: 3, windowMs: 86_400_000 },   // 3 per day
  create_pool:    { maxRequests: 5, windowMs: 300_000 },        // 5 per 5 min
  join_pool:      { maxRequests: 20, windowMs: 60_000 },        // 20 per minute
  make_deposit:   { maxRequests: 30, windowMs: 60_000 },        // 30 per minute
  start_pool:     { maxRequests: 10, windowMs: 60_000 },
  select_winner:  { maxRequests: 10, windowMs: 60_000 },
  end_pool:       { maxRequests: 10, windowMs: 60_000 },
  slash_collateral:{ maxRequests: 10, windowMs: 60_000 },
};

const usedNonces = new Set<string>();
const MAX_NONCE_STORAGE = 10_000;

const ipBuckets = new Map<string, RateLimitEntry>();
const addressBuckets = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 300_000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of ipBuckets) {
    if (now >= entry.resetAt) ipBuckets.delete(key);
  }
  for (const [key, entry] of addressBuckets) {
    if (now >= entry.resetAt) addressBuckets.delete(key);
  }
}

function checkBucket(buckets: Map<string, RateLimitEntry>, key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (existing.count >= config.maxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterMs: number };

export function checkRateLimit(
  ip: string,
  userAddress: string,
  action: string,
): RateLimitResult {
  cleanupExpired();

  const config = ACTION_CONFIGS[action] || DEFAULT_CONFIG;

  if (!checkBucket(ipBuckets, ip, config)) {
    const entry = ipBuckets.get(ip)!;
    const retryAfter = Math.max(0, entry.resetAt - Date.now());
    return { ok: false, error: `IP rate limit exceeded for ${action}. Try again later.`, retryAfterMs: retryAfter };
  }

  if (userAddress && !checkBucket(addressBuckets, userAddress, config)) {
    const entry = addressBuckets.get(userAddress)!;
    const retryAfter = Math.max(0, entry.resetAt - Date.now());
    // Rollback IP count since address is the real limiter
    const ipEntry = ipBuckets.get(ip);
    if (ipEntry && ipEntry.count > 0) ipEntry.count -= 1;
    return { ok: false, error: `Address rate limit exceeded for ${action}. Try again later.`, retryAfterMs: retryAfter };
  }

  return { ok: true };
}

export function checkReplayAttack(nonce: string): boolean {
  if (usedNonces.has(nonce)) return false;
  usedNonces.add(nonce);

  if (usedNonces.size > MAX_NONCE_STORAGE) {
    const entries = Array.from(usedNonces);
    for (let i = 0; i < entries.length / 2; i++) {
      usedNonces.delete(entries[i]);
    }
  }

  return true;
}

export function validateSponsorRequest(body: Record<string, unknown>): string | null {
  const action = body.action as string | undefined;
  if (!action) return "Missing `action` field";

  const userAddress = body.userAddress as string | undefined;
  if (!userAddress) return "Missing `userAddress`";
  if (!/^0x[0-9a-fA-F]{64}$/.test(userAddress)) return "Invalid `userAddress` format";

  switch (action) {
    case "claim_usdc":
      break;

    case "create_pool": {
      const deposit = Number(body.depositAmount);
      const maxP = Number(body.maxParticipants);
      const days = Number(body.cycleDurationDays);
      if (!body.usdcCoinId) return "Missing usdcCoinId";
      if (!deposit || deposit <= 0 || deposit > 100_000) return "depositAmount must be 1-100000 USDC";
      if (!maxP || maxP < 2 || maxP > 50) return "maxParticipants must be 2-50";
      if (!days || days < 1 || days > 365) return "cycleDurationDays must be 1-365";
      break;
    }

    case "join_pool": {
      if (!body.poolId) return "Missing poolId";
      if (!body.usdcCoinId) return "Missing usdcCoinId";
      const ca = Number(body.collateralAmount);
      if (!ca || ca <= 0 || ca > 1_000_000) return "collateralAmount must be >0 and <=1M USDC";
      break;
    }

    case "make_deposit": {
      if (!body.poolId) return "Missing poolId";
      if (!body.usdcCoinId) return "Missing usdcCoinId";
      const amt = Number(body.amount);
      if (!amt || amt <= 0 || amt > 1_000_000) return "amount must be 1-1000000 USDC";
      break;
    }

    case "start_pool":
    case "select_winner":
    case "end_pool": {
      if (!body.poolId) return "Missing poolId";
      if (!body.poolAdminCapId) return "Missing poolAdminCapId";
      break;
    }

    case "slash_collateral": {
      if (!body.poolId) return "Missing poolId";
      if (!body.poolAdminCapId) return "Missing poolAdminCapId";
      if (!body.participantAddress) return "Missing participantAddress";
      break;
    }

    default:
      return `Unknown action: ${action}`;
  }

  return null;
}
