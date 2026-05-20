# 🔍 SMART CONTRACT AUDIT REPORT — Archa (Mantle/EVM → Sui Migration)

> **Auditor Role:** Senior Smart Contract Engineer  
> **Date:** 2026-05-19  
> **Scope:** Full Solidity codebase audit + Migration docs accuracy check  
> **Purpose:** Identify bugs, logic errors, missing edge cases, and docs inaccuracies BEFORE Move rewrite

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Contracts Audited | 10 (4 core + 5 vaults + 1 mock) |
| Critical Bugs | 3 |
| High Bugs | 4 |
| Medium Bugs | 5 |
| Low Issues | 4 |
| Documentation Errors | 7 |
| Migration Doc Gaps | 5 |

**Overall Verdict:** Code berfungsi untuk hackathon demo, tapi punya beberapa bug serius yang HARUS diperbaiki saat rewrite ke Move. Documentation ada beberapa ketidaksesuaian dengan code asli.

---

## 🔴 CRITICAL BUGS

### C1: selectWinner() — Payout Calculation Can Exceed Available Funds

**File:** `ArisanPool.sol:220-222`

```solidity
uint256 cycleDeposits = config.depositAmount * config.maxParticipants;
uint256 yieldBonus = getCurrentYield() / config.maxParticipants;
uint256 totalPayout = cycleDeposits + yieldBonus;
```

**Masalah:**
- `cycleDeposits` dihitung berdasarkan `maxParticipants`, BUKAN jumlah peserta yang aktif
- Kalau ada peserta yang di-kick (collateral habis), `totalPoolFunds` bisa kurang dari `cycleDeposits`
- `yieldBonus` pakai total yield ÷ maxParticipants, tapi yield dihitung dari totalCollateral + totalPoolFunds yang bisa sudah berubah karena slashing
- **Result:** Bisa attempt `usdc.transfer(winner, totalPayout)` dengan amount lebih besar dari balance contract → **REVERT** → pool stuck, tidak bisa select winner

**Reproduce Scenario:**
1. Pool 5 orang, 10 USDC/bulan
2. Person C tidak deposit di cycle ini (missed payment, belum di-slash)
3. Cycle complete → `cycleDeposits = 10 * 5 = 50 USDC`
4. Tapi hanya 4 orang yang deposit → hanya 40 USDC di yield strategy
5. `yieldStrategy.withdraw(50)` → REVERT karena strategy hanya punya ~40 USDC
6. ATAU kalau withdraw berhasil dari vault (saldonya ada dari collateral peserta lain), `usdc.transfer(winner, 50+yield)` bisa berhasil tapi menguras dana milik peserta lain → **UNFAIR payout**

**Fix untuk Move:**
```move
// Hitung berdasarkan peserta aktif yang deposit, bukan maxParticipants
let cycle_deposits = deposit_amount * active_depositors_this_cycle;
let yield_bonus = current_yield / active_depositors_this_cycle;
let total_payout = cycle_deposits + yield_bonus;
assert!(total_payout <= pool_balance, E_INSUFFICIENT_FUNDS);
```

---

### C2: withdraw() di AIYieldStrategy — Owner Can Drain Without Shares

**File:** `AIYieldStrategy.sol:111`

```solidity
require(shares[msg.sender] >= shareAmount || msg.sender == owner, "Insufficient shares");
```

**Masalah:**
- Owner bisa withdraw **berapapun jumlahnya** tanpa punya shares
- `shares[msg.sender] -= shareAmount` hanya dijalankan jika `shares >= shareAmount` (line 116-118)
- Tapi `totalShares -= shareAmount` SELALU dijalankan (line 119)
- **Result:** Owner bisa drain dana tanpa punya shares. Di Solidity 0.8, kalau owner withdraw lebih dari `totalShares`, akan **REVERT** (underflow protection). Tapi kalau withdraw <= totalShares, logic tetap salah: `totalShares` berkurang tanpa `shares[owner]` berkurang → share value untuk depositor lain menjadi inaccurate

