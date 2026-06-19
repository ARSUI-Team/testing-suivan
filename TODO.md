# TODO — Suivan Final Sprint

**Target:** Hackathon-ready | **Estimasi:** 2.5 jam

---

## 🔴 FASE 1: AGENT FULL AUTO (60 min)

| Done | Task |
|---|---|
| ⬜ | 1.1 Bikin pool baru: 10 USDC, 2 org, 1 menit |
| ⬜ | 1.2 Admin delegate PoolAdminCap ke agent |
| ⬜ | 1.3 Participant 2 join pool |
| ⬜ | 1.4 Admin + participant deposit 10 USDC |
| ⬜ | 1.5 Panggil `GET /api/agent/cron` |
| ⬜ | 1.6 Verifiy: pool start auto |
| ⬜ | 1.7 Verifiy: select winner cycle 1 auto |
| ⬜ | 1.8 Panggil cron lagi setelah cycle 2 deadline |
| ⬜ | 1.9 Verifiy: select winner cycle 2 auto → pool ended |
| ⬜ | 1.10 Winner withdraw payout |
| ⬜ | 1.11 All claim collateral |
| ⬜ | 1.12 Set AGENT_SECRET_KEY di Vercel |
| ⬜ | 1.13 Setup Vercel Cron Job `/api/agent/cron` |

---

## 🟠 FASE 2: YIELD + JACKPOT (30 min)a

| Done | Task |
|---|---|
| ⬜ | 2.1 Deploy idle pool funds ke DeepBook via CLI |
| ⬜ | 2.2 Verifiy yield_balance > 0 setelah pool ended |
| ⬜ | 2.3 Verifiy jackpot gacha berjalan (1 peserta dapet semua) |
| ⬜ | 2.4 Tampilkan "Cumulative Yield (Jackpot)" di pool detail |
| ⬜ | 2.5 Tampilkan "Collateral Yield (Proportional)" di pool detail |
| ⬜ | 2.6 APY real-time dari on-chain data |

---

## 🟡 FASE 3: FRONTEND POLISH (30 min)

| Done | Task |
|---|---|
| ⬜ | 3.1 Pool name jangan default "Custom Pool" |
| ⬜ | 3.2 Winner card: tambah prominent |
| ⬜ | 3.3 Winner address clickable ke SuiScan |
| ⬜ | 3.4 Auto-refresh instant setelah tx sukses |
| ⬜ | 3.5 Test mobile responsive |
| ⬜ | 3.6 Test pause/unpause dari UI |
| ⬜ | 3.7 Hapus semua tombol yang bukan untuk current user |
| ⬜ | 3.8 Sembunyikan start/select winner dari non-admin |

---

## 🟢 FASE 4: VERCEL PRODUCTION (15 min)

| Done | Task |
|---|---|
| ⬜ | 4.1 Set 7 env vars di Vercel dashboard |
| ⬜ | 4.2 Redeploy |
| ⬜ | 4.3 Test semua fitur dari Vercel URL |
| ⬜ | 4.4 Kirim production URL ke mentor |

---

## 🔵 FASE 5: DEMO + DOCS (15 min)

| Done | Task |
|---|---|
| ⬜ | 5.1 Rekam demo video 5 menit |
| ⬜ | 5.2 Update MENTOR_HANDOFF.md |
| ⬜ | 5.3 Bikin skrip demo |
| ⬜ | 5.4 Taruh link demo di README |

---

## Quick Commands

```bash
# Start frontend
cd fe-suivan && rm -rf .next && npm run dev

# Move tests
cd contracts && sui move test

# Agent cron
open http://localhost:3000/api/agent/cron

# Automation status
curl "http://localhost:3000/api/automation/status?poolId=0x..."
```
