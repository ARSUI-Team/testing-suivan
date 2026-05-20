# BLOCKCHAIN_DEPENDENCY_AUDIT.md

## Complete EVM/Mantle Dependency Map

---

## 1. NPM Package Dependencies (Blockchain-Specific)

| Package | Version | Usage | Migration Target |
|---------|---------|-------|------------------|
| `wagmi` | ^2.12.0 | React hooks for Ethereum — ALL contract reads/writes | `@mysten/dapp-kit` |
| `viem` | ^2.21.0 | TypeScript Ethereum library — address/format utils | `@mysten/sui.js` |
| `@tanstack/react-query` | ^5.59.0 | Used by wagmi under the hood | ✅ Keep (also used by @mysten/dapp-kit) |

---

## 2. Smart Contract Layer — Solidity → Move

### 2.1 ArisanPool.sol (432 lines) — **CRITICAL**

| Solidity Pattern | Line(s) | EVM-Specific | Sui Equivalent |
|------------------|---------|--------------|----------------|
| `IERC20 usdc` (immutable) | 34 | ERC20 token interface | `Coin<USDC>` managed object |
| `IYieldStrategy yieldStrategy` | 35 | Contract interface | Shared Move module reference |
| `mapping(address => Participant)` | 39 | Address-keyed mapping | `Table` or `Bag` with address keys |
| `address[] participantList` | 40 | Dynamic address array | `vector<address>` in shared object |
| `mapping(uint256 => address) cycleWinners` | 49 | Cycle → winner mapping | `Table<u64, address>` |
| `usdc.transferFrom()` | 131 | ERC20 approve+transferFrom | `Coin::transfer()` or PTB |
| `usdc.approve()` | 170, 195 | ERC20 approve pattern | Not needed in Sui (object-based) |
| `usdc.transfer()` | 230, 420 | Direct transfer | `Coin::transfer()` |
| `keccak256(abi.encodePacked(block.timestamp, block.prevrandao, currentCycle))` | 213-214 | Pseudo-random | Need oracle or Sui randomness |
| `block.timestamp` | 143, 166, etc. | Block timestamp | `tx_context::epoch_timestamp_ms()` |
| `require()` statements | throughout | Error handling | `assert!()` with abort codes |
| `modifier onlyOwner` | 69 | Access control | `TxContext::sender()` check or capability |
| `event` emissions | 57-66 | Event logging | `sui::event::emit()` |
| `address(0)` checks | 99, etc. | Zero address guard | Not needed (object model different) |

### 2.2 ArisanFactory.sol (223 lines) — **CRITICAL**

| Solidity Pattern | Line(s) | EVM-Specific | Sui Equivalent |
|------------------|---------|--------------|----------------|
| `new ArisanPool(...)` | 172 | Dynamic contract creation | `ArisanPool` shared object creation |
| `address[] allPools` | 18 | Track all pools | `vector<ID>` or `TableVec` in registry |
| `mapping(address => address[]) userPools` | 19 | User → pools mapping | `Table<address, vector<ID>>` |
| `PoolTemplate[]` struct array | 28-33 | Template storage | `vector<PoolTemplate>` in shared object |
| `immutable usdc` address | 14 | Token address | `CoinMetadata<USDC>` or registry |

### 2.3 AIYieldStrategy.sol (312 lines) — **CRITICAL**

| Solidity Pattern | Line(s) | EVM-Specific | Sui Equivalent |
|------------------|---------|--------------|----------------|
| `IVault` interface | 6, 33 | External contract calls | Move module calls |
| `token.approve(address(activeVault), amount)` | 95 | ERC20 approve | Not needed in Sui |
| `activeVault.deposit(amount)` | 96 | External contract call | Move function call with Coin object |
| `activeVault.withdraw(sharesToWithdraw)` | 140 | External contract call | Move function returning Coin |
| `shares[msg.sender]` mapping | 26 | Per-user shares | `Table<address, u64>` in shared object |
| `vaultByName` string mapping | 36 | String → address mapping | `Table<String, ID>` |

### 2.4 MockUSDC.sol — **REPLACE**

Entirely EVM-specific. On Sui:
- Use native Sui USDC (`0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`)
- Or create test USDC coin using `sui::coin::create_currency`
- Faucet: Use Sui CLI faucet or custom faucet service

---

## 3. Frontend Blockchain Dependencies

### 3.1 Web3Provider.tsx — **FULL REWRITE**

```typescript
// CURRENT (EVM-specific)
import { WagmiProvider, createConfig, http } from "wagmi";
import { mantle, mantleSepoliaTestnet, sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
```

