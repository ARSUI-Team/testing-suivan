export const SUI_NETWORK =
  process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";

const TESTNET_PACKAGE_ID =
  "0x14b081894ab1473c3f0440b82b6dc3204c1b29ae332ff18a585b8f1af5e0d825";
const TESTNET_FACTORY_ID =
  "0xe2587c933fdd1f4fa4bab04655a773a23d896bab18738e0efafdc6c6f36f5558";
const TESTNET_FAUCET_ID =
  "0xc7ab25a1c78d708441bf311929782fc95d32a9521027d4c3f868debdcfac46b4";
const TESTNET_AGENT_ADDRESS =
  "0xa428d031fb5b7349e0dd1f17e1f5afceca2fad163a783e76ae198b71a35511a4";

function getNetworkValue(
  name: string,
  configuredValue: string | undefined,
  testnetFallback: string,
) {
  const value = configuredValue?.trim();
  if (SUI_NETWORK === "mainnet" && !value) {
    throw new Error(`${name} is required when NEXT_PUBLIC_SUI_NETWORK=mainnet`);
  }
  return value || testnetFallback;
}

export const SUI_PACKAGE_ID = getNetworkValue(
  "NEXT_PUBLIC_PACKAGE_ID",
  process.env.NEXT_PUBLIC_PACKAGE_ID,
  TESTNET_PACKAGE_ID,
);
export const SUI_FACTORY_ID = getNetworkValue(
  "NEXT_PUBLIC_FACTORY_ID",
  process.env.NEXT_PUBLIC_FACTORY_ID,
  TESTNET_FACTORY_ID,
);
export const SUI_USDC_TYPE = getNetworkValue(
  "NEXT_PUBLIC_USDC_TYPE",
  process.env.NEXT_PUBLIC_USDC_TYPE,
  `${TESTNET_PACKAGE_ID}::test_usdc::TEST_USDC`,
);
export const SUI_SUI_TYPE =
  SUI_NETWORK === "mainnet"
    ? process.env.NEXT_PUBLIC_SUI_TYPE?.trim() || "0x2::sui::SUI"
    : process.env.NEXT_PUBLIC_SUI_TYPE?.trim() ||
      `${TESTNET_PACKAGE_ID}::test_sui::TEST_SUI`;
export const SUI_FAUCET_ID =
  SUI_NETWORK === "mainnet"
    ? ""
    : process.env.NEXT_PUBLIC_FAUCET_ID?.trim() || TESTNET_FAUCET_ID;
export const SUI_CLOCK_ID = "0x6";
export const SUI_AGENT_ADDRESS = getNetworkValue(
  "NEXT_PUBLIC_AGENT_ADDRESS",
  process.env.NEXT_PUBLIC_AGENT_ADDRESS,
  TESTNET_AGENT_ADDRESS,
);

if (
  SUI_NETWORK === "mainnet" &&
  [SUI_PACKAGE_ID, SUI_FACTORY_ID, SUI_USDC_TYPE, SUI_SUI_TYPE].some((value) =>
    /test_usdc|test_sui|TEST_USDC|TEST_SUI/.test(value),
  )
) {
  throw new Error("Mainnet configuration must not reference test token types");
}
