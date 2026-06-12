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
export const SUI_PACKAGE_ID = "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52";
export const SUI_FACTORY_ID = "0x9fab756068fe9347795af6d290540d8e73945949a1bc9036cb223aef1fce2a36";
export const SUI_USDC_TYPE = "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52::test_usdc::TEST_USDC";
export const SUI_SUI_TYPE = "0xc8550b0f5756faaaf6b302fc24d675974c3114097aa67a80411bbba535f51e52::test_sui::TEST_SUI";
export const SUI_CLOCK_ID = "0x6";
export const SUI_AGENT_ADDRESS = "0xa428d031fb5b7349e0dd1f17e1f5afceca2fad163a783e76ae198b71a35511a4";
