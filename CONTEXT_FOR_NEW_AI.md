# 🔒 AI HANDOFF — COPY PASTE INI KE AI BARU

> **BACA INI DULU.** File ini berisi SEMUA konteks yang kamu butuhkan. Kamu tidak perlu membaca file lain untuk mulai bekerja.

---

## 1. PROJECT APA INI?

**Archa** (Arisan On-Chain) — protokol DeFi yang menggabungkan tradisi Indonesia "arisan" dengan blockchain.

### Apa itu Arisan?
Kumpulan orang yang nyetor uang bulanan, terus tiap bulan satu orang dapet seluruh uang pool-nya bergiliran.

### Contoh:
- 5 orang, masing-masing nyetor 10 USDC/bulan
- Bulan 1 → Orang A dapet 50 USDC (pool)
- Bulan 2 → Orang B dapet 50 USDC
- ...seterusnya sampai semua orang dapet giliran

### Keunikan Archa:
1. **Smart contract enforce rules** — tidak bisa curang, gak bisa kabur
2. **Collateral system** — tiap peserta deposit jaminan 125% dari potensi kewajiban mereka (biar gak kabur setelah menang)
3. **AI Yield Optimizer** — dana pool + jaminan otomatis di-deposit ke DeFi protocols buat generate yield tambahan (double yield)
4. **Winner selection** — pseudo-random setiap cycle (hackathon only — production perlu VRF)

### Business Logic / User Flow:
```
1. Connect wallet
2. Claim test USDC (faucet, 10,000 USDC via MockUSDC.mint)
3. Browse pools di /pools
4. Join pool → approve USDC + deposit collateral (jaminan)
5. Pool full → owner start pool → collateral di-deposit ke AIYieldStrategy
6. Setiap cycle (30 hari):
   a. Peserta approve + nyetor deposit bulanan
   b. Deposit masuk ke yield strategy (DeFi)
   c. Owner select winner → winner dapet pool + yield
7. Semua cycle selesai → collateral + yield dikembalikan ke semua peserta
```

### Collateral Formula:
```
collateral = depositAmount × (maxParticipants - 1) × 125 / 100
Contoh: Small pool (10 USDC, 5 peserta) → collateral = 10 × 4 × 1.25 = 50 USDC
```

---

## 2. SMART CONTRACTS — DARI CHAIN MANA, APA AJA?

### Sekarang: Mantle Network (EVM, Solidity)

Semua contract ada di `contracts/src/`:

| Contract | File | Lines | Apa Itu |
|----------|------|-------|---------|
| **ArisanPool** | `ArisanPool.sol` | 432 | Core pool logic — join, deposit, pilih winner, slash collateral, end pool |
| **ArisanFactory** | `ArisanFactory.sol` | 223 | Factory — buat pool baru (template: Small/Medium/Large), track semua pools |
| **AIYieldStrategy** | `AIYieldStrategy.sol` | 312 | Yield routing — deposit ke vaults, switch protocol, simulated yield |
| **MockUSDC** | `mocks/MockUSDC.sol` | 106 | Test USDC token (6 decimals) + faucet (public mint, no access control) |
| **BaseVault** | `vaults/BaseVault.sol` | 112 | Base vault — deposit, withdraw, simulateYield |
| **LendleVault** | `vaults/LendleVault.sol` | 13 | Mock Lendle (8.5% APY) |
| **MerchantMoeVault** | `vaults/MerchantMoeVault.sol` | 13 | Mock Merchant Moe (12% APY) |
| **AgniVault** | `vaults/AgniVault.sol` | 13 | Mock Agni Finance (9.5% APY) |
| **MinterestVault** | `vaults/MinterestVault.sol` | 13 | Mock Minterest (7.2% APY) |
| **KTXVault** | `vaults/KTXVault.sol` | 13 | Mock KTX Finance (15% APY) |
| *IERC20* | `interfaces/IERC20.sol` | 14 | Standard ERC20 interface |
| *IYieldStrategy* | `interfaces/IYieldStrategy.sol` | 23 | Strategy interface |
| *IVault* | `vaults/IVault.sol` | 15 | Vault interface |

