# 🗺️ MIGRATION MASTER PLAN — Archa: Mantle/EVM → Sui

> **Status:** 🟢 PHASE 1-5 COMPLETE — Phase 6 (Testing) remaining
> **Last Updated:** 2025-07-10
> **Branch:** `sui-migration`

---

## 📋 QUICK STATUS BOARD

| Phase | Nama | Status | Progress |
|-------|------|--------|----------|
| **0** | Setup & Git Strategy | ✅ DONE | 5/5 |
| **1** | Smart Contracts (Move) | ✅ DONE | 30/30 |
| **1.5** | Deploy ke Testnet | ✅ DONE | 5/5 |
| **2** | Frontend Web3 Layer | ✅ DONE | 15/15 |
| **3** | Page Components Update | ✅ DONE | 9/9 |
| **4** | AI Optimizer & Backend | ✅ DONE | 5/5 |
| **5** | Translations & Branding | ✅ DONE | 14/14 |
| **6** | Testing & Polish | ⬜ TODO | 0/10 |


## 📦 PHASE 0: SETUP & GIT STRATEGY — ✅ DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Buat branch `sui-migration` dari `main` | ✅ | |
| 0.2 | Install Sui CLI | ✅ | v1.72.2 |
| 0.3 | Setup Sui wallet lokal | ✅ | 0x0c60...f061 |
| 0.4 | Buat `sui/contracts/` directory structure | ✅ | |
| 0.5 | Verify `sui move build` compiles | ✅ | 0 errors |

---

## 📦 PHASE 1: SMART CONTRACTS (MOVE) — ✅ DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | `test_usdc.move` — USDC coin + faucet | ✅ | 53 lines |
| 1.2 | `arisan_pool.move` — core pool logic | ✅ | 876 lines |
| 1.3 | `arisan_factory.move` — factory + templates | ✅ | 253 lines |
| 1.4 | `yield_strategy.move` — yield + protocol switch | ✅ | 388 lines |
| 1.5 | `protocol_vault.move` — per-protocol vault | ✅ | 240 lines |
| 1.6 | All tests pass | ✅ | 41/41 |
| 1.7 | Deploy to testnet | ✅ | PKG: 0x72bb...bb1b |

---

## 📦 PHASE 1.5: DEPLOY KE TESTNET — ✅ DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.5.1 | `sui client publish` | ✅ | TX: 4rhFM1QPS6... |
| 1.5.2 | DEPLOYMENT.md created | ✅ | All object IDs saved |
| 1.5.3 | Test pool created | ✅ | 0x50f5...45a6 |
| 1.5.4 | Faucet mint tested | ✅ | 10K USDC |
| 1.5.5 | Verify on Suiscan | ✅ | Links in DEPLOYMENT.md |

---

## 📦 PHASE 2: FRONTEND WEB3 LAYER — ✅ DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Remove wagmi/viem, add @mysten/dapp-kit + @mysten/sui | ✅ | |
| 2.2 | Rewrite `Web3Provider.tsx` — SuiClientProvider + WalletProvider | ✅ | |
| 2.3 | Rewrite `contracts.ts` — Sui object IDs | ✅ | From DEPLOYMENT.md |
| 2.4 | Create `useSuiContracts.ts` — Sui-native hooks | ✅ | All read + write hooks |
| 2.5 | Create `useContracts.ts` bridge layer | ✅ | EVM-compatible shapes |
| 2.6 | Rewrite `ConnectWallet.tsx` — Sui wallet standard | ✅ | |
| 2.7 | Rewrite `USDCFaucet.tsx` — Move call mint | ✅ | |
| 2.8 | Rewrite `TestnetInfo.tsx` — Sui testnet info | ✅ | |
| 2.9 | Update `Header.tsx` — remove wagmi imports | ✅ | |
| 2.10 | Update `layout.tsx` — remove wagmi imports | ✅ | |
| 2.11 | `pnpm build` clean | ✅ | 0 TS errors, 11/11 pages |

---

## 📦 PHASE 3: PAGE COMPONENTS UPDATE — ✅ DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | `pools/page.tsx` — use Sui hooks, remove approve flow | ✅ | Direct Join Pool |
| 3.2 | `pools/[address]/page.tsx` — remove approve flow | ✅ | Direct Join + Deposit |
| 3.3 | `leaderboard/page.tsx` — import dari useContracts | ✅ | Build clean |
| 3.4 | `useAllPoolsWithInfo()` — reads blockchain | ✅ | Factory + events |
| 3.5 | `useParticipantList()` — reads blockchain | ✅ | participant_list field |
| 3.6 | `useHasDepositedThisCycle()` — cek blockchain | ✅ | Via useParticipantInfo |
| 3.7 | `MantleGasSavings.tsx` — rewritten as SuiNetworkBenefits | ✅ | Backward compat alias |
| 3.8 | `demo/page.tsx` + `ai/page.tsx` — Sui branding | ✅ | suiscan.xyz links |
| 3.9 | All explorer links → suiscan.xyz | ✅ | Zero mantlescan refs |
| 3.10 | Implement stub hooks (yield, winner, cycle) | ✅ | All read from chain |
| 3.11 | APY reads from YieldStrategy contract | ✅ | No more hardcoded |
| 3.12 | Remove EVM approve flow from pages | ✅ | Single tx on Sui |
| 3.13 | Delete all .evm.bak files | ✅ | 4 files removed |