**All EVM dependencies:**
- `WagmiProvider` → `SuiClientProvider` from `@mysten/dapp-kit`
- `createConfig()` → `createNetworkConfig()` + `makeSuiClientContext()`
- `http()` transports → `getFullnodeUrl()` from `@mysten/sui.js`
- `injected` connector (MetaMask) → Sui wallet standard
- `walletConnect` connector → `@mysten/wallet-kit` or Sui wallet adapter
- Chain IDs (5003, 5000, 11155111) → Sui chain IDs (testnet, mainnet)

### 3.2 useContracts.ts (544 lines) — **FULL REWRITE**

Every single hook is EVM-specific:

| Hook | wagmi Usage | Lines | Must Change |
|------|-------------|-------|-------------|
| `useAllPools()` | `useReadContract()` | 41-54 | ✅ Full rewrite |
| `usePoolInfo()` | `useReadContract()` | 57-86 | ✅ Full rewrite |
| `usePoolsInfo()` | `useReadContracts()` | 89-128 | ✅ Full rewrite |
| `useAllPoolsWithInfo()` | combines above | 131-185 | ✅ Full rewrite |
| `useRequiredCollateral()` | `useReadContract()` | 188-205 | ✅ Full rewrite |
| `useUSDCBalance()` | `useReadContract()` | 208-227 | ✅ Full rewrite |
| `useUSDCAllowance()` | `useReadContract()` | 230-249 | ✅ Full rewrite (not needed on Sui) |
| `useApproveUSDC()` | `useWriteContract()` + `useWaitForTransactionReceipt()` | 252-274 | ✅ Full rewrite (no approve pattern) |
| `useJoinPool()` | `useWriteContract()` | 277-297 | ✅ Full rewrite |
| `useCreatePool()` | `useWriteContract()` | 300-324 | ✅ Full rewrite |
| `useCreatePoolFromTemplate()` | `useWriteContract()` | 327-348 | ✅ Full rewrite |
| `useMakeDeposit()` | `useWriteContract()` | 351-371 | ✅ Full rewrite |
| `useParticipantInfo()` | `useReadContract()` | 374-402 | ✅ Full rewrite |
| `useParticipantList()` | `useReadContract()` + `useReadContracts()` | 405-443 | ✅ Full rewrite |
| `useHasDepositedThisCycle()` | `useReadContract()` | 446-464 | ✅ Full rewrite |
| `useCycleWinner()` | `useReadContract()` | 467-484 | ✅ Full rewrite |
| `useLastWinner()` | `useReadContract()` | 487-503 | ✅ Full rewrite |
| `useCurrentYield()` | `useReadContract()` | 506-523 | ✅ Full rewrite |
| `useIsCycleComplete()` | `useReadContract()` | 526-543 | ✅ Full rewrite |

**EVM-specific patterns used throughout:**
- `formatUnits(data, 6)` — USDC 6-decimal formatting
- `parseUnits(amount, 6)` — USDC amount conversion
- `0x${string}` address type
- `mantleSepoliaTestnet.id` chain ID
- `useWaitForTransactionReceipt()` — transaction confirmation

### 3.3 ConnectWallet.tsx — **FULL REWRITE**

| EVM Pattern | Usage | Sui Equivalent |
|-------------|-------|----------------|
| `useAccount()` from wagmi | Address + connection state | `useCurrentAccount()` from dapp-kit |
| `useConnect()` from wagmi | MetaMask/WC connectors | `useConnectWallet()` from dapp-kit |
| `useDisconnect()` from wagmi | Disconnect | `useDisconnectWallet()` from dapp-kit |
| `useBalance()` from wagmi | MNT native balance | `useBalance()` from dapp-kit |
| `window.ethereum` | MetaMask detection | Sui wallet injection (`window.suiWallet`) |
| MetaMask SVG icon | Wallet icon | Sui wallet icons (Suiet, Ethos, etc.) |
| WalletConnect QR | Mobile connect | Sui wallet QR (built-in) |
| EVM address format `0x...` | Address display | Sui address format |

### 3.4 USDCFaucet.tsx — **FULL REWRITE**

```typescript
// CURRENT — calls MockUSDC.mint() on EVM
writeContract({
  address: MOCK_USDC_ADDRESS,
  abi: MOCK_USDC_ABI,
  functionName: "mint",
  args: [address, parseUnits(String(FAUCET_AMOUNT), 6)],
  chainId: mantleSepoliaTestnet.id,
});
```

