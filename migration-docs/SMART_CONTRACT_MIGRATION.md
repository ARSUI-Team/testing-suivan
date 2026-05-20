# SMART_CONTRACT_MIGRATION.md

## Solidity → Sui Move Migration Strategy

---

## 1. Current Solidity Architecture

### Contract Overview

```
MockUSDC (ERC20, 6 decimals)
    ↓ used by
ArisanFactory ──creates──→ ArisanPool (N instances)
    ↓ uses                     ↓ uses
AIYieldStrategy ←──routes──→ BaseVault (5 protocol vaults)
                                  ├── LendleVault
                                  ├── MerchantMoeVault
                                  ├── AgniVault
                                  ├── MinterestVault
                                  └── KTXVault
```

### Key Patterns Used
- **Factory Pattern** — Factory creates pool contracts dynamically
- **ERC20 approve/transferFrom** — Token approval before transfers
- **Access Control** — `onlyOwner`, `onlyAIOptimizer` modifiers
- **Event Emission** — Structured events for all state changes
- **Simulated Yield** — BaseVault simulates yield for hackathon demo
- **Pseudo-random** — `keccak256` for winner selection

---

## 2. Required Move Architecture

### Object Model Design

```
┌─────────────────────────────────────────────────────────┐
│                    Sui Package: archa                    │
│                                                         │
│  ┌──────────────────┐   ┌──────────────────────────┐   │
│  │ AdminCap          │   │ ArisanFactory            │   │
│  │ (Owned Object)    │   │ (Shared Object)          │   │
│  │                   │   │ - templates              │   │
│  │ Owner capability  │   │ - all_pools: vector<ID>  │   │
│  │ for admin funcs   │   │ - user_pools: Table      │   │
│  └──────────────────┘   └──────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ArisanPool (Shared Object) — created per pool    │   │
│  │                                                   │   │
│  │ PoolConfig:                                       │   │
│  │   deposit_amount: u64                             │   │
│  │   max_participants: u64                           │   │
│  │   cycle_duration_ms: u64                          │   │
│  │   collateral_multiplier: u64                      │   │
│  │                                                   │   │
│  │ State:                                            │   │
│  │   current_cycle: u64                              │   │
│  │   pool_start_time_ms: u64                         │   │
│  │   total_pool_funds: Balance                       │   │
│  │   total_yield_earned: Balance                     │   │
│  │   is_pool_active: bool                            │   │
│  │   is_pool_full: bool                              │   │
│  │   is_pool_started: bool                           │   │
│  │   last_winner: Option<address>                    │   │
│  │                                                   │   │
│  │ Participants (via Table or Vec):                  │   │
│  │   participant_list: vector<address>               │   │
│  │   participants: Table<address, Participant>       │   │
│  │   cycle_winners: Table<u64, address>              │   │
│  │                                                   │   │
│  │ Balances:                                         │   │
│  │   collateral: Balance (CoinStore)                 │   │
│  │   pool_funds: Balance (CoinStore)                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ YieldStrategy (Shared Object)                     │   │
│  │                                                   │   │
│  │ - total_deposits: u64                             │   │
│  │ - total_shares: u64                               │   │
│  │ - shares: Table<address, u64>                     │   │
│  │ - simulated_apy: u64                              │   │
│  │ - active_vault_id: Option<ID>                     │   │
│  │ - registered_vaults: vector<ID>                   │   │
│  │ - vault_by_name: Table<String, ID>                │   │
│  │ - funds: Balance                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ProtocolVault (Shared Object) — per DeFi protocol │   │
│  │                                                   │   │
│  │ - protocol_name: String                           │   │
│  │ - apy: u64                                        │   │
│  │ - total_assets: u64                               │   │
│  │ - total_shares: u64                               │   │
│  │ - shares: Table<address, u64>                     │   │
│  │ - funds: Balance                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Move Module Design

### 3.1 `archa` Package Structure

```
archa/
├── Move.toml
├── sources/
│   ├── arisan_pool.move       # Core pool logic
│   ├── arisan_factory.move    # Factory & templates
│   ├── yield_strategy.move    # AI yield optimization
│   ├── protocol_vault.move    # Base vault implementation
│   └── test_usdc.move         # Test USDC coin
├── tests/
│   ├── arisan_pool_tests.move
│   ├── factory_tests.move
│   └── strategy_tests.move
└── generated/                  # Auto-generated bindings
```

### 3.2 Key Move Module Signatures

#### `arisan_pool.move`

```move
module archa::arisan_pool {
    use sui::coin::{Self, Coin, Balance};
    use sui::sui::SUI;
    use sui::table::{Self, Table};

    // === Structs ===

    /// Admin capability - required for admin functions
    public struct AdminCap has key, store { id: UID }

