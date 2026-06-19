# Suivan — Sui Overflow 2026 DeFi Track

## CTO Directive: Operation #1

> **Target:** Juara 1 DeFi Track — Sui Overflow 2026
> **Timeline:** 4 Minggu (Hard Deadline: H-7 sebelum final submission)
> **Tim:** 3 Engineer (Backend, Frontend, Smart Contract)
> **Status:** MVP sudah live di `suivan.vercel.app` + testnet

---

## 1. Peta Kemenangan

### 1.1 Matrix Penilaian (Bobot)

| Kriteria | Bobot | Skor Saat Ini | Target |
|----------|-------|---------------|--------|
| **Real-World Application** | 50% | 75/100 | **95/100** |
| **Technical Execution** | 25% | 88/100 | **95/100** |
| **Product Quality** | 15% | 65/100 | **90/100** |
| **Innovation** | 10% | 85/100 | **95/100** |
| **Sui Ecosystem Alignment** | — | 90/100 | **98/100** |
| **Weighted Total** | — | 78/100 | **94/100** |

### 1.2 Gap Analysis — Di Mana Kita Kalah?

```
Real-World Application:  75 → 95  ❌ Tidak ada demo video, user flow tidak mulus
Technical Execution:     88 → 95  ❌ Belum ada automation agent, testing coverage < 80%
Product Quality:         65 → 90  ❌ UI brutalist belum konsisten, error handling minim, mobile belum responsif
Innovation:              85 → 95  ❌ AI agent masih rule-based, belum ada on-chain reputation
Sui Integration:         90 → 98  ❌ Belum integrate DeepBook beneran, Walrus belum optimal
```

### 1.3 Strategi Jitu

1. **Real-World Application (50%)** — ROSCA adalah produk nyata dengan 100M+ pengguna global. Kita harus demonstrasikan end-to-end flow yang mulus: dari zkLogin (Google) → buat pool → invite → cycle selesai → cair. Buat video demo 3 menit yang cinematic.
2. **Technical Execution (25%)** — Contract sudah diaudit. Yang kurang: test coverage harus 90%+, AI automation agent, dan deployment pipeline yang mature.
3. **Product Quality (15%)** — UI brutalist kita standout. Tapi harus konsisten di semua halaman, loading states harus beautiful, error handling harus manusiawi.
4. **Innovation (10%)** — AI Pool Agent + DeepBook yield farming + Seal randomness adalah trinity yang tidak dimiliki kompetitor mana pun.
5. **Sui Ecosystem Alignment** — Gunakan SEMUA fitur Sui: zkLogin, DeepBook, Seal, Walrus, object display.

---

## 2. Task Assignment

### 2.1 Smart Contract Engineer (SC)

**Latar Belakang:** Masih kuliah, paham Move basics.

