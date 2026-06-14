# Yield and Collateral Logic Handoff

Tanggal update: 14 Juni 2026

Dokumen ini menjelaskan perubahan logic yield, collateral, jackpot, dan penanganan member yang berhenti membayar setelah menerima payout. Gunakan dokumen ini untuk review tim, testing, deployment, dan handoff.

## Tujuan Perubahan

Logic yang dituju:

1. Yield collateral dan yield iuran bulanan disimpan serta dibagikan melalui jalur berbeda.
2. Yield collateral dibagikan secara proporsional kepada member aktif saat pool berakhir.
3. Yield iuran bulanan tidak ikut payout tiap siklus. Yield tersebut dikumpulkan di `yield_balance` dan menjadi jackpot akhir.
4. Jackpot akhir dikocok memakai Seal seed bila tersedia, dengan fallback transaction digest untuk environment testing.
5. Collateral harus mampu melindungi sisa komitmen pembayaran jika member menerima payout lebih awal lalu berhenti membayar.
6. Eksekusi collateral untuk pembayaran yang terlewat harus dihitung sebagai kontribusi siklus, sehingga pool tidak macet.

## Perubahan Yang Dibuat

### Smart Contract

File utama:

- `contracts/sources/arisan_pool.move`
- `contracts/tests/arisan_pool_tests.move`

Perubahan:

- Rumus collateral berubah dari:

  ```text
  deposit_amount * 125%
  ```

  menjadi:

  ```text
  deposit_amount * (max_participants - 1) * 125%
  ```

- Rumus baru merepresentasikan 125% dari sisa komitmen maksimal setelah member menerima satu payout.
- `create_pool` dan `join_pool` sekarang memvalidasi collateral menggunakan rumus yang sama.
- `slash_collateral` sekarang:
  - mengambil satu nilai iuran dari collateral untuk pembayaran yang terlewat;
  - menambah dana tersebut ke `pool_funds_balance`;
  - menandai `deposits_this_cycle = true`;
  - memperbarui `last_deposit_cycle`;
  - menambah `active_depositors_count`;
  - mengurangi leaderboard score dan menambah `missed_payments`;
  - menonaktifkan member jika collateral habis.
- Jika sisa collateral tidak cukup untuk membayar satu iuran penuh, sisa tersebut tidak dianggap sebagai pembayaran siklus penuh.
- Yield iuran tetap berada di `yield_balance` dan tidak ditambahkan ke payout pemenang setiap siklus.
- Jackpot akhir menggunakan Seal seed jika tersedia. Seed jackpot diberi salt berbeda dari pemilihan winner siklus.
- Yield collateral tetap berada di `collateral_yield_balance` dan dicatat sebagai entitlement proporsional saat pool berakhir.

### Frontend dan API

File terkait:

- `fe-suivan/src/lib/poolMath.ts`
- `fe-suivan/src/hooks/useSuiContracts.ts`
- `fe-suivan/src/app/pools/page.tsx`
- `fe-suivan/src/app/pools/[address]/page.tsx`
- `fe-suivan/src/app/api/sponsor/route.ts`

Perubahan:

- Ditambahkan helper bersama `getRequiredCollateralAmount`.
- Create pool, join pool, detail pool, dan sponsor API memakai rumus collateral yang sama.
- Tampilan required collateral sekarang menunjukkan total collateral untuk sisa komitmen, bukan hanya 125% dari satu iuran.
- Simulator sebelumnya sudah memakai konsep `deposit * (participants - 1) * 1.25`, sehingga sekarang konsisten dengan kontrak.

## Contoh Perhitungan

Pool:

- Iuran: 25 USDC
- Jumlah member: 8
- Collateral multiplier: 125%

Perhitungan:

```text
remaining cycles = 8 - 1 = 7
base commitment = 25 * 7 = 175 USDC
required collateral = 175 * 125% = 218.75 USDC
```

Frontend melakukan pembulatan ke atas menjadi `219 USDC`.

## Alur Member Kabur

Contoh:

1. Member mendapatkan payout pada siklus awal.
2. Pada siklus berikutnya member tidak membayar.
3. Setelah deadline siklus, admin menjalankan `slash_collateral`.
4. Kontrak mengambil satu iuran dari collateral member.
5. Dana masuk ke `pool_funds_balance`.
6. Member dianggap sudah memenuhi pembayaran siklus melalui collateral.
7. Pool dapat lanjut ke pemilihan winner.
8. Proses diulang pada siklus berikutnya jika member kembali tidak membayar.
9. Member dinonaktifkan ketika collateral habis.

