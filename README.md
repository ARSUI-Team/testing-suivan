
# Suivan

**ROSCA Protocol — Native on Sui**

[![Sui Overflow 2026](https://img.shields.io/badge/Sui%20Overflow-2026-6F2BFF?style=for-the-badge&logo=sui&logoColor=white)](https://suioverflow.dev)
[![Built with Move](https://img.shields.io/badge/Built%20with-Move-00D4AA?style=for-the-badge&logo=sui&logoColor=white)](https://move-language.github.io/move/)
[![Testnet](https://img.shields.io/badge/Deployed-Sui%20Testnet-F5A623?style=for-the-badge)](https://suiscan.xyz/testnet/package/0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.1-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## What is Suivan?

**Suivan** is a decentralized ROSCA protocol built entirely on **Sui Move**. ROSCA (Rotating Savings and Credit Association) is a centuries-old community savings model — Suivan brings it on-chain with zero-knowledge onboarding, gasless transactions, and institutional-grade yield.

```
                    ┌─────────────────────────────┐
                    │     Suivan Protocol          │
                    │  ┌───────────────────────┐   │
                    │  │   Arisan Pool          │   │
                    │  │  ┌────┐ ┌────┐ ┌────┐│   │
                    │  │  │ P1 │ │ P2 │ │ Pn ││   │
                    │  │  └────┘ └────┘ └────┘│   │
                    │  └───────────────────────┘   │
                    │  ┌──────┐ ┌─────────┐       │
                    │  │Yield │ │  Seal   │       │
                    │  │Strategy│ │Randomness │       │
                    │  └──────┘ └─────────┘       │
                    │  ┌──────┐ ┌─────────┐       │
                    │  │Walrus│ │DeepBook │       │
                    │  │Store │ │  Yield  │       │
                    │  └──────┘ └─────────┘       │
                    └─────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────────┐        ┌──────────┐       ┌──────────┐
    │ zkLogin │        │Sponsored │       │  Wallet  │
    │(Google) │        │   Tx     │       │ Connect  │
    └─────────┘        └──────────┘       └──────────┘
```

---

## Key Features

### Smart Contracts

| Module | Description |
|---|---|
| **Arisan Factory** | Create & manage pool templates, track all pools & user participation |
| **Arisan Pool** | Full lifecycle: join, contribute, payout, winner selection, cycle management |
| **Yield Strategy** | Deploy idle pool funds to earn real yield (DeepBook v3, flash loans, maker rebates) |
| **DeepBook Yield** | Hot-potato atomic yield execution via DeepBook v3 AMM |
| **Protocol Vault** | Share-based accounting with mul_div precision math |
| **Seal Randomness** | Commit-reveal randomness using Seal threshold encryption for fair winner selection |
| **Walrus Store** | Off-chain blob storage for pool metadata, agreements & cycle history |
| **Test USDC** | Faucet-mintable USDC (6 decimals) for testnet onboarding |

### Frontend

- **Landing page** with GSAP-powered motion design
- **Pool explorer** with live Sui contract hooks
- **Interactive walkthrough demo** (5-step onboarding)
- **AI yield dashboard** powered by DeFiLlama data
- **Leaderboard** with mock data architecture
- **FAQ** with EN/ID bilingual support
- **zkLogin** — Google OAuth, no wallet required
- **Sponsored transactions** — gasless UX via backend relayer
- **Dark mode** with animated theme switching

---

## Tech Stack

```
Contracts     │  Sui Move • DeepBook v3 • Seal • Walrus
Frontend      │  Next.js 16 • React 19 • TypeScript • Tailwind CSS 4
Sui SDK       │  @mysten/dapp-kit • @mysten/sui • @mysten/walrus
Animation     │  GSAP • Lenis
State/Query   │  @tanstack/react-query
Icons         │  lucide-react
Deployment    │  Sui Testnet — Package ID: 0x72bb…1bb1b
```

---

## Deployed on Sui Testnet

| Component | Address |
|---|---|
| **Package** | [`0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b`](https://suiscan.xyz/testnet/package/0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b) |
| **Arisan Factory** | [`0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867`](https://suiscan.xyz/testnet/object/0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867) |
| **Yield Strategy** | [`0xf374ed58edfbf394acca7b352ef0c6738f4b5c5dd378df28c7f69cdd0611b5e2`](https://suiscan.xyz/testnet/object/0xf374ed58edfbf394acca7b352ef0c6738f4b5c5dd378df28c7f69cdd0611b5e2) |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Sui CLI (testnet)

### Frontend

```bash
cd fe-suivan
npm install
cp .env.example .env.local  # edit with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Smart Contracts

```bash
cd contracts

# Run tests (103 passing)
sui move test

# Build
sui move build
```

---

## Test Coverage

```
103 tests passing across 6 test modules:
  • arisan_pool_tests       — 31 tests (pool lifecycle)
  • yield_strategy_tests    — 10 tests (yield accounting)
  • protocol_vault_tests    — 7 tests (vault math)
  • deepbook_yield_tests    — tests (atomic yield)
  • seal_randomness_tests   — tests (commit-reveal)
  • walrus_store_tests      — tests (blob storage)
```

---

## Architecture Documents

| Document | Description |
|---|---|
| `contracts/DEPLOYMENT.md` | Testnet deployment details, object IDs, CLI usage |

---

## Community

- Telegram: [t.me/suivan](https://t.me/suivan)
- Discord: [discord.gg/suivan](https://discord.gg/suivan)

---

<div align="center">
  <strong>Built for Sui Overflow 2026</strong>
</div>
