# Suivan/Archa — Project Status

**Last updated:** 13 Juni 2026 | **Branch:** `sc-faiz` | **Auditor:** Faiz

---

## Apa ini?

Suivan adalah protokol ROSCA (Arisan) on-chain di Sui blockchain. Peserta setor deposit bulanan, tiap cycle satu pemenang diundi dapet seluruh deposit. Fitur: collateral, slashing, leaderboard, gacha yield, DeepBook V3 integration.

---

## Status saat ini

### Kontrak (Move)
- ✅ 9 modul source (arisan_pool, arisan_factory, yield_strategy, deepbook_yield, seal_randomness, walrus_store, test_usdc, test_sui, faucet)
- ✅ 120 tests, all pass
- ✅ Deployed di Sui Testnet
  - Package ID: `0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52`
  - Factory: `0x9fab756068fe9347795af6d290540d8e73945949a1bc9036cb223aef1fce2a36`
  - Faucet: `0x68612adb8811463218f3bbb22410a30bb5566f87c8e26efa08237665dc2784b2`

### Frontend (Next.js)
- ✅ 17 components, 8 hooks, 5 API routes
- ✅ Sponsor API with rate limiting + input validation
- ✅ .env.local configured with new testnet IDs
- ⬜ Belum di-start (`npm run dev`)

---

## Audit & Fix Summary

Tanggal 13 Juni 2026, dilakukan full audit — membaca seluruh codebase. Ditemukan 12 issues. **7 difix, 5 dianggap low priority.**

### Yang udah difix (7):
1. ❌ `select_winner()` bisa pake `tx_context::digest()` → winner bisa diprediksi. **Sekarang wajib Seal seed.**
2. ❌ Sponsor API no rate limit → gas sponsor bisa di-drain. **Sekarang ada rate limiter.**
3. ❌ TreasuryCap ID di `.env.example` → bisa leak. **Sekarang placeholder.**
4. ❌ Pause/unpause tidak diuji → bug bisa lock pool. **Sekarang 10 tests.**
5. ❌ `deposit_collateral_yield()` tanpa auth → siapa pun bisa deposit. **Sekarang butuh PoolAdminCap.**
6. ❌ User bisa spam create pool unlimited → storage bloat. **Sekarang max 100 per user.**
7. ❌ Gacha dust bisa ke participant inactive → edge case. **Sekarang difix.**

Detail tiap fix ada di file `FIX_CRITICAL_1.md` s.d `FIX_MEDIUM_7.md`.

---

## Quick Start (buat developer baru)

### 1. Clone & setup
```bash
git clone https://github.com/ARSUI-Team/testing-suivan.git
cd testing-suivan
```

### 2. Kontrak — test
```bash
cd contracts
sui move test
# Harus: 120 passed, 0 failed
```

### 3. Kontrak — deploy (kalau redeploy)
```bash
rm Published.toml
sui client publish --with-unpublished-dependencies
# Update .env.local dengan Package ID baru
```

### 4. Frontend
```bash
cd fe-suivan
npm install
npm run dev
# Buka http://localhost:3000
```

---

## Yang belum
- [ ] Jalankan `npm run dev` buat test sponsor API rate limiter
- [ ] Update frontend PTB `deposit_collateral_yield()` — tambah arg PoolAdminCap
- [ ] Rotasi TreasuryCap kalau ID lama ada di git history
- [ ] Test full lifecycle lewat frontend UI (bukan CLI)

---

## Notes penting buat tim

1. **Seal seed wajib** sebelum `select_winner`. Frontend harus set seed + handle error code 24.
2. **Setiap deploy ulang kontrak** = Package ID baru → update `.env.local`.
3. **TreasuryCap jangan di-commit** — simpan di Vercel secrets / `.env.local`.
4. **Rate limiter** bisa dikonfigurasi di `fe-suivan/src/lib/rateLimiter.ts` → `ACTION_CONFIGS`.