Catatan: admin tetap perlu mengeksekusi `slash_collateral` untuk member yang belum membayar sebelum `select_winner`. Otomatisasi keeper/agent belum ditambahkan dalam perubahan ini.

## Pemisahan Yield

### Yield Collateral

- Sumber: hasil deployment collateral.
- Penyimpanan: `collateral_yield_balance`.
- Distribusi: proporsional berdasarkan collateral member yang masih aktif saat pool berakhir.
- Klaim: digabung dengan pengembalian collateral melalui `claim_final`.

### Yield Iuran Bulanan

- Sumber: profit dari deployment dana iuran.
- Penyimpanan: `yield_balance`.
- Distribusi: jackpot satu kali saat pool selesai.
- Peserta jackpot: member aktif dengan leaderboard score lebih dari nol.
- Bobot tiket: `1 + leaderboard_score / TICKET_SCALE`.
- Randomness: Seal seed jika tersedia, fallback transaction digest untuk testing.

## Cara Testing Frontend

Jalankan dari folder `fe-suivan`:

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Checklist manual:

1. Buka `/pools`.
2. Buka modal create pool.
3. Isi iuran `25` dan jumlah member `8`.
4. Pastikan required collateral tampil `219 USDC`.
5. Buat pool dengan wallet yang memiliki USDC mencukupi.
6. Buka detail pool.
7. Pastikan nilai collateral di detail juga `219 USDC`.
8. Join menggunakan wallet lain dan pastikan transaksi meminta nilai collateral yang sama.
9. Pastikan wallet dengan saldo kurang mendapat error yang jelas dan transaksi tidak berhasil.

## Cara Testing Smart Contract

Sui CLI wajib tersedia:

```powershell
sui --version
cd contracts
sui move build
sui move test
```

Test penting yang harus diverifikasi:

1. `required_collateral` memakai `(max_participants - 1)`.
2. Create dan join gagal jika collateral kurang satu unit.
3. Create dan join berhasil dengan collateral tepat sesuai requirement.
4. Slash penuh satu iuran menandai member sudah deposit pada siklus itu.
5. `active_depositors_count` bertambah setelah slash yang menutup satu iuran.
6. Winner selection dapat berjalan setelah seluruh non-payer dieksekusi collateral-nya.
7. Repeated slash mengurangi collateral per siklus.
8. Member menjadi inactive saat collateral habis.
9. Yield iuran tidak masuk payout winner per siklus.
10. Jackpot akhir menghabiskan `yield_balance` dan hanya memilih member aktif.
11. `claim_final` mengembalikan sisa collateral dan entitlement yield collateral.

Pada mesin audit ini, `npm.cmd run lint` dan `npm.cmd run build` sudah berhasil. Test Move belum dapat dijalankan karena Sui CLI belum terpasang.

## Testing End-to-End Testnet

Setelah contract baru dipublish:

1. Update package ID dan shared object ID di konfigurasi FE.
2. Buat pool kecil, misalnya 3 member dengan iuran 10 USDC.
3. Pastikan required collateral adalah:

   ```text
   10 * (3 - 1) * 125% = 25 USDC
   ```

4. Join dengan dua wallet lain.
5. Start pool.
6. Bayar iuran dari semua wallet dan pilih winner siklus pertama.
7. Pada siklus kedua, jangan bayar dari wallet winner pertama.
8. Jalankan `slash_collateral` untuk wallet tersebut.
9. Pastikan status deposit wallet berubah menjadi sudah dibayar melalui collateral.
10. Pilih winner siklus kedua dan pastikan pool tidak macet.
11. Deposit yield collateral dan yield iuran menggunakan flow test yang tersedia.
12. Selesaikan seluruh siklus.
13. Pastikan:
    - jackpot dibayar dari `yield_balance`;
    - collateral yield tidak ikut jackpot;
    - member aktif dapat menjalankan `claim_final`;
    - nilai collateral yang kembali sudah dikurangi seluruh slash.

## Breaking Changes

Perubahan rumus collateral adalah perubahan perilaku kontrak.

- Pool lama yang sudah terbuat tetap menyimpan konfigurasi lama dan collateral yang sudah disetor.
- FE baru dapat menghitung collateral lebih besar daripada yang diwajibkan package lama.
- Contract baru tidak otomatis mengubah pool lama.
- Jangan memakai FE baru untuk production/testnet lama sebelum package dan factory ID diselaraskan.
- Publish contract baru akan menghasilkan package ID dan kemungkinan factory/faucet object ID baru.
- Semua environment variable, hardcoded config, sponsor route, explorer link, dan dokumentasi deployment harus diperbarui setelah publish.

