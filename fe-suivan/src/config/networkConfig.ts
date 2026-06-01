import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: "0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b",
      factoryId: "0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867",
      usdcType: "0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b::test_usdc::TEST_USDC",
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: "",
      factoryId: "",
      usdcType: "",
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
