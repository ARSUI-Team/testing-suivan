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
