import { useNetworkVariable } from "./networkConfig";

export function usePackageId() {
  return useNetworkVariable("packageId");
}

export function useFactoryId() {
  return useNetworkVariable("factoryId");
}

export function useUsdcType() {
  return useNetworkVariable("usdcType");
}

// Sui package object IDs — deployed to testnet
export const SUI_PACKAGE_ID = "0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b";
export const SUI_FACTORY_ID = "0xd45cfd2dcc4be81c17f44f3e5f934605c7d09bcf1adaeadab576607493383867";
export const SUI_USDC_TYPE = "0x72bbfae9cd90e62b1cecb9db218eb52ac6135d322d232eb5e8a35a9b1d41bb1b::test_usdc::TEST_USDC";
export const SUI_CLOCK_ID = "0x6";
