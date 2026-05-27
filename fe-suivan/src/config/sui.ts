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
export const SUI_PACKAGE_ID = "0xff8500790272c409da1deddf45e46236d4d77a1a7d250ca7728a113d4fc08edf";
export const SUI_FACTORY_ID = "0xc47d988a84759e85a5386390e4eef4227bc5634c249a3493c16425ede16c1624";
export const SUI_USDC_TYPE = "0xff8500790272c409da1deddf45e46236d4d77a1a7d250ca7728a113d4fc08edf::test_usdc::TEST_USDC";
export const SUI_CLOCK_ID = "0x6";