**Fix untuk Move:**
```move
// Hapus special case untuk owner
assert!(shares[sender] >= share_amount, E_INSUFFICIENT_SHARES);
shares[sender] -= share_amount;
total_shares -= share_amount;
```

---

### C3: _endPool() — Sequential Withdraw Can Fail Mid-Loop

**File:** `ArisanPool.sol:401-431`

```solidity
for (uint256 i = 0; i < participantList.length; i++) {
    // ...
    if (address(yieldStrategy) != address(0)) {
        yieldStrategy.withdraw(returnAmount);  // ← BISA GAGAL
    }
    usdc.transfer(participant, returnAmount);  // ← BISA GAGAL
}
```

**Masalah:**
- `_endPool()` dipanggil di dalam `selectWinner()` (line 240)
- Di setiap loop iteration, memanggil `yieldStrategy.withdraw(returnAmount)` (line 417) dan `usdc.transfer()` (line 420)
- Pool memang punya shares di strategy (karena pool yang deposit di `startPool()` dan `makeDeposit()`), jadi withdraw dari pool address valid
- **TAPI:** Kalau `yieldStrategy.withdraw()` gagal di participant ke-3 (misalnya vault sudah di-withdraw habis oleh participant 1-2), maka participant 1-2 SUDAH dapat dana, tapi 3-5 TIDAK
- Pool state: `isPoolActive = false` TAPI participant 3-5 tidak dapat collateral balik
- **Tidak ada partial withdrawal handling**
- **Result:** Dana participant tersisa ter-lock di pool/strategy selamanya
- NOTE: `usdc.transfer()` juga bisa gagal kalau pool balance habis (semua USDC sudah di strategy), tapi ini less likely karena strategy withdraw di line 417 harusnya return cukup

**Fix untuk Move:**
```move
// Option A: Withdraw semua dari strategy DULU, baru distribute
let total_to_return = /* calculate total */;
let funds = strategy.withdraw(total_to_return);
// Kemudian distribute dari balance yang sudah di-withdraw
for participant in participant_list {
    let amount = participant.collateral + yield_per_participant;
    coin::transfer(&mut funds, participant, amount);
}
// Handle sisa (rounding errors) kembali ke pool

// Option B: Gunakan try/catch pattern di Move (abort per participant)
// Tapi Move tidak punya try/catch — jadi MUST use Option A
```

---

## 🟠 HIGH BUGS

### H1: hasDepositedThisCycle() — Broken Logic After Missed Payment

**File:** `ArisanPool.sol:359-362`

```solidity
function hasDepositedThisCycle(address participant) public view returns (bool) {
    uint256 expectedDeposits = currentCycle * config.depositAmount;
    return participants[participant].totalDeposited >= expectedDeposits;
}
```

**Masalah:**
- Kalau participant miss cycle 1, di cycle 2 mereka deposit, `totalDeposited` naik
- Tapi `expectedDeposits = 2 * depositAmount`, jadi `totalDeposited` masih kurang
- **Participant yang pernah miss TIDAK PERNAH bisa deposit lagi** di cycle manapun
- Karena `expectedDeposits` terus naik setiap cycle, tapi participant selalu tertinggal 1 cycle

**Reproduce:**
1. Pool: 10 USDC/bulan, 5 peserta
2. Cycle 1: `expectedDeposits = 1 * 10 = 10`. Participant deposits → `totalDeposited = 10` ✅
3. Cycle 2: `expectedDeposits = 2 * 10 = 20`. Participant MISSED cycle 2 → `totalDeposited` tetap 10 → `10 >= 20` = FALSE ❌
4. Owner calls `slashCollateral()` → `collateralAmount` berkurang, TAPI `totalDeposited` TIDAK berubah (tetap 10)
5. Cycle 3: `expectedDeposits = 3 * 10 = 30`. Participant deposits 10 → `totalDeposited = 20` → `20 >= 30` = FALSE ❌
6. Cycle 4: `expectedDeposits = 4 * 10 = 40`. Participant deposits 10 → `totalDeposited = 30` → `30 >= 40` = FALSE ❌
7. **Participant TIDAK PERNAH bisa mengejar** — selalu tertinggal 1 cycle × depositAmount
8. NOTE: `slashCollateral()` mengurangi `collateralAmount` tapi TIDAK mengurangi `totalDeposited` — ini bukan penyebab lockout, tapi menambah masalah karena collateral habis lebih cepat

