import { createNetworkConfig } from "@mysten/dapp-kit";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID!;
const USDC_TYPE = process.env.NEXT_PUBLIC_USDC_TYPE!;
const FAUCET_ID = process.env.NEXT_PUBLIC_FAUCET_ID!;
const SUI_TYPE = PACKAGE_ID + "::test_sui::TEST_SUI";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: PACKAGE_ID,
      factoryId: FACTORY_ID,
      usdcType: USDC_TYPE,
      suiType: SUI_TYPE,
      faucetId: FAUCET_ID,
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: PACKAGE_ID,
      factoryId: FACTORY_ID,
      usdcType: USDC_TYPE,
      suiType: "0x2::sui::SUI",
      faucetId: FAUCET_ID,
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