    /// Participant record
    public struct Participant has store, copy, drop {
        collateral_amount: u64,
        total_deposited: u64,
        missed_payments: u64,
        has_received_payout: bool,
        is_active: bool,
        joined_at: u64,
    }

    /// Pool configuration
    public struct PoolConfig has store, copy, drop {
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
    }

    /// The shared pool object
    public struct ArisanPool has key {
        id: UID,
        config: PoolConfig,
        owner: address,
        ai_optimizer: address,

        // State
        current_cycle: u64,
        pool_start_time_ms: u64,
        is_pool_active: bool,
        is_pool_full: bool,
        is_pool_started: bool,
        last_winner: Option<address>,

        // Participants
        participant_list: vector<address>,
        participants: Table<address, Participant>,
        cycle_winners: Table<u64, address>,

        // Funds
        total_pool_funds: Balance,
        total_yield_earned: Balance,
    }

    // === Events ===
    public struct ParticipantJoined has copy, drop {
        participant: address,
        collateral: u64,
    }
    // ... more events

    // === Functions ===

    /// Create a new pool (called by factory or directly)
    public entry fun create_pool(
        usdc_coin: Coin<USDC>,  // For collateral
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        collateral_multiplier: u64,
        ctx: &mut TxContext,
    );

    /// Join the pool
    public entry fun join_pool(
        pool: &mut ArisanPool,
        collateral: Coin<USDC>,
        ctx: &mut TxContext,
    );

    /// Start the pool (once full)
    public entry fun start_pool(
        pool: &mut ArisanPool,
        cap: &AdminCap,
        ctx: &mut TxContext,
    );

    /// Make monthly deposit
    public entry fun make_deposit(
        pool: &mut ArisanPool,
        deposit: Coin<USDC>,
        ctx: &mut TxContext,
    );

    /// Select winner for current cycle
    public entry fun select_winner(
        pool: &mut ArisanPool,
        cap: &AdminCap,
        ctx: &mut TxContext,
    );

    // View functions
    public fun get_required_collateral(pool: &ArisanPool): u64;
    public fun get_total_collateral(pool: &ArisanPool): u64;
    public fun get_current_yield(pool: &ArisanPool): u64;
    public fun get_eligible_winners(pool: &ArisanPool): vector<address>;
    public fun get_pool_info(pool: &ArisanPool): PoolInfo;
}
```

#### `arisan_factory.move`

```move
module archa::arisan_factory {
    use sui::table::{Self, Table};
    use archa::arisan_pool::{Self, ArisanPool};

    public struct PoolTemplate has store, copy, drop {
        name: String,
        deposit_amount: u64,
        max_participants: u64,
        cycle_duration_ms: u64,
        is_active: bool,
    }

    public struct AdminCap has key, store { id: UID }

    public struct ArisanFactory has key {
        id: UID,
        owner: address,
        ai_optimizer: address,
        templates: vector<PoolTemplate>,
        all_pools: vector<ID>,
        user_pools: Table<address, vector<ID>>,
    }

    public entry fun create_factory(ctx: &mut TxContext);
    public entry fun create_pool_from_template(factory: &mut ArisanFactory, template_id: u64, ctx: &mut TxContext);
    public entry fun create_custom_pool(factory: &mut ArisanFactory, deposit_amount: u64, max_participants: u64, cycle_duration_ms: u64, ctx: &mut TxContext);
    public entry fun add_template(factory: &mut ArisanFactory, cap: &AdminCap, name: String, deposit_amount: u64, max_participants: u64, cycle_duration_ms: u64, ctx: &mut TxContext);
}
```

#### `yield_strategy.move`

```move
module archa::yield_strategy {
    use sui::coin::{Self, Coin, Balance};
    use sui::table::{Self, Table};

    public struct YieldStrategy has key {
        id: UID,
        owner: address,
        ai_optimizer: address,
        total_deposits: u64,
        total_shares: u64,
        simulated_apy: u64,     // basis points
        protocol_name: String,
        last_update_time_ms: u64,
        shares: Table<address, u64>,
        active_vault_id: Option<ID>,
        registered_vaults: vector<ID>,
        vault_by_name: Table<String, ID>,
        funds: Balance,
    }

    public entry fun deposit(strategy: &mut YieldStrategy, coin: Coin<USDC>, ctx: &mut TxContext);
    public entry fun withdraw(strategy: &mut YieldStrategy, shares: u64, ctx: &mut TxContext);
    public entry fun switch_protocol(strategy: &mut YieldStrategy, cap: &AdminCap, protocol_name: String, new_apy: u64, ctx: &mut TxContext);
}
```

---

## 4. Key Migration Challenges (Solidity → Move)

### 4.1 Token Handling

| Challenge | Solution |
|-----------|----------|
| No `approve/transferFrom` in Sui | Pass `Coin` objects directly as function arguments |
| No ERC20 standard | Use `sui::coin` framework with `Balance` and `Coin` types |
| USDC is a native coin on Sui | Use existing Sui USDC or create test version |
| Need to handle multiple Coin objects | Use `sui::coin::take` to split exact amounts |
| Pool needs to hold funds | Store as `Balance` in shared object |

**Approve Pattern Elimination:**
```
// EVM: Two transactions
1. usdc.approve(pool, amount)
2. pool.joinPool() // pool calls transferFrom

