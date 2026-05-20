# 🎯 EXECUTION STRATEGY — Cara Kerjanya

> **Goal:** Migrasi Archa dari Mantle (EVM) ke Sui, 1 phase per AI session
> **Root:** `/home/faiz/hackaton/sui/Archa`

---

## 📋 OVERVIEW — 6 Phase, 7 AI Sessions

```
Session 1 (AI 1): Phase 0 — Setup              → 30 menit
Session 2 (AI 2): Phase 1 — Smart Contracts     → 3-5 sesi (INI YANG TERBERAT)
Session 3 (AI 3): Phase 2 — Frontend Web3       → 1-2 sesi
Session 4 (AI 4): Phase 3 — Pages Update        → 1 sesi
Session 5 (AI 5): Phase 4+5 — AI Optimizer + Translations → 1 sesi (paralel)
Session 6 (AI 6): Phase 6 — Testing & Deploy    → 1 sesi
```

**TOTAL: ~7-11 AI sessions**

---

## 🔑 RULES SAAT GANTI AI

1. **SEBELUM tutup sesi AI lama:**
   - Bilang ke AI: "Update MIGRATION_MASTER_PLAN.md — ubah task yang sudah selesai dari ⬜ ke ✅"
   - Bilang ke AI: "Commit semua perubahan"
   - Tunggu commit selesai

2. **SAAT buka AI baru:**
   - Copy-paste prompt untuk phase yang sesuai (lihat di bawah)
   - AI baru akan baca context files sendiri

3. **FILE YANG SELALU DI-UPDATE:**
   - `sui/MIGRATION_MASTER_PLAN.md` — progress tracker (WAJIB update tiap selesai task)
   - `sui/contracts/DEPLOYMENT.md` — catat contract addresses setelah deploy (dibuat di Phase 1)

---

## 📦 PROMPT PER PHASE

### ═══════════════════════════════════════════
### SESSION 1: PHASE 0 — SETUP
### ═══════════════════════════════════════════

**COPY PASTE INI KE AI BARU:**

```
Kamu akan setup environment untuk migrasi Archa (Arisan On-Chain) dari Mantle/EVM ke Sui blockchain.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU:
1. sui/CONTEXT_FOR_NEW_AI.md — konteks lengkap project
2. sui/MIGRATION_MASTER_PLAN.md — cek status board, lihat Phase 0

TUGAS KAMU (Phase 0 — Setup):
1. Buat git branch `sui-migration` dari `main`
2. Install Sui CLI (cek apakah sudah ada: `sui --version`)
3. Setup Sui wallet lokal (`sui client`), connect ke testnet
4. Buat directory `sui/contracts/` dengan structure:
   - Move.toml (dependencies: Sui framework)
   - sources/ (empty, akan diisi Phase 1)
   - tests/ (empty)
5. Verify `sui move build` bisa compile empty project
6. Get testnet SUI dari faucet

SELESAI → update sui/MIGRATION_MASTER_PLAN.md (ubah ⬜ ke ✅ untuk Phase 0)
SELESAI → git commit semua perubahan
```

**Checkpoint sebelum pindah AI:**
- [ ] Branch `sui-migration` aktif
- [ ] `sui --version` works
- [ ] `sui client active-address` shows address
- [ ] `sui/contracts/Move.toml` exists
- [ ] `sui move build` compiles empty project
- [ ] Punya testnet SUI di wallet

---

### ═══════════════════════════════════════════
### SESSION 2: PHASE 1 — SMART CONTRACTS (BERAT)
### ═══════════════════════════════════════════

**⚠️ Ini phase terberat. Kemungkinan butuh 2-3 AI sessions.**
**Kamu bisa bagi jadi: Session 2A (Pool), Session 2B (Factory+Strategy+Vaults)**

**COPY PASTE INI KE AI BARU:**

