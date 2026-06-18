# Faucet Changelog — Suivan ROSCA

> Semua perubahan pada sistem faucet testnet, dari awal hingga final.

---

## Daftar Isi

1. [Ringkasan](#ringkasan)
2. [Kronologi Perubahan](#kronologi-perubahan)
3. [Detail Perubahan per Komponen](#detail-perubahan-per-komponen)
4. [Arsitektur Faucet](#arsitektur-faucet)
5. [Kelebihan & Keputusan Desain](#kelebihan--keputusan-desain)

---

## Ringkasan

Faucet adalah sistem pemberian token testnet (500 TEST_USDC per claim) untuk memungkinkan pengguna mencoba fitur Suivan tanpa modal nyata. Dikembangkan melalui **23+ commit** dengan iterasi dari backend-only → hybrid (backend + wallet langsung) → final dengan sponsor fallback.

**Angka penting:**
| Metrik | Nilai |
|---|---|
| Jumlah per claim | **500 USDC** |
| Cooldown | **24 jam** (86.400 detik) |
| Jaringan | **Sui Testnet** |
| Package ID | `0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825` |
| Faucet ID (shared) | `0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4` |

---

## Kronologi Perubahan

### Fase 1: Initial Faucet (`bf875b3` — `c25024a`)
- **Awal**: Backend-only via `/api/sponsor` — user mengklaim dari halaman faucet, backend menandatangani & mengirim tx
- **Jumlah**: 10,000 TEST_USDC per claim
- **Cooldown**: 30 detik (testing)
- **CSS**: Brutalist style dengan header

### Fase 2: Wallet Direct Call (`bf875b3`)
- **Perubahan besar**: Berpindah dari backend-only ke **wallet langsung** (user sign dari dompet sendiri via `useSignAndExecuteTransaction`)
  - Lebih transparan — user lihat tx di wallet mereka
  - Tidak perlu backend running
  - Gas dibayar user
- **`useClaimUSDC` hook** dibuat: panggil `faucet::claim_test_usdc` langsung dari frontend
- Sponsor API tetap ada sebagai **fallback** untuk user tanpa gas (via deployer key)
- **Hapus dependensi**: `TEST_SUI` type, `TreasuryCap` dari env var
- Update `networkConfig.ts` + `sui.ts` dengan package/faucet IDs baru

### Fase 3: Deploy Real (`9edf848` — `dda4210`)
- Deploy ulang ke testnet dengan package ID final
- Update semua config: `networkConfig.ts`, `sui.ts`, `sponsor/route.ts`
- Fix `FACTORY_ID` & `FAUCET_ID` const di sponsor route
- **Set `SPONSOR_SECRET_KEY`** di Vercel — ed25519 key deployer

### Fase 4: Auto-Refresh (`cba0e8b` — `cb94cba`)
- `useUSDCBalance` otomatis **refetch setiap 3 detik** (`refetchInterval: 3000`)
- Manual refetch setelah claim berhasil — balance langsung update tanpa nunggu 3 detik
- Ini critical untuk UX: setelah claim 500 USDC, saldo harus langsung terlihat

### Fase 5: History + TX Hash (`49b689d` — `25c828d`)
- **Claim history disimpan ke localStorage** — tidak hilang saat refresh
- Setiap entry: token, amount, timestamp, **tx digest**
- Tanggal + waktu dengan **timezone** (format `HH:MM:SS GMT+7`)
- **Tx digest** ditampilkan dengan `0xabc12345…6789` + **SuiScan link** (`suiscan.xyz/testnet/tx/{digest}`)
- Link explorer selalu muncul — bahkan saat digest masih `undefined` (fallback "View on SuiScan")

### Fase 6: Sponsor Fallback (`27ca672`)
- **Dual-mode claim**:
  1. Coba langsung dari wallet user (sign with wallet)
  2. Jika gagal (insufficient gas/etc) → **fallback ke sponsor API** (backend sign pakai deployer key)
- Error handling: tangkap error dari `useSignAndExecuteTransaction`, trigger `trySponsor()`
- Prevent infinite retry dengan `lastErrorRef` tracking

### Fase 7: UX Polish (`3abc6e9` — `a052093`)
- **Step-by-step subtitle**: "Step 1: Get free SUI for gas. Step 2: Claim 500 USDC..."
- **Tx hash capture reaktif**: via `useEffect` pada `hash` (bukan callback `mutate` — react-query v5 sudah deprecated)
- **Rate limit message**: "Next claim available in **24:00:00**. Need more USDC? Get SUI first..."
- **Progress bar** di button selama cooldown
- **Cooldown 24 jam** (`FAUCET_COOLDOWN_S = 86400`) — serius!
- **Format HH:MM:SS** — bukan "30s", tapi `🕐 00:00:28`

### Fase 8: SUI Faucet External Link (`5e1eec5` — `92737c5`)
- **SUI faucet** API langsung gagal dengan **429 Too Many Requests**
- Solusi: **external link** ke `faucet.testnet.sui.io` — buka tab baru
- Tampilkan sebagai card dengan `ExternalLink` icon, bukan button yang bisa diklik & gagal

---

## Detail Perubahan per Komponen

### 1. `fe-suivan/src/app/faucet/page.tsx` (423 lines)

**File final — perubahan dari awal sampai akhir:**

| Area | Awal | Akhir |
|---|---|---|
| Claim method | Backend-only (`fetch /api/sponsor`) | Wallet langsung + sponsor fallback |
| Jumlah | 10,000 USDC | 500 USDC |
| Cooldown | 30 detik | 24 jam (86400s) |
| Cooldown display | "30s remaining" | `🕐 00:00:28` (HH:MM:SS) |
| Progress bar | — | Ada di bawah button selama cooldown |
| Balance refresh | Manual reload | Auto 3s refetch + manual refetch setelah claim |
| TX Hash | Tidak ditampilkan | `0xabc12345…6789` + SuiScan link |
| Claim history | Tidak ada | localStorage, persist antar session |
| Delete history | — | Per-entry (hover → × button) |
| Date/time | — | Tanggal + waktu dengan timezone |
| SUI faucet | Inline API call (gagal 429) | External link ke `faticet.testnet.sui.io` |
| Step-by-step guide | — | "Step 1: Get SUI. Step 2: Claim USDC." |
| Error handling | Basic toast | Sponsor fallback + error deduplication |

### 2. `fe-suivan/src/hooks/useSuiContracts.ts`

**Perubahan pada hooks terkait faucet:**

#### `useClaimUSDC()` (line 643)
```typescript
// Hook baru — claim langsung dari wallet user
export function useClaimUSDC() {
  const { mutate: signAndExecute, isPending, data, error } = useSignAndExecuteTransaction();
  const claimUSDC = (faucetId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::faucet::claim_test_usdc`,
      arguments: [tx.object(faucetId), tx.object(CLOCK_ID)],
    });
    signAndExecute({ transaction: tx }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suivan"] }),
    });
  };
  return { claimUSDC, hash: data?.digest, isPending, isSuccess: !!data, error };
}
```

#### `useUSDCBalance()` (line 375)
```typescript
// Auto-refresh 3 detik — krusial untuk UX faucet
refetchInterval: 3000,  // tambahan
staleTime: 0,
refetchOnMount: true,
refetchOnWindowFocus: true,
```

### 3. `fe-suivan/src/context/LanguageContext.tsx`

**Translasi faucet (36 key):**

| Key | English | Indonesian |
|---|---|---|
| `faucet.badge` | `test_faucet` | `test_faucet` |
| `faucet.title` | Get Test Tokens | Dapatkan Token Tes |
| `faucet.subtitle` | Step 1: Get free SUI for gas. Step 2: Claim 500 USDC… | Langkah 1: Dapatkan SUI gratis… Langkah 2: Klaim 500 USDC… |
| `faucet.success` | Tokens claimed successfully! | Token berhasil diklaim! |
| `faucet.error` | Faucet request failed | Permintaan faucet gagal |
| `faucet.cooldown` | Cooldown active. Try again in {time}s. | Cooldown aktif. Coba lagi dalam {time}s. |
| `faucet.recentTitle` | Recent Claims | Klaim Terbaru |
| `faucet.recentEmpty` | No claims yet… | Belum ada klaim… |
| `faucet.goToPools` | Go to Pools | Ke Pools |
| `faucet.balanceTitle` | Your Balances | Saldo Anda |

### 4. `contracts/sources/faucet.move` (104 lines)

**Smart contract Sui Move untuk faucet on-chain:**

```move
module suivan::faucet {
    const COOLDOWN_MS: u64 = 86_400_000;  // 24 jam
    const USDC_AMOUNT: u64 = 500_000_000; // 500 USDC (6 desimal)

