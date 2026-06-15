import { useNetworkVariable } from "./networkConfig";
export {
  SUI_AGENT_ADDRESS,
  SUI_CLOCK_ID,
  SUI_FACTORY_ID,
  SUI_PACKAGE_ID,
  SUI_SUI_TYPE,
  SUI_USDC_TYPE,
} from "./suiConstants";

export function usePackageId() {
  return useNetworkVariable("packageId");
}

export function useFactoryId() {
  return useNetworkVariable("factoryId");
}

export function useUsdcType() {
  return useNetworkVariable("usdcType");
}

export function useSuiType() {
  return useNetworkVariable("suiType");
}

export function useFaucetId() {
  return useNetworkVariable("faucetId");
}

// Sui package object IDs — deployed to testnet
export const SUI_PACKAGE_ID = "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6";
export const SUI_FACTORY_ID = "0x70a934372b9508ca92e8b0ed11ca4bfb0a42d17d27c6fb7838f195b5cc74714d";
export const SUI_USDC_TYPE = "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_usdc::TEST_USDC";
export const SUI_SUI_TYPE = "0xb79c6171ac1ce89d864f1ce59329b8393d7f540e6e31b30cad0b71c54729bfb6::test_sui::TEST_SUI";
export const SUI_CLOCK_ID = "0x6";
export const SUI_AGENT_ADDRESS = "0xa428d031fb5b7349e0dd1f17e1f5afceca2fad163a783e76ae198b71a35511a4";
