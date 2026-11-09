# madeonsol-x402 — examples

Copy-paste examples for the [`madeonsol-x402`](https://www.npmjs.com/package/madeonsol-x402) TypeScript SDK.

This SDK supports **two auth modes**:
- `msk_...` API key — get a free one (200 req/day) at <https://madeonsol.com/pricing>
- Solana private key — pay-per-call via x402 micropayments (for AI agents)

```bash
npm install madeonsol-x402
export MADEONSOL_API_KEY=msk_...
npx tsx examples/kol-feed.ts
```

| File | What it does | Tier / Auth |
|---|---|---|
| [`kol-feed.ts`](./kol-feed.ts) | Latest 10 KOL buys with MC-at-trade | Free, API key |
| [`x402-agent.ts`](./x402-agent.ts) | Same call, but paid per-request via Solana wallet | Pay-per-call |
| [`coordination-rest.ts`](./coordination-rest.ts) | REST API: multi-KOL convergence with peak-density scoring | Free, API key |
| [`first-touch-scout.ts`](./first-touch-scout.ts) | First-KOL-touch events from S-tier scouts (backtested) | Free, API key |


## Early ShredPrism stream (madeonsol-x402 4.1.0+)

`early-stream.mjs` uses the managed TypeScript client (4.1.0+). It imports `../dist`, so
build this checkout first (or import from madeonsol-x402 4.1.0+). Requires Node 22+, an
active ULTRA/BUSINESS/ENTERPRISE key and activated `early_ws_url` discovery.

```sh
MADEONSOL_API_KEY=msk_your_key EARLY_WALLETS=YOUR_VALID_SOLANA_WALLET node examples/early-stream.mjs
```

Use exactly one of `EARLY_WALLETS` or `EARLY_MINTS`; replace placeholder addresses.
Do not log credentials. This example receives data; it does not sign or execute trades.
See the parent README for private-list management, compact mode, reconnect, cursor
persistence and explicit gap handling. Benchmark evidence does not establish customer lead.

