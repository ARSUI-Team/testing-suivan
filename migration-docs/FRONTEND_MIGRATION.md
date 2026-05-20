# FRONTEND_MIGRATION.md

## Frontend Migration: Mantle/EVM → Sui

---

## Overview

The frontend is built with **Next.js 15 App Router**, **React 19**, **TypeScript**, and **Tailwind CSS**. The migration primarily affects the Web3 layer (wallet + contract interactions), while the UI framework and styling remain unchanged.

---

## 1. Wallet Migration

### Current (MetaMask + WalletConnect on EVM)

```typescript
// Web3Provider.tsx — Current
import { WagmiProvider, createConfig, http } from "wagmi";
import { mantle, mantleSepoliaTestnet, sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const connectors = [
  injected({ target: "MetaMask" }),
  walletConnect({ projectId, showQrModal: true }),
];

const config = createConfig({
  chains: [mantleSepoliaTestnet, mantle, sepolia],
  connectors,
  transports: {
    [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
    [mantle.id]: http("https://rpc.mantle.xyz"),
    [sepolia.id]: http("https://gateway.tenderly.co/public/sepolia"),
  },
});
```

### Target (Sui Wallet Standard)

```typescript
// Web3Provider.tsx — Sui Migration
import { SuiClientProvider, getFullnodeUrl } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { networkConfig } from "./networkConfig";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        {children}
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

**Network Config:**
```typescript
// networkConfig.ts
import { getFullnodeUrl } from "@mysten/sui.js/client";

export const networkConfig = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};
```

### Wallet Connectors

| Current (EVM) | Target (Sui) |
|---------------|---------------|
| MetaMask (injected) | Sui Wallet Standard (auto-detect) |
| WalletConnect QR | Built into Sui wallets (Suiet, Ethos, etc.) |
| `window.ethereum` | `window.suiWallet` / wallet standard |

**ConnectWallet.tsx Rewrite:**
```typescript
// Current
const { connect, connectors } = useConnect();       // wagmi
const { address, isConnected } = useAccount();      // wagmi