**Fix untuk Move:**
```move
// Track deposits PER CYCLE, bukan cumulative
// Gunakan Table<address, u64> cycle_deposits atau vector
// Atau: simpan last_deposit_cycle, check cycle == current_cycle
let last_deposit_cycle = participant.last_deposit_cycle;
has_deposited = last_deposit_cycle == current_cycle;
```

---

### H2: getCurrentYield() — Double-Counting Risk

**File:** `ArisanPool.sol:330-335`

```solidity
function getCurrentYield() public view returns (uint256) {
    uint256 totalValue = yieldStrategy.getTotalValue();
    uint256 principal = getTotalCollateral() + totalPoolFunds;
    return totalValue > principal ? totalValue - principal : 0;
}
```

**Masalah:**
- `getTotalValue()` dari AIYieldStrategy sudah termasuk simulated yield (line 277-281)
- `principal = getTotalCollateral() + totalPoolFunds`
- Tapi `totalPoolFunds` juga sudah termasuk slashed collateral (line 258: `totalPoolFunds += slashAmount`)
- **Slashed collateral dihitung sebagai "principal"** → yield calculation understated
- Tidak kritis, tapi yield reporting tidak akurat

---

### H3: MockUSDC.mint() — No Access Control

**File:** `MockUSDC.sol:70-72`

```solidity
function mint(address to, uint256 amount) external {
    _mint(to, amount);
}
```

**Masalah:**
- **SIAPAPUN** bisa mint unlimited USDC
- Ini OK untuk testing, tapi di frontend `USDCFaucet.tsx` memanggil `mint()` langsung
- Untuk Sui: harusnya faucet function punya capability guard atau test-only marker

**Catatan:** Ini sengaja untuk hackathon, tapi **DOKUMENTASI HARUS MENCATAT** bahwa ini bukan production-ready

---

### H4: Factory — No Duplicate Pool Prevention

**File:** `ArisanFactory.sol:67-78` dan `83-93`

**Masalah:**
- User bisa create unlimited pools dari template yang sama
- Tidak ada limit berapa pool per user
- Tidak ada check apakah user sudah punya pool yang sama
- Bisa spam pool creation → gas waste + clutter

**Fix untuk Move:** Tambah limit per-user pool creation

---

## 🟡 MEDIUM BUGS

### M1: BaseVault.simulateYield() — Yield Propagation Is Indirect

**File:** `BaseVault.sol:106-111`

```solidity
function simulateYield() external onlyOwner {
    uint256 yieldAmount = (totalAssetAmount * apy) / 10000 / 12;
    totalAssetAmount += yieldAmount;
}
```

**Masalah:**
- `simulateYield()` menambah `totalAssetAmount` di vault
- `AIYieldStrategy.getTotalValue()` (line 270) menghitung: `(vaultShares * vaultTotalAssets) / vaultTotalShares`
- Jadi yield dari vault **MEMANG propagate** ke strategy melalui share value → **audit sebelumnya salah tentang ini**
- **TAPI:** Ada juga **double simulated yield** — strategy sendiri menghitung yield tambahan di line 277-279: `(totalDeposits * simulatedAPY * timeElapsed) / (yearInSeconds * 10000)`
- Artinya total yield = vault yield + strategy yield → **overstated** untuk demo purposes
- **Must call `simulateYield()` manually** pada vault — tidak ada auto-yield

---

### M2: AIYieldStrategy.deposit() — Shares Calculation Can Be Zero

**File:** `AIYieldStrategy.sol:84-87`

