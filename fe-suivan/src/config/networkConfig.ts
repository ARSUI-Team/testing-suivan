import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6",
      factoryId: "0x70a934372b9508ca92e8b0ed11ca4bfb0a42d17d27c6fb7838f195b5cc74714d",
      usdcType: "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_usdc::TEST_USDC",
      suiType: "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_sui::TEST_SUI",
      faucetId: "0xca8159a2315c30d0705232c95189e236462d7b74a0b153f5cd0866d7864e1862",
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6",
      factoryId: "0x70a934372b9508ca92e8b0ed11ca4bfb0a42d17d27c6fb7838f195b5cc74714d",
      usdcType: "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_usdc::TEST_USDC",
      suiType: "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_sui::TEST_SUI",
      faucetId: "0xca8159a2315c30d0705232c95189e236462d7b74a0b153f5cd0866d7864e1862",
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
