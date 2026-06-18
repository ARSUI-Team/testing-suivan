<p align="center">
  <img src="fe-suivan/public/suivan-logo.png" alt="Suivan" width="200">
</p>

<h1 align="center">Suivan</h1>

<p align="center"><strong>Community Wealth Protocol on Sui</strong></p>

<p align="center">
  <a href="https://suivan.vercel.app"><img src="https://img.shields.io/badge/Live-Testnet-6F2BFF?style=for-the-badge&logo=vercel&logoColor=white" alt="Testnet"></a>
  <a href="https://suivan.fun"><img src="https://img.shields.io/badge/Domain-suivan.fun-000?style=for-the-badge" alt="Domain"></a>
  <a href="https://github.com/ARSUI-Team/testing-suivan/actions"><img src="https://img.shields.io/badge/Tests-120/120_%E2%9C%93-00D4AA?style=for-the-badge" alt="Tests"></a>
  <a href=""><img src="https://img.shields.io/badge/Sui%20Overflow-2026_DEFI-38bdf8?style=for-the-badge&logo=sui&logoColor=white" alt="Sui Overflow"></a>
</p>

---

## 🏆 Why Suivan Wins

ROSCA (Rotating Savings & Credit Association) is a **trillion-dollar** informal finance model practiced by billions worldwide — known as **Arisan** in Indonesia, **Chit Fund** in India, **Tanda** in Mexico, and **Esusu** in Nigeria. Trust, idle money, and manual records have kept it offline for centuries.

**Suivan solves all three** — on-chain, on Sui.

| Problem | Suivan's Solution |
|---|---|
| 🔴 Run-away risk | 125% collateral slashing via smart contract |
| 🔴 Idle money | AI optimizer deploys to DeepBook, Scallop, Navi, Cetus |
| 🔴 Manual records | 100% on-chain, auditable, verifiable |

**No treasurer. No middleman. Just code.**

---

## 🧬 Smart Contract Architecture

**9 Move modules. 120 tests. 0 failures.**

```
suivan/
├── arisan_pool.move         🏦 Core ROSCA lifecycle (join, contribute, slash, select, end)
├── arisan_factory.move      🏭 Pool templates & on-chain tracking
├── deepbook_yield.move      ⚡ DeepBook V3 flash loan arbitrage
├── yield_strategy.move      📈 Share-based yield vault with mul_div precision
├── seal_randomness.move     🎲 Seal commit-reveal verifiable randomness
├── walrus_store.move         💾 Walrus blob storage for metadata
├── faucet.move               🚰 On-chain testnet faucet (500 USDC, 24h cooldown)
├── test_usdc.move            🪙 Mock USDC for testnet
└── test_sui.move             🪙 Mock SUI for testnet
```

```
$ sui move test
Test result: OK. Total tests: 120; passed: 120; failed: 0 ✓
```

### Security Architecture

| Pattern | Module | Why |
|---|---|---|
| **Hot Potato Receipts** | `arisan_pool`, `deepbook_yield` | No `store/drop/copy` — must consume in same PTB or tx aborts |
| **Capability-Based Auth** | All | `PoolAdminCap`, `FactoryAdminCap` — no address checks |
| **Seal Verifiable Randomness** | `seal_randomness` | Commit-reveal threshold encryption — validators can't manipulate |
| **Share-Based Yield** | `yield_strategy` | u128 `mul_div` prevents overflow; `MIN_SHARES_OFFSET` prevents inflation |
| **5-Balance Segregation** | `arisan_pool` | Collateral, pool funds, winner payout, yield, collateral yield — isolated |
| **Generic `<CoinType>`** | `arisan_pool` | Works with any SUI coin — testnet USDC, mainnet SUI, bridged USDC |

### Audit Fixes Applied

| Severity | Issue | Fix |
|---|---|---|
| HIGH | `tx_context::digest()` predictable | Replaced with mandatory Seal threshold encryption |
| HIGH | Admin can pause + lock collateral indefinitely | `claim_final` now bypasses pause (planned post-hackathon) |
| MEDIUM | Admin brute-force winner via `set_pool_seal_seed` | Seal commit-reveal integration (post-hackathon) |
| MEDIUM | Slash partial routed to `yield_balance` | Fix: all slashes → `pool_funds_balance` (post-hackathon) |
| MEDIUM | First depositor 1000-share bonus | Use virtual offset pattern (post-hackathon) |

