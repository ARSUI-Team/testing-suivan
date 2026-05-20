# REPO_STRUCTURE.md

## Complete Repository Structure & File Analysis

```
archa/
├── .env.example                    # NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
├── .gitignore
├── .npmrc
├── .gitbook.yaml                   # GitBook configuration
├── eslint.config.mjs               # ESLint flat config
├── next.config.ts                  # Next.js config (image domains)
├── package.json                    # Dependencies & scripts
├── pnpm-lock.yaml                  # Lock file
├── package-lock.json               # Lock file
├── postcss.config.mjs              # PostCSS with Tailwind
├── tsconfig.json                   # TypeScript config
├── prompt.md                       # Migration audit master prompt
├── README.md                       # Project documentation
├── FAUCET_GUIDE.md                 # USDC faucet guide for testers
├── LOADING_SETUP.md                # Loading animation setup docs
├── UPLOAD_LOGO.md                  # Logo upload instructions
│
├── cache/                          # Foundry build cache
│   ├── solidity-files-cache.json
│   └── test-failures
│
├── docs/                           # Project documentation
│   ├── README.md
│   ├── SUMMARY.md                  # GitBook summary
│   ├── video-recording-guide.md
│   ├── demo-subtitles.srt
│   ├── demo-script.md
│   ├── pitch-deck/
│   │   └── Archa_Pitch_Deck.md
│   ├── getting-started/
│   │   ├── quick-start.md
│   │   └── key-concepts.md
│   ├── how-it-works/
│   │   ├── arisan-mechanism.md
│   │   ├── ai-yield-optimizer.md
│   │   └── collateral-system.md
│   ├── technical/
│   │   └── smart-contracts.md
│   └── resources/
│       ├── glossary.md
│       ├── faq.md
│       └── links.md
│
├── gitbook/                        # GitBook docs (mirror of docs/)
│   ├── README.md
│   ├── SUMMARY.md
│   ├── overview/
│   ├── concepts/
│   ├── guides/
│   ├── technical/
│   ├── getting-started/
│   ├── resources/
│   └── ... (mirrored structure)
│
├── contracts/                      # 🔴 SMART CONTRACTS (Foundry/Solidity)
│   ├── foundry.toml                # Foundry config — Mantle RPCs, Etherscan
│   ├── .env.example
│   ├── README.md
│   ├── src/
│   │   ├── ArisanPool.sol          # 🔴 CORE: Pool logic (432 lines)
│   │   ├── ArisanFactory.sol       # 🔴 CORE: Factory pattern (223 lines)
│   │   ├── AIYieldStrategy.sol     # 🔴 CORE: Yield routing (312 lines)
│   │   ├── interfaces/
│   │   │   ├── IERC20.sol          # Standard ERC20 interface
│   │   │   └── IYieldStrategy.sol  # Yield strategy interface
│   │   ├── vaults/
│   │   │   ├── IVault.sol          # Vault interface
│   │   │   ├── BaseVault.sol       # Base vault implementation
│   │   │   ├── LendleVault.sol     # Lendle protocol vault
│   │   │   ├── MerchantMoeVault.sol # Merchant Moe vault
│   │   │   ├── AgniVault.sol       # Agni Finance vault
│   │   │   ├── MinterestVault.sol  # Minterest vault
│   │   │   └── KTXVault.sol        # KTX Finance vault
│   │   └── mocks/
│   │       └── MockUSDC.sol        # Mock USDC token with faucet
│   ├── test/
│   │   └── ArisanPool.t.sol       # Pool contract tests
│   ├── script/
│   │   ├── Deploy.s.sol            # Basic deployment script
│   │   └── DeployAll.s.sol         # 🔴 Full deployment (12 contracts)
│   ├── out/                        # Compiled artifacts
│   └── lib/
│       └── forge-std/              # Foundry standard library
│
├── public/                         # Static assets
│   ├── logo Archa.png
│   ├── archa-hitam.png
│   ├── vercel.svg
│   ├── window.svg
│   ├── globe.svg
│   ├── next.svg
│   └── file.svg
│
├── src/                            # 🔴 FRONTEND (Next.js App Router)
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Web3Provider > LanguageProvider > ToastProvider)
│   │   ├── page.tsx                # Landing page
│   │   ├── loading.tsx             # Global loading
│   │   ├── globals.css             # Global styles (Tailwind)
│   │   ├── pools/
│   │   │   ├── page.tsx            # 🔴 Pool explorer (677 lines)
│   │   │   ├── loading.tsx
│   │   │   └── [address]/
│   │   │       └── page.tsx        # 🔴 Pool detail (635 lines)
│   │   ├── ai/
│   │   │   ├── page.tsx            # 🔴 AI Optimizer dashboard (435 lines)
│   │   │   └── loading.tsx
│   │   ├── leaderboard/
│   │   │   ├── page.tsx            # Leaderboard page
│   │   │   └── loading.tsx
│   │   ├── faq/
│   │   │   └── page.tsx            # FAQ page
│   │   ├── demo/
│   │   │   └── page.tsx            # Demo walkthrough
│   │   └── api/                    # 🔴 API Routes
│   │       ├── yields/
│   │       │   ├── route.ts        # GET yields data
│   │       │   └── recommend/
│   │       │       └── route.ts    # POST/GET recommendations
│   │       └── strategy/
│   │           └── route.ts        # GET/POST strategy analysis
│   │
│   ├── components/
│   │   ├── Header.tsx              # Navigation header
│   │   ├── Footer.tsx              # Footer with links
│   │   ├── HeroSection.tsx         # Landing hero
│   │   ├── AboutSection.tsx        # About section
│   │   ├── HowItWorksSection.tsx   # How it works
│   │   ├── HowItWorksSlideshow.tsx # How it works slideshow
│   │   ├── AdvantagesSection.tsx   # Advantages section
│   │   ├── AdvantagesSlideshow.tsx # Advantages slideshow
│   │   ├── ConnectWallet.tsx       # 🔴 Wallet connect modal (MetaMask + WalletConnect)
│   │   ├── USDCFaucet.tsx          # 🔴 USDC faucet (calls MockUSDC.mint)
│   │   ├── TestnetInfo.tsx         # 🔴 Mantle testnet info & faucet link
│   │   ├── MantleGasSavings.tsx    # 🔴 Gas savings comparison widget
│   │   ├── SharePool.tsx           # Share pool on social
│   │   ├── WinnerModal.tsx         # Winner celebration modal
│   │   ├── CollateralReturnModal.tsx # Collateral return modal
│   │   ├── PoolAnalyticsChart.tsx  # Pool performance chart
│   │   ├── Confetti.tsx            # Confetti celebration
│   │   ├── Toast.tsx               # Toast notification system
│   │   ├── PageTransition.tsx      # Page transition animation
│   │   ├── LoadingAnimation.tsx    # Logo assembly loading
│   │   ├── LoadingSpinner.tsx      # Generic spinner
│   │   ├── LogoAssembleAnimation.tsx # Logo animation
│   │   ├── OnboardingTutorial.tsx   # First-time user tutorial
│   │   ├── AppInitializer.tsx       # App initialization with loading
│   │   └── ArchaLogo.tsx           # Logo component
│   │
│   ├── hooks/
│   │   ├── useContracts.ts         # 🔴 ALL contract interaction hooks (544 lines)
│   │   └── useAI.ts                # 🔴 AI data hooks (177 lines)
│   │
│   ├── providers/
│   │   └── Web3Provider.tsx        # 🔴 wagmi config — chains, connectors, RPCs (56 lines)
│   │
│   ├── context/
│   │   └── LanguageContext.tsx      # i18n provider (EN/ID, ~490 lines)
│   │
│   ├── config/
│   │   ├── contracts.ts            # 🔴 Contract addresses (3 networks)
│   │   └── abis.ts                 # 🔴 Contract ABIs (Factory, Pool, ERC20)
│   │
│   └── lib/
│       └── ai-optimizer.ts         # 🔴 AI yield engine (468 lines)
│
└── sui/                            # Migration artifacts
    └── migration-docs/
        ├── PROJECT_CONTEXT.md
        ├── REPO_STRUCTURE.md
        ├── BLOCKCHAIN_DEPENDENCY_AUDIT.md
        ├── SUI_MIGRATION_PLAN.md
        ├── SMART_CONTRACT_MIGRATION.md
        ├── BACKEND_MIGRATION.md
        ├── FRONTEND_MIGRATION.md
        ├── RISK_ANALYSIS.md
        └── IMPLEMENTATION_TODO.md
```

