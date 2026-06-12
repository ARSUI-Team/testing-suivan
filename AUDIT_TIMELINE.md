# Suivan/Archa — Full Audit & Fix Timeline

**Tanggal:** 13 Juni 2026
**Auditor:** DeepSeek V4 Pro via opencode
**Proyek:** Suivan — ROSCA (Rotating Savings and Credit Association) protocol di Sui Move

---

## Fase 0: Project Overview

Suivan/Archa adalah protokol ROSCA (Arisan) on-chain di Sui blockchain. Pemain setor deposit bulanan, tiap cycle satu pemenang diundi, dapet seluruh deposit. Ada collateral, slashing buat yang skip deposit, leaderboard, gacha yield, dan integrasi DeepBook V3.

Stack:
- **Smart Contract:** Sui Move (9 modul)
- **Frontend:** Next.js 16 + React 19 + Tailwind 4
- **Dependencies:** DeepBook V3, Seal (verifiable randomness), Walrus (blob storage)
- **Deploy:** Sui Testnet + Vercel

---

## Fase 1: Full Codebase Read

Membaca **seluruh baris kode** — 1670 lines `arisan_pool.move`, 315 lines `arisan_factory.move`, semua modul, 2614 lines tests, frontend hooks, API routes, config.

### Temuan awal
- Core pool logic **80% solid** — capability-based auth, per-cycle deposit tracking, hot potato pattern
- Butuh hardening di beberapa area kritis
- 103 tests exist, coverage bagus untuk core flow

---

## Fase 2: Identifikasi 12 Issues

### 🔴 CRITICAL — harus fix sebelum mainnet

**C1 — Winner Selection Randomness Fallback (`arisan_pool.move:803-815`)**
- `select_winner()` punya fallback `tx_context::digest()` kalau Seal seed tidak diset
- `tx_context::digest()` **tidak unpredictable** — validator/miner bisa predict winner
- **Fix:** Hapus fallback, wajib Seal seed → abort dengan `E_NO_SEAL_SEED` jika tidak diset

**C2 — Sponsor API No Rate Limiting (`api/sponsor/route.ts`)**
- API menerima request tanpa batas → private key gas sponsor bisa di-drain
- **Fix:** Rate limit per-IP + per-Sui-address, input validation, replay protection, nonce check

**C3 — TreasuryCap ID Terexpose (`.env.example`)**
- TreasuryCap ID hardcoded di `.env.example` yang committed ke git
- TreasuryCap = kunci mint token. Jika private key deployer bocor → unlimited mint
- **Fix:** Ganti dengan placeholder, dokumentasi untuk rotasi

**C4 — Pause Mechanism Zero Test Coverage (`arisan_pool.move`)**
- Pause/unpause tidak diuji sama sekali — bug bisa lock pool permanen
- **Fix:** 10 tests baru mencakup semua entry point + pause/unpause lifecycle

### 🟡 MEDIUM — fix sebelum mainnet

**M5 — `deposit_collateral_yield()` Without Auth (`arisan_pool.move:1183`)**
- Fungsi ini public tanpa PoolAdminCap → siapa pun bisa deposit yield
- **Fix:** Tambahkan `cap: &PoolAdminCap` parameter + assertion

**M6 — Unbounded `user_pools` Vector (`arisan_factory.move:41`)**
- User bisa spam create pool ribuan kali → storage bloat, DOS
- **Fix:** `MAX_POOLS_PER_USER = 100` + assertion di kedua fungsi create pool

**M7 — Gacha `last_active_idx` Fallback (`arisan_pool.move:950`)**
- Jika tidak ada active participant dengan collateral, remainder dust ke index 0 yang bisa inactive
- **Fix:** Flag `has_any_distribution` — hanya distribusi remainder jika ada yang terima yield

---

## Fase 3: Implementasi Fix (satu per satu)