**7 contracts perlu rewrite ke Move** (Pool, Factory, Strategy, BaseVault + 5 vaults)
**3 interfaces dihapus** (native Move types / module references)
**MockUSDC diganti** → custom Sui coin type via create_currency

### Contract Relationship (AKURAT — setelah audit):
```
MockUSDC (ERC20 token, 6 decimals, public mint NO access control)
    ↓ used by
ArisanFactory → creates → ArisanPool (per pool)
    │                        │
    │  Factory does NOT set  │  Pool has yieldStrategy field
    │  yieldStrategy on pool │  (default = address(0))
    │                        │  Must call updateYieldStrategy() manually
    ↓                        ↓
AIYieldStrategy ← pool deposits collateral + monthly deposits here
    ↓
Vaults (Lendle, MerchantMoe, Agni, Minterest, KTX)
    ↑
    └── Strategy routes USDC to active vault
    └── switchProtocol() withdraws from old vault, deposits to new vault
    └── simulateYield() on vault increases vault balance (NOT auto-compound)
```

### Pool Templates (Factory):
- **Small:** 10 USDC/bulan, 5 peserta, cycle 30 hari
- **Medium:** 50 USDC/bulan, 10 peserta, cycle 30 hari  
- **Large:** 100 USDC/bulan, 20 peserta, cycle 30 hari
- **Custom:** 2-50 peserta, min 1 day cycle

### Transaction Lifecycle (EVM — 2-step approve pattern):
```
1. usdc.approve(poolAddress, collateralAmount)    ← ERC20 approve
2. pool.joinPool()                                ← pool calls transferFrom
3. pool.startPool()                               ← deposits collateral to strategy (approve + deposit)
4. usdc.approve(poolAddress, depositAmount)       ← setiap bulan
5. pool.makeDeposit()                             ← approve + deposit ke strategy
6. pool.selectWinner()                            ← withdraw dari strategy, transfer ke winner
```

### Key Functions Per Contract:

**ArisanPool:**
- `joinPool()` — transferFrom collateral, add participant, check pool full
- `startPool()` — onlyOwner, approve+deposit collateral to strategy
- `makeDeposit()` — transferFrom deposit, approve+deposit to strategy  
- `selectWinner()` — onlyOwner, pseudo-random, withdraw+transfer payout
- `slashCollateral(address)` — onlyOwner, deduct collateral, kick if 0
- `updateYieldStrategy(address)` — onlyAIOptimizer, withdraw old, deposit new
- `setAIOptimizer(address)` — onlyOwner
- `transferOwnership(address)` — onlyOwner
- `_endPool()` — internal, return collateral + yield to active participants

**ArisanFactory:**
- `createPoolFromTemplate(templateId)` — create from template
- `createCustomPool(deposit, maxPart, cycleDuration)` — create custom
- `addTemplate(name, deposit, maxPart, cycleDuration)` — onlyOwner
- `setTemplateActive(templateId, isActive)` — onlyOwner
- `setAIOptimizer(address)` — onlyOwner

**AIYieldStrategy:**
- `deposit(amount)` — transferFrom, mint shares, route to vault
- `withdraw(shareAmount)` — calc amount, pull from vault, transfer
- `registerVault(address, name)` — onlyOwner
- `setActiveVault(address)` — onlyOwner, withdraw old, deposit new
- `switchProtocol(name, newAPY)` — onlyAIOptimizer, withdraw+deposit+update
- `setAPY(newAPY)` — onlyAIOptimizer

---

## 3. FRONTEND — APA AJA?

### Tech Stack:
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** — styling
- **wagmi v2** + **viem** — Web3 SDK (INI YANG HARUS DIGANTI)
- **@tanstack/react-query** — data fetching (TETAP, compatible juga dengan Sui)

### Pages:
| Route | Fungsi |
|-------|--------|
| `/` | Landing page (hero, about, how-it-works) |
| `/pools` | Pool explorer — list semua pool, filter, buat pool baru |
| `/pools/[address]` | Pool detail — peserta, yield, join/deposit/start/winner actions |
| `/ai` | AI Yield Optimizer dashboard — protocol analysis, recommendations |
| `/leaderboard` | Community rankings (simulated data) |
| `/faq` | FAQ (EN/ID translations) |
| `/demo` | Demo walkthrough |

