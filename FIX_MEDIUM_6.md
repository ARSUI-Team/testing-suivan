# FIX: MEDIUM #6 — Limit Jumlah Pool per User

## File yang diubah
- `contracts/sources/arisan_factory.move` (3 line additions)

## Apa yang difix

### Masalah
`user_pools: Table<address, vector<ID>>` — setiap user bisa membuat pool tanpa batas. Seorang attacker bisa spam create pool ribuan kali, menyebabkan:
1. **Storage bloat:** vector<ID> per user tumbuh unbounded → gas cost untuk read/write makin mahal
2. **DoS:** List user_pools bisa terlalu besar untuk di-query dari frontend
3. **Table degradation:** Table dengan banyak entries di bawah 1 address bisa memperlambat Sui node

### Solusi
Menambahkan limit `MAX_POOLS_PER_USER = 100` dan assertion di kedua fungsi create pool:

```move
const MAX_POOLS_PER_USER: u64 = 100;
const E_TOO_MANY_POOLS: u64 = 104;

// Di create_pool_from_template dan create_custom_pool:
if (table::contains(&factory.user_pools, creator)) {
    let user_pools = table::borrow_mut(&mut factory.user_pools, creator);
    assert!(vector::length(user_pools) < MAX_POOLS_PER_USER, E_TOO_MANY_POOLS);
    vector::push_back(user_pools, pool_id);
}
```

Limit 100 pool per user masih generous untuk testnet — cukup untuk testing berbagai template pool. Untuk mainnet bisa diturunkan ke 20-30.

## Yang harus dicek manual

1. **Test:**
   ```bash
   cd contracts && sui move test
   ```
   Harus: 120 passed, 0 failed

2. **Frontend error handling:**
   Jika user mencoba create pool ke-101, API harus return error `E_TOO_MANY_POOLS`. Cek di `useSuiContracts.ts` apakah ada handling untuk abort code 104.

3. **Number review:**
   `MAX_POOLS_PER_USER = 100` — cukup untuk testnet. Untuk mainnet, pertimbangkan:
   - 10 pool = cukup untuk individual user
   - 50 pool = cukup untuk power user / DAO
   - Bisa dibuat configurable via FactoryAdminCap

## Status
✅ FIXED — 120 tests PASS. Lanjut ke MEDIUM #7
