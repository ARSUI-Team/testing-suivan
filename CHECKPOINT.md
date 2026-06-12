# CHECKPOINT — Audit & Fix Suivan/Archa

**Tanggal:** 13 Juni 2026
**Branch:** `ham-landing`
**Status:** 7 fixes complete, 4 Critical + 3 Medium

---

## Yang sudah dikerjakan

### 🔴 CRITICAL (4 fixes)
| # | Issue | File | Fix | Verified |
|---|---|---|---|---|
| C1 | `tx_context::digest()` fallback — winner bisa diprediksi | `arisan_pool.move` | Hapus fallback, wajib Seal seed | ✅ Testnet |
| C2 | Sponsor API no rate limit | `api/sponsor/route.ts` | Rate limiter + input validation + replay protection | ⬜ Frontend |
| C3 | TreasuryCap ID di `.env.example` | `.env.example` | Ganti placeholder | ✅ |
| C4 | Pause/unpause zero test coverage | `arisan_pool_tests.move` | 10 tests baru | ✅ 120/120 |

### 🟡 MEDIUM (3 fixes)
| # | Issue | File | Fix | Verified |
|---|---|---|---|---|
| M5 | Auth `deposit_collateral_yield()` | `arisan_pool.move` | Tambah PoolAdminCap | ✅ 120/120 |
| M6 | Unbounded user_pools vector | `arisan_factory.move` | `MAX_POOLS_PER_USER = 100` | ✅ 120/120 |
| M7 | Gacha last_active_idx ke inactive | `arisan_pool.move` | Flag `has_any_distribution` | ✅ 120/120 |

---

## Deployed to testnet
- Package ID: `0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52`
- Factory: `0x9fab756068fe9347795af6d290540d8e73945949a1bc9036cb223aef1fce2a36`
- Faucet: `0x68612adb8811463218f3bbb22410a30bb5566f87c8e26efa08237665dc2784b2`
- Full lifecycle tested: create → join → start → deposit → set_seal_seed → select_winner → cycle advance ✅

---

## Files changed
```
contracts/sources/arisan_factory.move
contracts/sources/arisan_pool.move
contracts/tests/arisan_pool_tests.move
fe-suivan/.env.example
fe-suivan/.env.local
fe-suivan/src/app/api/sponsor/route.ts
fe-suivan/src/lib/rateLimiter.ts  (new file)
```

## Fix documentation
- `FIX_CRITICAL_1.md` s.d `FIX_CRITICAL_4.md`
- `FIX_MEDIUM_5.md` s.d `FIX_MEDIUM_7.md`

---

## Yang belum
- [ ] Test sponsor API rate limit di frontend (`npm run dev`)
- [ ] Update frontend PTB untuk `deposit_collateral_yield()` (sekarang butuh PoolAdminCap arg)
- [ ] Review gas cost setelah deploy ulang
- [ ] Rotasi TreasuryCap jika ID lama ada di git history