## Yang Perlu Diketahui Teman Satu Tim

### Smart Contract Team

- Review formula collateral dan overflow boundary dengan `u128`.
- Jalankan seluruh Move test, bukan hanya `arisan_pool_tests`.
- Periksa kompatibilitas syntax randomness/Seal dengan versi Sui testnet yang dipakai.
- Publish package baru dan catat semua object ID baru.
- Jangan menganggap pool lama otomatis termigrasi.

### Frontend Team

- Gunakan `getRequiredCollateralAmount`; jangan menulis ulang rumus `125%` secara manual.
- Required collateral bergantung pada `maxParticipants`.
- Pastikan saldo dan coin selection mampu menangani collateral yang lebih besar.
- Setelah redeploy contract, update `SUI_PACKAGE_ID`, `SUI_FACTORY_ID`, `SUI_USDC_TYPE`, dan ID terkait.

### Backend/Sponsor Team

- Sponsor route create pool sudah memakai rumus baru.
- Validasi request harus tetap membatasi deposit amount dan max participants.
- Pastikan relayer tidak menggunakan package/factory ID lama.
- Endpoint sponsor masih perlu autentikasi, rate limiting, dan pembatasan action sebelum production.

### QA Team

- Fokus pada winner awal yang berhenti membayar.
- Test repeated missed payments sampai collateral habis.
- Test batas collateral tepat, kurang satu unit, dan berlebih.
- Pastikan jackpot dan collateral yield tidak tercampur.
- Test pool lama dan pool baru secara terpisah.

### Product Team

- Copy produk harus konsisten: collateral adalah 125% dari sisa komitmen, bukan 125% dari satu iuran.
- Jelaskan bahwa collateral dapat dipakai otomatis oleh admin/agent untuk menutup iuran yang terlewat.
- Jelaskan bahwa yield iuran menjadi jackpot akhir, sedangkan yield collateral dibagikan proporsional.

## Pesan Untuk Grup Tim

Gunakan pesan berikut untuk update singkat:

> Update logic yield dan collateral sudah dibuat. Required collateral sekarang dihitung sebagai 125% dari sisa komitmen: `deposit x (jumlah member - 1) x 125%`. Jika member sudah mendapat payout lalu berhenti membayar, admin dapat menjalankan slash collateral per siklus dan hasil slash dihitung sebagai iuran siklus supaya pool tidak macet. Yield collateral tetap dibagikan proporsional saat akhir pool, sedangkan yield iuran dikumpulkan menjadi jackpot akhir dengan Seal seed/fallback randomness. Perubahan ini membutuhkan publish ulang contract, update package/factory IDs di FE dan sponsor API, lalu full Move test dan E2E testnet. Pool lama tidak otomatis termigrasi.

## Update Withdraw Pemenang

Payout arisan tidak lagi langsung dikirim oleh transaksi `select_winner`.

- `select_winner` memindahkan payout siklus ke `winner_payout_balance`.
- Participant pemenang menyimpan `pending_winner_payout`.
- Hanya alamat pemenang tersebut yang dapat menjalankan `claim_winner_payout`.
- Admin, agent, creator, dan member lain tidak dapat menentukan alamat penerima.
- Setelah klaim, nilai pending menjadi nol dan `winner_payout_claimed` menjadi `true`.
- Klaim tetap tersedia ketika pool sudah selesai atau sedang dipause, agar hak dana pemenang tidak terkunci.
- FE menampilkan nilai payout yang tersedia dan tombol `Withdraw Winner Payout`.
- Hook `claim_final` juga diperbaiki agar Coin hasil klaim benar-benar ditransfer ke wallet dan tidak menjadi unused transaction result.
- Parser participant dynamic field diperbaiki agar membaca wrapper `value.fields` dari RPC Sui; sebelumnya status participant dapat terbaca nol/false.

Perubahan layout `ArisanPool` dan `Participant` ini adalah breaking change. Gunakan package baru dan pool baru untuk E2E. Jangan menganggap object pool lama otomatis kompatibel.

## Update Status dan Automasi

Status pool sekarang dihitung otomatis dari state on-chain dan waktu lokal:

| Status | Kondisi |
| --- | --- |
| `open` | Belum penuh dan belum dimulai |
| `ready` | Sudah penuh dan siap `start_pool` |
| `active` | Siklus berjalan dan deadline belum tercapai |
| `action_required` | Deadline siklus tercapai; perlu slash/draw |
| `completed` | Pool sudah berakhir |

