# FIX: CRITICAL #1 — Hapus Fallback `tx_context::digest()` Randomness

## File yang diubah
- `contracts/sources/arisan_pool.move` (line ~787-815)

## Apa yang difix

### Masalah
`select_winner()` punya fallback path yang menggunakan `tx_context::digest()` sebagai seed randomness jika Seal seed tidak diset. `tx_context::digest()` **tidak unpredictable** — validator/miner bisa memanipulasi/memprediksi tx digest, sehingga winner selection bisa di-exploit.

### Solusi
Menghapus seluruh fallback branch `tx_context::digest()`. Sekarang `select_winner()` wajib punya Seal seed yang sudah diset melalui `set_seal_seed()`. Jika tidak ada Seal seed, fungsi abort dengan error `E_NO_SEAL_SEED` (kode 24).

### Perubahan kode
**SEBELUM:**
```move
let (seed, seed_source) = if (pool.seal_seed.is_some()) {
    // ... pakai Seal seed
    (s, SEED_SOURCE_SEAL)
} else {
    // Fallback: tx_context::digest() — TIDAK AMAN
    let digest = tx_context::digest(ctx);
    // ...
    (s, 0u8)
};
```

**SETELAH:**
```move
// Wajib Seal seed — abort jika tidak ada
assert!(pool.seal_seed.is_some(), E_NO_SEAL_SEED);
let seal_bytes = option::borrow(&pool.seal_seed);
let mut s = pool.current_cycle;
// ... hash seal bytes
let seed = s;
let seed_source = SEED_SOURCE_SEAL;
```

## Yang harus dicek manual

1. **Test runner:**
   ```
   cd contracts && sui move test
   ```
   Semua 103+ tests harus PASS. Pastikan test `test_select_winner_success` masih hijau.

2. **Frontend flow:**
   Sebelum panggil `select_winner`, frontend/sekarang HARUS panggil `set_pool_seal_seed()` dulu buat nyetel seed. Cek di `useSuiContracts.ts` — apakah ada PTB yang set seed sebelum select_winner?

3. **Deploy ulang:**
   Setelah deploy, test full flow:
   - Create pool → join → start → **set_seal_seed** → deposit semua → select_winner
   - Pastikan select_winner abort kalau seal seed belum diset

4. **Gas cost:**
   Cek apakah perubahan ini nambah gas cost signifikan (harusnya tidak, malah berkurang karena hapus satu branch besar)

## Status
✅ FIXED — lanjut ke CRITICAL #2
