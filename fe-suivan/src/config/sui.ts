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

export function useSuiType() {
  return useNetworkVariable("suiType");
}

export function useFaucetId() {
  return useNetworkVariable("faucetId");
}

// Sui package object IDs — deployed to testnet
export const SUI_PACKAGE_ID = "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156";
export const SUI_FACTORY_ID = "0xa8109352afcf4dfe8eba3337d901a24e9aad80515e8781902a395695b9cc7e83";
export const SUI_USDC_TYPE = "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156::test_usdc::TEST_USDC";
export const SUI_SUI_TYPE = "0x02f49c6e953acb2708c745729bfcd3f6653b0725d86a8c1dd84fbeb2dbbca156::test_sui::TEST_SUI";
export const SUI_CLOCK_ID = "0x6";
