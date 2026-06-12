# FIX: MEDIUM #5 — Auth pada `deposit_collateral_yield()` + Yield Strategy Status

## File yang diubah
- `contracts/sources/arisan_pool.move` (line ~1183-1195)

## Apa yang difix

### Masalah
`deposit_collateral_yield()` sebelumnya **public tanpa autentikasi apapun** — siapa pun bisa deposit yield ke `collateral_yield_balance`. Meskipun tidak langsung eksploitatif (orang GIVING uang), ada beberapa risiko:

1. **Dust attack:** Siapa pun bisa deposit 1 unit terus-menerus, flooding event log
2. **Proportional yield manipulation:** Deposit besar di akhir cycle bisa mengubah distribusi yield untuk participant terakhir
3. **Griefing:** Blokir pool dari ending dengan cara bikin kolateral yield loop

### Solusi
Menambahkan `PoolAdminCap` sebagai parameter first dan menambahkan assertion `cap.pool_id == object::id(pool)`:

```move
// SEBELUM:
public fun deposit_collateral_yield<CoinType>(
    pool: &mut ArisanPool<CoinType>,
    yield_coin: Coin<CoinType>,
) { ... }

// SETELAH:
public fun deposit_collateral_yield<CoinType>(
    cap: &PoolAdminCap,
    pool: &mut ArisanPool<CoinType>,
    yield_coin: Coin<CoinType>,
) {
    assert!(cap.pool_id == object::id(pool), E_WRONG_POOL_CAP);
    ...
}
```

### Status yield_strategy module
Module `yield_strategy.move` sudah benar dari segi share accounting tapi masih **belum terintegrasi** dengan `arisan_pool`. `strategy_id` di `ArisanPool` selalu `None`. 

Untuk produksi, ada 2 opsi:
1. **DeepBook direct (existing):** Gunakan `deepbook_yield::deposit_funds_to_deepbook()` via PTB — ini sudah work
2. **YieldStrategy vault (future):** Set `strategy_id` saat pool start, deposit ke YieldStrategy setiap cycle, withdraw saat select_winner

Untuk testnet/hackathon, opsi 1 sudah cukup.

## Yang harus dicek manual

1. **Test pass:**
   ```bash
   cd contracts && sui move test
   ```
   Harus: `Test result: OK. Total tests: 120; passed: 120; failed: 0`

2. **Frontend check:**
   - Apakah ada UI/PTB yang panggil `deposit_collateral_yield()`? Jika iya, harus diupdate untuk menyertakan `PoolAdminCap` object ID.

3. **Production plan:**
   Sebelum mainnet, pilih salah satu:
   - Hapus `yield_strategy.move` dan `strategy_id` field dari ArisanPool (simplifikasi)
   - Atau integrasikan penuh: set strategy_id di start_pool, auto-deploy deposit ke YieldStrategy

## Status
✅ FIXED — 120 tests PASS. Lanjut ke MEDIUM #6