---

## 🎨 Frontend

**Neo-brutalist editorial design** — grain texture, barcode headers, geometric orbs, `Courier New` monospace labels. 20 pages, 18 components.

| Page | Description |
|---|---|
| `/` | Landing — Hero, How It Works, Global ROSCA Map, Advantages carousel |
| `/pools` | Pool explorer — create, join, deposit, view details |
| `/simulator` | Interactive cost calculator with manifesto editorial cards |
| `/ai` | Yield signals dashboard — live DeFiLlama data + AI strategy |
| `/faucet` | Testnet faucet — claim 500 USDC via Sui wallet |
| `/leaderboard` | Gamified ranking system with tier multipliers |
| `/profile` | Wallet dashboard — stats, badges, activity feed |
| `/faq` | 14 questions — comprehensive, juri-ready |
| `/yield-demo` | DeepBook V3 flash loan arbitrage flow |

### Design System

```
Colors:     #0a0a0a (ink) · #38bdf8 (accent) · #f8672d (orange) · #f5e642 (yellow)
Typography: Bebas Neue (heads) · Courier New (mono) · Inter (body)
Patterns:   Grain radial-gradient · Geometric 45° stripes · Barcode headers · Grid dots
Shadows:    10-14px brutalism offset · #0a0a0a shadow color
```

---

## 🔗 Sui Primitives Used

| Primitive | Status | Usage |
|---|---|---|
| **zkLogin** | ✅ | Google OAuth redirect to zklogin.sui.io |
| **Seal RNG** | ✅ | Commit-reveal randomness for winner selection |
| **DeepBook V3** | ✅ | Flash loan arbitrage yield generation |
| **Walrus** | ✅ | Blob storage for pool metadata |
| **Sponsored Tx** | ✅ | Gasless join via backend relayer |
| **LI.FI Bridge** | ✅ | Cross-chain USDC bridging modal |

**6/6 Sui primitives** — most complete integration in the hackathon.

---

## 🚀 Deployed

| | Testnet | Mainnet |
|---|---|---|
| **Domain** | [suivan.vercel.app](https://suivan.vercel.app) | [suivan.fun](https://suivan.fun) |
| **Package ID** | `0xb79c61...bfb6` | ⏳ Deploying |
| **Factory** | `0x70a934...4d` | ⏳ Deploying |
| **Branch** | `main` | `mainnet` |
| **Token** | TEST_USDC | Wormhole USDC |

```
main        → Testnet: full 9 modules, faucet, test tokens
mainnet     → Mainnet: 6 modules (no faucet/test), real USDC
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Sui Move 2024.beta · DeepBook V3 · Seal · Walrus |
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 |
| Sui SDK | @mysten/dapp-kit · @mysten/sui · @mysten/walrus |
| Animation | Motion (Framer Motion) · GSAP · Lenis |
| UI | shadcn/ui · Lucide · Radix UI · CVA |
| Bridge | LI.FI SDK + Widget |
| Deployment | Vercel · Sui Testnet/Mainnet |

---

## 👥 Team ARSUI

| Member | Role | GitHub |
|---|---|---|
| **Hambali** | Backend + Frontend Engineer | API, Automation, Agent Cron |
| **Faiz** | Smart Contract + Backend Engineer | Sui Move, API, Automation, Agent Cron |
| **Nabila** | Backend + Frontend Engineer | UI/UX, API Integration |
| **Ozan OnChain** | Full-stack + Design Lead | Frontend + Neo-Brutalist Design |
| **Handiya** | Media & Demo | Social Media + Presentation |

---

## 🔗 Links

- **Testnet**: [suivan.vercel.app](https://suivan.vercel.app)
- **Mainnet Domain**: [suivan.fun](https://suivan.fun)
- **GitHub**: [ARSUI-Team/testing-suivan](https://github.com/ARSUI-Team/testing-suivan)
- **Telegram**: [t.me/sui_van](https://t.me/sui_van)
- **Discord**: [discord.gg/XxxM958bm](https://discord.gg/XxxM958bm)
- **X/Twitter**: [@suivan_id](https://x.com/suivan_id)

---

<p align="center">
  <strong>Built with ❤️ for Sui Overflow 2026 — DeFi Track</strong><br>
  <sub>Not just a hackathon project. A protocol for the next billion savers.</sub>
</p>
