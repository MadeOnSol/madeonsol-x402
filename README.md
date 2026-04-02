# madeonsol-x402

Zero-config x402 client SDK for the [MadeOnSol](https://madeonsol.com) Solana KOL intelligence API. Pay-per-request with USDC on Solana.

## Install

```bash
npm install madeonsol-x402 @x402/fetch @x402/svm @x402/core @solana/kit @scure/base
```

## Quick Start

```ts
import { createClient } from "madeonsol-x402";

const client = createClient(process.env.SOLANA_PRIVATE_KEY!);
const { trades } = await client.kolFeed({ limit: 10 });
console.log(trades);
```

## Endpoints

| Method | Price | Description |
|---|---|---|
| `kolFeed(params?)` | $0.005 | Real-time KOL trade feed from 946+ tracked wallets |
| `kolCoordination(params?)` | $0.02 | Tokens being accumulated by multiple KOLs simultaneously |
| `kolLeaderboard(params?)` | $0.005 | KOL performance rankings by PnL and win rate |
| `deployerAlerts(params?)` | $0.01 | Alerts from elite Pump.fun deployers with KOL enrichment |
| `discovery()` | Free | Lists all endpoints, prices, and parameter docs |

## Parameters

**kolFeed** — `limit` (1-100), `action` ("buy" | "sell"), `kol` (wallet address)

**kolCoordination** — `period` ("1h" | "6h" | "24h" | "7d"), `min_kols` (2-50), `limit` (1-50)

**kolLeaderboard** — `period` ("today" | "7d" | "30d"), `limit` (1-50)

**deployerAlerts** — `since` (ISO8601), `limit` (1-100), `offset` (number)

## How it works

The SDK wraps the [x402 payment protocol](https://x402.org). When you call an endpoint, the library automatically:

1. Sends the request
2. Receives the 402 Payment Required response
3. Signs a USDC payment on Solana using your private key
4. Retries the request with the payment proof
5. Returns typed data

Your wallet needs USDC (SPL token) on Solana mainnet. Payments are settled via the PayAI facilitator.

## Discovery

```ts
const info = await client.discovery();
console.log(info.endpoints); // all endpoints with prices and params
```

Docs: [madeonsol.com/solana-api](https://madeonsol.com/solana-api)
