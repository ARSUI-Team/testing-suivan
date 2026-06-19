<p align="center">
  <img src="fe-suivan/public/suivan-logo.png" alt="Suivan" width="180">
</p>

<h1 align="center">Suivan</h1>

<p align="center">
  <strong>Community Wealth Protocol · Built on Sui Move</strong><br>
  <em>On-chain ROSCA for the next billion savers</em>
</p>

<p align="center">
  <a href="https://suivan.vercel.app"><img src="https://img.shields.io/badge/Live-suivan.vercel.app-000?style=for-the-badge&logo=vercel" alt="Testnet"></a>
  <a href="https://suivan.fun"><img src="https://img.shields.io/badge/Mainnet-suivan.fun-38bdf8?style=for-the-badge" alt="Mainnet"></a>
  <a href=""><img src="https://img.shields.io/badge/Tests-120_Passed-00D4AA?style=for-the-badge" alt="Tests"></a>
  <a href=""><img src="https://img.shields.io/badge/Sui_Overflow_2026-DF_Track-f8672d?style=for-the-badge&logo=sui" alt="Sui Overflow"></a>
</p>

---

## 💡 What is Suivan?

ROSCA (Rotating Savings & Credit Association) powers **$1T+** in informal finance across Indonesia (*Arisan*), India (*Chit Fund*), Mexico (*Tanda*), Nigeria (*Esusu*), and 80+ countries. But it's broken:

| Problem | Why | Suivan Fixes It |
|---|---|---|
| Members run away after their turn | No enforcement mechanism | **125% collateral** locked in smart contract |
| Pooled money sits idle for weeks | No yield infrastructure | **AI optimizer** → DeepBook V3, Scallop, Navi, Cetus |
| Records on paper, easy to fake | No transparency | **100% on-chain**, Sui object model, Seal RNG |

**No treasurer. No bank. No trust needed. Just Suivan.**

---

## 🎬 Try It in 30 Seconds

