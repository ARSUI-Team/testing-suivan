# IMPLEMENTATION_TODO.md

## Granular Implementation Checklist

---

## Phase 1: Smart Contracts (Move)

### 1.1 Setup
- [ ] Create `sui/contracts/` directory for Move project
- [ ] Create `Move.toml` with dependencies (Sui framework)
- [ ] Create `sources/` directory structure
- [ ] Create `tests/` directory structure
- [ ] Verify `sui move build` compiles empty project

### 1.2 Test USDC Module
- [ ] Create `test_usdc.move` module
- [ ] Define USDC coin type using `sui::coin::create_currency`
- [ ] Implement `mint_faucet` entry function (public mint for testing)
- [ ] Test minting USDC to test address
- [ ] Verify coin balance via CLI

### 1.3 ArisanPool Module
- [ ] Define `Participant` struct
- [ ] Define `PoolConfig` struct
- [ ] Define `ArisanPool` shared object struct
- [ ] Define `AdminCap` capability struct
- [ ] Define all event structs (ParticipantJoined, DepositMade, etc.)
- [ ] Implement `create_pool()` entry function
- [ ] Implement `join_pool()` entry function
  - [ ] Accept `Coin<USDC>` as collateral
  - [ ] Store participant info in Table
  - [ ] Add to participant_list vector
  - [ ] Check pool not full, not already joined
  - [ ] Emit ParticipantJoined event
- [ ] Implement `start_pool()` entry function
  - [ ] Require AdminCap
  - [ ] Set pool_start_time_ms from Clock
  - [ ] Set current_cycle = 1
  - [ ] Emit PoolStarted event
- [ ] Implement `make_deposit()` entry function
  - [ ] Accept `Coin<USDC>` as deposit
  - [ ] Check participant is active
  - [ ] Check not already deposited this cycle
  - [ ] Add to total_pool_funds Balance
  - [ ] Emit DepositMade event
- [ ] Implement `select_winner()` entry function
  - [ ] Require AdminCap
  - [ ] Check cycle is complete (Clock check)
  - [ ] Get eligible winners
  - [ ] Pseudo-random selection
  - [ ] Calculate payout (deposits + yield)
  - [ ] Transfer payout to winner
  - [ ] Record cycle winner
  - [ ] Advance cycle or end pool
  - [ ] Emit PayoutDistributed event
- [ ] Implement `slash_collateral()` entry function
  - [ ] Require AdminCap
  - [ ] Check missed payment
  - [ ] Deduct from collateral
  - [ ] Add to pool funds
  - [ ] Emit CollateralSlashed event
- [ ] Implement view functions
  - [ ] `get_required_collateral()`
  - [ ] `get_total_collateral()`
  - [ ] `get_current_yield()`
  - [ ] `get_eligible_winners()`
  - [ ] `get_pool_info()`
  - [ ] `get_participant_count()`
  - [ ] `has_deposited_this_cycle()`
  - [ ] `is_cycle_complete()`
- [ ] Implement `_end_pool()` internal function
  - [ ] Return collateral + yield to all active participants
  - [ ] Emit CollateralReturned for each
  - [ ] Emit PoolEnded
- [ ] Write Move unit tests
  - [ ] Test pool creation
  - [ ] Test joining pool
  - [ ] Test starting pool
  - [ ] Test making deposits
  - [ ] Test winner selection
  - [ ] Test collateral slashing
  - [ ] Test pool ending
  - [ ] Test edge cases (full pool, double join, etc.)

### 1.4 ArisanFactory Module
- [ ] Define `PoolTemplate` struct
- [ ] Define `ArisanFactory` shared object struct
- [ ] Define `AdminCap` capability struct
- [ ] Define events (PoolCreated, TemplateAdded)
- [ ] Implement `create_factory()` function
- [ ] Initialize default templates (Small/Medium/Large)
- [ ] Implement `create_pool_from_template()` entry function
- [ ] Implement `create_custom_pool()` entry function
- [ ] Implement `add_template()` admin function
- [ ] Implement view functions (get_all_pools, get_user_pools, etc.)
- [ ] Write factory tests

### 1.5 YieldStrategy Module
- [ ] Define `YieldStrategy` shared object struct
- [ ] Implement `create_strategy()` function
- [ ] Implement `deposit()` — accept Coin, mint shares
- [ ] Implement `withdraw()` — burn shares, return Coin
- [ ] Implement `register_vault()` admin function
- [ ] Implement `switch_protocol()` admin function
  - [ ] Withdraw from current vault
  - [ ] Deposit to new vault
- [ ] Implement `set_apy()` optimizer function
- [ ] Implement view functions
- [ ] Write strategy tests

### 1.6 ProtocolVault Module
- [ ] Define `ProtocolVault` shared object struct
- [ ] Implement `create_vault()` function
- [ ] Implement `deposit()` — accept Coin, issue shares
- [ ] Implement `withdraw()` — burn shares, return Coin
- [ ] Implement `simulate_yield()` admin function
- [ ] Implement view functions
- [ ] Write vault tests

