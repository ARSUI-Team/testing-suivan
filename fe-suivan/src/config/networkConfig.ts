import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: "0xff8500790272c409da1deddf45e46236d4d77a1a7d250ca7728a113d4fc08edf",
      factoryId: "0xc47d988a84759e85a5386390e4eef4227bc5634c249a3493c16425ede16c1624",
      usdcType: "0xff8500790272c409da1deddf45e46236d4d77a1a7d250ca7728a113d4fc08edf::test_usdc::TEST_USDC",
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
