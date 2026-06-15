# Suivan Mainnet and Domain Handoff

Status date: June 15, 2026

## Executive Status

- Production repository exists at `ARSUI-Team/Suivan`.
- Active development and fixes currently live in `ARSUI-Team/testing-suivan`.
- The repositories diverged after commit `86bf6d8`; the testing repository is
  substantially ahead and must be promoted through a reviewed release PR.
- The Move package only has a `published.testnet` entry. No mainnet package,
  factory object, production USDC type, or mainnet upgrade capability is
  recorded.
- `suivan.xyz` is not owned by the team. It is parked and listed for sale.
- The authenticated Vercel account has no Suivan project and no custom domains.
- Sui CLI is not installed in the current environment, so a mainnet publish
  cannot be performed from this machine yet.

## Changes Applied Now

The frontend now fails closed when configured for mainnet:

- `NEXT_PUBLIC_PACKAGE_ID`, `NEXT_PUBLIC_FACTORY_ID`,
  `NEXT_PUBLIC_USDC_TYPE`, and `NEXT_PUBLIC_AGENT_ADDRESS` are mandatory.
- Mainnet builds reject `TEST_USDC` and `TEST_SUI` token types.
- Sponsored transactions use the selected Sui network instead of always using
  testnet.
- The test USDC faucet returns an error on mainnet.
- Metadata and share links use `NEXT_PUBLIC_SITE_URL`.
- Testnet remains the default until the mainnet deployment values exist.

## Mainnet Release Order

1. Freeze and merge the approved testing branches into
   `ARSUI-Team/testing-suivan/main`.
2. Run the complete frontend and Move test suites.
3. Audit the final Move bytecode and confirm the collateral, jackpot yield,
   winner payout, and member escape/slashing behavior.
4. Install the pinned Sui CLI/toolchain used by the contract.
5. Create or select a team-controlled mainnet deployer wallet.
6. Fund the deployer and sponsor wallets with mainnet SUI.
7. Replace test-only assets and dependencies with production equivalents.
8. Publish the Move package to Sui mainnet.
9. Record the package ID, factory ID, upgrade capability, transaction digest,
   production USDC type, and automation agent address.
10. Add the production values to Vercel and build with
    `NEXT_PUBLIC_SUI_NETWORK=mainnet`.
11. Smoke test with a deliberately small-value pool before public launch.
12. Promote the tested release to `ARSUI-Team/Suivan`.

## Required Mainnet Environment

```dotenv
NEXT_PUBLIC_SITE_URL=https://<owned-domain>
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_FACTORY_ID=0x...
NEXT_PUBLIC_USDC_TYPE=0x...::usdc::USDC
NEXT_PUBLIC_SUI_TYPE=0x2::sui::SUI
NEXT_PUBLIC_AGENT_ADDRESS=0x...
SPONSOR_SECRET_KEY=<server-only-secret>
```

Do not configure `NEXT_PUBLIC_FAUCET_ID` on mainnet.

## Domain Decision

`https://suivan.xyz` currently resolves to a parked sales page and was listed
for approximately USD 699 when checked on June 15, 2026. Do not point
application metadata or Vercel aliases to it until ownership is confirmed.

Team decision required:

- Buy `suivan.xyz` through an approved company account, or
- choose an available alternative such as a longer brand/domain combination.

Domain purchase is a financial and ownership action and was intentionally not
performed automatically.

After ownership:

1. Add the domain to the team-owned Vercel project.
2. Apply the DNS records supplied by Vercel.
3. Configure both apex and `www`; choose one canonical redirect.
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL.
5. Verify TLS, Open Graph URLs, wallet callbacks, share links, and API routes.

## Testing

Testnet regression:

```bash
cd fe-suivan
npm run lint
npm run build
npm run dev
```

Verify:

- Wallet connects to Sui testnet.
- Pool creation, metadata name, notification, join, deposit, winner selection,
  payout, collateral slashing, and final jackpot claims still work.
- Faucet remains visible and functional only on testnet.
- Shared pool URLs use the configured site URL.

Mainnet configuration guard:

```powershell
$env:NEXT_PUBLIC_SUI_NETWORK="mainnet"
Remove-Item Env:NEXT_PUBLIC_PACKAGE_ID -ErrorAction SilentlyContinue
npm run build
```

Expected result: build fails with a clear missing mainnet variable error.

Then provide all mainnet variables and rebuild. The build must reject any value
containing `TEST_USDC` or `TEST_SUI`.

## Team Notes

- Do not merge the testing repository into production as an unreviewed bulk
  overwrite. The diff is large and includes contract state changes.
- The production repository is older than the current testing main branch.
- Never place `SPONSOR_SECRET_KEY`, deployer mnemonics, or upgrade capability
  secrets in Git or `NEXT_PUBLIC_*` variables.
- Mainnet deployment should use a multisig or otherwise team-controlled upgrade
  process, not a personal wallet.
- A frontend mainnet toggle is not a mainnet launch. Contract publication,
  production asset selection, sponsor funding, monitoring, and emergency
  procedures must all be complete first.