    public struct Faucet has key {
        id: UID,
        usdc_cap: TreasuryCap<TEST_USDC>,  // TreasuryCap di DALAM shared object
        last_claims: Table<address, u64>,   // rate limiter per address
    }
}
```

**Key features:**
- `init_faucet()` — sekali panggil setelah publish, deposit TreasuryCap ke shared Faucet
- `claim_test_usdc()` — entry function, cek cooldown → mint → transfer
- `cooldown_remaining()` — view function untuk frontend
- `Claimed` event — emit setiap claim

### 5. `fe-suivan/src/app/api/sponsor/route.ts` (152 lines)

**Backend API untuk gas sponsorship:**

| Action | Fungsi |
|---|---|
| `claim_usdc` | Claim faucet atas nama user (deployer bayar gas) |
| `create_pool` | Buat pool baru (gas sponsorship) |
| `join_pool` | Join pool (gas sponsorship) |
| `make_deposit` | Deposit cycle (gas sponsorship) |

**Security:**
- Gunakan `SPONSOR_SECRET_KEY` dari env var (ed25519 deployer key)
- `tx.setSender(userAddress)` — tx atas nama user
- `tx.setGasOwner(sponsorAddress)` — gas dibayar deployer
- Return `{ digest, sponsor }` — transparan

### 6. `fe-suivan/src/config/sui.ts` + `networkConfig.ts`

```typescript
// ID final yang dipakai:
export const SUI_PACKAGE_ID = "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825";
export const SUI_FAUCET_ID  = "0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4";
export const SUI_FACTORY_ID = "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558";
```

- **Stale env vars dihapus**: `SUI_TREASURY_CAP`, `USDC_TREASURY_CAP`
- **Faucet ID** via `useFaucetId()` hook — reactive dari network config

---

## Arsitektur Faucet

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  faucet/page.tsx                                  │   │
│  │  ├── handleClaimDirect() ──► useClaimUSDC() ──────┼───┼──► Sui Wallet (sign tx)
│  │  │                         (sign with wallet)     │   │        │
│  │  │                                                 │   │        │ (gagal: no gas)
│  │  └── Error → trySponsor() ──► fetch POST /sponsor ─┼───┼──► Sponsor API
│  │                              (backend sign)        │   │        │
│  │                                                     │   │        ▼
│  │  ┌─────────────────────────────────────────────┐   │   │  Sui Testnet
│  │  │  useUSDCBalance() ← refetchInterval: 3000ms  │   │   │  faucet::claim_test_usdc
│  │  │                                              │   │   │      │
│  │  │  claimHistory ← localStorage                 │   │   │      ▼
│  │  │  txHash → SuiScan link                       │   │   │  500 USDC minted
│  │  └─────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Alur Claim:

1. User klik "Claim 500 USDC"
2. Cek cooldown localStorage — jika < 24 jam, tampilkan sisa waktu
3. Panggil `claimUSDC(faucetId)` — wallet signing muncul
4. **Jika sukses**: `useEffect` detek `hash` berubah → simpan history + refresh balance + cooldown 24h
5. **Jika gagal** (insufficient gas, etc): fallback ke sponsor API
6. Sponsor API: deployer sign tx + bayar gas → return `digest`
7. History ditampilkan dengan tx hash link ke SuiScan

---

## Kelebihan & Keputusan Desain

### 1. Priority: User Non-Web3 Friendly ✅

**Masalah:** Target user bukan crypto-native — mereka bingung dengan "gas", "sign transaction", dll.

**Solusi:**
- Subtitle step-by-step: "Step 1: Get SUI. Step 2: Claim USDC. Step 3: Explore Pools."
- Bahasa manusia: "Confirm in wallet..." bukan "Sign transaction"
- External link untuk SUI faucet — user dikirim ke halaman resmi Sui
- Rate limit message jelas: "Need more USDC? Get SUI first above, then claim again."

### 2. Reactive TX Hash — Bukan Callback ✅

**Masalah:** react-query v5 deprecated `mutate(vars, { onSuccess })`. Callback sering miss.

**Solusi:** `useEffect` pada `hash` dari mutation data:
```typescript
useEffect(() => {
  if (!txHash || txHash === lastSavedHash.current) return;
  lastSavedHash.current = txHash;
  if (claimStatus !== "loading") return;
  onClaimSuccess(txHash);
}, [txHash, claimStatus, onClaimSuccess]);
```
- Lebih reliable — trigger setiap kali `hash` change
- Bisa untuk gas sponsorship maupun wallet signing
- Idempotent dengan `lastSavedHash` (tidak double-trigger)

### 3. Sponsor Fallback ✅

**Masalah:** User baru tidak punya SUI untuk gas. Mereka perlu gas untuk claim faucet yang memberi mereka USDC — circular dependency.

**Solusi:** Dual-mode:
1. Coba wallet langsung (user punya gas → gratis untuk kita)
2. Fallback ke sponsor API (deployer bayar gas → scalable untuk demo)

**Efisiensi:** Hanya 1 tx sponsor per user (yang pertama) — selanjutnya user punya SUI sisa dari sponsor tx pertama.

### 4. Cooldown 24 Jam — Serius ✅

**Masalah:** Fake user/ bot bisa claim berkali-kali.

**Solusi:**
- Contract: `COOLDOWN_MS = 86_400_000` (24 jam) — enforced on-chain
- Frontend: localStorage + timer countdown
- Tampilan: `🕐 00:00:28` (format jam, bukan "30s lagi") — looks like a real rate-limited API
- Progress bar: visual sisa waktu di button

**Kenapa 24 jam?** Karena:
- 500 USDC cukup untuk join + 5x deposit dalam 1 pool
- Bot perlu menunggu 1 hari untuk claim lagi
- Kesan serius untuk juri hackathon

### 5. Coinflip Pattern (react-query v5) ✅

**Masalah:** react-query v5 menghapus `onSuccess` callback dari `mutate`.

**Solusi:** Reactive pattern — watch `data` / `hash` via `useEffect`:
```typescript
// ❌ Tidak: (v4 style, deprecated di v5)
mutate(vars, { onSuccess: (data) => handle(data) })

