# Suivan — Master Plan

**Status:** 16 Juni 2026, 120 tests pass, deployed to testnet
**Target:** Hackathon-ready demo in front of judges

---

## INVENTORY

| Component | Count | Status |
|---|---|---|
| Move modules | 9 source + 7 seal-library | ✅ |
| Move tests | 120 tests, 5 files | ✅ All pass |
| API routes | 9 endpoints | ✅ |
| Frontend pages | 27 files, 11 routes | ✅ |
| React hooks | 9 hooks | ✅ |
| Config files | 10 files | ✅ |

---

## FASE 1: AGENT FULL AUTO — PRIORITY #1

### Task 1.1 — Fix Delegate + Test Auto Flow
- [ ] Test "Delegate to Agent" dari UI (udah difix `tx.transferObjects`)
- [ ] Verifiy PoolAdminCap berpindah ke agent address `0x0c60...`
- [ ] Bikin pool baru: 10 USDC, 2 orang, 1 menit
- [ ] Admin delegate → agent
- [ ] Participant 2 join
- [ ] Keduanya deposit 10 USDC
- [ ] Panggil `GET /api/agent/cron`
- [ ] Verifikasi: pool auto-start → auto-select cycle 1 → auto-select cycle 2 → end
- [ ] Participant withdraw payout
- [ ] Claim collateral

### Task 1.2 — Agent Production Ready
- [ ] Set `AGENT_SECRET_KEY` di Vercel env vars
- [ ] Setup Vercel Cron Jobs → `/api/agent/cron` setiap 30 detik
- [ ] Test dari Vercel URL

### Task 1.3 — Admin Delegation UX
- [ ] Setelah delegate, lifecycle control harus berubah ke "Delegated"
- [ ] Sembunyikan tombol Start/Select Winner dari non-admin
- [ ] Tampilkan status agent ("Agent: auto-running" / "Agent: waiting")

---

## FASE 2: YIELD + DEPLOYMENT — PRIORITY #2

### Task 2.1 — Collateral Yield
- [ ] Agent auto-deposits idle `pool_funds_balance` ke DeepBook
- [ ] Verifikasi profit masuk ke `yield_balance`
- [ ] Tampilkan yield progress di detail pool

### Task 2.2 — Jackpot Gacha
- [ ] Verifikasi gacha berjalan di `end_pool_internal`
- [ ] Verifikasi jackpot dibayar dari `yield_balance`
- [ ] Tampilkan pemenang jackpot di UI

### Task 2.3 — Yield Display
- [ ] Tampilkan "Cumulative Yield (Jackpot)" di pool detail
- [ ] Tampilkan "Collateral Yield (Proportional)" di pool detail
- [ ] APY real-time dari on-chain data

---

## FASE 3: FRONTEND FINAL POLISH — PRIORITY #3

### Task 3.1 — Remove "Custom Pool" Default Name
- [ ] Pool name auto-fill dari input, bukan "Custom Pool"
- [ ] Handle empty name dengan graceful fallback

### Task 3.2 — Winner Display Improvements
- [ ] Winner card: full width, lebih prominent
- [ ] Cycle winners list: semua cycle jelas
- [ ] Winner address: clickable link ke SuiScan

### Task 3.3 — Auto-Refresh Improvements
- [ ] Real-time update setelah transaksi (bukan 15 detik polling)
- [ ] Invalidate queries pas select winner / deposit / claim sukses

### Task 3.4 — Mobile Responsive
- [ ] Test di mobile (Galaxy S20 / iPhone 12)
- [ ] Cek overflow, button size, modal scroll
- [ ] Perbaiki jika ada yang pecah

### Task 3.5 — Pause Mechanism
- [ ] Test pause/unpause dari UI
- [ ] Verifikasi semua operasi terblokir saat paused
- [ ] Verifikasi operasi normal kembali setelah unpause

---

## FASE 4: VERCEL PRODUCTION — PRIORITY #4

### Task 4.1 — Vercel Env Vars
- [ ] Set semua env vars di Vercel dashboard
- [ ] Redeploy
- [ ] Verifikasi frontend jalan di production URL

### Task 4.2 — Custom Domain (Optional)
- [ ] Setup domain jika ada
- [ ] SSL/TLS auto dari Vercel

### Task 4.3 — Demo Recording
- [ ] Rekam full flow 5 menit
- [ ] Mulai dari faucet → create pool → join → deposit → select winner → withdraw → claim
- [ ] Tunjukkan Agent auto-run
- [ ] Tunjukkan Yield/jackpot jika sudah selesai

---

## FASE 5: DOCUMENTATION — PRIORITY #5

### Task 5.1 — Handoff docs
- [ ] Update MENTOR_HANDOFF.md dengan flow terbaru
- [ ] Update README.md dengan cara run local
- [ ] Contract deployment instructions

### Task 5.2 — Demo script
- [ ] Bikin skrip demo 5 menit
- [ ] Tulis poin-poin yang harus disebutkan
- [ ] Highlight: collateral formula, winner escrow, seal randomness, agent auto

---

## EXECUTION ORDER

```
Fase 1 (60 min) → Fase 2 (30 min) → Fase 3 (30 min) → Fase 4 (15 min) → Fase 5 (15 min)
```

Total: ~2.5 jam

---

## CHECKLIST BEFORE JUDGING

- [ ] 120/120 Move tests pass
- [ ] TypeScript 0 errors
- [ ] 3 wallet bisa join + deposit + select winner + withdraw + claim
- [ ] Agent handle start + select winner auto
- [ ] Jackpot/yield terlihat di UI
- [ ] Demo video siap
- [ ] Link Vercel production ready
