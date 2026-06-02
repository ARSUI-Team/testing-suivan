import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825",
      factoryId: "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558",
      usdcType: "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_usdc::TEST_USDC",
      suiType: "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_sui::TEST_SUI",
      faucetId: "0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4",
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825",
      factoryId: "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558",
      usdcType: "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_usdc::TEST_USDC",
      suiType: "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_sui::TEST_SUI",
      faucetId: "0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4",
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
