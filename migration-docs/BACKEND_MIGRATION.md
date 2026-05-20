# BACKEND_MIGRATION.md

## Backend Architecture Migration: Mantle/EVM → Sui

---

## Current Backend Architecture

The "backend" in this project is entirely serverless — **Next.js API Routes** running on Vercel. There is no separate backend server, database, or queue system.

### API Routes

| Route | Method | Purpose | Blockchain Coupling |
|-------|--------|---------|-------------------|
| `/api/yields` | GET | Fetch protocol yields | Low (DeFiLlama REST API) |
| `/api/yields/recommend` | GET/POST | AI yield recommendation | Low (pure logic) |
| `/api/strategy` | GET/POST | Strategy analysis | Low (pure logic) |

### AI Engine

`src/lib/ai-optimizer.ts` — Pure TypeScript module that:
1. Fetches yield data from DeFiLlama REST API
2. Filters for Mantle-specific protocols
3. Runs risk-adjusted scoring algorithm
4. Returns allocation recommendations

**This module has NO direct blockchain dependency.** It only reads from a REST API and computes results.

---

## What Changes for Sui Migration

### 1. DeFiLlama API Filtering

**Current (Mantle):**
```typescript
// Filter for Mantle chain protocols
const mantlePools = pools.filter(
  (pool) =>
    pool.chain.toLowerCase() === "mantle" &&
    Object.values(DEFILLAMA_PROJECT_MAPPING).includes(pool.project.toLowerCase())
);
```

**Sui Migration:**
```typescript
// Filter for Sui chain protocols
const suiPools = pools.filter(
  (pool) =>
    pool.chain.toLowerCase() === "sui" &&
    Object.values(DEFILLAMA_PROJECT_MAPPING).includes(pool.project.toLowerCase())
);
```

### 2. Protocol List

**Current Mantle Protocols:**
| Protocol | DeFiLlama Project | Risk Score |
|----------|-------------------|------------|
| Lendle | `lendle` | 3/10 |
| Merchant Moe | `merchant-moe` | 5/10 |
| Agni Finance | `agni-finance` | 4/10 |
| Minterest | `minterest` | 2/10 |
| KTX Finance | `ktx-finance` | 7/10 |

**Proposed Sui Protocols:**
| Protocol | DeFiLlama Project | Risk Score |
|----------|-------------------|------------|
| Scallop | `scallop` | 3/10 |
| NAVI Protocol | `navi` | 4/10 |
| Aftermath Finance | `aftermath-finance` | 4/10 |
| Cetus Protocol | `cetus` | 5/10 |
| Turbos Finance | `turbos` | 5/10 |

### 3. Vault Address Mapping

**Current:**
```typescript
export const VAULT_ADDRESSES = {
  lendle: "0x8b01b91bdf61E41051ad1F494901e02175B7784D",  // EVM address
  merchantMoe: "0x5b4501f4B18fb500a240B7D33d323c2A7d4d3FC0",
  // ...
};
```

**Sui Migration:**
```typescript
export const VAULT_ADDRESSES = {
  scallop: "0x...",  // Sui object ID
  navi: "0x...",
  aftermath: "0x...",
  cetus: "0x...",
  turbos: "0x...",
};
```

### 4. Fallback APY Rates

**Current:**
```typescript
const FALLBACK_APY_RATES: Record<string, number> = {
  lendle: 8.5,
  merchantMoe: 12.0,
  agni: 9.5,
  minterest: 7.2,
  ktx: 15.0,
};
```

**Sui Migration:**
```typescript
const FALLBACK_APY_RATES: Record<string, number> = {
  scallop: 6.5,
  navi: 8.0,
  aftermath: 7.5,
  cetus: 12.0,
  turbos: 10.0,
};
```

### 5. Protocol Name Mapping

**Current:**
```typescript
const DEFILLAMA_PROJECT_MAPPING: Record<string, string> = {
  "lendle": "lendle",
  "merchant-moe": "merchant-moe",
  "agni-finance": "agni-finance",
  "minterest": "minterest",
  "ktx-finance": "ktx-finance",
};
```

**Sui Migration:**
```typescript
const DEFILLAMA_PROJECT_MAPPING: Record<string, string> = {
  "scallop": "scallop",
  "navi": "navi",
  "aftermath": "aftermath-finance",
  "cetus": "cetus",
  "turbos": "turbos",
};
```

---

## What Does NOT Change

| Component | Why No Change |
|-----------|--------------|
| API route structure | Pure REST endpoints, no blockchain dependency |
| `@tanstack/react-query` usage | Used for caching, blockchain-agnostic |
| Risk scoring algorithm | Pure math, no blockchain dependency |
| Recommendation engine | Pure logic, no blockchain dependency |
| Market conditions | Simulated/random data |
| Historical performance | Simulated data |
| Rebalancing logic | Pure computation |
| Cache mechanism | 5-minute in-memory cache |
| Error handling patterns | Standard HTTP responses |

---

## Potential Backend Enhancements for Sui

### 1. Sui Indexer Integration

Currently, pool data is fetched directly from smart contracts via RPC. For Sui, consider:

```typescript
// Option A: Direct RPC queries (simpler)
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const pool = await client.getObject({ id: poolId, options: { showContent: true } });

// Option B: Sui GraphQL API (faster for complex queries)
const response = await fetch('https://sui-testnet.mystenlabs.com/graphql', {
  method: 'POST',
  body: JSON.stringify({
    query: `{ objects(filter: { type: "archa::arisan_pool::ArisanPool" }) { nodes { contents } } }`
  })
});
```

### 2. Event Subscription

For real-time updates (e.g., when someone joins a pool):

```typescript
// Sui RPC event subscription
await client.subscribeEvent({
  filter: { type: `${PACKAGE_ID}::arisan_pool::ParticipantJoined` },
  onMessage: (event) => {
    // Update UI in real-time
    queryClient.invalidateQueries(['pools']);
  }
});
```

### 3. Transaction History

```typescript
// Query transactions for a specific pool
const txs = await client.queryTransactionBlocks({
  filter: { InputObject: poolId },
  options: { showEffects: true },
});
```

---

## Summary

The backend migration is **LOW COMPLEXITY** because:

1. ✅ No database migration needed (no database)
2. ✅ No server infrastructure changes (stays on Vercel)
3. ✅ API routes are blockchain-agnostic
4. ✅ AI engine uses REST API, not blockchain RPC
5. 🟡 Only DeFiLlama protocol list needs updating
6. 🟡 Vault addresses change from EVM to Sui object IDs
7. 🟡 Chain filter changes from "mantle" to "sui"
