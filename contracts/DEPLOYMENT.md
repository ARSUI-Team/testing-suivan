# 🚀 DEPLOYMENT — Sui Testnet

> **Network:** Sui Testnet
> **Date:** 2025-05-20
> **TX Digest:** 4rhFM1QPS6tDzszmAqJSynnKCY6JeWTbK4pauco7L9Lr
> **Deployer:** 0x0c605e48372c48178372abb66f4444ee3d25fe954bd9010879b6c9797e6ef061

---

## 📦 Package ID

```
0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b
```

All types use this as prefix: `suivan::<module>::<type>`

---

## 🏗️ Shared Objects

| Object | ID | Type |
|--------|----|------|
| **ArisanFactory** | `0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867` | Shared |
| **YieldStrategy** | `0xf374ed58edfbf394acca7b352ef0c6738f4b5c5dd378df28c7f69cdd0611b5e2` | Shared |

## 🪙 Coin Types

| Coin | Full Type |
|------|-----------|
| **TEST_USDC** | `0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b::test_usdc::TEST_USDC` |

## 🔐 Owned Capability Objects

| Cap | ID | Owner |
|-----|----|-------|
| **FactoryAdminCap** | `0xd3069209feab76594555a5609412a7be45931016f8d740d9437e56b308496e9f` | deployer |
| **StrategyAdminCap** | `0x3d1a4021b01340701390ae56fbbbe8876a6f2202328280ffc76f8477356ae37d` | deployer |
| **PoolAdminCap** | `0x54111fe94c2f54a5e6d1cbc4320ff1d25fc7bfe8ea59c5ec3f3439f8eec905c1` | deployer |
| **TreasuryCap<TEST_USDC>** | `0x63af2ef268e8ab668201807c1b8452210b43d2adfe8562bac96db8b3bfbb7e4f` | deployer |
| **Currency<TEST_USDC>** | `0xab7d7903cba24e14a8f81f0caac70432e5dd72b1cf6b7e69c24dcec6689ad03a` | deployer |
| **UpgradeCap** | `0xfd300d6c39b9ff69101ff06a4cdd762f640bb64c77760eca9a0f66e7b9497c06` | deployer |

---

## 📝 How to Use

### Mint Test USDC
```bash
sui client call --package 0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b \
  --module test_usdc --function mint_faucet \
  --args 10000000000 --gas-budget 10000000
```
(Mints 10,000 TEST_USDC to sender)

### Initialize Factory Templates
```bash
sui client call --package 0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b \
  --module arisan_factory --function init_default_templates \
  --args 0xd3069209feab76594555a5609412a7be45931016f8d740d9437e56b308496e9f \
  --args 0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867 \
  --gas-budget 10000000
```

### Create Pool (Custom)
```bash
# First, split coins for collateral
# Then call create_pool with collateral coin
sui client call --package 0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b \
  --module arisan_pool --function create_pool \
  --args <COIN_OBJECT> 10000000 5 2592000000 125 \
  --gas-budget 10000000
```

### View on Explorer
- **Suiscan:** https://suiscan.xyz/testnet/package/0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b
- **Factory:** https://suiscan.xyz/testnet/object/0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867
- **Strategy:** https://suiscan.xyz/testnet/object/0xf374ed58edfbf394acca7b352ef0c6738f4b5c5dd378df28c7f69cdd0611b5e2

---

## ⚠️ IMPORTANT NOTES

1. **TreasuryCap** is owned by deployer — only deployer can mint TEST_USDC
2. **AdminCap objects** are owned by deployer — needed for admin operations
3. **UpgradeCap** allows upgrading the package — keep safe!
4. Factory templates need to be initialized before pool creation from template works

---

## 🧪 Test Pool Created

| Pool | ID | Config |
|------|----|--------|
| **Small Pool (test)** | `0x50f5d1efd0884e6d98c4ae69836c7c8133fc736fec0a72247ea2134b7e8445a6` | 10 USDC deposit, 5 max participants, 30 days, 125% collateral |

### Verification Links
- **Package:** https://suiscan.xyz/testnet/package/0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b
- **Factory:** https://suiscan.xyz/testnet/object/0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867
- **YieldStrategy:** https://suiscan.xyz/testnet/object/0xf374ed58edfbf394acca7b352ef0c6738f4b5c5dd378df28c7f69cdd0611b5e2
- **Test Pool:** https://suiscan.xyz/testnet/object/0x50f5d1efd0884e6d98c4ae69836c7c8133fc736fec0a72247ea2134b7e8445a6