// Sui
import { useConnectWallet, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";

const { mutate: connect } = useConnectWallet();
const account = useCurrentAccount();
const { mutate: disconnect } = useDisconnectWallet();
```

### Balance Display

```typescript
// Current (EVM)
import { useBalance } from "wagmi";
const { data: balance } = useBalance({ address });

// Sui
import { useBalance } from "@mysten/dapp-kit";
const { data: balance } = useBalance(account?.address);

// USDC balance
import { useBalance as useCoinBalance } from "@mysten/dapp-kit";
const { data: usdcBalance } = useCoinBalance(account?.address, {
  coinType: "0x...::usdc::USDC"
});
```

---

## 2. Transaction Flow Changes

### Approve + Transfer → Direct Coin Transfer

**Current EVM (2 transactions):**
```typescript
// Step 1: Approve
const { writeContract } = useWriteContract();
writeContract({
  address: USDC_ADDRESS,
  abi: ERC20_ABI,
  functionName: "approve",
  args: [poolAddress, amount],
});

// Step 2: After approval confirmed
writeContract({
  address: poolAddress,
  abi: ARISAN_POOL_ABI,
  functionName: "joinPool",
});
```

**Sui (1 transaction with PTB):**
```typescript
import { Transaction } from "@mysten/sui.js/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";

const { mutate: signAndExecute } = useSignAndExecuteTransaction();

const joinPool = (poolId: string, collateralAmount: number) => {
  const tx = new Transaction();

  // Split USDC coins for collateral
  const [collateralCoin] = tx.splitCoins(
    tx.object(usdcCoinId),
    [tx.pure.u64(collateralAmount)]
  );

  // Join pool — pass coin directly
  tx.moveCall({
    target: `${PACKAGE_ID}::arisan_pool::join_pool`,
    arguments: [
      tx.object(poolId),     // shared pool object
      collateralCoin,        // Coin<USDC>
      tx.object(CLOCK_ID),   // Clock
    ],
    typeArguments: [USDC_TYPE],
  });

  signAndExecute({ transaction: tx });
};
```

### Transaction Confirmation

**Current (EVM):**
```typescript
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
```

**Sui:**
```typescript
const { data: result, isPending, isSuccess } = useSignAndExecuteTransaction();
// Wait for digest confirmation if needed
```

---

## 3. Contract Read Hooks Migration

### Reading Pool Data

**Current (EVM):**
```typescript
const { data } = useReadContract({
  address: poolAddress,
  abi: ARISAN_POOL_ABI,
  functionName: "getPoolInfo",
  chainId: CHAIN_ID,
});
```

**Sui:**
```typescript
import { useSuiClient } from "@mysten/dapp-kit";

const client = useSuiClient();

const { data } = useQuery({
  queryKey: ["poolInfo", poolId],
  queryFn: async () => {
    const result = await client.getObject({
      id: poolId,
      options: { showContent: true },
    });
    return parsePoolData(result.data?.content);
  },
});
```

### Reading Multiple Pools

**Current (EVM):**
```typescript
const { data } = useReadContracts({
  contracts: poolAddresses.map(addr => ({
    address: addr,
    abi: ARISAN_POOL_ABI,
    functionName: "getPoolInfo",
  })),
});
```

**Sui:**
```typescript
const pools = await Promise.all(
  poolIds.map(id => client.getObject({
    id,
    options: { showContent: true },
  }))
);
```

### Getting All Pools from Factory

**Current (EVM):**
```typescript
const { data: poolAddresses } = useReadContract({
  address: FACTORY_ADDRESS,
  abi: ARISAN_FACTORY_ABI,
  functionName: "getAllPools",
});
```

**Sui:**
```typescript
// Read factory shared object
const factory = await client.getObject({
  id: FACTORY_ID,
  options: { showContent: true },
});
const poolIds = factory.data?.content?.fields?.all_pools;
```

---

## 4. Address Format Changes

| EVM | Sui |
|-----|-----|
| `0x1234...abcd` (20 bytes, hex) | `0x1234...abcd` (32 bytes, hex) |
| Checksum addresses | No checksum needed |
| ENS names (future) | Sui Name Service (future) |
| `0x${string}` TypeScript type | `string` (Sui SDK handles validation) |

**Display formatting stays the same:**
```typescript
const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
```

---

## 5. Component-by-Component Migration

### `ConnectWallet.tsx` — **FULL REWRITE**

| Section | Change |
|---------|--------|
| Wallet detection | `window.ethereum` → Sui wallet standard |
| Connect modal | MetaMask/WC icons → Sui wallet icons (Suiet, Ethos, etc.) |
| Address display | Same format (`0x...`) |
| Balance display | `useBalance()` from dapp-kit |
| Disconnect | `useDisconnectWallet()` from dapp-kit |

### `USDCFaucet.tsx` — **FULL REWRITE**

```typescript
// Current — calls MockUSDC.mint() on EVM
writeContract({
  address: MOCK_USDC_ADDRESS,
  functionName: "mint",
  args: [address, parseUnits("10000", 6)],
});

// Sui — call faucet move function
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::test_usdc::mint_faucet`,
  arguments: [tx.pure.address(account.address), tx.pure.u64(10_000_000_000)],
});
signAndExecute({ transaction: tx });
```

### `TestnetInfo.tsx` — **ADAPT**

| Change | Details |
|--------|---------|
| Chain check | `chain?.id === mantleSepoliaTestnet.id` → check Sui network |
| Native token | "MNT" → "SUI" |
| Faucet link | Mantle faucet → Sui faucet (`https://discord.gg/sui` #testnet-faucet) |
| Balance | `useBalance()` from wagmi → `useBalance()` from dapp-kit |

### `MantleGasSavings.tsx` — **ADAPT/REBRAND**

| Change | Details |
|--------|---------|
| Branding | "Powered by Mantle" → "Powered by Sui" |
| Gas prices | Mantle estimates → Sui estimates |
| Unit | gwei → MIST (1 SUI = 10^9 MIST) |
| Storage costs | Add storage cost section (unique to Sui) |

### `pools/page.tsx` — **ADAPT IMPORTS**

- Replace all `useContracts` imports with new Sui hooks
- Remove `useUSDCAllowance` (no approve pattern)
- Remove `useApproveUSDC` (no approve pattern)
- Update pool address type from `0x${string}` to `string`

### `pools/[address]/page.tsx` — **ADAPT IMPORTS**

- Same as pools/page.tsx
- Remove approve flow (join pool = 1 tx instead of 2)
- Update explorer links from Mantlescan → Suiscan

### `ai/page.tsx` — **MINIMAL CHANGES**

- Protocol names change (Lendle → Scallop, etc.)
- Vault address display changes
- Explorer links change
- DeFiLlama data stays the same (chain filter changes)

### `LanguageContext.tsx` — **TEXT UPDATES**

| Translation Key | Current (EN) | Change To |
|-----------------|-------------|-----------|
| `about.description` | "built on Mantle Network" | "built on Sui Network" |
| `about.adv6.desc` | "Built on Mantle Network..." | "Built on Sui Network..." |
| `footer.description` | "...on Mantle Network..." | "...on Sui Network..." |
| `faq.a1` | "...built on Mantle Network..." | "...built on Sui Network..." |
| `faq.a5` | "Mantle Network gas fees..." | "Sui Network gas fees..." |
| `faq.a6` | "...bridge to Mantle Network" | "...bridge to Sui Network" |

---

## 6. UI/UX Transaction Differences

### For Users

| EVM Experience | Sui Experience |
|---------------|----------------|
| 2 tx for join (approve + join) | 1 tx for join (coin transfer) ✅ Better UX |
| Wait for 2 confirmations | Wait for 1 confirmation ✅ Faster |
| Gas in ETH/MNT | Gas in SUI |
| MetaMask popup | Sui wallet popup |
| 20-byte address | 32-byte address |

### Explorer Links

| EVM | Sui |
|-----|-----|
| `https://sepolia.mantlescan.xyz/address/{addr}` | `https://suiscan.xyz/testnet/object/{id}` |
| `https://sepolia.mantlescan.xyz/tx/{hash}` | `https://suiscan.xyz/testnet/tx/{digest}` |
