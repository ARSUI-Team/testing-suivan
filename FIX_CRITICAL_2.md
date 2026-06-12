# FIX: CRITICAL #2 — Rate Limiting + Input Validation di Sponsor API

## File yang diubah
- `fe-suivan/src/app/api/sponsor/route.ts` (rewrite)
- `fe-suivan/src/lib/rateLimiter.ts` (new file)

## Apa yang difix

### Masalah
Sponsor API tidak punya rate limiting, input validation, atau replay protection. Siapa pun bisa:
1. Spam API tanpa batas — menghabiskan SUI gas sponsor
2. Kirim parameter arbitrer (deposit amount -1, max participants 99999)
3. Replay request yang sama berkali-kali

### Solusi

**1. Rate Limiter (`rateLimiter.ts`):**
- Rate limit per **IP address** dan per **Sui address** (dual enforcement)
- Per-action rate limits:
  - `claim_usdc`: 3 request per 24 jam (faucet cooldown)
  - `create_pool`: 5 per 5 menit
  - `join_pool` / `make_deposit`: 20-30 per menit
  - `start_pool` / `select_winner` / `end_pool` / `slash`: 10 per menit
- Auto cleanup expired entries setiap 5 menit
- Response 429 + `Retry-After` header

**2. Input Validation (`validateSponsorRequest`):**
- `userAddress`: format Sui address (0x + 64 hex)
- `depositAmount`: 1 - 100,000 USDC
- `maxParticipants`: 2 - 50 (sesuai MAX_POOL_SIZE)
- `cycleDurationDays`: 1 - 365 hari
- `collateralAmount`: >0 - 1,000,000 USDC
- Semua required fields dicek per action

**3. Replay Protection:**
- `nonce` parameter opsional di request body
- Nonce yang sudah dipakai disimpan di Set (max 10,000 entries)
- Duplicate nonce → 409 Conflict

**4. Error Handling improved:**
- Bedakan 503 (RPC down) vs 500 (internal error) vs 502 (tx gagal) vs 501 (not configured)
- `SPONSOR_SECRET_KEY` placeholder check: return 501 jika masih `your_ed25519_private_key_hex`

**5. Gas Budget cap:**
- Hard cap `MAX_GAS_BUDGET = 50_000_000` (sebelumnya 10M, terlalu rendah untuk PTB kompleks)

## Yang harus dicek manual

1. **Build & start:**
   ```
   cd fe-suivan && npm run dev
   ```
   Pastikan tidak ada TypeScript error di `rateLimiter.ts`

2. **Test rate limit:**
   ```bash
   # Spam faucet claim > 3x dalam 24 jam → harus 429
   curl -X POST http://localhost:3000/api/sponsor \
     -H "Content-Type: application/json" \
     -d '{"action":"claim_usdc","userAddress":"0x0000000000000000000000000000000000000000000000000000000000000001"}'
   ```

3. **Test input validation:**
   ```bash
   # depositAmount > 100000 → harus 400
   curl -X POST http://localhost:3000/api/sponsor \
     -H "Content-Type: application/json" \
     -d '{"action":"create_pool","userAddress":"0x00...","usdcCoinId":"0x...","depositAmount":999999,"maxParticipants":5,"cycleDurationDays":30}'
   ```

4. **Test nonce replay:**
   ```bash
   # Kirim 2 request dengan nonce yang sama → kedua harus 409
   curl ... -d '{"action":"join_pool","userAddress":"0x...","poolId":"0x...","usdcCoinId":"0x...","collateralAmount":12.5,"nonce":"abc123"}'
   ```

5. **Test placeholder key:**
   Jika `SPONSOR_SECRET_KEY=your_ed25519_private_key_hex` → harus return 501

## Status
✅ FIXED — lanjut ke CRITICAL #3
