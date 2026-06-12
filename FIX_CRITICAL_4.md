# FIX: CRITICAL #4 — Test Pause/Unpause Mechanism + Update Legacy Test

## File yang diubah
- `contracts/sources/arisan_pool.move` — (no change, pause mechanism already correct)
- `contracts/tests/arisan_pool_tests.move` — Updated legacy test + added 10 pause tests

## Apa yang difix

### Masalah
1. **Pause/unpause mechanism tidak punya test coverage.** Bug di `assert_not_paused()` atau `pause_pool()` bisa bikin seluruh pool locked permanen tanpa terdeteksi.
2. **`test_legacy_path_no_seal_seed`** masih mengetes fallback `tx_context::digest()` yang sudah dihapus di Critical #1.

### Solusi

**A. Update legacy test:**
Mengganti `test_legacy_path_no_seal_seed` → `test_select_winner_without_seal_seed_aborts`
- Sekarang expect abort dengan `E_NO_SEAL_SEED` (kode 24)
- Memvalidasi bahwa `select_winner` tanpa seal seed = gagal

**B. Added 10 pause/unpause tests (SECTION 18):**

| Test | What it covers |
|---|---|
| `test_pause_and_unpause_success` | Basic pause → is_paused true → unpause → is_paused false |
| `test_pause_pool_wrong_cap` | Pause dengan wrong PoolAdminCap → E_WRONG_POOL_CAP |
| `test_unpause_pool_wrong_cap` | Unpause dengan wrong cap setelah pause → E_WRONG_POOL_CAP |
| `test_join_pool_rejected_when_paused` | Join pool tidak bisa saat paused → E_POOL_PAUSED |
| `test_make_deposit_rejected_when_paused` | Deposit tidak bisa saat paused → E_POOL_PAUSED |
| `test_start_pool_rejected_when_paused` | Start pool tidak bisa saat paused → E_POOL_PAUSED |
| `test_select_winner_rejected_when_paused` | Select winner tidak bisa saat paused → E_POOL_PAUSED |
| `test_slash_collateral_rejected_when_paused` | Slash tidak bisa saat paused → E_POOL_PAUSED |
| `test_end_pool_rejected_when_paused` | End pool tidak bisa saat paused → E_POOL_PAUSED |
| `test_pause_unpause_then_join` | Pause → unpause → operasi normal kembali |

### Hasil test
```
Test result: OK. Total tests: 120; passed: 120; failed: 0
```

## Yang harus dicek manual

1. **Verifikasi semua 120 tests pass:**
   ```bash
   cd contracts && sui move test
   ```
   Harus output: `test result: OK. Total tests: 120; passed: 120; failed: 0`

2. **Verifikasi pause di frontend:**
   - Cek apakah ada UI/button untuk pause/unpause pool
   - Pastikan tombol pause/unpause hanya muncul untuk pemegang PoolAdminCap
   - Pastikan semua operasi (join, deposit, select_winner) terblokir saat pool paused

3. **Edge case manual test:**
   - Pool dipause saat ada participant yang sudah deposit → slashing harus tetap gagal
   - Pool dipause lalu di-unpause → semua operasi normal kembali
   - Pool dipause saat cycle sedang berjalan → harus tetap bisa di-unpause
   - Pause setelah claim_final → seharusnya tidak relevan (pool already ended)

## Status
✅ FIXED — total 120 tests ALL PASS. Lanjut ke MEDIUM #5