### C1 — Hapus Fallback Randomness
- Menghapus 30+ lines fallback branch di `select_winner()`
- Menambahkan `assert!(pool.seal_seed.is_some(), E_NO_SEAL_SEED)`
- Testing: deploy ulang ke testnet → select_winner tanpa seal seed **gagal dengan error 24**
- Testing: set seal seed → select_winner **sukses**, seed_source=1 (dari Seal)

### C2 — Rate Limiter + Validation
- Membuat `fe-suivan/src/lib/rateLimiter.ts` — in-memory rate limiter dengan:
  - Bucket per-IP + per-Sui-address
  - Per-action limits (faucet=3/day, deposit=30/min, dll)
  - Auto cleanup setiap 5 menit
  - Nonce-based replay protection
- Rewrite `api/sponsor/route.ts`:
  - Input validation untuk semua parameter (depositAmount 1-100k, dll)
  - `Retry-After` header di response 429
  - Error handling dibedakan (501/502/503/500)
  - Gas budget cap `MAX_GAS_BUDGET = 50_000_000`

### C3 — TreasuryCap Placeholder
- Ganti `TREASURY_CAP_ID=0x63af...` menjadi `TREASURY_CAP_ID=your_treasury_cap_object_id`
- Verifikasi `.env.local` sudah di-gitignore (`.env*.local`) → tidak committed
- Catatan: rotasi TreasuryCap jika ID lama ada di git history

### C4 — Pause/Unpause Tests
- Menambahkan Section 18 di `arisan_pool_tests.move`:
  - `test_pause_and_unpause_success` — basic lifecycle
  - `test_*_rejected_when_paused` — 6 test untuk join, deposit, start, select_winner, slash, end_pool
  - `test_pause_pool_wrong_cap` + `test_unpause_pool_wrong_cap`
  - `test_pause_unpause_then_join` — resume normal
- Update `test_legacy_path_no_seal_seed` → `test_select_winner_without_seal_seed_aborts`

### M5 — PoolAdminCap Auth
- Menambahkan `cap: &PoolAdminCap` ke `deposit_collateral_yield()`
- Assertion `cap.pool_id == object::id(pool)`

### M6 — Max Pools Per User
- Menambahkan `MAX_POOLS_PER_USER: u64 = 100` + `E_TOO_MANY_POOLS: u64 = 104`
- Assertion di `create_pool_from_template()` dan `create_custom_pool()`

### M7 — Gacha Dust Fix
- Menambahkan `has_any_distribution: bool` flag
- Remainder hanya didistribusi jika `has_any_distribution == true`

---

## Fase 4: Deploy & Test di Testnet

1. `rm Published.toml` — hapus catatan publish lama
2. `sui client publish --with-unpublished-dependencies` — deploy kontrak baru
3. Package ID baru: `0xc8550b0f...`
4. Init faucet: `init_faucet()`
5. Init template: `init_default_templates()` — Small (5 org), Medium (10), Large (20)
6. Claim USDC dari 3 address berbeda
7. Create pool + join + start + deposit + set_seal_seed + select_winner
8. Verifikasi: Seal seed wajib, cycle advance, payout berhasil

---

## Hasil Akhir

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Test count | 103 | 120 (+17) |
| Critical issues | 4 | 0 |
| Medium issues | 3 | 0 |
| Deploy status | Testnet (stale) | Testnet (fresh) |
| Randomness security | Fallback ke tx digest | Wajib Seal seed |
| API rate limit | None | Per-IP + per-address |
| Pause test coverage | 0 | 10 tests |
| User pool limit | Unlimited | 100 per user |

---

## Catatan untuk Tim

1. **Setiap deploy ulang** = Package ID baru → update `.env.local`
2. **TreasuryCap ID** tidak boleh di `.env.example` atau commit — simpan di secrets manager
3. **Frontend `deposit_collateral_yield()`** harus diupdate: tambahkan `poolAdminCapId` ke PTB
4. **Seal seed** wajib diset sebelum `select_winner` — frontend harus handle `E_NO_SEAL_SEED` (code 24)
5. **Rate limiter** bisa dikonfigurasi per-action di `rateLimiter.ts` `ACTION_CONFIGS`