---

## Module Dependency Relationships

```
layout.tsx
  └─ Web3Provider (wagmi config)
       └─ LanguageProvider (i18n)
            └─ ToastProvider
                 └─ AppInitializer
                      └─ PageTransition
                           └─ {children}

pools/page.tsx
  ├─ useAllPoolsWithInfo() → useReadContract(ArisanFactory.getAllPools)
  │                         → useReadContracts(ArisanPool.getPoolInfo) × N
  ├─ useUSDCBalance() → useReadContract(ERC20.balanceOf)
  ├─ useUSDCAllowance() → useReadContract(ERC20.allowance)
  ├─ useApproveUSDC() → useWriteContract(ERC20.approve)
  ├─ useJoinPool() → useWriteContract(ArisanPool.joinPool)
  └─ useCreatePool() → useWriteContract(ArisanFactory.createCustomPool)

pools/[address]/page.tsx
  ├─ usePoolInfo() → useReadContract(ArisanPool.getPoolInfo)
  ├─ useParticipantList() → useReadContract(ArisanPool.getParticipantCount)
  │                         → useReadContracts(ArisanPool.participantList) × N
  ├─ useParticipantInfo() → useReadContract(ArisanPool.participants)
  ├─ useMakeDeposit() → useWriteContract(ArisanPool.makeDeposit)
  ├─ useCurrentYield() → useReadContract(ArisanPool.getCurrentYield)
  └─ useLastWinner() → useReadContract(ArisanPool.lastWinner)

ai/page.tsx
  ├─ useYields() → fetch("/api/yields") → DeFiLlama API
  ├─ useAIRecommendation() → fetch("/api/yields/recommend")
  └─ useOptimalStrategy() → fetch("/api/strategy")

USDCFaucet.tsx
  └─ useWriteContract(MockUSDC.mint)

ConnectWallet.tsx
  ├─ useAccount() → wagmi
  ├─ useConnect() → wagmi (MetaMask + WalletConnect)
  └─ useDisconnect() → wagmi

TestnetInfo.tsx
  └─ useBalance() → wagmi (MNT native token)
```