```
Kamu akan menulis smart contracts Archa dalam Sui Move.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU (WAJIB — jangan skip):
1. sui/CONTEXT_FOR_NEW_AI.md — Section 2 (smart contracts) dan Section 6 (known bugs)
2. sui/AUDIT_REPORT.md — BUGS YANG HARUS DI-FIX DI MOVE:
   - C1: payout calc pakai active depositors, bukan maxParticipants
   - C2: hapus owner bypass di withdraw
   - C3: _endPool withdraw semua dulu baru distribute
   - H1: deposit tracking pakai per-cycle bool, bukan cumulative
3. sui/MIGRATION_MASTER_PLAN.md — cek Phase 1 checklist
4. sui/migration-docs/SMART_CONTRACT_MIGRATION.md — desain Move structs dan function signatures

DESIGN DECISIONS (sudah diputuskan):
- AdminCap: 1 untuk Factory + 1 untuk Strategy. Pool pakai owner field + TxContext::sender()
- Deposit tracking: per-cycle bool (has_deposited: bool) + reset saat cycle advance
- Balance: PISAH collateral_balance dan pool_funds_balance
- USDC: custom test coin via create_currency
- Clock: start_pool, select_winner, slash_collateral butuh &Clock parameter
- YieldStrategy: Pool stores strategy object ID (Option A)

TUGAS KAMU (Phase 1):
1. Buat test_usdc.move — define USDC coin type + mint_faucet function
2. Buat arisan_pool.move — CORE contract:
   - Structs: ArisanPool (shared object), Participant, PoolConfig
   - Functions: create_pool, join_pool, start_pool, make_deposit, select_winner, slash_collateral, _end_pool
   - View functions: get_pool_info, get_participant_count, has_deposited_this_cycle, is_cycle_complete
   - Admin: set_ai_optimizer, transfer_ownership
   - Events: ParticipantJoined, DepositMade, PayoutDistributed, CollateralSlashed, CollateralReturned, PoolStarted, PoolEnded
3. Buat arisan_factory.move:
   - Structs: ArisanFactory (shared object), PoolTemplate
   - Functions: create_factory, create_pool_from_template, create_custom_pool, add_template
   - Default templates: Small (10 USDC, 5 orang), Medium (50 USDC, 10 orang), Large (100 USDC, 20 orang)
4. Buat yield_strategy.move:
   - Deposit/withdraw dengan shares
   - switch_protocol, register_vault, simulate_yield
5. Buat protocol_vault.move:
   - Base vault: deposit, withdraw, simulate_yield
6. Tulis tests untuk semua module
7. `sui move build` — harus 0 errors
8. `sui move test` — semua pass

SELESAI → update sui/MIGRATION_MASTER_PLAN.md (ubah ⬜ ke ✅ untuk Phase 1)
SELESAI → git commit semua perubahan
```

**Kalau context limit tercapai, lanjutkan dengan prompt ini:**

```
Lanjutkan Phase 1 — Smart Contracts Move.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA: sui/MIGRATION_MASTER_PLAN.md — cek mana yang sudah ✅ di Phase 1, lanjutkan yang masih ⬜.

PERHATIAN: Bug fixes yang HARUS ada di Move code:
- C1: select_winner pakai active_depositors_count, bukan max_participants
- C2: withdraw hanya jika shares cukup, TANPA owner bypass
- C3: end_pool withdraw semua dari strategy DULU, baru distribute
- H1: per-cycle has_deposited bool, reset saat advance cycle

Lanjutkan dari mana kamu berhenti.
SELESAI → update MIGRATION_MASTER_PLAN.md + git commit
```

**Checkpoint sebelum pindah AI:**
- [ ] `sui move build` — 0 errors
- [ ] `sui move test` — all pass
- [ ] Semua 5 module ada di `sui/contracts/sources/`
- [ ] Bug fixes C1, C2, C3, H1 implemented

---

### ═══════════════════════════════════════════
### SESSION 2.5: PHASE 1.5 — DEPLOY KE TESTNET
### ═══════════════════════════════════════════

**COPY PASTE INI KE AI BARU:**