**Apa yang harus dipelajari:**
- [Sui Move by Example](https://examples.sui.io/)
- [Sui Overflow workshop recordings](https://www.youtube.com/@SuiNetwork)
- Baca semua source code di `contracts/sources/` sampai paham setiap baris

**Task List:**

| # | Task | Priority | Deadline | Effort |
|---|------|----------|----------|--------|
| SC-1 | **Fixing: Pool AdminCap harus bisa ditransfer ke agent address** | 🔴 Critical | H-21 | 3 hari |
| | Buat fungsi `transfer_admin_cap(pool_admin_cap, new_owner)` di `arisan_pool.move` agar user bisa mendelegasikan PoolAdminCap ke AI agent. Tambah test. | | | |
| SC-2 | **Fixing: Auto-start ketika pool penuh** | 🔴 Critical | H-21 | 2 hari |
| | Modifikasi `join_pool()`: ketika `participant_list.length >= max_participants`, langsung panggil `start_pool()` secara atomik (bukan cuma set `is_full = true`). Tambah test. | | | |
| SC-3 | **Fixing: Cycle auto-advance** | 🟠 High | H-21 | 3 hari |
| | Buat fungsi `advance_cycle(pool, clock)` yang bisa dipanggil siapa saja (tanpa admin cap). Cek `is_cycle_complete` → jika ya, reset `deposits_this_cycle` untuk semua participant. | | | |
| SC-4 | **DeepBook V3 Real Integration** | 🟠 High | H-14 | 7 hari |
| | Integrasi sungguhan dengan DeepBook V3 testnet (bukan simulasi). Baca `deepbook_yield.move`, ganti mock dengan real flash loan arbitrage call. Koordinasi dengan backend untuk oracle prices. | | | |
| SC-5 | **Test Coverage 90%+** | 🟠 High | H-14 | 5 hari |
| | Coverage saat ini 103 test. Target: 200+ test. Coverage: edge cases, overflow, reentrancy, hak akses. Jalankan `sui move test --coverage` dan laporkan coverage report. | | | |
| SC-6 | **Parameterized Pool Templates** | 🟡 Medium | H-10 | 3 hari |
| | Buat template pool yang bisa dipilih user: "Conservative" (collateral 110%), "Standard" (125%), "Aggressive" (150%). | | | |
| SC-7 | **On-chain Reputation Score** | 🟡 Medium | H-7 | 4 hari |
| | Tambah score system di `ArisanPool` untuk tiap participant: bonus tepat bayar, penalti telat. Score ini dipakai di leaderboard. | | | |
| SC-8 | **Security Audit Final** | 🔴 Critical | H-5 | 3 hari |
| | Lakukan final audit: static analysis, manual review, fuzz test. Dokumentasikan semua findings dan mitigasi. | | | |

**Deliverables SC:**
- Pull Request ke branch `main` untuk setiap task
- Test report (coverage minimal 90%)
- Security audit report (format PDF/MD)
- Dokumentasi fungsi baru di `contracts/README.md`

---

### 2.2 Backend Engineer

**Latar Belakang:** Lulusan TI, paham TypeScript/Node.js, API design.

**Apa yang harus dipelajari:**
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

**Task List:**

| # | Task | Priority | Deadline | Effort |
|---|------|----------|----------|--------|
| BE-1 | **AI Pool Agent — Production Ready** | 🔴 Critical | H-21 | 5 hari |
| | Sudah ada `src/lib/pool-agent.ts`. Yang harus ditambahkan: (a) retry logic yang mature, (b) logging ke file/db, (c) metrics endpoint, (d) error notification ke Telegram/Discord. | | | |
| BE-2 | **Scheduler Infrastructure** | 🔴 Critical | H-21 | 2 hari |
| | Setup `vercel.json` dengan cron job (setiap 5 menit). Atau pakai cron-job.org. Pastikan agent tick berjalan 24/7 tanpa downtime. Dokumentasikan di SUI_OVERFLOW_2026_GUIDE.md. | | | |
| BE-3 | **Sponsored Transaction Refactor** | 🟠 High | H-21 | 3 hari |
| | Refactor `/api/sponsor/route.ts`: (a) rate limiting per user, (b) tx queue, (c) nonce management, (d) error categorization (user error vs system error). Tambah endpoint `GET /api/sponsor/status` untuk monitoring. | | | |
| BE-4 | **Webhook System** | 🟠 High | H-14 | 4 hari |
| | Buat webhook notification: ketika pool start, ketika winner terpilih, ketika pool selesai. Notifikasi bisa via Telegram bot atau email. Frontend akan consume ini untuk real-time update. | | | |
| BE-5 | **Analytics & Metrics** | 🟡 Medium | H-14 | 3 hari |
| | Buat endpoint `GET /api/metrics` yang return: total pools created, total participants, total volume, avg APY, agent actions count, success/fail rate. Data disimpan di file JSON (sederhana, tanpa DB). | | | |
| BE-6 | **Indexer / Cache Layer** | 🟡 Medium | H-10 | 5 hari |
| | Buat cache layer untuk Sui on-chain data. Gunakan simple JSON file cache dengan TTL. Ini penting karena Sui public RPC punya rate limit ketat. Cache semua `getOwnedObjects` dan `getObject` calls. | | | |
| BE-7 | **Walrus Metadata Optimization** | 🟡 Medium | H-10 | 2 hari |
| | Optimasi `/api/walrus/route.ts`: (a) cache blob reads, (b) retry dengan backoff, (c) fallback aggregator jika primary down. | | | |
| BE-8 | **Error Tracking & Monitoring** | 🟡 Medium | H-7 | 2 hari |
| | Integrasi error tracking ( bisa pake Sentry gratis atau custom logger). Semua error dari agent, sponsor, walrus routes harus terlog dengan stack trace lengkap. | | | |
| BE-9 | **Sistem Deploy & CI/CD** | 🟡 Medium | H-5 | 2 hari |
| | Setup GitHub Actions: (a) auto-deploy ke Vercel ketika push ke main, (b) run test sebelum deploy, (c) notifikasi deploy status ke Telegram. | | | |

**Deliverables Backend:**
- AI Agent berjalan 24/7 di production
- `vercel.json` dengan cron job configuration
- Webhook system documentation
- Metrics dashboard ( bisa endpoint JSON sederhana)
- CI/CD pipeline aktif

---

### 2.3 Frontend Engineer

**Latar Belakang:** Lulusan TI, paham React/Next.js, CSS, TypeScript.

**Apa yang harus dipelajari:**
- [Next.js 16 Docs](https://nextjs.org/docs)
- [@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [GSAP](https://gsap.com/docs/)

**Task List:**

| # | Task | Priority | Deadline | Effort |
|---|------|----------|----------|--------|
| FE-1 | **Agent Integration UI — Finalize** | 🔴 Critical | H-21 | 3 hari |
| | Halaman detail pool sudah ada panel AI Agent. Yang harus ditambah: (a) status indicator real-time (idle/running/error), (b) action log history (kapan terakhir start_pool, select_winner), (c) tombol manual trigger agent. | | | |
| FE-2 | **Mobile Responsive Overhaul** | 🔴 Critical | H-21 | 5 hari |
| | Test di Chrome DevTools untuk semua screen width (320px - 1440px). Perbaiki: pool cards stacking, modal overflow, header navigation, font sizes. Target: Lighthouse mobile score 90+. | | | |
| FE-3 | **Loading States & Skeleton** | 🟠 High | H-21 | 2 hari |
| | Setiap halaman harus punya skeleton loading yang beautiful. Saat ini hanya pools page yang punya `PoolCardSkeleton`. Tambah untuk: detail pool, AI dashboard, leaderboard, profile. | | | |
| FE-4 | **Error Handling UX** | 🟠 High | H-21 | 3 hari |
| | Buat error boundary di tiap segment. Error message harus human-readable (bukan "Something went wrong"). Contoh: "Failed to load pool. The network is congested — please try again in 30 seconds." Tambah tombol retry. | | | |
| FE-5 | **Pool Creation Flow** | 🟠 High | H-14 | 4 hari |
| | Buat guided multi-step pool creation wizard: Step 1: Pilih template (Conservative/Standard/Aggressive), Step 2: Isi parameter (deposit, participants, durasi), Step 3: AI Agent toggle (delegate admin cap ke agent), Step 4: Review & Confirm. | | | |
| FE-6 | **Real-time Updates** | 🟠 High | H-14 | 4 hari |
| | Implementasi pooling: tiap 15 detik, refresh pool data dari chain. Tampilkan countdown timer untuk cycle deadline. Animasi smooth untuk perubahan status. | | | |
| FE-7 | **Demo Video Page** | 🟠 High | H-10 | 3 hari |
| | Buat halaman `/demo-video` yang embed video demo 3 menit (upload ke YouTube). Tampilkan step-by-step transcript di bawah video. Ini penting untuk juri yang butuh quick overview. | | | |
| FE-8 | **Dark Mode Polish** | 🟡 Medium | H-10 | 2 hari |
| | Dark mode sudah ada tapi belum konsisten. Audit semua halaman: pastikan kontras cukup, tidak ada warna yang "broken" di dark mode. Test dengan browser dark mode emulation. | | | |
| FE-9 | **Animation & Micro-interactions** | 🟡 Medium | H-7 | 5 hari |
| | GSAP animation: (a) pool card hover effect, (b) modal open/close transition, (c) number counter animation (TVL, participants), (d) confetti ketika pool completed. | | | |
| FE-10 | **Performance Optimization** | 🟡 Medium | H-5 | 3 hari |
| | (a) Image optimization dengan `next/image`, (b) code splitting untuk heavy components (chart, map), (c) bundle analysis dengan `@next/bundle-analyzer`, (d) lazy loading untuk routes. | | | |
| FE-11 | **Suivan Landing Page Refresh** | 🟡 Medium | H-5 | 3 hari |
| | Landing page harus cinematic. Tambah: (a) animated hero section dengan Three.js atau canvas, (b) live stats counter (total pools, TVL), (c) testimonial carousel, (d) CTA yang jelas ke Pools page. | | | |
| FE-12 | **Aksesibilitas (a11y)** | 🟢 Low | H-3 | 2 hari |
| | (a) Semantic HTML, (b) ARIA labels, (c) keyboard navigation, (d) focus management untuk modal, (e) screen reader friendly. | | | |

**Deliverables Frontend:**
- Mobile-first responsive design
- Agent UI panel dengan live status
- Pool creation wizard
- Demo video page
- Lighthouse score: Performance 90+, Accessibility 95+, SEO 100

---

## 3. Timeline (Gantt-style)

```
Minggu 1 (H-28 s/d H-21)
┌─────────────────────────────────────────────────────────┐
│ SC-1  ████████░░░░  AdminCap Transfer                   │
│ SC-2  ████████░░░░  Auto-start on full                   │
│ BE-1  ██████████░░  AI Agent production-ready            │
│ BE-2  ██████░░░░░░  Cron scheduler                       │
│ BE-3  ██████░░░░░░  Sponsor tx refactor                  │
│ FE-1  ████████░░░░  Agent UI finalize                    │
│ FE-2  ████████████  Mobile responsive                    │
│ FE-3  ██████░░░░░░  Loading states                       │
│ FE-4  ██████░░░░░░  Error handling                       │
└─────────────────────────────────────────────────────────┘

Minggu 2 (H-21 s/d H-14)
┌─────────────────────────────────────────────────────────┐
│ SC-3  ████████░░░░  Cycle auto-advance                   │
│ SC-4  ████████████  DeepBook V3 integration              │
│ BE-4  ████████████  Webhook system                       │
│ BE-5  ██████░░░░░░  Analytics metrics                    │
│ FE-5  ████████████  Pool creation wizard                 │
│ FE-6  ████████████  Real-time updates                    │
└─────────────────────────────────────────────────────────┘

Minggu 3 (H-14 s/d H-7)
┌─────────────────────────────────────────────────────────┐
│ SC-5  ████████████  Test coverage 90%+                  │
│ SC-6  ██████░░░░░░  Pool templates                       │
│ BE-6  ████████████  Indexer/cache layer                  │
│ BE-7  ██████░░░░░░  Walrus optimization                  │
│ FE-7  ████████████  Demo video page                      │
│ FE-8  ██████░░░░░░  Dark mode polish                     │
└─────────────────────────────────────────────────────────┘

Minggu 4 (H-7 s/d H-0)
┌─────────────────────────────────────────────────────────┐
│ SC-7  ████████░░░░  On-chain reputation                  │
│ SC-8  ████████░░░░  Final security audit                 │
│ BE-8  ██████░░░░░░  Error tracking                       │
│ BE-9  ██████░░░░░░  CI/CD pipeline                       │
│ FE-9  ████████████  Animation & micro-interactions       │
│ FE-10 ████████████  Performance optimization              │
│ FE-11 ████████░░░░  Landing page refresh                 │
│ FE-12 ██████░░░░░░  Accessibility                        │
└─────────────────────────────────────────────────────────┘

Final Week (H-7 s/d H-0): Integration testing, bug fixing, demo recording, submission.
```

---

## 4. Technical Architecture (Updated)

```
                         SUIVAN SYSTEM ARCHITECTURE
                         ─────────────────────────

┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                         │
│                                                                      │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Landing  │ │ Pools    │ │ Detail │ │ AI Agent │ │ Demo Video  │  │
│  │ Page     │ │ Explorer │ │ Pool   │ │ Panel    │ │ Page        │  │
│  └─────────┘ └──────────┘ └────────┘ └──────────┘ └─────────────┘  │
│                                                                      │
│  @mysten/dapp-kit │ zkLogin │ Wallet │ SponsoredTx │ React Query    │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Next.js API Routes)                    │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ /api/agent   │ │ /api/sponsor │ │ /api/walrus  │ │ /api/cron  │  │
│  │ Tick + Status│ │ Gasless Tx   │ │ Blob Storage │ │  Schedule  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ /api/metrics │ │ /api/webhook │ │ /api/yields  │                 │
│  │ Analytics    │ │ Notification │ │ DeFiLlama    │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
│                                                                      │
│  AI Agent Engine (pool-agent.ts) → Cron: every 5 min                │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       SUI TESTNET (On-chain)                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Smart Contracts (Move)                     │   │
│  │                                                              │   │
│  │  arisan_factory  arisan_pool  yield_strategy  protocol_vault │   │
│  │  deepbook_yield  seal_randomness  walrus_store  test_usdc    │   │
│  │                                                              │   │
│  │  +AI Agent Cap (new): Delegated admin authority              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ DeepBook V3  │  │ Seal     │  │ Walrus     │  │ Sui Object   │  │
│  │ Flash Loans  │  │Randomness│  │ Blob Store │  │ Display      │  │
│  └──────────────┘  └──────────┘  └────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                  │
│                                                                      │
│  DeFiLlama API (yield data) │ cron-job.org (scheduler)               │
│  Vercel (hosting)           │ Telegram Bot (notifications)           │
│  GitHub Actions (CI/CD)     │ YouTube (demo video)                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Key Technical Decisions

### 5.1 Kenapa AI Agent Pakai Sponsor Key?

Agent menggunakan **SPONSOR_SECRET_KEY** yang sama dengan sponsored transaction backend. Ini adalah deliberate design decision:

- **Single source of truth**: Satu keypair untuk semua operasi gasless
- **Security**: Keypair disimpan di environment variable, tidak di code
- **Auditability**: Semua transaksi agent bisa di-track via digest

```
Agent Address: 0xa428d031fb5b7349e0dd1f17e1f5afceca2fad163a783e76ae198b71a35511a4
Network: Sui Testnet
RPC: https://sui-testnet-rpc.publicnode.com (dapat diubah via env SUI_RPC_URL)
```

### 5.2 PoolAdminCap Delegation Flow

```
User (Creator)                    Agent (Sponsor Key)                      Sui Chain
     │                                  │                                     │
     │── Delegate AdminCap ────────────►│                                     │
     │                                  │── tx.transferObjects(adminCap,agent)│
     │                                  │◄──── digest ───────────────────────│
     │                                  │                                     │
     │                                  │── tick() ──────────────────────────►│
     │                                  │◄──── pool state ───────────────────│
     │                                  │── start_pool() ────────────────────►│
     │                                  │◄──── digest ───────────────────────│
     │                                  │── select_winner() ─────────────────►│
     │                                  │◄──── digest ───────────────────────│
```

### 5.3 DeepBook V3 Integration Strategy

Jangan implementasi full arbitrage strategy (too complex untuk timeline ini). Instead:

1. **Phase 1 (H-14)**: Deploy mock DeepBook pool yang selalu return profit.
2. **Phase 2 (H-7)**: Tuning parameter berdasarkan historical DeepBook data.
3. **Phase 3 (Post-hackathon)**: Live arbitrage dengan risk management.

---

## 6. Daily Standup Format

Setiap hari jam 09:00 WIB, masing-masing jawab 3 pertanyaan di grup Telegram:

```
1. Apa yang saya kerjakan kemarin?
2. Apa yang akan saya kerjakan hari ini?
3. Apa blocker saya?
```

**Blocker harus di-report dalam 1 jam**, jangan menunggu standup besok.

---

## 7. Code Review Guidelines

| Aturan | Keterangan |
|--------|------------|
| **Setiap PR harus 2 approval** | SC review FE code, FE review BE code, BE review SC code — saling review biar semua paham konteks |
| **Test wajib** | SC: `sui move test` harus pass. FE/BE: `npm run build` harus pass |
| **No lint warning** | `npm run lint` harus clean |
| **Deskripsi PR** | Wajib ada: What, Why, How, Screenshot (untuk FE) |
| **Branch naming** | `fe/{task-id}`, `be/{task-id}`, `sc/{task-id}` |

---

## 8. Submission Checklist (H-1)

### Smart Contract
- [ ] All 200+ tests pass
- [ ] Coverage report > 90%
- [ ] Security audit report selesai
- [ ] Contracts deployed ke testnet dengan object IDs yang valid
- [ ] Documentation: setiap fungsi publik punya doc comment

### Backend
- [ ] AI Agent running 24/7 (cek log: tidak ada error dalam 24 jam terakhir)
- [ ] Sponsored transaction: semua flow bisa dijalankan tanpa SUI balance
- [ ] All API endpoints return proper JSON responses
- [ ] Error handling: no unhandled promise rejections

### Frontend
- [ ] All pages load in < 3 detik (3G)
- [ ] Mobile responsive: test di Chrome DevTools iPhone 14
- [ ] Lighthouse: Performance 90+, Accessibility 95+, SEO 100
- [ ] Dark mode: semua halaman terlihat good
- [ ] Error boundary aktif di semua route

### Demo & Submission
- [ ] Video demo 3 menit (upload ke YouTube unlisted)
- [ ] README.md updated dengan semua fitur baru
- [ ] ARCHITECTURE.md updated dengan arsitektur terbaru
- [ ] Deployed URL: `https://suivan.vercel.app` — semua fitur berfungsi
- [ ] Source code di GitHub (public repo)

---

## 9. Notes for SC (Junior)

Kamu masih kuliah dan ini mungkin pertama kalinya kerja di production-grade smart contract. **It's okay.** Yang penting:

1. **Jangan node sendiri.** Selalu tanya dulu kalau ragu. Backend dan Frontend senior bisa bantu review logic kamu.
2. **Test dulu sebelum deploy.** Selalu jalankan `sui move test` dan `sui move test --coverage`.
3. **Gunakan testnet.** Jangan pernah deploy ke mainnet tanpa approval dari CTO.
4. **Baca kode yang sudah ada.** `arisan_pool.move` adalah referensi terbaik untuk memahami pola Move.
5. **Resource:**
   - [Sui Book (bahasa Indonesia)](https://move-book.com/) — terjemahan komunitas
   - [Sui Overflow Discord](https://discord.gg/sui) — tanya di channel #developers
   - Chat pribadi ke CTO kapan saja kalau stuck > 30 menit

**Kita semua pernah jadi junior. Yang membedakan adalah: berani bertanya, rajin testing, dan tidak menyerah.**

---

## 10. Winning Mindset

> **"Suivan bukan sekadar hackathon project. Ini adalah protokol keuangan komunitas yang akan dipakai jutaan orang."**

Setiap baris kode yang kalian tulis minggu ini akan:
- Membantu seorang ibu di Jawa mengikuti arisan tanpa takut ketipu
- Membantu seorang TKI di Hong Kong menabung tanpa bunga bank
- Membuktikan bahwa Sui bisa jadi rumah bagi DeFi yang accessible untuk semua

**Kita tidak cuma competing. Kita building the future of community finance.**

---

<div align="center">

**CTO, Suivan Protocol**
**#SuiOverflow2026 #DeFi #ROSCA #Move**

</div>