// Sui: Single transaction with PTB
1. [PTB]
   - Split Coin<USDC> with amount
   - arisan_pool::join_pool(pool, split_coin)
   // Coin transferred directly as argument
```

### 4.2 Dynamic Collections

| EVM | Sui Move |
|-----|----------|
| `mapping(address => Participant)` | `Table<address, Participant>` |
| `address[] participantList` | `vector<address>` in struct |
| `mapping(uint256 => address)` | `Table<u64, address>` |

**Note:** `Table` has per-entry storage cost. For small datasets (5-20 participants), a `vector` with linear search may be more gas-efficient.

### 4.3 Access Control

| EVM | Sui Move |
|-----|----------|
| `modifier onlyOwner` | `AdminCap` capability object (owned by deployer) |
| `msg.sender == owner` | Check `TxContext::sender()` |
| `onlyAIOptimizer` | `OptimizerCap` capability or address check |

### 4.4 Random Winner Selection

```move
// Option 1: Simple hash-based (hackathon only)
fun select_random_winner(pool: &ArisanPool, ctx: &TxContext): address {
    let eligible = get_eligible_winners(pool);
    let hash = tx_context::digest(ctx); // Not truly random
    let index = hash_to_u64(hash) % vector::length(&eligible);
    *vector::borrow(&eligible, index)
}

// Option 2: External oracle (production)
// Use a randomness service or commit-reveal
```

### 4.5 Events

```move
// EVM
event ParticipantJoined(address indexed participant, uint256 collateral);

// Move
public struct ParticipantJoined has copy, drop {
    participant: address,
    collateral: u64,
}

// In function:
sui::event::emit(ParticipantJoined {
    participant: sender,
    collateral: amount,
});
```

### 4.6 Time-based Logic

| EVM | Sui Move |
|-----|----------|
| `block.timestamp` | `sui::clock::timestamp_ms(clock)` (pass Clock obj as param) |
| `30 days` constant | `30 * 24 * 60 * 60 * 1000` (ms in Sui) |

**Important:** Sui Clock requires passing `&Clock` as a function parameter in the PTB.

### 4.7 Shared vs Owned Objects

| State | Object Type | Reason |
|-------|-------------|--------|
| ArisanPool | **Shared** | Multiple users need to read/write |
| ArisanFactory | **Shared** | Anyone can create pools |
| YieldStrategy | **Shared** | Pool + AI need to interact |
| AdminCap | **Owned** | Only admin holds this |
| Participant's collateral Coin | **Owned → Shared** | Transferred from user to pool |

---

## 5. Storage Cost Considerations

Sui charges for storage. Key considerations:

| Object | Est. Size | Storage Cost |
|--------|-----------|--------------|
| ArisanPool (5 participants) | ~2KB | ~2 SUI |
| ArisanPool (20 participants) | ~8KB | ~8 SUI |
| YieldStrategy | ~1KB | ~1 SUI |
| ProtocolVault | ~0.5KB | ~0.5 SUI |
| Table entries | ~32 bytes each | Per entry |

**Note:** Storage is refundable when objects are deleted.

---

## 6. Contract Interaction Flow (Sui PTB)

### Join Pool Transaction (Sui)

```typescript
const tx = new Transaction();
const [collateralCoin] = tx.splitCoins(tx.gas, [tx.pure(collateralAmount)]);

tx.moveCall({
  target: `${PACKAGE_ID}::arisan_pool::join_pool`,
  arguments: [
    tx.object(poolId),           // shared pool object
    collateralCoin,              // Coin<USDC> for collateral
    tx.object(CLOCK_ID),         // Clock object
  ],
  typeArguments: [USDC_TYPE],
});
```

### Make Deposit (Sui)

```typescript
const tx = new Transaction();
const [depositCoin] = tx.splitCoins(usdcCoin, [tx.pure(depositAmount)]);

tx.moveCall({
  target: `${PACKAGE_ID}::arisan_pool::make_deposit`,
  arguments: [
    tx.object(poolId),
    depositCoin,
    tx.object(CLOCK_ID),
  ],
  typeArguments: [USDC_TYPE],
});
```

### No More Approve Transaction! ✅

The entire `approve + transferFrom` pattern is eliminated. Users pass Coin objects directly in Programmable Transaction Blocks.