```solidity
uint256 sharesToMint = amount;
if (totalShares > 0 && totalDeposits > 0) {
    sharesToMint = (amount * totalShares) / totalDeposits;
}
```

**Masalah:**
- Kalau `amount` sangat kecil dibanding `totalDeposits`, `sharesToMint` bisa = 0
- User deposit tapi dapat 0 shares → dana masuk tapi tidak bisa withdraw
- **Dust deposit problem**

**Fix:** Add minimum deposit amount check

---

### M3: selectWinner() — Random Is Predictable

**File:** `ArisanPool.sol:213-215`

```solidity
uint256 randomIndex = uint256(
    keccak256(abi.encodePacked(block.timestamp, block.prevrandao, currentCycle))
) % eligible.length;
```

**Masalah:**
- `block.timestamp` dan `block.prevrandao` diketahui oleh validator
- Owner (yang call `selectWinner()`) bisa manipulate timing untuk influence result
- `currentCycle` bukan entropy — itu constant
- **Owner bisa consistently pick winner yang diinginkan**

**Fix untuk Move:**
```move
// Untuk hackathon: pakai tx_context::digest() — masih predictable tapi acceptable
// Untuk production: perlu external randomness oracle
// Sui tidak punya native VRF, jadi commit-reveal scheme adalah opsi terbaik
```

---

### M4: Collateral Not Deposited to Yield Strategy for Inactive Participants

**File:** `ArisanPool.sol:168-172` dan `slashCollateral()` line 258

**Masalah:**
- `startPool()` deposits SEMUA collateral ke yield strategy (line 170-171)
- `slashCollateral()` mengurangi `collateralAmount` di struct dan menambah `totalPoolFunds`
- Tapi slashed amount TIDAK di-deposit ke yield strategy
- **Slashed funds idle di pool contract**, tidak generate yield

---

### M5: Event Emission Inconsistency