### Key Web3 Components:
| Component | Apa Itu | Status Migrasi |
|-----------|---------|----------------|
| `Web3Provider.tsx` | wagmi config (Mantle Sepolia, MetaMask, WalletConnect) | 🔴 Rewrite total |
| `useContracts.ts` | 17 hooks — read/write contract (544 lines) | 🔴 Rewrite total |
| `contracts.ts` | Contract addresses untuk 3 networks (Ethereum Sepolia, Mantle Sepolia, Mantle Mainnet) | 🔴 Rewrite total |
| `abis.ts` | Full ABIs (Factory, Pool, ERC20) | 🔴 Rewrite total |
| `ConnectWallet.tsx` | MetaMask + WalletConnect modal | 🔴 Rewrite total |
| `USDCFaucet.tsx` | Direct mint 10,000 USDC via MockUSDC.mint() | 🔴 Rewrite total |
| `TestnetInfo.tsx` | MNT balance display, Mantle faucet link | 🟠 Adapt |
| `MantleGasSavings.tsx` | Gas savings comparison widget | 🟠 Adapt + rebrand |

### All Hooks in useContracts.ts (17 hooks):
| Hook | Type | Sui Equivalent |
|------|------|----------------|
| `useAllPools()` | Read — factory.getAllPools | Read factory shared object |
| `usePoolInfo(address)` | Read — pool.getPoolInfo | Read pool shared object |
| `usePoolsInfo(addresses[])` | BatchRead — multiple getPoolInfo | Multi-getObject |
| `useAllPoolsWithInfo()` | Combined — above + formatting | Combined |
| `useRequiredCollateral(address)` | Read — pool.getRequiredCollateral | Read pool config |
| `useUSDCBalance(address)` | Read — ERC20.balanceOf | useBalance(coinType) |
| `useUSDCAllowance(owner, spender)` | Read — ERC20.allowance | **DELETE — not needed on Sui** |
| `useApproveUSDC()` | Write — ERC20.approve | **DELETE — not needed on Sui** |
| `useJoinPool()` | Write — pool.joinPool | PTB: splitCoin + join_pool |
| `useCreatePool()` | Write — factory.createCustomPool | PTB: create_pool |
| `useCreatePoolFromTemplate()` | Write — factory.createPoolFromTemplate | PTB: create_from_template |
| `useMakeDeposit()` | Write — pool.makeDeposit | PTB: splitCoin + make_deposit |
| `useParticipantInfo()` | Read — pool.participants(addr) | Read participant from Table |
| `useParticipantList()` | BatchRead — pool.participantList(i) | Read vector in pool object |
| `useHasDepositedThisCycle()` | Read — pool.hasDepositedThisCycle | Read participant field |
| `useCycleWinner()` | Read — pool.cycleWinners(cycle) | Read from Table<u64, address> |
| `useLastWinner()` | Read — pool.lastWinner | Read pool.last_winner field |
| `useCurrentYield()` | Read — pool.getCurrentYield | Read + calculate |
| `useIsCycleComplete()` | Read — pool.isCycleComplete | Read + Clock check |

**MISSING hooks — TIDAK ADA di code EVM sama sekali, harus dibuat baru di Move version:**
- `useStartPool()` — pool.startPool (admin only, pool owner) — **tidak ada UI di EVM**
- `useSelectWinner()` — pool.selectWinner (admin only, pool owner) — **tidak ada UI di EVM**
- `useSlashCollateral()` — pool.slashCollateral (admin only, pool owner) — **tidak ada UI di EVM**
- `useUpdateYieldStrategy()` — pool.updateYieldStrategy (AI optimizer) — **tidak ada UI di EVM**

Ini adalah **scope tambahan** — bukan cuma rewrite hook, tapi juga harus bikin UI (admin panel / owner buttons di pool detail)

### AI Optimizer (Backend — mostly unchanged):
- `ai-optimizer.ts` — fetch yield data dari DeFiLlama REST API
- **Current protocols:** Lendle, Merchant Moe, Agni, Minterest, KTX (semua Mantle)
- **Target Sui protocols:** Scallop, NAVI, Aftermath, Cetus, Turbos
- `useAI.ts` — hooks untuk AI page (TIDAK perlu diubah — pure REST)
- DeFiLlama filter: `pool.chain === "mantle"` → `pool.chain === "sui"`