---

## 📦 PHASE 4: AI OPTIMIZER & BACKEND — ✅ DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | `ai-optimizer.ts` — chain "mantle" → "sui" | ✅ | |
| 4.2 | Replace protocol list (Scallop, NAVI, Aftermath, Cetus, Turbos) | ✅ | |
| 4.3 | Update vault addresses → Sui object IDs | ✅ | |
| 4.4 | Update fallback APY values for Sui protocols | ✅ | |
| 4.5 | Test DeFiLlama Sui data | ✅ | API routes work |

---

## 📦 PHASE 5: TRANSLATIONS & BRANDING — ✅ DONE

| # | File | Status | Notes |
|---|------|--------|-------|
| 5.1 | `src/context/LanguageContext.tsx` | ✅ | 14 keys ID+EN |
| 5.2 | `src/lib/ai-optimizer.ts` | ✅ | ~10 refs |
| 5.3 | `src/app/layout.tsx` | ✅ | meta + keywords |
| 5.4 | `src/app/demo/page.tsx` | ✅ | |
| 5.5 | `src/app/ai/page.tsx` | ✅ | suiscan links |
| 5.6 | `src/app/pools/[address]/page.tsx` | ✅ | |
| 5.7 | `src/components/Footer.tsx` | ✅ | docs/explorer links |
| 5.8 | `src/components/HeroSection.tsx` | ✅ | Sui badge |
| 5.9 | `src/components/AboutSection.tsx` | ✅ | |
| 5.10 | `src/components/OnboardingTutorial.tsx` | ✅ | Sui Wallet |
| 5.11 | `src/components/WinnerModal.tsx` | ✅ | Sui protocols |
| 5.12 | `src/components/CollateralReturnModal.tsx` | ✅ | Sui protocols |
| 5.13 | `src/components/SharePool.tsx` | ✅ | Built on Sui |
| 5.14 | `src/components/MantleGasSavings.tsx` | ✅ | → SuiNetworkBenefits |

**Verified:** `grep -r "Mantle" src/` returns 0 results (except backward compat alias)

---

## 📦 PHASE 6: TESTING & POLISH — ⬜ TODO

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Test wallet connect (Sui Wallet) | ⬜ | Manual test needed |
| 6.2 | Test USDC faucet mint | ⬜ | Manual test needed |
| 6.3 | Test pool list shows data from blockchain | ⬜ | |
| 6.4 | Test join pool (single tx, no approve) | ⬜ | |
| 6.5 | Test make deposit | ⬜ | |
| 6.6 | Test pool detail page (yield, winner, cycle) | ⬜ | |
| 6.7 | Test AI optimizer page | ⬜ | |
| 6.8 | Test mobile responsive | ⬜ | |
| 6.9 | Test all explorer links (suiscan.xyz) | ⬜ | |
| 6.10 | Deploy to Vercel | ⬜ | |

---

## 🐛 BUGS FROM AUDIT — ALL FIXED

| Bug | Status | Notes |
|-----|--------|-------|
| C1: payout pakai active depositors | ✅ Fixed | Di arisan_pool.move |
| C2: hapus owner bypass withdraw | ✅ Fixed | Di yield_strategy.move |
| C3: end_pool withdraw dulu baru distribute | ✅ Fixed | Di arisan_pool.move |
| H1: per-cycle deposit tracking | ✅ Fixed | Di arisan_pool.move |

---

## 📊 BRIDGE HOOKS — ALL CONNECTED

| Hook | Source | Status |
|------|--------|--------|
| useAccount | @mysten/dapp-kit | ✅ |
| useUSDCBalance | client.getBalance() | ✅ |
| usePoolInfo | client.getObject() | ✅ |
| useParticipantInfo | devInspect get_participant | ✅ |
| useAllPoolsWithInfo | Factory + events + multi-getObject | ✅ |
| useParticipantList | getObject participant_list | ✅ |
| useJoinPool | PTB splitCoins + join_pool | ✅ |
| useCreatePool | PTB splitCoins + create_pool | ✅ |
| useCreatePoolFromTemplate | PTB + factory template | ✅ |
| useMakeDeposit | PTB splitCoins + make_deposit | ✅ |
| useRequiredCollateral | PoolInfo field | ✅ |
| useHasDepositedThisCycle | participantInfo.depositedThisCycle | ✅ |
| useCurrentYield | pool.yield_balance on-chain | ✅ |
| useLastWinner | pool.last_winner on-chain | ✅ |
| useIsCycleComplete | time-based calc | ✅ |
| useCycleWinner | devInspect get_cycle_winner | ✅ |
| useStrategyAPY | yield_strategy.simulated_apy | ✅ |
| useUSDCAllowance | Stub (not needed on Sui) | ✅ |
| useApproveUSDC | Stub (not needed on Sui) | ✅ |
