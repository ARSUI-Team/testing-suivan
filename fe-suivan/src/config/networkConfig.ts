import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156",
      factoryId: "0xa8109352afcf4dfe8eba3337d901a24e9aad80515e8781902a395695b9cc7e83",
      usdcType: "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156::test_usdc::TEST_USDC",
      suiType: "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156::test_sui::TEST_SUI",
      faucetId: "0x3dc30bab44e1d2f6ed75503ff701c3a406cf2144ac3b2e21d8b53947be9d2819",
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156",
      factoryId: "0xa8109352afcf4dfe8eba3337d901a24e9aad80515e8781902a395695b9cc7e83",
      usdcType: "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156::test_usdc::TEST_USDC",
      suiType: "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156::test_sui::TEST_SUI",
      faucetId: "0x3dc30bab44e1d2f6ed75503ff701c3a406cf2144ac3b2e21d8b53947be9d2819",
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