---

## Files Requiring Migration (Priority Order)

| Priority | File(s) | Migration Type |
|----------|---------|----------------|
| 🔴 P0 | `Web3Provider.tsx` | Full rewrite — wagmi → @mysten/dapp-kit |
| 🔴 P0 | `useContracts.ts` | Full rewrite — wagmi hooks → @mysten/sui |
| 🔴 P0 | `contracts/` | Full rewrite — Solidity → Sui Move |
| 🔴 P0 | `ConnectWallet.tsx` | Rewrite — MetaMask/WC → Sui wallet standard |
| 🔴 P0 | `USDCFaucet.tsx` | Rewrite — MockUSDC.mint → Sui Coin |
| 🔴 P0 | `contracts.ts` | Full rewrite — new contract addresses |
| 🔴 P0 | `abis.ts` | Full rewrite — Move ABI equivalents |
| 🟠 P1 | `TestnetInfo.tsx` | Adapt — Mantle → Sui testnet |
| 🟠 P1 | `MantleGasSavings.tsx` | Adapt — Mantle gas → Sui gas |
| 🟠 P1 | `ai-optimizer.ts` | Adapt — Mantle chain → Sui chain |
| 🟡 P2 | `pools/page.tsx` | Adapt — hook imports |
| 🟡 P2 | `pools/[address]/page.tsx` | Adapt — hook imports |
| 🟢 P3 | `LanguageContext.tsx` | No change (blockchain-agnostic) |
| 🟢 P3 | Landing page components | Minimal — text references to "Mantle" |
| 🟢 P3 | `useAI.ts` | No change (uses REST API, not blockchain) |
| 🟢 P3 | API routes | No change (use DeFiLlama REST, not blockchain) |