Must change to:
- Call Sui Move faucet module
- Or use Sui CLI faucet
- Or create a custom faucet endpoint

### 3.5 TestnetInfo.tsx — **ADAPT**

| EVM Pattern | Must Change |
|-------------|-------------|
| `mantleSepoliaTestnet.id` check | → Sui testnet chain check |
| `useBalance()` for MNT | → SUI balance check |
| "MNT" references | → "SUI" references |
| Link to Mantle faucet | → Link to Sui faucet |
| "Mantle Sepolia Testnet" text | → "Sui Testnet" |

### 3.6 MantleGasSavings.tsx — **ADAPT/REMOVE**

| EVM Pattern | Must Change |
|-------------|-------------|
| Mantle-specific gas prices | → Sui gas estimates |
| "Powered by Mantle" branding | → "Powered by Sui" |
| Ethereum vs Mantle comparison | → Ethereum vs Sui comparison |
| Gas in gwei | → Sui uses MIST (1 SUI = 10^9 MIST) |

---

## 4. Contract Configuration Files

### 4.1 contracts.ts — **FULL REWRITE**

```typescript
// CURRENT — EVM addresses for 3 networks
export const CONTRACTS = {
  ethereumSepolia: { chainId: 11155111, usdc: "0x...", factory: "0x...", ... },
  mantleSepolia: { chainId: 5003, usdc: "0x...", factory: "0x...", ... },
  mainnet: { chainId: 5000, ... }
};
export const ACTIVE_CHAIN = "mantleSepolia";
```

Must change to:
- Sui object IDs for shared objects
- Sui package ID
- Sui USDC type tag
- Network: testnet / mainnet

### 4.2 abis.ts (417 lines) — **FULL REWRITE**

All ABIs are EVM-specific (function signatures, types). Move contracts have different interface patterns. Replace with:
- Move module function references
- Or auto-generated TypeScript client from Move ABI

---

## 5. AI Optimizer Layer — **ADAPT**

### 5.1 ai-optimizer.ts

| EVM Pattern | Must Change |
|-------------|-------------|
| `VAULT_ADDRESSES` — EVM addresses | → Sui object IDs |
| `chain: "Mantle"` in protocol data | → `chain: "Sui"` |
| DeFiLlama filter for Mantle chain | → Filter for Sui chain protocols |
| Mantle-specific protocol list (Lendle, Merchant Moe, etc.) | → Sui DeFi protocols (Scallop, NAVX, Aftermath, etc.) |
| `DEFILLAMA_PROJECT_MAPPING` | → Sui protocol mapping |

### 5.2 API Routes (yields, strategy, recommend)

These are **mostly blockchain-agnostic** (they call DeFiLlama REST API, not blockchain RPC). Changes needed:
- Replace Mantle-specific protocol names with Sui protocols
- Update DeFiLlama filter from `chain === "mantle"` to `chain === "sui"`
- Update risk scores for new protocols
- Update fallback APY values

---

## 6. Risk Assessment Per File

| File | EVM Coupling | Migration Risk | Estimated Effort |
|------|-------------|----------------|------------------|
| `ArisanPool.sol` | 🔴 CRITICAL | HIGH | 3-5 days |
| `ArisanFactory.sol` | 🔴 CRITICAL | HIGH | 2-3 days |
| `AIYieldStrategy.sol` | 🔴 CRITICAL | HIGH | 2-3 days |
| `useContracts.ts` | 🔴 CRITICAL | MEDIUM | 2-3 days |
| `Web3Provider.tsx` | 🔴 CRITICAL | MEDIUM | 1 day |
| `ConnectWallet.tsx` | 🔴 CRITICAL | MEDIUM | 1 day |
| `contracts.ts` | 🔴 CRITICAL | LOW | 0.5 day |
| `abis.ts` | 🔴 CRITICAL | LOW | 0.5 day |
| `USDCFaucet.tsx` | 🔴 CRITICAL | MEDIUM | 1 day |
| `TestnetInfo.tsx` | 🟠 HIGH | LOW | 0.5 day |
| `MantleGasSavings.tsx` | 🟠 HIGH | LOW | 0.5 day |
| `ai-optimizer.ts` | 🟠 HIGH | MEDIUM | 1-2 days |
| `pools/page.tsx` | 🟡 MEDIUM | LOW | 0.5 day |
| `pools/[address]/page.tsx` | 🟡 MEDIUM | LOW | 0.5 day |
| `LanguageContext.tsx` | 🟢 LOW | LOW | 0.5 day (text changes) |
| Landing page components | 🟢 LOW | LOW | 0.5 day |