```
Kamu akan deploy Archa Move contracts ke Sui testnet.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU:
1. sui/MIGRATION_MASTER_PLAN.md — cek status Phase 1 harus sudah ✅
2. sui/CONTEXT_FOR_NEW_AI.md — Section 2 untuk contract structure

TUGAS KAMU:
1. Build: `sui move build` — pastikan 0 errors
2. Publish: `sui client publish --gas-budget 100000000`
3. CATAT SEMUA OUTPUT ke file baru `sui/contracts/DEPLOYMENT.md`:
   - PACKAGE_ID
   - Factory object ID + AdminCap ID
   - Strategy object ID + AdminCap ID  
   - Vault object IDs (semua)
   - USDC Type Tag
   - Test USDC TreasuryCap ID
4. Mint test USDC ke wallet kamu
5. Create sample pools via factory
6. Test: join pool, start pool, deposit, select winner
7. Verify semua di Suiscan

SELESAI → update MIGRATION_MASTER_PLAN.md
SELESAI → git commit (termasuk DEPLOYMENT.md)
```

**Checkpoint:**
- [ ] DEPLOYMENT.md created with all IDs
- [ ] Test USDC minted
- [ ] Sample pool created
- [ ] Basic flow tested (join → start → deposit → winner)

---

### ═══════════════════════════════════════════
### SESSION 3: PHASE 2 — FRONTEND WEB3 LAYER
### ═══════════════════════════════════════════

**COPY PASTE INI KE AI BARU:**

```
Kamu akan migrasi frontend Web3 layer dari EVM (wagmi/viem) ke Sui (@mysten/dapp-kit).

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU:
1. sui/CONTEXT_FOR_NEW_AI.md — Section 3 (frontend), Section 5 (architecture changes)
2. sui/MIGRATION_MASTER_PLAN.md — cek Phase 2 checklist
3. sui/migration-docs/FRONTEND_MIGRATION.md — code examples wagmi → dapp-kit
4. sui/contracts/DEPLOYMENT.md — contract addresses di Sui testnet

PACKAGE CHANGES:
- REMOVE: wagmi, viem
- ADD: @mysten/sui.js, @mysten/dapp-kit
- KEEP: @tanstack/react-query (compatible)

TUGAS KAMU (Phase 2):
1. Update package.json — remove wagmi+viem, add @mysten/sui.js + @mysten/dapp-kit
2. Rewrite src/providers/Web3Provider.tsx — SuiClientProvider dari dapp-kit
3. Rewrite src/config/contracts.ts — ganti EVM addresses dengan Sui object IDs dari DEPLOYMENT.md
4. Delete src/config/abis.ts — tidak perlu di Sui (pakai module references)
5. Buat src/hooks/useSuiContracts.ts — rewrite SEMUA hooks:
   - Read hooks: useAllPools, usePoolInfo, usePoolsInfo, useAllPoolsWithInfo, useUSDCBalance, useParticipantInfo, useParticipantList, useHasDepositedThisCycle, useCycleWinner, useLastWinner, useCurrentYield, useIsCycleComplete
   - Write hooks: useJoinPool (PTB), useCreatePool, useCreatePoolFromTemplate, useMakeDeposit (PTB)
   - NEW admin hooks: useStartPool, useSelectWinner, useSlashCollateral
   - DELETE: useUSDCAllowance, useApproveUSDC (tidak perlu di Sui)
6. Delete src/hooks/useContracts.ts (old EVM hooks)
7. Rewrite src/components/ConnectWallet.tsx — Sui wallet standard
8. Rewrite src/components/USDCFaucet.tsx — Move call buat mint
9. Adapt src/components/TestnetInfo.tsx — Sui network
10. Adapt src/components/MantleGasSavings.tsx → rename ke SuiGasSavings.tsx

IMPORTANT: 
- Join pool di Sui = 1 transaction (Coin object as argument), bukan 2 (approve+join)
- PTB (Programmable Transaction Blocks) untuk semua write operations
- Clock ID: 0x6 (Sui testnet & mainnet)

SELESAI → update MIGRATION_MASTER_PLAN.md + git commit
```

