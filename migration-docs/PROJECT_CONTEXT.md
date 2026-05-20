# PROJECT_CONTEXT.md

## Overview

**Archa** (Arisan On-Chain) is a decentralized rotating savings and credit association (arisan) protocol that combines the traditional Indonesian financial tradition of "arisan" with AI-powered yield optimization and blockchain technology.

Originally built for the **Mantle Global Hackathon 2025** on Mantle Network (EVM L2), the project must now be migrated to the **Sui blockchain**.

---

## What This Project Is

Archa digitizes the traditional Indonesian "arisan" system — a community-based rotating savings group where participants contribute a fixed amount periodically, and each cycle one member receives the entire pool. Key innovations:

1. **Smart Contract Enforcement** — Rules are immutable, transparent, and trustless
2. **Collateral System** — Participants deposit collateral upfront (125% of potential liabilities) to prevent "run-away" behavior
3. **AI Yield Optimizer** — Pool funds and collateral are automatically invested in DeFi protocols (Lendle, Merchant Moe, Agni, Minterest, KTX) for yield generation
4. **Double Yield** — Both pool deposits AND collateral earn yield simultaneously

---

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                    │
│  React 19 + TypeScript + Tailwind CSS + wagmi v2 + viem         │
│  Pages: /, /pools, /pools/[address], /ai, /leaderboard, /faq    │
└───────────────────────┬─────────────────┬───────────────────────┘
                        │                 │
              ┌─────────▼──────┐   ┌───────▼──────────┐
              │   wagmi Hooks  │   │  Next.js API     │
              │ useReadContract │   │  /api/yields     │
              │ useWriteContract│   │  /api/strategy   │
              └─────────┬──────┘   └───────┬──────────┘
                        │                 │
              ┌─────────▼──────┐   ┌───────▼──────────┐
              │  Mantle RPC    │   │  DeFiLlama API   │
              │  (EVM JSON-RPC)│   │  (Yield Data)    │
              └─────────┬──────┘   └──────────────────┘
                        │
         ┌──────────────▼──────────────────────────┐
         │         SMART CONTRACTS (Solidity)       │
         │                                          │
         │  ┌──────────────┐  ┌──────────────────┐  │
         │  │ ArisanFactory │  │ AIYieldStrategy  │  │
         │  │ - createPool  │  │ - deposit        │  │
         │  │ - templates   │  │ - withdraw       │  │
         │  └──────┬───────┘  │ - switchProtocol │  │
         │         │          └───────┬──────────┘  │
         │  ┌──────▼───────┐          │              │
         │  │ ArisanPool   │◄─────────┘              │
         │  │ - joinPool   │                         │
         │  │ - makeDeposit│  ┌──────────────────┐  │
         │  │ - selectWinner│ │  DeFi Vaults     │  │
         │  │ - slashCollateral│ (Lendle, etc.)  │  │
         │  └──────────────┘  └──────────────────┘  │
         │                                          │
         │  ┌──────────────┐                        │
         │  │  MockUSDC    │                        │
         │  └──────────────┘                        │
         └──────────────────────────────────────────┘
```

---

## Major Systems

### 1. Smart Contract Layer (Solidity / Foundry)

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **ArisanFactory** | Creates and manages arisan pools | `createPoolFromTemplate()`, `createCustomPool()`, `getAllPools()` |
| **ArisanPool** | Individual pool logic — join, deposit, winner selection, collateral | `joinPool()`, `makeDeposit()`, `selectWinner()`, `slashCollateral()` |
| **AIYieldStrategy** | Yield optimization — routes funds to DeFi vaults | `deposit()`, `withdraw()`, `switchProtocol()`, `registerVault()` |
| **BaseVault** | Base vault mock for each DeFi protocol | `deposit()`, `withdraw()`, `simulateYield()` |
| **MockUSDC** | Test USDC token with faucet | `mint()`, `claimFaucet()`, `transfer()`, `approve()` |

**Pool Templates (Factory):**
- Small: 10 USDC, 5 participants, 30-day cycles
- Medium: 50 USDC, 10 participants, 30-day cycles
- Large: 100 USDC, 20 participants, 30-day cycles

**Collateral Formula:**
```
collateral = depositAmount × (maxParticipants - 1) × 125 / 100
```

### 2. Frontend Layer (Next.js 15 + React 19)

**Pages:**
| Route | Purpose |
|-------|---------|
| `/` | Landing page with hero, about, how-it-works, advantages sections |
| `/pools` | Pool explorer — list all pools, filter by status, create custom pool |
| `/pools/[address]` | Pool detail — participants, yield info, join/deposit actions |
| `/ai` | AI Yield Optimizer dashboard — protocol analysis, recommendations |
| `/leaderboard` | Community rankings (currently simulated data) |
| `/faq` | FAQ page with EN/ID translations |
| `/demo` | Demo walkthrough page |

**Key Components:**
- `ConnectWallet` — MetaMask + WalletConnect modal
- `USDCFaucet` — Direct mint of 10,000 test USDC via MockUSDC contract
- `TestnetInfo` — Shows MNT balance and links to Mantle faucet
- `MantleGasSavings` — Displays gas savings comparison vs Ethereum
- `SharePool` — Share pool info on social media
- `WinnerModal` / `CollateralReturnModal` — Success celebration modals

### 3. Web3 Integration Layer (wagmi v2 + viem)

**Provider:** `Web3Provider.tsx`
- Chains: `mantleSepoliaTestnet`, `mantle`, `sepolia`
- Connectors: `injected` (MetaMask), `walletConnect`
- RPC: `https://rpc.sepolia.mantle.xyz`

