# SUI_MIGRATION_PLAN.md

## Complete Migration Strategy: Mantle/EVM → Sui

---

## Executive Summary

This migration involves moving the entire Archa protocol from an EVM-based architecture (Solidity + wagmi + viem) to the Sui blockchain (Move + @mysten/dapp-kit + @mysten/sui.js). The migration touches every layer of the application: smart contracts, frontend wallet integration, contract interaction hooks, and AI yield optimizer configuration.

**Estimated Total Migration Time:** 15-25 developer-days
**Overall Difficulty:** HIGH
**Biggest Blockers:** Smart contract rewrite (Move is fundamentally different from Solidity)

---

## Migration Phases

### Phase 1: Foundation & Smart Contracts (Week 1-2)
**Goal:** Write Move contracts, deploy to Sui testnet

| Step | Task | Duration | Dependency | Risk |
|------|------|----------|------------|------|
| 1.1 | Set up Sui Move project structure | 0.5 day | None | LOW |
| 1.2 | Create USDC coin type (test) | 0.5 day | 1.1 | LOW |
| 1.3 | Write `arisan_pool` Move module | 3-5 days | 1.2 | HIGH |
| 1.4 | Write `arisan_factory` Move module | 2-3 days | 1.3 | HIGH |
| 1.5 | Write `ai_yield_strategy` Move module | 2-3 days | 1.3 | HIGH |
| 1.6 | Write Move tests | 2-3 days | 1.3-1.5 | MEDIUM |
| 1.7 | Deploy to Sui testnet | 0.5 day | 1.3-1.6 | LOW |
| 1.8 | Verify contract interactions | 1 day | 1.7 | MEDIUM |

### Phase 2: Frontend Web3 Layer (Week 2-3)
**Goal:** Replace all EVM wallet/contract hooks with Sui equivalents

| Step | Task | Duration | Dependency | Risk |
|------|------|----------|------------|------|
| 2.1 | Install Sui SDK packages | 0.5 day | None | LOW |
| 2.2 | Rewrite `Web3Provider.tsx` | 1 day | 2.1 | MEDIUM |
| 2.3 | Rewrite `contracts.ts` config | 0.5 day | 1.7 | LOW |
| 2.4 | Replace `abis.ts` with Move bindings | 0.5 day | 1.7 | LOW |
| 2.5 | Rewrite all hooks in `useContracts.ts` | 2-3 days | 2.2-2.4 | HIGH |
| 2.6 | Rewrite `ConnectWallet.tsx` | 1 day | 2.2 | MEDIUM |
| 2.7 | Rewrite `USDCFaucet.tsx` | 1 day | 2.5 | MEDIUM |
| 2.8 | Adapt `TestnetInfo.tsx` | 0.5 day | 2.2 | LOW |
| 2.9 | Adapt/replace `MantleGasSavings.tsx` | 0.5 day | 2.2 | LOW |

### Phase 3: Frontend Pages (Week 3)
**Goal:** Update all pages to use new Sui hooks

| Step | Task | Duration | Dependency | Risk |
|------|------|----------|------------|------|
| 3.1 | Update `pools/page.tsx` | 0.5 day | 2.5 | LOW |
| 3.2 | Update `pools/[address]/page.tsx` | 0.5 day | 2.5 | LOW |
| 3.3 | Update `ai/page.tsx` | 0.5 day | 2.5 | LOW |
| 3.4 | Update leaderboard page | 0.5 day | 2.5 | LOW |
| 3.5 | Update FAQ and demo pages | 0.5 day | 2.5 | LOW |

### Phase 4: AI Optimizer Adaptation (Week 3-4)
**Goal:** Switch yield data to Sui ecosystem

| Step | Task | Duration | Dependency | Risk |
|------|------|----------|------------|------|
| 4.1 | Update `ai-optimizer.ts` for Sui protocols | 1-2 days | None | MEDIUM |
| 4.2 | Update API routes for Sui chain | 0.5 day | 4.1 | LOW |
| 4.3 | Test DeFiLlama Sui data | 0.5 day | 4.1 | LOW |

### Phase 5: Polish & Testing (Week 4)
**Goal:** Full integration testing and polish

| Step | Task | Duration | Dependency | Risk |
|------|------|----------|------------|------|
| 5.1 | End-to-end testing | 2 days | All above | MEDIUM |
| 5.2 | Update all text/branding | 0.5 day | None | LOW |
| 5.3 | Update documentation | 1 day | 5.1 | LOW |
| 5.4 | Deploy to Vercel | 0.5 day | 5.1 | LOW |

---

