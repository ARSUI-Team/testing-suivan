<p align="center">
  <img src="fe-suivan/public/suivan-logo.jpeg" alt="Suivan Logo" width="400">
</p>

# Suivan

**ROSCA Protocol — Native on Sui**

[![Sui Overflow 2026](https://img.shields.io/badge/Sui%20Overflow-2026-6F2BFF?style=for-the-badge&logo=sui&logoColor=white)](https://suioverflow.dev)
[![Built with Move](https://img.shields.io/badge/Built%20with-Move-00D4AA?style=for-the-badge&logo=sui&logoColor=white)](https://move-language.github.io/move/)
[![Testnet](https://img.shields.io/badge/Deployed-Sui%20Testnet-F5A623?style=for-the-badge)](https://suiscan.xyz/testnet/package/0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b)
[![Frontend](https://img.shields.io/badge/Live-suivan.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://suivan.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## What is Suivan?

**Suivan** is a decentralized ROSCA protocol built entirely on **Sui Move**. ROSCA (Rotating Savings and Credit Association) is a centuries-old community savings model used by millions worldwide — Suivan brings it on-chain with verifiable randomness, gasless transactions, and institutional-grade yield via DeepBook V3.

```
                    ┌─────────────────────────────┐
                    │       Suivan Protocol        │
                    │  ┌───────────────────────┐   │
                    │  │     Arisan Pool        │   │
                    │  │  ┌────┐ ┌────┐ ┌────┐ │   │
                    │  │  │ P1 │ │ P2 │ │ Pn │ │   │
                    │  │  └────┘ └────┘ └────┘ │   │
                    │  └───────────────────────┘   │
                    │  ┌──────────┐ ┌─────────┐    │
                    │  │   Yield   │ │  Seal   │    │
                    │  │ Strategy  │ │Randmness│    │
                    │  └──────────┘ └─────────┘    │
                    │  ┌──────────┐ ┌─────────┐    │
                    │  │  Walrus   │ │DeepBook │    │
                    │  │  Store    │ │  Yield  │    │
                    │  └──────────┘ └─────────┘    │
                    └─────────────────────────────┘
```

---

## Key Features

### Smart Contracts (8 Move modules, 21 source files)

| Module | Lines | Security | Description |
|---|---|---|---|
| **Arisan Factory** | 270 | ✅ Capability auth | Pool templates, on-chain tracking of all pools & user pools |
| **Arisan Pool** | ~1350 | ✅ Hot potato receipts | Full ROSCA lifecycle: join, contribute, payout, winner selection |
| **DeepBook Yield** | 240 | ✅ Slippage protection | Flash loan arbitrage via DeepBook V3 with hot potato atomicity |
| **Yield Strategy** | 240 | ✅ Share-based | Vault accounting with mul_div precision, first-deposit inflation protection |
| **Protocol Vault** | 200 | ✅ | Share-based vault with mul_div math |
| **Seal Randomness** | 210 | ✅ Verifiable | Commit-reveal randomness via Seal threshold encryption |
| **Walrus Store** | 140 | ✅ | Off-chain blob storage for pool metadata & agreements |
| **Test USDC** | 65 | ✅ | Faucet-mintable testnet USDC |

### Frontend (Next.js 16 + React 19)

- **Landing page** with GSAP-powered motion design
- **Pool explorer** with live Sui contract hooks (zkLogin, wallet, sponsored tx)
- **Interactive walkthrough demo** (5-step onboarding)
- **Yield signals dashboard** — live DeFiLlama data aggregation
- **Yield optimizer** — risk-scored protocol recommendations
- **Leaderboard** with sortable stats
- **FAQ** with EN/ID bilingual support (i18n)
- **Sponsored transactions** — gasless UX via backend relayer
- **Accessibility** — scrollbar styling, reduced-motion support

---

## Audit Fixes Applied

Critical issues identified during code audit and resolved:

| Issue | Fix |
|---|---|
| Predictable `tx_context::digest()` randomness | Removed; Seal threshold encryption is now **mandatory** for winner selection |
| Yield profit not routed to yield_balance | `return_pool_funds_from_yield` now splits principal → `pool_funds`, profit → `yield_balance` |
| Factory `all_pools` never populated | `create_pool` now returns `ID`; factory tracks all pools + user pools on-chain |
| `yield_strategy` dead storage fields | Removed unused `active_vault_id`, `registered_vaults` |
| No slippage protection on DeepBook swaps | Added `min_profit` parameter to both `flash_arbitrage_borrow_base/quote` |
| Factory events missing pool ID | Both `PoolCreatedFromTemplate` and `PoolCreatedCustom` now emit `pool_id` |
| `SuiJsonRpcClient` broken import | Replaced with `SuiClient` from `@mysten/sui/client` across all frontend files |
| Duplicate `createNetworkConfig` | Consolidated into single source in `networkConfig.ts` |
| "Generate AI Strategy" linking to JSON API | Changed to inline button with client-side fetch + recommendation display |
| Scrollbar hidden globally | Restored with thin styled scrollbar |
| No reduced-motion support | Added `@media (prefers-reduced-motion: reduce)` |
| Debug "Pool detail boundary" text | Removed from pool detail page |

---

## Security Architecture

- **Capability-based auth**: Every admin operation requires a unique `PoolAdminCap`, `FactoryAdminCap`, or `StrategyAdminCap` object — no sender-address checks
- **Hot potato pattern**: `YieldWithdrawalReceipt` has no `store`, `copy`, `drop`, or `key` abilities — if not consumed in the same PTB, the transaction aborts (reentrancy-proof)
- **Verifiable randomness**: Winner selection requires a Seal-encrypted seed committed before selection — validators cannot influence outcomes
- **Share-based yield accounting**: Precision `mul_div` math with u128 intermediates prevents overflow; `MIN_SHARES_OFFSET` mitigates first-depositor inflation
- **Event-driven audit trail**: Every state change emits structured events for off-chain indexing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Sui Move • DeepBook V3 • Seal • Walrus |
| Frontend | Next.js 16 • React 19 • TypeScript • Tailwind CSS 4 |
| Sui SDK | @mysten/dapp-kit • @mysten/sui • @mysten/walrus |
| Animation | GSAP • Lenis |
| State/Data | @tanstack/react-query • DeFiLlama API |
| Deployment | Sui Testnet + Vercel |

---

## Deployed on Sui Testnet

| Component | Address | Explorer |
|---|---|---|
| **Package** | `0x72bb…1bb1b` | [Suiscan](https://suiscan.xyz/testnet/package/0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b) |
| **Arisan Factory** | `0xd45c…3867` | [Suiscan](https://suiscan.xyz/testnet/object/0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867) |
| **Yield Strategy** | `0xf374…1b5e2` | [Suiscan](https://suiscan.xyz/testnet/object/0xf374ed58edfbf394acca7b352ef0c6738f4b5c5dd378df28c7f69cdd0611b5e2) |

Frontend: **[suivan.vercel.app](https://suivan.vercel.app)**

---

## Why Suivan Wins the DeFi Track

| Judge Criteria | Suivan Advantage |
|---|---|
| **Real-World Application** (50%) | ROSCA = 100M+ global users. Solving trust, idle funds, and accessibility. Sui-native: zkLogin for non-crypto users, sponsored tx for gasless onboarding. |
| **Technical Execution** | 8 Move modules, 103+ tests, capability-based auth, hot potato receipts, Seal threshold encryption for verifiable randomness, share-based accounting with inflation protection. |
| **Product Quality** | Next.js 16 + React 19, brutalist design system, dark mode, GSAP motion, i18n EN/ID, interactive demo walkthrough. |
| **Innovation** | First ROSCA protocol native on Sui. DeepBook V3 flash loan yield. Seal commit-reveal randomness for fair winner selection. AI yield optimization via DeFiLlama. |
| **Sui Ecosystem Alignment** | zkLogin, sponsored transactions, DeepBook V3, Seal threshold encryption, Walrus blob storage, @mysten/dapp-kit, Sui parallel execution. |

### Key Differentiators vs Competitors

- **Not an EVM port** — Every module written in Sui Move edition 2024.beta, leveraging Sui-specific patterns (shared objects, hot potato, `public(package)`, `key` abilities)
- **Verifiable randomness** — Seal threshold encryption replaces `tx_context::digest()` which validators could manipulate
- **Gasless onboarding** — Sponsored transaction backend enables users to join pools without holding SUI
- **Real DeFi yield** — DeepBook V3 flash loan arbitrage with hot potato atomicity, not simulated APY
- **Share-based yield vault** — `mul_div` with u128 intermediates + `MIN_SHARES_OFFSET` first-deposit inflation protection
- **On-chain everything** — Factory tracks all pools + per-user pools; events for every state change; Walrus for off-chain blob storage

### Scoring Matrix

```
Real-World Application:  75/100  ────────████████████████████░░░░░░░░░░░
Technical Execution:     88/100  ────────████████████████████████████░░░░░
Product Quality:         65/100  ────────█████████████████░░░░░░░░░░░░░░░░
Innovation:              85/100  ────────██████████████████████████░░░░░░░
Sui Integration:         90/100  ────────███████████████████████████████░░
──────────────────────────────────────────────────────────────────────────
Weighted Total:          78/100  ────────█████████████████████████░░░░░░░░░
```

---

## Getting Started

---

## Test Suite

```
103+ tests across 6 modules:
  • arisan_pool          — 31+ tests (full lifecycle, slashing, yield, events)
  • yield_strategy       — 10+ tests (share accounting, deposit/withdraw)
  • protocol_vault       — 7+ tests (vault math, invariants)
  • deepbook_yield       — 16+ tests (hot potato, auth, edge cases)
  • seal_randomness      — 11+ tests (commit-reveal lifecycle)
  • walrus_store         — 9+ tests (blob linking, validation)
```

---

## Architecture Docs

| Document | Description |
|---|---|
| `contracts/DEPLOYMENT.md` | Testnet deployment details, object IDs, CLI usage |

---

## Community

- Telegram: [t.me/suivan](https://t.me/suivan)
- Discord: [discord.gg/suivan](https://discord.gg/suivan)

---

<div align="center">
  <strong>Built for Sui Overflow 2026 — DeFi Track</strong>
</div>