**Contract Hooks:** `useContracts.ts`
- 15+ hooks for reading/writing contract state
- Uses `useReadContract`, `useWriteContract`, `useReadContracts`, `useWaitForTransactionReceipt`
- Chain hardcoded to `mantleSepoliaTestnet.id`

**Configuration:**
- `contracts.ts` — Contract addresses for 3 networks (Ethereum Sepolia, Mantle Sepolia, Mantle Mainnet)
- `abis.ts` — Full ABIs for ArisanFactory, ArisanPool, ERC20

### 4. AI Yield Optimizer (Backend Logic in API Routes)

**API Routes:**
| Route | Purpose |
|-------|---------|
| `GET /api/yields` | Fetch current protocol yields from DeFiLlama |
| `POST /api/yields/recommend` | Get AI recommendation based on risk tolerance |
| `GET /api/strategy` | Get optimal strategy for given risk level |
| `POST /api/strategy` | Analyze current allocation and suggest rebalancing |

**AI Engine:** `ai-optimizer.ts`
- Fetches real-time yield data from DeFiLlama API (`https://yields.llama.fi/pools`)
- Filters for Mantle chain protocols: Lendle, Merchant Moe, Agni, Minterest, KTX
- Risk-adjusted scoring: `Score = (APY × 10) - (RiskScore × RiskWeight) + (TVL Bonus)`
- Three risk profiles: conservative, moderate, aggressive
- 5-minute client-side cache
- Fallback to simulated data if API fails

### 5. Internationalization

- `LanguageContext.tsx` — EN/ID translations
- ~150+ translation keys covering all UI text
- Persisted to localStorage

---

## Business Logic / User Flow

```
1. User connects wallet (MetaMask/WalletConnect)
2. User claims test USDC via faucet (10,000 USDC)
3. User browses pools on /pools page
4. User selects a pool and:
   a. Approves USDC spending (ERC20 approve)
   b. Joins pool (deposits collateral)
5. Once pool is full, owner starts the pool
6. Pool starts — collateral is deposited to AIYieldStrategy
7. Each cycle (30 days):
   a. Participants make monthly deposits
   b. Deposits go to AIYieldStrategy for yield
   c. Owner selects winner when cycle completes
   d. Winner receives pool deposits + accumulated yield
8. After all cycles complete:
   a. Pool ends
   b. Collateral + yield bonus returned to all participants
```

---

## Transaction Lifecycle

1. **Approve USDC** — `usdc.approve(poolAddress, collateralAmount)`
2. **Join Pool** — `pool.joinPool()` (transfers collateral from user to pool)
3. **Start Pool** — `pool.startPool()` (deposits all collateral to yield strategy)
4. **Monthly Deposit** — `usdc.approve(poolAddress, depositAmount)` → `pool.makeDeposit()`
5. **Select Winner** — `pool.selectWinner()` (withdraws from strategy, transfers to winner)
6. **End Pool** — Automatic in `selectWinner()` after last cycle

---

## Important Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **125% collateral multiplier** | Ensures no economic benefit from winning early and leaving |
| **Simplified random (keccak256)** | For hackathon demo; production would use Chainlink VRF |
| **MockUSDC (6 decimals)** | Matches real USDC decimals |
| **BaseVault simulation** | Real DeFi protocols not available on testnet |
| **DeFiLlama for yield data** | Free, reliable API with Mantle chain support |
| **wagmi v2 + viem** | Modern React hooks for Ethereum, type-safe |
| **Next.js App Router** | Latest Next.js with server components support |
| **WalletConnect for mobile** | Multi-wallet support beyond MetaMask |

---

## Key Metrics

- **Smart Contracts:** 12 deployed (1 Factory + 3 Pools + 1 Strategy + 5 Vaults + 1 MockUSDC + 1 existing USDC)
- **Frontend Pages:** 6 main routes
- **Contract Hooks:** 15+ custom hooks
- **API Routes:** 4 endpoints
- **Translations:** ~150+ keys in EN/ID
- **Supported Protocols:** 5 DeFi vaults (Lendle, Merchant Moe, Agni, Minterest, KTX)