## Safe Migration Sequence

The migration MUST follow this order due to dependencies:

```
1. Smart Contracts (Move)           ← MUST be first
   ↓
2. Deploy to Sui testnet             ← Get contract addresses
   ↓
3. Web3Provider + Config             ← Setup Sui SDK
   ↓
4. Contract Hooks                    ← Core interaction layer
   ↓
5. Wallet + Faucet Components        ← User-facing Web3
   ↓
6. Page Components                   ← UI adaptation
   ↓
7. AI Optimizer                      ← Backend adaptation
   ↓
8. Testing & Polish                  ← Final validation
```

---

## Rollback Considerations

| Scenario | Rollback Plan |
|----------|---------------|
| Move contracts have bugs | Keep Solidity contracts deployed on Mantle, fix Move |
| Sui SDK missing features | Feature flag to switch between EVM/Sui providers |
| Frontend breaks | Git branch strategy — keep `main` on Mantle, merge Sui when stable |
| DeFiLlama no Sui data | Use fallback simulated data (already implemented) |

**Recommended Git Strategy:**
```
main (Mantle - stable)
  └── sui-migration (development)
        └── sui/contracts (Move contracts)
        └── sui/frontend (Sui frontend)
```

---

## Key Architecture Decisions for Migration

### 1. Object Model Mapping

| EVM Concept | Sui Equivalent | Notes |
|-------------|---------------|-------|
| Contract state (global) | **Shared Object** | Pool state, factory state |
| ERC20 token balance | **Owned Coin Object** | USDC coins owned by user |
| ERC20 approve/allowance | **Not needed** | Sui uses object transfer, no approve pattern |
| `mapping(address => ...)` | **Table** or in-object field | For participant data |
| Factory-created contracts | **Shared Objects** created dynamically | Each pool is a shared object |
| `msg.sender` check | **TxContext::sender()** | Sender verification |
| `onlyOwner` modifier | **AdminCap** capability object | Transferable capability |

### 2. Token Handling

**EVM Pattern (approve + transferFrom):**
```
User: usdc.approve(pool, amount)
User: pool.joinPool() → pool calls usdc.transferFrom(user, pool, amount)
```

**Sui Pattern (Coin objects in PTB):**
```
User: [PTB]
  1. Split Coin<USDC> from user's coins
  2. Call arisan_pool::join_pool(Coin<USDC>, pool_obj)
  // Coin is transferred as function argument
```

**This eliminates the entire approve/allowance flow!**

### 3. Random Winner Selection

| EVM | Sui |
|-----|-----|
| `keccak256(block.timestamp, block.prevrandao)` | Need external randomness source |
| Chainlink VRF (production) | Sui doesn't have native VRF yet |

**Options:**
1. Use a commit-reveal scheme
2. Use third-party randomness oracle
3. For hackathon: use block hash + timestamp (not secure, but works)
4. Use Sui's future randomness feature if available

### 4. Event Architecture

| EVM | Sui |
|-----|-----|
| `event ParticipantJoined(address, uint256)` | `sui::event::emit(ParticipantJoined { participant, collateral })` |
| Indexed events for filtering | Module events, filterable by package |
| The Graph / subgraph indexing | Sui RPC event queries |

---

## NPM Package Changes

### Remove:
```json
{
  "wagmi": "^2.12.0",
  "viem": "^2.21.0"
}
```

### Add:
```json
{
  "@mysten/sui.js": "^0.x",
  "@mysten/dapp-kit": "^0.x",
  "@mysten/wallet-kit": "^0.x"
}
```

### Keep:
```json
{
  "next": "16.1.1",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "@tanstack/react-query": "^5.59.0",
  "tailwindcss": "^4"
}
```

---

## Estimated Migration Difficulty

| Component | Difficulty | Time | Notes |
|-----------|-----------|------|-------|
| Move Contracts | 🔴 HIGH | 7-11 days | Complete rewrite, different paradigm |
| Web3 Provider | 🟠 MEDIUM | 1 day | Straightforward SDK swap |
| Contract Hooks | 🔴 HIGH | 2-3 days | Every hook rewrites, new patterns |
| Wallet Component | 🟠 MEDIUM | 1 day | Different wallet ecosystem |
| Pages | 🟢 LOW | 2-3 days | Mostly import changes |
| AI Optimizer | 🟠 MEDIUM | 1-2 days | Protocol list changes |
| Config/ABIs | 🟢 LOW | 1 day | Address/ABI replacement |
| Testing | 🟠 MEDIUM | 2-3 days | Full integration test needed |
| **TOTAL** | | **15-25 days** | |