### 1.7 Deploy to Testnet
- [ ] Build all Move modules: `sui move build`
- [ ] Run all tests: `sui move test`
- [ ] Deploy to Sui testnet: `sui client publish`
- [ ] Record package ID
- [ ] Record all shared object IDs (factory, strategy, vaults)
- [ ] Mint test USDC
- [ ] Create sample pools via factory
- [ ] Verify on Suiscan

---

## Phase 2: Frontend Web3 Layer

### 2.1 Package Updates
- [ ] Remove `wagmi` and `viem` from package.json
- [ ] Install `@mysten/sui.js`
- [ ] Install `@mysten/dapp-kit`
- [ ] Run `pnpm install`
- [ ] Verify build succeeds (with type errors expected)

### 2.2 Web3 Provider
- [ ] Rewrite `src/providers/Web3Provider.tsx`
  - [ ] Import from `@mysten/dapp-kit`
  - [ ] Configure networks (testnet, mainnet)
  - [ ] Setup `SuiClientProvider`
  - [ ] Keep `QueryClientProvider` (compatible)
- [ ] Update `src/app/layout.tsx` — import new provider

### 2.3 Contract Configuration
- [ ] Rewrite `src/config/contracts.ts`
  - [ ] Replace EVM addresses with Sui object IDs
  - [ ] Add PACKAGE_ID constant
  - [ ] Add USDC_TYPE constant
  - [ ] Add CLOCK_ID constant
  - [ ] Define network config
- [ ] Rewrite `src/config/abis.ts`
  - [ ] Replace EVM ABIs with Move module references
  - [ ] Or delete and use inline function references

### 2.4 Contract Hooks
- [ ] Create new `src/hooks/useSuiContracts.ts`
  - [ ] `useAllPools()` — read factory object, return pool IDs
  - [ ] `usePoolInfo(poolId)` — read pool object, parse fields
  - [ ] `usePoolsInfo(poolIds)` — batch read pool objects
  - [ ] `useAllPoolsWithInfo()` — combined hook
  - [ ] `useRequiredCollateral(poolId)` — read pool config
  - [ ] `useUSDCBalance(address)` — read coin balance
  - [ ] ~~`useUSDCAllowance()`~~ — DELETE (not needed on Sui)
  - [ ] ~~`useApproveUSDC()`~~ — DELETE (not needed on Sui)
  - [ ] `useJoinPool()` — PTB: split coin + moveCall join_pool
  - [ ] `useCreatePool()` — PTB: moveCall create_pool
  - [ ] `useCreatePoolFromTemplate()` — PTB: moveCall from template
  - [ ] `useMakeDeposit()` — PTB: split coin + moveCall make_deposit
  - [ ] `useParticipantInfo(poolId, address)` — read participant from Table
  - [ ] `useParticipantList(poolId)` — read participant list vector
  - [ ] `useHasDepositedThisCycle(poolId, address)`
  - [ ] `useCycleWinner(poolId, cycle)`
  - [ ] `useLastWinner(poolId)`
  - [ ] `useCurrentYield(poolId)`
  - [ ] `useIsCycleComplete(poolId)`
- [ ] Delete old `src/hooks/useContracts.ts`

### 2.5 Wallet Component
- [ ] Rewrite `src/components/ConnectWallet.tsx`
  - [ ] Use `useCurrentAccount()` from dapp-kit
  - [ ] Use `useConnectWallet()` from dapp-kit
  - [ ] Use `useDisconnectWallet()` from dapp-kit
  - [ ] Replace MetaMask/WC icons with Sui wallet icons
  - [ ] Update wallet detection logic
  - [ ] Keep same UI layout and styling

### 2.6 Faucet Component
- [ ] Rewrite `src/components/USDCFaucet.tsx`
  - [ ] Replace `useWriteContract(mint)` with PTB `test_usdc::mint_faucet`
  - [ ] Update success/error handling
  - [ ] Keep same UI

### 2.7 Info Components
- [ ] Update `src/components/TestnetInfo.tsx`
  - [ ] Replace Mantle chain check with Sui network check
  - [ ] Replace "MNT" with "SUI"
  - [ ] Update faucet link
- [ ] Update/replace `src/components/MantleGasSavings.tsx`
  - [ ] Rename to `SuiGasSavings.tsx` (or `NetworkGasSavings.tsx`)
  - [ ] Update gas price estimates for Sui
  - [ ] Change branding from Mantle to Sui
  - [ ] Add storage cost info (unique to Sui)

---

## Phase 3: Page Components

### 3.1 Pools Page
- [ ] Update `src/app/pools/page.tsx`
  - [ ] Replace hook imports from `useContracts` to `useSuiContracts`
  - [ ] Remove approve flow (single tx for join)
  - [ ] Update pool address type from `0x${string}` to `string`
  - [ ] Update explorer links to Suiscan
  - [ ] Test all flows (browse, join, create)

