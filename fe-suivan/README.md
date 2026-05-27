# Suivan Frontend

Suivan is a Sui-native frontend direction for a global ROSCA protocol. ROSCA stands for Rotating Savings and Credit Association. Arisan is treated as a local expression of the same collective savings model, while the product language stays global-first and English-first.

This repository contains the Suivan frontend: a cleaner hackathon-grade interface, GSAP motion, Sui-oriented copy, and modular frontend boundaries for backend and Move contract integration.

## Current Focus

- Landing page with Suivan branding and English copy
- ROSCA education for a global audience
- Sui pool object explorer and cycle progress surfaces
- APY and yield signals from Sui-focused DeFiLlama data
- GSAP and Lenis motion inspired by Pivy and Zentry-style storytelling
- Reusable frontend structure that can later connect to the new backend and Sui smart contracts

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- GSAP
- Lenis
- @mysten/dapp-kit
- @mysten/sui

## Important Product Notes

- Do not treat inherited contract addresses, chain assumptions, or API shapes as final.
- Frontend work should stay modular so Sui wallet, API, sponsored transaction, zkLogin, and contract adapters can be swapped cleanly.
- User-facing copy should stay in English.
- Avoid emoji in UI copy, README content, and new source files.

## Local Development

```bash
npm install
npm run dev
```

Open the local app at:

```text
http://127.0.0.1:3000
```

## Build

```bash
npm run build
```

## Key Routes

- `/` Suivan landing page
- `/pools` Sui-native pool explorer
- `/pools/[address]` Pool detail for member state, contribution, payout, commitment, and yield data
- `/faq` Suivan FAQ and ROSCA education

## Community Links

- Telegram: `https://t.me/suivan`
- Discord: `https://discord.gg/suivan`

Update these URLs when the official community channels are live.
