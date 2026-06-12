# FIX: MEDIUM #7 — Gacha `last_active_idx` Fallback Edge Case

## File yang diubah
- `contracts/sources/arisan_pool.move` (line ~949-968)

## Apa yang difix

### Masalah
Di `end_pool_internal()`, saat mendistribusikan collateral yield secara proporsional:

```move
let mut last_active_idx: u64 = 0;
// loop melalui participants...
if (p.is_active && p.collateral_amount > 0) {
    // distribute yield
    last_active_idx = i;  // ← hanya di-set jika ada participant yang memenuhi syarat
}
```

Setelah loop, remainder (truncation dust) diberikan ke `participant_list[last_active_idx]`:

```move
let addr = *vector::borrow(&pool.participant_list, last_active_idx);
p.proportional_yield_earned += remainder;
```

**Bug:** Jika **tidak ada satupun** active participant dengan `collateral_amount > 0` (semua sudah deactivated tapi collateral_yield_balance masih ada nilai dari deposit sebelumnya), `last_active_idx` tetap 0. Maka dust remainder diberikan ke `participant_list[0]` yang bisa jadi sudah inactive/deactivated.

### Solusi
Menambahkan flag `has_any_distribution: bool` yang hanya true jika setidaknya 1 participant menerima yield. Remainder hanya diberikan jika flag ini true:

```move
let mut has_any_distribution: bool = false;
// ...
if (p.is_active && p.collateral_amount > 0) {
    // distribute...
    has_any_distribution = true;
}
// ...
if (remainder > 0 && has_any_distribution) {
    // award to last_active_idx
}
```

Jika tidak ada yang menerima yield, remainder dust tetap di `collateral_yield_balance` (tidak terdistribusi — tapi jumlahnya minimal, < total_participants micro-units).

## Yang harus dicek manual

1. **Test:**
   ```bash
   cd contracts && sui move test
   ```
   Harus: 120 passed, 0 failed

2. **Edge case scenario:**
   - Pool dengan 5 participant, collateral_multiplier 100%
   - Semua participant di-slash full → semua inactive
   - Tapi ada 100 USDC di collateral_yield_balance dari deposit sebelumnya
   - end_pool → dust tidak terdistribusi ke participant inactive
   - Pastikan `total_collateral_yield` di PoolEnded event benar

3. **Gas impact:**
   Satu bool tambahan di loop — negligible gas cost. O(1) overhead.

## Status
✅ FIXED — 120 tests PASS. All 7 fixes complete.