### 3.2 Pool Detail Page
- [ ] Update `src/app/pools/[address]/page.tsx`
  - [ ] Replace hook imports
  - [ ] Remove approve step from join modal
  - [ ] Remove approve step from deposit modal
  - [ ] Update explorer links
  - [ ] Simplify UX (1-tx join/deposit)

### 3.3 AI Optimizer Page
- [ ] Update `src/app/ai/page.tsx`
  - [ ] Update vault address display to Sui object IDs
  - [ ] Update explorer links to Suiscan
  - [ ] Update protocol names to Sui protocols

### 3.4 Other Pages
- [ ] Update `src/app/leaderboard/page.tsx` — minimal changes
- [ ] Update `src/app/faq/page.tsx` — text changes only
- [ ] Update `src/app/demo/page.tsx` — text changes
- [ ] Update `src/app/page.tsx` (landing) — text changes

---

## Phase 4: AI Optimizer & Backend

### 4.1 AI Optimizer
- [ ] Update `src/lib/ai-optimizer.ts`
  - [ ] Change chain filter from "mantle" to "sui"
  - [ ] Replace protocol list with Sui protocols
  - [ ] Update vault addresses to Sui object IDs
  - [ ] Update fallback APY values
  - [ ] Update risk scores
  - [ ] Update protocol name mapping

### 4.2 API Routes
- [ ] Update `src/app/api/yields/route.ts` — no code changes needed (uses ai-optimizer)
- [ ] Update `src/app/api/yields/recommend/route.ts` — no code changes needed
- [ ] Update `src/app/api/strategy/route.ts` — no code changes needed

---

## Phase 5: Translations & Branding

### 5.1 Translations
- [ ] Update `src/context/LanguageContext.tsx`
  - [ ] Replace "Mantle" → "Sui" in all keys (~15 keys)
  - [ ] Replace "MNT" → "SUI" in all keys
  - [ ] Replace "Mantle Network" → "Sui Network" in all keys
  - [ ] Replace "Mantle Sepolia" → "Sui Testnet" in all keys
  - [ ] Replace Mantle faucet links with Sui faucet links

### 5.2 Documentation
- [ ] Update `README.md` — change all Mantle references
- [ ] Update `docs/` folder — change all Mantle references
- [ ] Update `gitbook/` folder — change all Mantle references
- [ ] Update `FAUCET_GUIDE.md` — Sui faucet instructions

### 5.3 SEO & Meta
- [ ] Update `src/app/layout.tsx` metadata
  - [ ] Change description
  - [ ] Change keywords
- [ ] Update `public/` assets if any Mantle branding

---

## Phase 6: Testing & Polish

### 6.1 Integration Testing
- [ ] Test wallet connection flow
- [ ] Test USDC faucet mint
- [ ] Test pool creation from template
- [ ] Test custom pool creation
- [ ] Test joining pool
- [ ] Test making deposits
- [ ] Test pool detail page
- [ ] Test AI optimizer page
- [ ] Test leaderboard page
- [ ] Test FAQ page
- [ ] Test all translations (EN/ID)
- [ ] Test mobile responsiveness
- [ ] Test all explorer links work

### 6.2 Polish
- [ ] Remove all console.log EVM-related messages
- [ ] Clean up unused imports (viem, wagmi)
- [ ] Verify no hardcoded Mantle/EVM references remain
- [ ] Test on Sui testnet end-to-end
- [ ] Deploy to Vercel

---

## Dependency Order (What Blocks What)

```
Move Contracts (1.1-1.7)
    ↓ [blocks everything]
Contract Addresses from deployment
    ↓
contracts.ts + abis.ts (2.3)
    ↓
Web3Provider (2.2) + useSuiContracts hooks (2.4)
    ↓ [blocks all pages]
ConnectWallet (2.5) + USDCFaucet (2.6)
    ↓
Page Components (3.1-3.4) ← can start after hooks
    ↓
AI Optimizer (4.1) ← independent, can parallel with pages
    ↓
Translations (5.1-5.2) ← independent, can parallel
    ↓
Testing (6.1-6.2) ← last
```

**Parallel Work Opportunities:**
- AI Optimizer updates (4.x) can happen independently of frontend
- Translations (5.x) can happen independently
- Page components (3.x) can be prepared (import structure) before hooks are complete

---

## Estimated Time per Phase

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Smart Contracts | 7-11 days | None |
| Phase 2: Web3 Layer | 4-6 days | Phase 1 complete |
| Phase 3: Pages | 2-3 days | Phase 2 hooks ready |
| Phase 4: AI Optimizer | 1-2 days | None (parallel) |
| Phase 5: Translations | 1 day | None (parallel) |
| Phase 6: Testing | 2-3 days | All phases complete |
| **TOTAL** | **15-25 days** | |
