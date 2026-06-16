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

export const SUI_PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
export const SUI_FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID!;
export const SUI_USDC_TYPE = process.env.NEXT_PUBLIC_USDC_TYPE!;
export const SUI_SUI_TYPE = SUI_PACKAGE_ID + "::test_sui::TEST_SUI";
export const SUI_CLOCK_ID = "0x6";