Implementasi automasi memakai aturan deterministik, bukan keputusan AI:

- Helper lifecycle: `fe-suivan/src/lib/poolLifecycle.ts`.
- Planner API read-only: `GET /api/automation/status?poolId=<POOL_ID>`.
- Planner membaca participant aktif, deposit siklus berjalan, deadline, dan kepemilikan `PoolAdminCap` oleh agent.
- Planner mengembalikan urutan rekomendasi `start_pool`, `slash_collateral`, dan `select_winner`.
- Endpoint tidak menyimpan private key dan tidak menandatangani transaksi.
- Eksekusi production sebaiknya memakai keeper/cron dengan signer terpisah, secret manager, allowlist package/object, monitoring, dan retry idempotent.
- AI dapat dipakai untuk monitoring atau penjelasan, tetapi tidak diperlukan untuk menentukan lifecycle yang aturannya sudah pasti.

Contoh pemeriksaan planner:

```bash
curl "http://localhost:3000/api/automation/status?poolId=0xPOOL_ID"
```

Field penting pada response:

- `lifecycle.status`
- `lifecycle.nextAction`
- `lifecycle.cycleDeadlineMs`
- `missingDeposits`
- `delegatedToAgent`
- `recommendedTransactions`
- `executionMode: "planner_only"`

## Testing Withdraw dan Automasi

1. Publish contract/package baru dan update ID di `fe-suivan/src/config/suiConstants.ts`.
2. Buat pool minimal dua member, start, lalu setor dari semua member.
3. Setelah deadline, jalankan `select_winner`.
4. Pastikan wallet pemenang belum menerima payout otomatis.
5. Pastikan participant pemenang memiliki `pending_winner_payout > 0`.
6. Coba klaim dari wallet non-pemenang; transaksi harus abort.
7. Klaim dari wallet pemenang; saldo wallet harus bertambah sesuai payout.
8. Coba klaim kedua kali; transaksi harus abort.
9. Pastikan `winner_payout_balance` dan pending participant berkurang tepat.
10. Uji status `open`, `ready`, `active`, `action_required`, dan `completed`.
11. Panggil planner sebelum dan sesudah deadline.
12. Simulasikan satu member tidak setor; planner harus merekomendasikan slash participant tersebut sebelum draw.
13. Jalankan lint dan build FE.
14. Jalankan seluruh Move tests setelah Sui CLI tersedia.

## Update Untuk Teman Satu Tim

- Smart contract: review escrow solvency, winner-only authorization, double-claim prevention, dan kompatibilitas package upgrade.
- Frontend: gunakan status lifecycle baru; jangan memetakan pool penuh sebagai `active`.
- Backend/agent: planner saat ini read-only. Jangan menambahkan private key ke route Next.js.
- QA: payout sekarang pull-based, jadi test lama yang menunggu coin otomatis harus diubah menjadi flow claim.
- DevOps: scheduler/keeper harus memiliki observability, retry, dan alarm ketika transaksi slash/draw gagal.
- Product: copy UI harus menjelaskan bahwa pemenang perlu withdraw sendiri setelah draw.

Pesan update singkat:

> Withdraw pemenang sudah diubah menjadi pull-based escrow: saat draw, payout dicatat sebagai pending dan hanya wallet pemenang yang bisa withdraw. Status pool sekarang otomatis menjadi Open, Ready, Active, Action Required, atau Completed berdasarkan state dan deadline. Ditambahkan planner API read-only untuk keeper/cron yang merekomendasikan start, slash member yang belum setor, lalu select winner. AI tidak dipakai sebagai pengambil keputusan lifecycle karena rule-nya deterministik. Perubahan struct contract bersifat breaking, jadi perlu package/pool baru, update config, full Move test, dan E2E testnet.

## Status

- [x] Contract logic diperbarui.
- [x] Rumus FE dan sponsor API diselaraskan.
- [x] Unit test expectation diperbarui.
- [x] Frontend lint berhasil.
- [x] Frontend production build berhasil.
- [x] Winner payout escrow dan winner-only withdraw dibuat.
- [x] Status lifecycle otomatis dibuat.
- [x] Automation planner read-only dibuat.
- [x] Dokumentasi handoff withdraw/automation dibuat.
- [ ] Sui Move build dijalankan.
- [ ] Seluruh Sui Move test berhasil.
- [ ] Contract baru dipublish ke testnet.
- [ ] Package dan object ID baru dimasukkan ke FE/API.
- [ ] E2E testnet selesai.
- [ ] Tim diberi update dan menyetujui perubahan ekonomi.
