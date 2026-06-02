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
export const SUI_PACKAGE_ID = "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825";
export const SUI_FACTORY_ID = "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558";
export const SUI_USDC_TYPE = "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_usdc::TEST_USDC";
export const SUI_SUI_TYPE = "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825::test_sui::TEST_SUI";
export const SUI_CLOCK_ID = "0x6";
