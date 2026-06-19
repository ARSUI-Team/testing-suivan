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
export const SUI_AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS || "0x501f2840d1d6fb2a98299f52f671150d38e118c33e8342861dd4ad5d58b788f1";
export const SUI_FAUCET_ID = process.env.NEXT_PUBLIC_FAUCET_ID || "0xb0d0ce15b6c58af48216877c9df20d0ed91409b093f214fe79b29e71c103e311";
export const SUI_NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "testnet") as "testnet" | "mainnet";
export const IS_MAINNET = SUI_NETWORK === "mainnet";