### i18n:
- `LanguageContext.tsx` — EN/ID translations (~150+ keys)
- Ada ~15 keys yang mention "Mantle" → harus diganti "Sui"

---

## 4. MAU DIAPAIN?

**Migrasi dari Mantle (EVM) ke Sui blockchain** — untuk hackathon Sui.

Artinya:
- Smart contracts: **Solidity → Sui Move** (rewrite total — 7 contracts)
- SDK: **wagmi + viem → @mysten/dapp-kit + @mysten/sui.js**
- Wallet: **MetaMask → Sui Wallet (Suiet/Ethos/Sui Wallet)**
- Token: **MockUSDC (ERC20) → Custom Sui Coin (create_currency)**
- Protocols: **Lendle/MerchantMoe/Agni/Minterest/KTX → Scallop/NAVI/Cetus/Aftermath/Turbos**
- Branding: **"Mantle Network" → "Sui Network"**
- Approve pattern: **2-tx (approve+transferFrom) → 1-tx (Coin object in PTB)** ✅

### Yang TIDAK berubah:
- Next.js, React, TypeScript, Tailwind
- UI design, page layout, animations
- Business logic (arisan mechanism) — cuma di-fix bug-nya
- AI scoring algorithm
- i18n system
- API routes (hanya ganti chain filter)

---

## 5. KEY ARCHITECTURE CHANGES (EVM → SUI)

| Konsep EVM | Konsep Sui | Penjelasan |
|------------|-----------|------------|
| `contract` | `module` dalam `package` | 1 package archa, multiple modules |
| `mapping()` | `Table<K,V>` atau `vector` | Collection storage |
| `onlyOwner` modifier | `AdminCap` owned object | Capability pattern |
| `msg.sender` | `tx_context::sender()` | Sender verification |
| `block.timestamp` | `clock.timestamp_ms(&clock)` | Pass `&Clock` object |
| `event X(...)` | `struct X has copy, drop; event::emit(X{...})` | Event struct |
| Factory creates contract | Factory creates **shared object** | Object-centric model |
| `new ArisanPool(...)` | `transfer::share_object(ArisanPool{...})` | Share object creation |
| `keccak256` random | `hash::digest()` or external oracle | Hackathon: hash-based ok |
| ERC20 `approve/transferFrom` | **Coin object as argument** | 1 tx instead of 2! |
| ERC20 `balanceOf` | `coin::balance()` or `useBalance()` | Direct read |
| USDC 6 decimals | USDC 6 decimals | ✅ Same on Sui |

### Token Flow (PENTING):

**EVM (2 transactions):**
```
Step 1: usdc.approve(pool, 50_000_000)     // 50 USDC in 6 decimals
Step 2: pool.joinPool()                     // pool calls transferFrom(user, pool, 50_000_000)
```

**Sui (1 transaction — Programmable Transaction Block):**
```typescript
const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(50_000_000)]);
tx.moveCall({
  target: `${PACKAGE_ID}::arisan_pool::join_pool`,
  arguments: [tx.object(poolId), coin, tx.object(CLOCK_ID)],
  typeArguments: [USDC_TYPE],
});
```

### Functions That Need Clock Parameter:
- `start_pool()` — untuk poolStartTime
- `select_winner()` — untuk isCycleComplete check
- `slash_collateral()` — untuk hasMissedPayment check
- `make_deposit()` — untuk timestamp (optional)

### AdminCap Design Decision:
- **1 AdminCap for Factory** — add templates, set optimizer
- **1 AdminCap for Strategy** — register vaults, switch protocol
- **Pool: NO AdminCap** — use `owner` field + `TxContext::sender()` check (simpler)
- Factory creates pool, transfers ownership to caller → caller is pool owner

---

## 6. ⚠️ KNOWN BUGS IN SOLIDITY (MUST FIX IN MOVE)

**AUDIT REPORT:** `sui/AUDIT_REPORT.md` — baca untuk detail lengkap

