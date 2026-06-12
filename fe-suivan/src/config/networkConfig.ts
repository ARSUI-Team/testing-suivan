import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52",
      factoryId: "0x9fab756068fe9347795af6d290540d8e73945949a1bc9036cb223aef1fce2a36",
      usdcType: "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52::test_usdc::TEST_USDC",
      suiType: "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52::test_sui::TEST_SUI",
      faucetId: "0x68612adb8811463218f3bbb22410a30bb5566f87c8e26efa08237665dc2784b2",
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52",
      factoryId: "0x9fab756068fe9347795af6d290540d8e73945949a1bc9036cb223aef1fce2a36",
      usdcType: "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52::test_usdc::TEST_USDC",
      suiType: "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52::test_sui::TEST_SUI",
      faucetId: "0x68612adb8811463218f3bbb22410a30bb5566f87c8e26efa08237665dc2784b2",
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
