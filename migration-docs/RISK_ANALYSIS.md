# RISK_ANALYSIS.md

## Migration Risk Assessment: Mantle/EVM → Sui

---

## Risk Summary Table

| # | Risk | Severity | Probability | Impact | Mitigation |
|---|------|----------|-------------|--------|------------|
| 1 | Move contract paradigm mismatch | 🔴 CRITICAL | HIGH | Total rewrite needed | Invest in Move learning, prototype early |
| 2 | Object model conceptual gap | 🔴 CRITICAL | MEDIUM | Design errors | Study Sui object patterns before coding |
| 3 | Token handling differences | 🔴 CRITICAL | MEDIUM | Breaks core flow | Prototype Coin transfer in Move first |
| 4 | No approve pattern in Sui | 🟠 HIGH | CERTAIN | Eliminates 2-step flow | Update all frontend flows |
| 5 | Random number generation | 🟠 HIGH | HIGH | Security vulnerability | Use hackathon-safe approach, flag for production |
| 6 | Sui SDK maturity | 🟠 HIGH | MEDIUM | Missing features | Check SDK docs, have fallbacks |
| 7 | DeFiLlama Sui coverage | 🟡 MEDIUM | MEDIUM | Less protocol data | Implement robust fallback data |
| 8 | Storage costs on Sui | 🟡 MEDIUM | LOW | Higher costs for large pools | Optimize object structure |
| 9 | Wallet ecosystem differences | 🟡 MEDIUM | LOW | User experience changes | Support multiple Sui wallets |
| 10 | Event query differences | 🟢 LOW | MEDIUM | Indexing needs rewrite | Use Sui RPC event queries |

---

## CRITICAL Risks (Detailed)

### Risk #1: Move Contract Paradigm Mismatch

**Severity:** 🔴 CRITICAL
**Probability:** HIGH
**Impact:** Complete smart contract rewrite from scratch

**Why this is critical:**
Move is fundamentally different from Solidity in:
- **Object-centric vs Account-centric:** Move organizes state as objects, not contract storage
- **Resource-oriented:** Move has linear types — resources can't be duplicated or accidentally destroyed
- **Module system:** Move uses modules, not contracts with inheritance
- **No mapping:** Must use `Table` or `vector` for collections
- **Entry functions vs external calls:** Different calling conventions
- **Capability pattern:** Access control through owned objects, not modifiers

**Mitigation:**
1. Complete Sui Move tutorial before starting
2. Study existing Sui DeFi projects (Scallop, NAVI) for patterns
3. Prototype a minimal pool in Move first
4. Get code review from someone experienced with Move

---

### Risk #2: Object Model Design Errors

**Severity:** 🔴 CRITICAL
**Probability:** MEDIUM
**Impact:** Wrong object design = poor performance, high gas, or inability to implement features

**Key design decisions:**
1. **Pool as shared object vs. owned + dynamic fields?**
   - Shared object = anyone can access, but needs consensus
   - Owned = only owner can mutate, but limits participant actions
2. **Table vs vector for participant mapping?**
   - Table = O(1) lookups, per-entry storage cost
   - vector = cheaper for small datasets, linear search
3. **Balance vs Coin in shared objects?**
   - Balance = can hold mixed amounts in shared object
   - Coin = individual objects, harder to manage in shared context
4. **How to handle yield strategy reference?**
   - Direct module call vs. object reference

**Mitigation:**
1. Design object model on paper before coding
2. Benchmark with different approaches
3. Consider using `sui::balance::Balance` for all fund storage in shared objects

---

### Risk #3: Token Handling Differences

**Severity:** 🔴 CRITICAL
**Probability:** MEDIUM
**Impact:** Core token flow (collateral, deposits, payouts) won't work

**The Problem:**
The entire EVM token flow is based on `approve + transferFrom`:
```
User → approve(pool, amount) → pool.joinPool() → pool.transferFrom(user, amount)
```

In Sui, tokens are **first-class objects**. The flow becomes:
```
User splits Coin → passes Coin to pool function → Coin is deposited into pool's Balance
```

**This eliminates:**
- All `approve` logic in hooks
- All `allowance` checks
- Two-step transaction UX
- `MockUSDC.approve()` and `MockUSDC.allowance`

**But requires:**
- Understanding `sui::coin` module
- Proper Coin splitting in PTBs
- Balance management in shared objects

**Mitigation:**
1. Prototype Coin transfer flow early
2. Test with Sui CLI before frontend integration
3. Use `sui::balance` for internal fund management

---

## HIGH Risks (Detailed)

### Risk #4: No Approve Pattern — Flow Restructure

**Severity:** 🟠 HIGH
**Probability:** CERTAIN
**Impact:** All pool join/deposit flows must be restructured