// ✅ React-query v5: 
const { data, mutate } = useMutation(...)
useEffect(() => { if (data) handle(data) }, [data])
```

Ini pattern yang sama dipakai di `useClaimUSDC` — watch `hash` dari mutation data.

### 6. Persist History ✅

**Masalah:** User claim, refresh halaman, history hilang — tidak profesional.

**Solusi:** localStorage dengan format:
```typescript
interface ClaimRecord {
  token: string;    // "usdc"
  amount: string;   // "500"
  time: number;     // Date.now()
  txDigest?: string; // "0xabc123..."
}
```
- Max 10 entries (buffer)
- Delete per entry (hover muncul × button)
- Format: "Apr 15 · 14:32:05 GMT+7"

### 7. SUI Faucet External Link ✅

**Masalah:** Public testnet faucet API (`https://faucet.testnet.sui.io/v1/gas`) memberi **429 Too Many Requests** karena IP rate limiting.

**Solusi:** Redirect ke halaman resmi `faucet.testnet.sui.io` sebagai external link (buka tab baru). Tampilkan sebagai card dengan:
- Icon `ExternalLink`
- "Get free SUI →" CTA
- Penjelasan: "SUI for gas fees"

### 8. Auto-Refresh Balance ✅

**Masalah:** Setelah claim, balance tidak update sampai user refresh manual.

