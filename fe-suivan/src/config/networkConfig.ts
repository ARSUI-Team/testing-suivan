import { createNetworkConfig } from "@mysten/dapp-kit";
import {
  SUI_FACTORY_ID,
  SUI_FAUCET_ID,
  SUI_NETWORK,
  SUI_PACKAGE_ID,
  SUI_SUI_TYPE,
  SUI_USDC_TYPE,
} from "./suiConstants";

const TESTNET_PACKAGE_ID =
  "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
    variables: {
      packageId: SUI_NETWORK === "testnet" ? SUI_PACKAGE_ID : TESTNET_PACKAGE_ID,
      factoryId:
        SUI_NETWORK === "testnet"
          ? SUI_FACTORY_ID
          : "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558",
      usdcType:
        SUI_NETWORK === "testnet"
          ? SUI_USDC_TYPE
          : `${TESTNET_PACKAGE_ID}::test_usdc::TEST_USDC`,
      suiType:
        SUI_NETWORK === "testnet"
          ? SUI_SUI_TYPE
          : `${TESTNET_PACKAGE_ID}::test_sui::TEST_SUI`,
      faucetId:
        SUI_NETWORK === "testnet"
          ? SUI_FAUCET_ID
          : "0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4",
    },
  },
  mainnet: {
    network: "mainnet",
    url: "https://fullnode.mainnet.sui.io:443",
    variables: {
      packageId: SUI_NETWORK === "mainnet" ? SUI_PACKAGE_ID : "",
      factoryId: SUI_NETWORK === "mainnet" ? SUI_FACTORY_ID : "",
      usdcType: SUI_NETWORK === "mainnet" ? SUI_USDC_TYPE : "",
      suiType: SUI_NETWORK === "mainnet" ? SUI_SUI_TYPE : "0x2::sui::SUI",
      faucetId: "",
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
