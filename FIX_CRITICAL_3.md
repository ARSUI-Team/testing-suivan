# FIX: CRITICAL #3 — TreasuryCap ID Terexpose di .env.example

## File yang diubah
- `fe-suivan/.env.example` (line 14)

## Apa yang difix

### Masalah
`TREASURY_CAP_ID=0x63af2ef268e8ab668201807c1b8452210b43d2adfe8562bac96db8b3bfbb7e4f` tercantum di `.env.example` yang **committed ke git**. TreasuryCap adalah objek yang memegang hak mint token. Meskipun ini hanya ID (bukan private key), tetap saja:

1. TreasuryCap ID yang terexpose = attacker tahu persis objek mana yang diincar
2. Jika ada bug di faucet module atau deployer key bocor → bisa mint unlimited USDC
3. `.env.example` tidak di-gitignore → ID ini permanen di git history

### Solusi
Mengganti TreasuryCap ID di `.env.example` dengan placeholder:
```
TREASURY_CAP_ID=your_treasury_cap_object_id
```

### Verifikasi tambahan
- `.env.local` sudah di-gitignore (pattern `.env*.local`) — TIDAK committed ke git ✅
- `TREASURY_CAP_ID` tidak direferensikan di client-side code (tidak ada `NEXT_PUBLIC_` prefix) ✅
- `TREASURY_CAP_ID` tidak dipakai di sponsor API route ✅

## Yang harus dicek manual

1. **Git history cleanup:**
   ```bash
   # Cek apakah TreasuryCap ID 0x63af masih ada di git history
   git log -p --all -S "0x63af2ef268e8ab668201807c1b8452210b43d2adfe8562bac96db8b3bfbb7e4f"
   ```
   Jika ID ini pernah ada di commit sebelumnya, perlu di-rotasi setelah deploy baru:
   ```bash
   # Di Sui testnet, publish ulang package → dapat TreasuryCap baru
   sui move publish
   # Update TREASURY_CAP_ID di .env.local dengan ID baru
   ```

2. **File .env.local:**
   Pastikan `.env.local` hanya berisi nilai yang benar untuk deploy saat ini. Jika TreasuryCap ID lama sudah tidak valid, bisa diabaikan.

3. **Keamanan jangka panjang:**
   Untuk mainnet, jangan pernah menyimpan private key / TreasuryCap ID di file apapun. Gunakan:
   - Secret manager (Vercel Environment Variables, AWS Secrets Manager, etc.)
   - Atau Sui KMS / multisig untuk TreasuryCap

## Status
✅ FIXED — lanjut ke CRITICAL #4