**Checkpoint:**
- [ ] `pnpm build` — no wagmi/viem import errors
- [ ] Wallet connects
- [ ] Can read pool data
- [ ] Can execute join_pool transaction

---

### ═══════════════════════════════════════════
### SESSION 4: PHASE 3 — PAGE COMPONENTS
### ═══════════════════════════════════════════

**COPY PASTE INI KE AI BARU:**

```
Kamu akan update semua page components untuk pakai Sui hooks baru.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU:
1. sui/MIGRATION_MASTER_PLAN.md — cek Phase 3 checklist
2. src/hooks/useSuiContracts.ts — hooks baru (sudah dibuat di Phase 2)

TUGAS KAMU (Phase 3):
1. Update src/app/pools/page.tsx:
   - Ganti import dari useContracts ke useSuiContracts
   - Hapus approve flow (1 tx join, bukan 2)
   - Update address type: 0x${string} → string
   - Update explorer links ke Suiscan
2. Update src/app/pools/[address]/page.tsx:
   - Sama seperti di atas
   - Tambah admin buttons: Start Pool, Select Winner (hanya visible untuk pool owner)
   - Hapus approve step dari join/deposit modals
3. Update src/app/ai/page.tsx:
   - Update vault addresses display
   - Update explorer links
   - Update protocol names (Sui protocols)
4. Update src/app/leaderboard/page.tsx — minimal changes
5. Update src/app/faq/page.tsx — text only
6. Update src/app/demo/page.tsx — text only
7. Update src/app/page.tsx (landing) — text only
8. Update ALL explorer links: mantlescan → suiscan

SELESAI → update MIGRATION_MASTER_PLAN.md + git commit
```

**Checkpoint:**
- [ ] All pages render without errors
- [ ] Pool explorer shows Sui testnet pools
- [ ] Join pool = single transaction
- [ ] Admin buttons visible for pool owner

---

### ═══════════════════════════════════════════
### SESSION 5: PHASE 4+5 — AI OPTIMIZER + TRANSLATIONS (PARALEL)
### ═══════════════════════════════════════════

**COPY PASTE INI KE AI BARU:**

```
Kamu akan update AI Optimizer dan Translations untuk Sui.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU:
1. sui/MIGRATION_MASTER_PLAN.md — cek Phase 4 dan Phase 5 checklist
2. sui/CONTEXT_FOR_NEW_AI.md — Section 3 (AI Optimizer info)
3. sui/contracts/DEPLOYMENT.md — vault object IDs

TUGAS KAMU:

PHASE 4 — AI Optimizer:
1. Update src/lib/ai-optimizer.ts:
   - Ganti chain filter: "mantle" → "sui"
   - Ganti VAULT_ADDRESSES: EVM addresses → Sui object IDs dari DEPLOYMENT.md
   - Ganti DEFILLAMA_PROJECT_MAPPING: Mantle protocols → Sui protocols (Scallop, NAVI, Aftermath, Cetus, Turbos)
   - Ganti FALLBACK_APY_RATES: Sui protocol APYs
   - Ganti PROTOCOL_RISK_SCORES: Sui protocol risk scores
   - Ganti formatProtocolName: Sui protocol names
   - Ganti "Mantle" → "Sui" di semua string
   - Ganti "Mantle Network" → "Sui Network" di reasoning strings
2. API routes TIDAK perlu diubah (mereka pakai ai-optimizer.ts)

PHASE 5 — Translations:
1. Update src/context/LanguageContext.tsx:
   - Replace "Mantle" → "Sui" di semua translation keys (~15 keys)
   - Replace "MNT" → "SUI"
   - Replace "Mantle Network" → "Sui Network"
   - Replace "Mantle Sepolia" → "Sui Testnet"
   - Replace Mantle faucet links → Sui faucet links
2. Update src/components/TestnetInfo.tsx (kalau belum) — Sui faucet link
3. Search & destroy: grep -r "Mantle" src/ → harus 0 results

SELESAI → update MIGRATION_MASTER_PLAN.md + git commit
```