**Affected Code:**
- `pools/page.tsx` — Join flow with approve step
- `pools/[address]/page.tsx` — Join and deposit flows
- `useContracts.ts` — `useApproveUSDC`, `useUSDCAllowance` hooks (DELETE these)
- `USDCFaucet.tsx` — Mint flow

**Mitigation:** This is actually an improvement — single-transaction UX is better for users.

---

### Risk #5: Random Number Generation

**Severity:** 🟠 HIGH
**Probability:** HIGH
**Impact:** Winner selection could be manipulated

**Current EVM approach:**
```solidity
uint256 randomIndex = uint256(
    keccak256(abi.encodePacked(block.timestamp, block.prevrandao, currentCycle))
) % eligible.length;
```

**Sui challenges:**
- Sui doesn't expose block-level randomness
- `tx_context::digest()` is deterministic per transaction
- No native VRF equivalent yet

**Hackathon solution:**
```move
// Use validator signature + epoch as entropy (still not secure)
fun pseudo_random(ctx: &TxContext, clock: &Clock): u64 {
    let ts = clock.timestamp_ms();
    let digest = tx_context::digest(ctx);
    // Combine multiple entropy sources
    hash::hash_value((&ts, digest))
}
```

**Production solution needed:**
- Third-party randomness oracle
- Commit-reveal scheme
- Wait for native Sui randomness

---

### Risk #6: Sui SDK Maturity

**Severity:** 🟠 HIGH
**Probability:** MEDIUM
**Impact:** May encounter SDK bugs or missing features

**Known concerns:**
- `@mysten/dapp-kit` is newer than wagmi, fewer community examples
- Documentation may be less comprehensive
- Some edge cases in Programmable Transaction Blocks
- React 19 compatibility (need to verify)

**Mitigation:**
1. Check latest SDK versions and changelog
2. Test basic flows early
3. Use official Sui templates as reference
4. Join Sui Discord for support

---

## MEDIUM Risks (Detailed)

### Risk #7: DeFiLlama Sui Coverage

**Severity:** 🟡 MEDIUM
**Probability:** MEDIUM
**Impact:** Less real yield data available

DeFiLlama may have fewer Sui protocols listed compared to Mantle. Check:
- https://defillama.com/chain/Sui
- Current Sui protocol count and data quality

**Mitigation:** Fallback simulated data already exists in `ai-optimizer.ts`.

---

### Risk #8: Storage Costs

**Severity:** 🟡 MEDIUM
**Probability:** LOW
**Impact:** Higher costs for pool creation and large pools

Sui charges for storage. A pool with 20 participants + all state could be expensive.

**Estimates:**
- Pool object: ~2-8 SUI depending on participant count
- Factory: ~1-2 SUI
- Strategy + Vaults: ~1-2 SUI each

**Mitigation:** Storage is refundable. Optimize by using `vector` instead of `Table` for small datasets.

---

## Hidden Coupling Risks

### 1. Hardcoded Chain ID

```typescript
// useContracts.ts — Line 11
const CHAIN_ID = mantleSepoliaTestnet.id; // 5003
```

This is used in EVERY hook. Must be changed to Sui network check.

### 2. `formatUnits` / `parseUnits` with 6 decimals

```typescript
formatUnits(data, 6)  // USDC has 6 decimals on EVM
parseUnits(amount.toString(), 6)
```

Sui USDC may have different decimals. Check: Sui native USDC uses **6 decimals** ✅

### 3. Address Comparison

```typescript
addr.toLowerCase() === address?.toLowerCase()
```

Sui addresses are already lowercase. This should work, but verify.

### 4. Explorer Links

```typescript
href={`https://sepolia.mantlescan.xyz/address/${poolAddress}`}
```

All Mantlescan links must change to Suiscan or SuiExplorer.

### 5. "Mantle" in Translation Strings

~15+ translation keys reference "Mantle" or "MNT". All must change to "Sui" / "SUI".

---

## Overall Risk Assessment

```
                    PROBABILITY
            LOW         MEDIUM         HIGH
        ┌───────────┬───────────┬───────────┐
  HIGH  │   #8      │  #6, #7   │  #4, #5   │
IMPACT  ├───────────┼───────────┼───────────┤
 MEDIUM │   #10     │           │           │
        ├───────────┼───────────┼───────────┤
  LOW   │           │   #9      │           │
        └───────────┴───────────┴───────────┘

                CRITICAL RISKS:
                #1, #2, #3 (off-chart — require complete redesign)
```

**Recommended Priority:**
1. **First:** Prototype Move contracts (#1, #2, #3) — these are the biggest unknowns
2. **Second:** Setup Sui SDK and test wallet integration (#6)
3. **Third:** Migrate hooks and pages (#4, #5)
4. **Fourth:** Polish and optimize (#7, #8, #9, #10)