1. Visit **[suivan.vercel.app](https://suivan.vercel.app)**
2. Explore the **Simulator** — tweak deposits, see costs, no wallet needed
3. Connect **any Sui wallet** (or **Google** via zkLogin)
4. Claim **500 USDC** from faucet → join a pool → wait for winner selection

---

## 🏗️ How a ROSCA Cycle Works

```
    Cycle 1         Cycle 2         Cycle 3      ...    Cycle N
   ┌─────────┐    ┌─────────┐    ┌─────────┐          ┌─────────┐
   │ P1 wins │    │ P2 wins │    │ P3 wins │          │ Pn wins │
   │  $250   │    │  $250   │    │  $250   │          │  $250   │
   └─────────┘    └─────────┘    └─────────┘          └─────────┘
        │              │              │                    │
        └──────────────┴──────────────┴────────────────────┘
                    All members contribute $25/month
    
    At pool end: collateral returned + yield bonuses distributed
```

---

## 🧬 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SUIVAN PROTOCOL                        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  zkLogin │  │   Seal   │  │  Walrus  │  │DeepBook │  │
│  │  Google  │  │    Tx    │  │   RNG    │  │  Storage  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │             │             │               │        │
│  ┌────┴─────────────┴─────────────┴───────────────┴─────┐  │
│  │                 Arisan Pool (Core)                   │  │
│  │   Join · Deposit · Slash · Select · Payout · End    │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────┼──────────────────────────────┐  │
│  │                  Yield Engine                        │  │
│  │   DeepBook V3 Flash Arbitrage + AI Strategy Agent   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐    │
│  │ LI.FI Bridge│  │ Agent Cron  │  │  Leaderboard +   │    │
│  │ Cross-chain │  │ Auto start  │  │  NFT Badges      │    │
│  └─────────────┘  └────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Smart Contracts (Move)

**9 modules · 120 tests · 0 failures**

```
contracts/sources/
├── arisan_pool.move          🏦 1,761 lines — Full ROSCA lifecycle
├── arisan_factory.move       🏭 320 lines — Templates + on-chain pool registry
├── deepbook_yield.move       ⚡ 246 lines — Flash loan arbitrage via DeepBook V3
├── yield_strategy.move       📈 261 lines — Share-based vault with u128 precision
├── seal_randomness.move      🎲 212 lines — Seal commit-reveal threshold encryption
├── walrus_store.move          💾 139 lines — Permanent blob metadata on Walrus
├── faucet.move                🚰 104 lines — On-chain faucet, 24h cooldown
├── test_usdc.move             🪙 64 lines — Mock USDC (testnet only)
└── test_sui.move              🪙 51 lines — Mock SUI (testnet only)
```

```bash
$ sui move test
Test result: OK. Total tests: 120; passed: 120; failed: 0 ✓
```

### Security Patterns

| Pattern | Enforces | Module |
|---|---|---|
| **Hot Potato Receipts** | Atomicity — tx aborts if not consumed | `arisan_pool`, `deepbook_yield` |
| **Capability-Based Auth** | No address checks — `PoolAdminCap` | All modules |
| **Seal Threshold Encryption** | Verifiable fair randomness | `seal_randomness` |
| **5-Balance Segregation** | Funds isolation — no commingling | `arisan_pool` |
| **Generic `<CoinType>`** | Works with SUI, USDC, any token | `arisan_pool`, `yield_strategy` |

### Audit Status

Internal audit completed. **7 HIGH/MEDIUM issues documented** with inline fix annotations:
- `SEC-AC-1`: Per-pool capability → no global admin
- `SEC-AR-1`: Rejection sampling → unbiased winner selection
- `H-03/S1-2`: Hot potato atomicity → fund safety
- Full [audit report](https://github.com/ARSUI-Team/testing-suivan) available in commit history

---

## 🎨 Frontend

**Neo-brutalist editorial design system.** 20 routes, 18 components, bilingual EN/ID.

| Route | Purpose |
|---|---|
| `/` | Landing page — Animation-driven Hero + ROSCA Map + How To Play + Advantages |
| `/pools` | Pool Explorer — Create, join, deposit, view details |
| `/pools/[address]` | Pool detail — Lifecycle management, metadata, AI agent, brutalist design |
| `/simulator` | Interactive simulator — No wallet needed |
| `/ai` | SUI Yield Explorer — Live protocol APY + DeepBook V3 orderbook |
| `/faucet` | Testnet faucet — 500 USDC per claim, 24h cooldown |
| `/leaderboard` | Gamified ranking — Diamond/Platinum/Gold tiers, real on-chain data |
| `/profile` | Dashboard — Stats, Achievements, activity feed, wallet info |
| `/faq` | 16 comprehensive Q&As |

### Design Language

```
Colors      #0a0a0a ink · #38bdf8 accent · #f8672d orange · #f5e642 yellow
Typography  Bebas Neue (display) · Courier New (mono) · Inter (body)
Textures    Grain radial-gradient · Geometric 45° stripes · Barcode headers
Shadows     10–14px brutal offset · #0a0a0a shadow color
```

---

## 🧩 Sui Ecosystem Integration

**5/5 Sui primitives — deep native integration.**

| Primitive | Implementation | Impact |
|---|---|---|
| **zkLogin** | Google OAuth → [zklogin.sui.io](https://zklogin.sui.io) | No seed phrase onboarding |
| **Seal RNG** | Commit-reveal threshold encryption | Verifiable fair draws |
| **DeepBook V3** | Flash loan arbitrage + BalanceManager | Real DeFi yield |
| **Walrus** | Blob storage for pool metadata | Permanent on-chain identity |
| **LI.FI Bridge** | Cross-chain modal widget | USDC from 20+ chains |

---

## 🚀 Deployment

| | Testnet | Mainnet |
|---|---|---|
| **Live At** | [suivan.vercel.app](https://suivan.vercel.app) | [suivan.fun](https://suivan.fun) |
| **Package** | `0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515` | Deploying (branch `mainnet`) |
| **Factory** | `0x4484b70fdea8a4aefcfef9c6a33e13d975b2cde0ce6a2085cb8eb18cf5e6af32` | — |
| **Faucet** | `0xb0d0ce15b6c58af48216877c9df20d0ed91409b093f214fe79b29e71c103e311` | N/A (mainnet uses real tokens) |
| **Agent** | `0x501f2840d1d6fb2a98299f52f671150d38e118c33e8342861dd4ad5d58b788f1` | TBD |
| **Modules** | 8 production | 6 (no faucet/test tokens) |
| **Token** | `TEST_USDC` | Wormhole-bridged USDC |
| **Network** | Sui Testnet | Sui Mainnet |

---

## 🛠 Tech Stack

| Layer | Choices |
|---|---|
| **Contracts** | Sui Move 2024.beta · DeepBook V3 · Seal · Walrus |
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 |
| **Sui SDK** | `@mysten/dapp-kit` · `@mysten/sui` · `@mysten/walrus` |
| **State + Data** | `@tanstack/react-query` · Custom hooks · DeFiLlama API |
| **Animation** | Motion (Framer Motion) · GSAP · Lenis |
| **UI Kit** | shadcn/ui · Lucide · Radix UI · CVA |
| **Bridge** | LI.FI SDK + Widget |
| **Infra** | Vercel · Sui RPC · DeepBook Indexer |

---

## 👥 Team ARSUI

| Member | Role |
|---|---|
| **Hambali** | Backend & Frontend Engineering |
| **Faiz** | Smart Contracts & Backend Engineering |
| **Nabila** | Backend & Frontend Engineering |
| **Ozan OnChain** | Full-stack Engineering & Design |
| **Handiya** | Media & Presentation |

---

## 🔗 Links

- **Testnet**: [suivan.vercel.app](https://suivan.vercel.app)
- **Mainnet**: [suivan.fun](https://suivan.fun)
- **GitHub**: [ARSUI-Team/testing-suivan](https://github.com/ARSUI-Team/testing-suivan)
- **Telegram**: [t.me/sui_van](https://t.me/sui_van)
- **Discord**: [discord.gg/XxxM958bm](https://discord.gg/XxxM958bm)
- **X/Twitter**: [@suivan_id](https://x.com/suivan_id)

---

<p align="center">
  <strong>Built for Sui Overflow 2026 — DeFi Track</strong><br>
  <sub>Not just a hackathon project. A protocol for the next billion savers.</sub>
</p>