### Critical Bugs:
1. **C1: selectWinner payout > balance** — hitung `maxParticipants` bukan active depositors. Kalau ada yang di-kick, payout bisa melebihi dana → REVERT → pool stuck
2. **C2: Owner withdraw bypass** — owner bisa withdraw tanpa shares di AIYieldStrategy
3. **C3: _endPool can fail mid-loop** — kalau withdraw gagal di participant ke-3, sisanya ke-lock

### High Bugs:
4. **H1: hasDepositedThisCycle broken** — pakai cumulative counter, participant yang miss 1x PERMANENTLY locked out
5. **H3: MockUSDC.mint no access control** — siapapun bisa mint unlimited (OK for hackathon)
6. **H4: No duplicate pool prevention** — user bisa spam pools

### Fixes for Move:
- Use **per-cycle bool** for deposit tracking (fix H1)
- Use **active depositors count** for payout calc (fix C1)
- Use **withdraw-all-first** pattern in _endPool (fix C3)
- Remove **owner bypass** in withdraw (fix C2)
- **Separate** collateral Balance and pool_funds Balance (cleaner accounting)

---

## 7. PROJECT FILE STRUCTURE

```
/home/faiz/hackaton/sui/Archa/
├── contracts/              ← Solidity contracts (CURRENT — EVM, JANGAN HAPUS)
│   ├── src/
│   │   ├── ArisanPool.sol          (432 lines) ← CORE
│   │   ├── ArisanFactory.sol       (223 lines) ← CORE
│   │   ├── AIYieldStrategy.sol     (312 lines) ← CORE
│   │   ├── interfaces/ (IERC20, IYieldStrategy)
│   │   ├── vaults/ (BaseVault + 5 protocol vaults)
│   │   └── mocks/ (MockUSDC)
│   └── script/ (DeployAll.s.sol)
│
├── src/                    ← Next.js frontend (CURRENT — EVM hooks)
│   ├── app/               ← Pages
│   │   ├── page.tsx              ← Landing
│   │   ├── pools/page.tsx        ← Pool explorer (677 lines)
│   │   ├── pools/[address]/page.tsx ← Pool detail (635 lines)
│   │   ├── ai/page.tsx           ← AI dashboard (435 lines)
│   │   ├── leaderboard/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── demo/page.tsx
│   │   └── api/ (yields, strategy)
│   ├── components/        ← UI components (Header, Footer, Hero, etc.)
│   ├── hooks/
│   │   ├── useContracts.ts       ← 17 EVM hooks (544 lines) 🔴 REWRITE
│   │   └── useAI.ts              ← AI hooks (177 lines) ✅ NO CHANGE
│   ├── providers/
│   │   └── Web3Provider.tsx      ← wagmi provider (56 lines) 🔴 REWRITE
│   ├── config/
│   │   ├── contracts.ts          ← Contract addresses 🔴 REWRITE
│   │   └── abis.ts               ← Contract ABIs 🔴 DELETE
│   ├── context/
│   │   └── LanguageContext.tsx    ← i18n EN/ID (~490 lines) 🟡 TEXT UPDATE
│   └── lib/
│       └── ai-optimizer.ts       ← AI engine (468 lines) 🟡 PROTOCOL UPDATE
│
├── sui/                   ← MIGRATION ARTIFACTS
│   ├── CONTEXT_FOR_NEW_AI.md      ← FILE INI
│   ├── MIGRATION_MASTER_PLAN.md   ← PROGRESS TRACKER + CHECKLIST
│   ├── AUDIT_REPORT.md            ← SMART CONTRACT AUDIT + BUGS
│   └── migration-docs/            ← 9 file dokumentasi detail
│       ├── PROJECT_CONTEXT.md
│       ├── REPO_STRUCTURE.md
│       ├── BLOCKCHAIN_DEPENDENCY_AUDIT.md
│       ├── SUI_MIGRATION_PLAN.md
│       ├── SMART_CONTRACT_MIGRATION.md
│       ├── BACKEND_MIGRATION.md
│       ├── FRONTEND_MIGRATION.md
│       ├── RISK_ANALYSIS.md
│       └── IMPLEMENTATION_TODO.md
│
└── package.json           ← Dependencies (wagmi 2.12, viem 2.21, next 16.1, react 19.2)
```