**Solusi:**
- `refetchInterval: 3000` — auto refetch setiap 3 detik
- `refetch()` manual setelah claim success — langsung update tanpa nunggu interval

### 9. Network Config Cleanup ✅

**Masalah:** Banyak env var yang sudah tidak dipakai (`TEST_SUI`, `TreasuryCap`).

**Solusi:**
- Hapus `SUI_TREASURY_CAP`, `USDC_TREASURY_CAP` dari env
- Semua ID via `networkConfig.ts` + `sui.ts` — single source of truth
- `SPONSOR_SECRET_KEY` hanya di server (Vercel env var)

### 10. Smart Contract Design ✅

**Masalah:** TreasuryCap harus aman — tidak bisa dicuri.

**Solusi:**
- TreasuryCap disimpan **di dalam shared Faucet object** — bukan di deployer address
- Siapa pun bisa panggil `claim_test_usdc` — tidak perlu owner
- Rate limiter per-address via `Table<address, u64>` — on chain, tidak bisa diakali
- `Claimed` event untuk indexing

---

## Files Changed

| File | Lines | Perubahan |
|---|---|---|
| `fe-suivan/src/app/faucet/page.tsx` | 423 | Full rewrite (history, tx hash, cooldown UI, sponsor fallback) |
| `fe-suivan/src/hooks/useSuiContracts.ts` | 679 | Added `useClaimUSDC`, `refetchInterval: 3000` di `useUSDCBalance` |
| `fe-suivan/src/context/LanguageContext.tsx` | 735 | 36 faucet translation keys (EN + ID) |
| `fe-suivan/src/app/api/sponsor/route.ts` | 152 | Added `claim_usdc`, `FACTORY_ID`, `FAUCET_ID` consts |
| `fe-suivan/src/config/sui.ts` | 28 | Updated package/faucet/factory IDs, added `useFaucetId()` |
| `fe-suivan/src/config/networkConfig.ts` | — | Updated all IDs, removed stale vars |
| `contracts/sources/faucet.move` | 104 | 24h cooldown, 500 USDC, shared object pattern |
