# 🚀 DEPLOYMENT — Sui Testnet

> **Network:** Sui Testnet
> **Date:** 2026-06-19
> **Deployer:** 0x501f2840d1d6fb2a98299f52f671150d38e118c33e8342861dd4ad5d58b788f1

---

## 📦 Package ID

```
0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515
```

All types use this as prefix: `suivan::<module>::<type>`

---

## 🏗️ Shared Objects

| Object | ID | Type |
|--------|----|------|
| **ArisanFactory** | `0x4484b70fdea8a4aefcfef9c6a33e13d975b2cde0ce6a2085cb8eb18cf5e6af32` | Shared |
| **Faucet** | `0xb0d0ce15b6c58af48216877c9df20d0ed91409b093f214fe79b29e71c103e311` | Shared |
| **TreasuryCap<TEST_USDC>** | `0x14582163e9d3859e6b7a9b6d7f5bd6335a624212f6ba625d4a9a1f1d79b1e102` | Owned |
| **YieldStrategy** | `0xacb53839fbb80e991e28c8dad4554f8ac374c3dbafa56fbb7547523c1fe2dbd4` | Shared (orphaned — removed from sources) |

## 🪙 Coin Types

| Coin | Full Type |
|------|-----------|
| **TEST_USDC** | `0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515::test_usdc::TEST_USDC` |
| **TEST_SUI** | `0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515::test_sui::TEST_SUI` |

## 🤖 Agent

| Item | Value |
|------|-------|
| **Agent Address** | `0x501f2840d1d6fb2a98299f52f671150d38e118c33e8342861dd4ad5d58b788f1` |

---

## 📝 How to Use

### Claim Test USDC (Faucet)
```
sui client call --package 0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515 \
  --module faucet --function claim_test_usdc \
  --args 0xb0d0ce15b6c58af48216877c9df20d0ed91409b093f214fe79b29e71c103e311 \
  --gas-budget 10000000
```

### View on Explorer
- **Suiscan:** https://suiscan.xyz/testnet/package/0x63ad9b5fb0fa7f286ac05892182e4eb5896cc9165f9bd2b7d0ba1de87b81b515
- **Factory:** https://suiscan.xyz/testnet/object/0x4484b70fdea8a4aefcfef9c6a33e13d975b2cde0ce6a2085cb8eb18cf5e6af32
- **Faucet:** https://suiscan.xyz/testnet/object/0xb0d0ce15b6c58af48216877c9df20d0ed91409b093f214fe79b29e71c103e311

---

## ⚠️ IMPORTANT NOTES

1. Contract upgrade is **breaking** — old pools will not appear in new factory
2. `create_pool` now auto-deposits cycle 1 (creator pre-deposits)
3. `delegate_to` parameter allows auto-agent delegation on creation
4. Agent auto-executes: start, slash, select_winner
5. Winner payout is pull-based — winner must withdraw manually