---

## 8. MIGRATION STATUS & PROGRESS

**BACA:** `sui/MIGRATION_MASTER_PLAN.md` untuk checklist lengkap.
**BACA:** `sui/AUDIT_REPORT.md` untuk bug list dan fix requirements.

### Ringkasan Phase:

| Phase | Nama | Status | Dependency |
|-------|------|--------|------------|
| 0 | Setup (Sui CLI, git branch, wallet) | ⬜ NOT STARTED | None |
| 1 | **Smart Contracts Move** (rewrite 7 contracts) | ⬜ NOT STARTED | Phase 0 |
| 2 | Frontend Web3 (ganti wagmi → dapp-kit, rewrite 17 hooks) | ⬜ NOT STARTED | Phase 1 |
| 3 | Page Components Update (6 pages) | ⬜ NOT STARTED | Phase 2 |
| 4 | AI Optimizer (protocol list Sui) | ⬜ NOT STARTED | None (parallel) |
| 5 | Translations (Mantle → Sui, ~15 keys) | ⬜ NOT STARTED | None (parallel) |
| 6 | Testing & Deploy | ⬜ NOT STARTED | All phases |

### Current State:
- **Git branch:** main (belum ada branch sui-migration)
- **Dependencies:** masih wagmi + viem
- **Smart Contracts:** masih Solidity di `contracts/` (belum ada Move)
- **Audit:** selesai, ada 3 critical + 4 high bugs yang harus di-fix di Move

---

## 9. DOKUMENTASI DETAIL

Kalau butuh info lebih detail, baca file-file ini:

| File | Isi |
|------|-----|
| `sui/AUDIT_REPORT.md` | ⭐ SMART CONTRACT AUDIT — bugs, doc errors, migration gaps |
| `sui/MIGRATION_MASTER_PLAN.md` | ⭐ PROGRESS TRACKER — checklist per task |
| `sui/migration-docs/SMART_CONTRACT_MIGRATION.md` | Move contract design, struct signatures |
| `sui/migration-docs/FRONTEND_MIGRATION.md` | wagmi → dapp-kit, code examples |
| `sui/migration-docs/BLOCKCHAIN_DEPENDENCY_AUDIT.md` | All EVM-specific files |
| `sui/migration-docs/IMPLEMENTATION_TODO.md` | Granular checklist |
| `sui/migration-docs/PROJECT_CONTEXT.md` | Architecture, diagrams |
| `sui/migration-docs/REPO_STRUCTURE.md` | File explanations |
| `sui/migration-docs/BACKEND_MIGRATION.md` | AI optimizer changes |
| `sui/migration-docs/RISK_ANALYSIS.md` | Migration risks |
| `sui/migration-docs/SUI_MIGRATION_PLAN.md` | Strategy, timing estimates |

---

## 10. RULES

1. **Selalu update `sui/MIGRATION_MASTER_PLAN.md`** setiap selesai task (⬜ → ✅)
2. **Jangan skip phase** — ikut urutan dependency
3. **Commit + push** sebelum akhir sesi
4. **Jangan hapus code EVM lama** — biarkan di branch main
5. **Baca AUDIT_REPORT.md** sebelum mulai Move rewrite — fix semua bugs di sana
6. **Kalau bingung, baca migration-docs dulu** sebelum nebak
7. **Kalau ada blocker, catat di MIGRATION_MASTER_PLAN.md**

---

## 11. PROMPT UNTUK AI BARU

Copy paste ini ke AI baru:

```
Baca file ini dulu: sui/CONTEXT_FOR_NEW_AI.md
Lalu baca audit report: sui/AUDIT_REPORT.md

Setelah baca:
1. Baca sui/MIGRATION_MASTER_PLAN.md untuk cek progress terbaru
2. Cek STATUS BOARD — mana yang ⬜ (belum) dan ✅ (sudah)
3. Perhatikan AUDIT_REPORT.md — ada 3 critical bugs yang harus di-fix di Move rewrite
4. Kerjakan NEXT ACTION yang tercatat
5. Update MIGRATION_MASTER_PLAN.md setiap selesai task

Project root: /home/faiz/hackaton/sui/Archa
```