**Checkpoint:**
- [ ] AI page shows Sui protocols
- [ ] DeFiLlama data fetches successfully
- [ ] `grep -r "Mantle" src/` returns 0 results
- [ ] `grep -r "MNT" src/` returns 0 relevant results

---

### ═══════════════════════════════════════════
### SESSION 6: PHASE 6 — TESTING & DEPLOY
### ═══════════════════════════════════════════

**COPY PASTE INI KE AI BARU:**

```
Kamu akan melakukan full integration testing dan deploy Archa ke Vercel.

PROJECT ROOT: /home/faiz/hackaton/sui/Archa

BACA DULU:
1. sui/MIGRATION_MASTER_PLAN.md — cek Phase 6 checklist
2. sui/CONTEXT_FOR_NEW_AI.md — Section 1 (user flow)

TUGAS KAMU:
1. Build: `pnpm build` — harus 0 errors
2. Test semua user flows di Sui testnet:
   a. Connect Sui wallet
   b. Mint test USDC via faucet
   c. Browse pools
   d. Join pool (1 transaction)
   e. Start pool (as owner)
   f. Make deposit
   g. Select winner (as owner)
   h. View pool detail
   i. AI optimizer page
   j. Leaderboard page
   k. FAQ page (EN + ID)
   l. Mobile responsive check
3. Fix semua bugs yang ditemukan
4. Clean up:
   - Remove console.log EVM-related
   - Clean unused imports
   - Verify no hardcoded Mantle/EVM references
5. Deploy ke Vercel

SELESAI → update MIGRATION_MASTER_PLAN.md (SEMUA harus ✅)
SELESAI → git commit + tag sebagai sui-migration-v1
```

**Checkpoint:**
- [ ] `pnpm build` — 0 errors
- [ ] All user flows work
- [ ] App deployed on Vercel
- [ ] Status board: semua ✅

---

## 🚨 TROUBLESHOOTING — Kalau AI Baru Bingung

### Kalau AI bilang "saya tidak bisa membaca file":
```
Kamu bisa baca file. Gunakan tool Read untuk membaca:
- Read file_path="/home/faiz/hackaton/sui/Archa/sui/CONTEXT_FOR_NEW_AI.md"
- Read file_path="/home/faiz/hackaton/sui/Archa/sui/MIGRATION_MASTER_PLAN.md"
```

### Kalau AI bilang "saya tidak familiar dengan Sui Move":
```
Referensi Sui Move yang kamu butuhkan:
- Sui framework docs: https://docs.sui.io/
- Move language: Object-centric, resource-oriented
- Key modules: sui::coin, sui::balance, sui::table, sui::event, sui::transfer, sui::clock
- PTB (Programmable Transaction Blocks): cara build transactions di frontend
- SDK: @mysten/dapp-kit untuk React hooks, @mysten/sui.js untuk client

Baca juga: sui/migration-docs/SMART_CONTRACT_MIGRATION.md untuk desain yang sudah direncanakan
```

### Kalau AI mulai coding tanpa baca context:
```
STOP. Baca dulu file ini sebelum coding:
1. sui/CONTEXT_FOR_NEW_AI.md
2. sui/MIGRATION_MASTER_PLAN.md
3. sui/AUDIT_REPORT.md (khusus Phase 1)

Jangan coding sebelum memahami konteks.
```

### Kalau context limit tercapai di tengah Phase 1:
```
Lanjutkan Phase 1 — Smart Contracts Move dari mana kamu berhenti.

BACA: sui/MIGRATION_MASTER_PLAN.md → cek mana yang sudah ✅ vs ⬜ di Phase 1

BUG FIXES YANG WAJIB ADA:
- C1: payout pakai active depositors count
- C2: hapus owner bypass withdraw
- C3: end_pool withdraw semua dulu
- H1: per-cycle has_deposited bool

Lanjutkan, update MIGRATION_MASTER_PLAN.md tiap selesai, commit di akhir.
```