**Masalah:**
- `ArisanPool.sol` emit `DepositMade` (line 199) tapi tidak emit event saat deposit masuk ke yield strategy
- `AIYieldStrategy.sol` emit `Deposited` dan `FundsRoutedToVault` — tapi dari perspective pool, tidak ada traceability
- Tidak ada event untuk `getPoolInfo()` view call (OK, view functions shouldn't emit)
- **Missing events:** collateral returned per participant di `_endPool` (hanya emit `CollateralReturned` tapi participant yang inactive tidak dapat apa-apa — tidak ada event untuk ini)

---

## 🟢 LOW ISSUES

### L1: Gas Inefficiency in Loops

- `getTotalCollateral()` — loop semua participant (O(n))
- `getEligibleWinners()` — double loop (O(2n))
- `_endPool()` — loop + withdraw per participant (O(n) external calls)
- **Move concern:** Sui juga charge gas per operation, loops di shared objects bisa mahal

### L2: No Emergency Pause Mechanism

- Tidak ada `pause()` / `unpause()` function
- Kalau ada bug di production, tidak bisa stop pool
- **Standard practice:** OpenZeppelin Pausable

### L3: No Reentrancy Guards

- `ArisanPool` menggunakan `transfer` (not `call`) — relatively safe
- `AIYieldStrategy` juga pakai `transfer` — safe
- Tapi best practice tetap pakai ReentrancyGuard
- **Move note:** Sui's execution model inherently prevents reentrancy on shared objects

### L4: Magic Numbers

- `125` collateral multiplier (hardcoded di Factory line 177)
- `10000` basis points divisor
- `365 days` in AIYieldStrategy
- **Move note:** Define sebagai constants

---

## 📋 DOKUMENTASI ERRORS (Migration Docs vs Actual Code)

### D1: CONTEXT_FOR_NEW_AI.md — Missing `yieldStrategy` in Pool Relationship

**Dokumen bilang:**
```
ArisanFactory → creates → ArisanPool (per pool)
    ↓                        ↓
AIYieldStrategy ← deposit dari pool
```

**Code aktual:** 
- Factory TIDAK set yieldStrategy pada pool yang dibuat (Factory line 172-193)
- Pool hanya punya `yieldStrategy` yang di-set default = address(0)
- `updateYieldStrategy()` harus dipanggil manual OLEH pool owner SETELAH pool dibuat
- **Diagram harus menunjukkan bahwa yieldStrategy connection adalah manual/optional**

---

### D2: IMPLEMENTATION_TODO.md — Missing `updateYieldStrategy()` in Pool Module

**Dokumen:** Tidak mention `updateYieldStrategy()` function di checklist ArisanPool module

**Code aktual:** `ArisanPool.sol:274-297` — fungsi ini exist dan penting untuk connect pool ke yield strategy

---

### D3: SMART_CONTRACT_MIGRATION.md — Wrong Pool Object Design

**Dokumen:**
```
collateral: Balance (CoinStore)
pool_funds: Balance (CoinStore)
```

**Problem:** Dokumen menyebut 2 Balance terpisah. Tapi di code aktual:
- Pool hanya punya `totalPoolFunds` (uint256 counter)
- TIDAK ada pemisahan antara collateral balance dan pool funds balance di contract
- Collateral dan pool funds TERCAMPUR di yield strategy
- **Move design harus memutuskan:** apakah pisah 2 Balance atau gabung?

**Rekomendasi:** Pisah jadi `collateral_balance: Balance` dan `pool_funds_balance: Balance` di Move — ini lebih aman dan lebih clear

---

### D4: IMPLEMENTATION_TODO.md — Missing `setAIOptimizer()` and `transferOwnership()`

**Code aktual punya:**
- `ArisanPool.setAIOptimizer()` (line 302-305)
- `ArisanPool.transferOwnership()` (line 310-313)
- `ArisanFactory.setAIOptimizer()` (line 128-133)
- `AIYieldStrategy.setAIOptimizer()` (line 249-252)

**Dokumen:** Tidak ada satupun di checklist

---

### D5: BLOCKCHAIN_DEPENDENCY_AUDIT.md — Missing Vault Contract Dependencies

**Dokumen:** Tidak audit `BaseVault.sol`, `IVault.sol`, dan 5 vault contracts

**Code aktual:** 5 vault contracts masing-masing punya:
- `deposit()` / `withdraw()` — ERC20 transferFrom pattern
- `simulateYield()` — admin function
- Semua inherit dari `BaseVault` yang pakai `IERC20.transferFrom()`

**Impact:** Vault contracts juga perlu rewrite ke Move, tapi tidak tercatat di dependency audit

---

### D6: CONTEXT_FOR_NEW_AI.md — Wrong Vault Count

**Dokumen:** "10 contract" di tabel

**Aktual:** 12 files (ArisanPool, ArisanFactory, AIYieldStrategy, IERC20, IYieldStrategy, IVault, BaseVault, LendleVault, MerchantMoeVault, AgniVault, MinterestVault, KTXVault, MockUSDC) = **13 files** (10 contracts + 3 interfaces)

**Yang perlu rewrite ke Move:** 7 (ArisanPool, ArisanFactory, AIYieldStrategy, BaseVault + 5 vaults = 7. Interfaces jadi native Move types)
**Yang dihapus:** MockUSDC (diganti Sui Coin), IERC20 (native), IYieldStrategy (native Move), IVault (native Move module reference)

---

### D7: FRONTEND_MIGRATION.md — Missing Admin Functions (No Hooks, No UI)

**Dokumen:** Hook list tidak mention admin functions:
- `useStartPool()` — tidak ada hook, tidak ada di UI
- `useSelectWinner()` — tidak ada hook, tidak ada di UI
- `useSlashCollateral()` — tidak ada hook, tidak ada di UI
- `useUpdateYieldStrategy()` — tidak ada hook, tidak ada di UI

**Code aktual:**
- `useContracts.ts` — TIDAK punya hook untuk admin functions ini. Search: `grep "selectWinner\|slashCollateral\|startPool\|updateYieldStrategy" useContracts.ts` → 0 results
- Page components (`pools/page.tsx`, `pools/[address]/page.tsx`) — TIDAK memanggil admin functions sama sekali
- Admin functions HANYA bisa dipanggil langsung via Etherscan atau script — **tidak ada UI untuk ini**
- Untuk hackathon demo, ini di-hardcode di demo page sebagai text, bukan functional button

**Impact untuk Move migration:**
- **Hooks baru harus dibuat:** `useStartPool()`, `useSelectWinner()`, `useSlashCollateral()`, `useUpdateYieldStrategy()`
- **UI baru harus dibuat:** Admin panel atau tombol di pool detail untuk pool owner
- Ini adalah **scope tambahan** yang tidak tercatat di migration plan

---

## 📋 MIGRATION DOC GAPS

### G1: No Decision on Clock Passing

**Masalah:** Move requires passing `&Clock` as parameter for time-based logic. Dokumen mention ini di SMART_CONTRACT_MIGRATION.md tapi:
- Tidak spesifikkan fungsi mana yang butuh Clock
- Tidak mention bahwa Clock harus di-include di setiap PTB dari frontend

**Fungsi yang butuh Clock:**
- `join_pool()` — untuk `joinedAt` (opsional, bisa pakai `tx_context::epoch_timestamp_ms()`)
- `start_pool()` — untuk `poolStartTime`
- `make_deposit()` — untuk deposit timestamp
- `select_winner()` — untuk `isCycleComplete()` check
- `slash_collateral()` — untuk `hasMissedPayment()` check
- `has_deposited_this_cycle()` — tidak butuh Clock (bisa pakai counter)
- `is_cycle_complete()` — butuh Clock

**Frontend impact:** Setiap PTB yang manggil fungsi time-based harus include `tx.object(CLOCK_ID)`

---

### G2: No Decision on AdminCap Distribution

**Masalah:** Dokumen mention AdminCap tapi tidak jelaskan:
- Siapa yang dapat AdminCap saat deploy?
- Berapa banyak AdminCap? 1 per package atau 1 per module?
- Bagaimana AdminCap untuk pool yang dibuat via Factory?

**Design decision needed:**
```
Option A: 1 AdminCap for Factory + Strategy (deployer gets it)
          Pool functions use separate mechanism (owner check via TxContext)

Option B: AdminCap per module (Factory cap, Strategy cap, Pool cap per pool)
          More complex but more granular

RECOMMENDED: Option A — simpler for hackathon
- Factory AdminCap: for adding templates
- Strategy AdminCap: for registering vaults, switching protocols  
- Pool: use owner field + TxContext::sender() check (no AdminCap needed per pool)
```

---

### G3: No Decision on YieldStrategy Connection Pattern

**Masalah:** Di Solidity, pool punya `yieldStrategy` address yang bisa di-update. Di Move:

```
Option A: Pool menyimpan ID YieldStrategy shared object
          → Pool memanggil strategy functions via module reference
          → Perlu pass strategy object di PTB

Option B: YieldStrategy adalah hot potato / capability pattern
          → Pool menerima dan menyimpan YieldStrategy Ticket/Cap
          → Lebih Move-idiomatic tapi lebih complex

Option C: Pool tidak menyimpan strategy reference
          → Frontend selalu pass strategy object di PTB
          → Pool function accept strategy sebagai parameter
          → Paling flexible tapi UX lebih complex (frontend must know strategy ID)

RECOMMENDED: Option A — closest to current Solidity pattern
```

---

### G4: Missing Participant Deposit Tracking Design for Move

**Masalah:** Bug H1 (hasDepositedThisCycle broken) perlu redesign di Move.

**Current broken approach:** Cumulative totalDeposited vs expectedDeposits
**Fix approach for Move:**
```move
// Option A: Per-cycle deposit tracking
struct Participant {
    // ... existing fields
    last_deposit_cycle: u64,      // Terakhir deposit di cycle berapa
    deposits_this_cycle: bool,    // Udah deposit cycle ini belum
}

// Di make_deposit():
participant.deposits_this_cycle = true;
participant.last_deposit_cycle = pool.current_cycle;

// Di select_winner() (saat advance cycle):
for participant in participant_list {
    if !participant.deposits_this_cycle {
        // Missed payment — slash
        slash_collateral_logic();
    }
    participant.deposits_this_cycle = false; // Reset untuk cycle berikutnya
}

// Di has_deposited_this_cycle():
return participant.deposits_this_cycle
```

---

### G5: No Sui USDC Type Decision

**Masalah:** Dokumen mention test USDC tapi tidak decide:

```
Option A: Buat custom test USDC coin type via create_currency
          → Package-specific, harus mint via faucet function
          → TIDAK compatible dengan Sui mainnet USDC

Option B: Gunakan existing Sui testnet USDC (jika ada)
          → Check: 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
          → More realistic, tapi perlu dapat dari faucet

Option C: Gunakan Sui native coin (SUI) sebagai stand-in
          → Tersedia gratis, tapi tidak realistis untuk USDC use case

RECOMMENDED: Option A untuk hackathon — full control, no external dependency
```

---

## ✅ ACTION ITEMS — Wajib Sebelum Mulai Move Rewrite

### Must Fix (Critical & High):
1. [ ] **C1:** Fix payout calculation — use active depositors count, not maxParticipants
2. [ ] **C2:** Remove owner bypass in withdraw — everyone needs shares
3. [ ] **C3:** Fix _endPool — withdraw all first, then distribute
4. [ ] **H1:** Redesign deposit tracking — per-cycle bool, not cumulative
5. [ ] **H3:** Add access control to MockUSDC.mint() (or document as test-only)

### Must Decide (Design Decisions):
6. [ ] **G1:** Which functions need Clock parameter? → List documented above
7. [ ] **G2:** AdminCap distribution strategy → Recommended: Option A
8. [ ] **G3:** YieldStrategy connection pattern → Recommended: Option A
9. [ ] **G4:** Deposit tracking redesign → Recommended: per-cycle bool
10. [ ] **G5:** USDC type for Sui → Recommended: Option A (custom test coin)

### Must Update (Documentation):
11. [ ] **D1:** Fix pool relationship diagram — yieldStrategy is optional/manual
12. [ ] **D2:** Add updateYieldStrategy() to implementation checklist
13. [ ] **D3:** Decide collateral vs pool funds Balance separation
14. [ ] **D4:** Add admin functions (setAIOptimizer, transferOwnership) to checklist
15. [ ] **D5:** Add vault contracts to dependency audit
16. [ ] **D6:** Fix contract count (7 need rewrite, not 10)
17. [ ] **D7:** Add admin hooks to frontend migration plan

---

## 📊 BUG SUMMARY BY CONTRACT

| Contract | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| ArisanPool.sol | C1, C3 | H1 | M3, M4, M5 | L1, L2 |
| AIYieldStrategy.sol | C2 | | M2 | |
| ArisanFactory.sol | | H4 | | |
| BaseVault.sol | | | M1 | |
| MockUSDC.sol | | H3 | | |
| Migration Docs | | | | D1-D7, G1-G5 |

---

## 🎯 PRIORITAS UNTUK MOVE REWRITE

Dari audit ini, saat rewrite ke Move, urutan prioritas:

1. **Desain ulang deposit tracking** (fix H1) — ini fundamental, tanpa ini pool tidak bisa berjalan
2. **Pisah collateral dan pool funds** (fix C3) — 2 Balance terpisah di shared object
3. **Withdraw-all-first pattern** (fix C3) — aman untuk _endPool
4. **Fix payout calculation** (fix C1) — pakai active depositors
5. **Remove owner bypass** (fix C2) — semua harus punya shares
6. **Tambahkan admin functions** (fix D4) — jangan lupa setAIOptimizer, transferOwnership

Kalau 6 ini di-fix di Move, contract akan jauh lebih robust dari versi Solidity-nya.
