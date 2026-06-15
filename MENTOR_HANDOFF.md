# Suivan — Mentor Handoff

**Date:** 16 Juni 2026 | **Branch:** main | **Deployed:** Vercel auto-deploy

---

## VERCEL ENVIRONMENT VARIABLES

Copy-paste semua ini ke Vercel Settings → Environment Variables:

```
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6
NEXT_PUBLIC_FACTORY_ID=0x70a934372b9508ca92e8b0ed11ca4bfb0a42d17d27c6fb7838f195b5cc74714d
NEXT_PUBLIC_FAUCET_ID=0xca8159a2315c30d0705232c95189e236462d7b74a0b153f5cd0866d7864e1862
NEXT_PUBLIC_USDC_TYPE=0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_usdc::TEST_USDC
NEXT_PUBLIC_AGENT_ADDRESS=0x0c605e48372c48178372abb66f4444ee3d25fe954bd9010879b6c9797e6ef061
AGENT_SECRET_KEY=suiprivkey1qrtyqemnzczr4htxce5m069n0ly9v3huzk5qnt83fnyvszazea9tctdv8p8
```

> **Note:** Setelah set env vars, klik **Redeploy** di Vercel.

---

## HOW TO TEST (FLOW UNTUK JURI)

### Step 1: Buka website
Buka Vercel deployment URL (misal `https://suivan.vercel.app`)

### Step 2: Connect wallet
Klik **Connect Wallet** → pilih Sui Wallet → approve

### Step 3: Claim USDC
Buka halaman **Faucet** → klik **Claim 500 USDC**

### Step 4: Create Pool
Buka **Pools** → **Create Pool**

| Field | Value |
|---|---|
| Cycle Deposit | 10 |
| Max Participants | 3 |
| Cycle Duration | 1 (Minutes) |

> Required Collateral: **25 USDC** (formula: `10 × (3-1) × 125%`)

### Step 5: Invite 2 other wallets to Join
Share pool link ke 2 wallet lain → mereka klik **Join Pool**

### Step 6: Start Pool
Admin klik **Start** → semua participant **deposit** 10 USDC

### Step 7: Select Winner (setelah 60 detik)
Admin klik **Winner** → auto-select dengan verifiable randomness (Seal)

### Step 8: Winner withdraws payout
Pemenang klik **Withdraw Winner Payout** → 30 USDC masuk wallet

### Step 9: Repeat deposit → select winner
Cycle 2 & 3 sama seperti di atas

### Step 10: Claim collateral
Pool ended → semua participant klik **Claim Collateral + Yield**

---

## AI AGENT (OPTIONAL — auto-run)

Agent bisa auto-start, auto-select winner, auto-slash missing deposits.

### Setup:
1. Admin klik **Delegate to Agent** di pool detail
2. Agent cron berjalan otomatis (atau panggil manual):
   ```
   GET /api/agent/cron
   ```

---

## KEY DEMO POINTS

| Fitur | Bukti |
|---|---|
| Collateral 125% dari sisa komitmen | `10 × 2 × 125% = 25 USDC` |
| Winner escrow (pull-based) | Pemenang harus withdraw manual |
| Verifiable randomness | Seal seed + on-chain seed source |
| Pause/unpause | Admin bisa emergency stop |
| Slashing | Potong collateral yang ga deposit |
| Jackpot gacha | Yield kumulatif dikocok di akhir |

---

## NOTES

- `AGENT_SECRET_KEY` hanya untuk testnet — **jangan dipake di mainnet**
- Semua tx gas dibayar user (bukan sponsor)
- Pool di factory lama ga akan muncul — factory baru kosong
- `Published.toml` di folder `contracts/` bisa diabaikan
