# madeonsol-x402

TypeScript SDK for the [MadeOnSol](https://madeonsol.com) Solana KOL intelligence API.

## Authentication

Three options (in priority order):

| Method | Option | Best for |
|---|---|---|
| **MadeOnSol API key** (recommended) | `apiKey` | Developers — [get a free key](https://madeonsol.com/developer) |
| RapidAPI key | `rapidApiKey` | RapidAPI subscribers |
| x402 micropayments | `privateKey` | AI agents with Solana wallets |

## Install

```bash
npm install madeonsol-x402
```

> x402 peer deps (`@x402/fetch @x402/svm @x402/core @solana/kit @scure/base`) are only needed when using `privateKey`.

## Quick Start

```ts
import { createClient } from "madeonsol-x402";

// Option 1: API key (simplest — get one free at madeonsol.com/developer)
const client = createClient("msk_your_api_key_here");

// Option 2: x402 micropayments (auto-detected when no msk_ prefix)
// const client = createClient(process.env.SOLANA_PRIVATE_KEY!);

const { trades } = await client.kolFeed({ limit: 10 });
console.log(trades);
```

### Advanced initialization

```ts
import { MadeOnSolX402 } from "madeonsol-x402";

const client = new MadeOnSolX402({
  apiKey: "msk_...",        // OR
  rapidApiKey: "rapid_...", // OR
  privateKey: "base58...",  // x402 micropayments
});
```

## Endpoints

| Method | Description |
|---|---|
| `kolFeed(params?)` | Real-time KOL trade feed from 946+ tracked wallets |
| `kolCoordination(params?)` | Tokens being accumulated by multiple KOLs simultaneously |
| `kolLeaderboard(params?)` | KOL performance rankings by PnL and win rate |
| `deployerAlerts(params?)` | Alerts from elite Pump.fun deployers with KOL enrichment |
| `discovery()` | Lists all endpoints, prices, and parameter docs (free) |

## Parameters

**kolFeed** — `limit` (1-100), `action` ("buy" | "sell"), `kol` (wallet address)

**kolCoordination** — `period` ("1h" | "6h" | "24h" | "7d"), `min_kols` (2-50), `limit` (1-50)

**kolLeaderboard** — `period` ("today" | "7d" | "30d"), `limit` (1-50)

**deployerAlerts** — `since` (ISO8601), `limit` (1-100), `offset` (number)

## REST API (webhooks + streaming)

```ts
import { MadeOnSolREST } from "madeonsol-x402";

const rest = new MadeOnSolREST({ apiKey: "msk_your_key" });
// OR: new MadeOnSolREST({ rapidApiKey: "your_rapidapi_key" });

const token = await rest.getStreamToken();
// token.ws_url — KOL/deployer streaming (Pro/Ultra)
// token.dex_ws_url — all-DEX trade stream (Ultra only)
```

## Discovery

```ts
const info = await client.discovery();
console.log(info.endpoints); // all endpoints with prices and params
```

Docs: [madeonsol.com/solana-api](https://madeonsol.com/solana-api)

## Also Available

| Platform | Package |
|---|---|
| Python (LangChain, CrewAI) | [`madeonsol-x402`](https://github.com/LamboPoewert/madeonsol-python) on PyPI |
| MCP Server (Claude, Cursor) | [`mcp-server-madeonsol`](https://www.npmjs.com/package/mcp-server-madeonsol) |
| ElizaOS | [`@madeonsol/plugin-madeonsol`](https://www.npmjs.com/package/@madeonsol/plugin-madeonsol) |
| Solana Agent Kit | [`solana-agent-kit-plugin-madeonsol`](https://www.npmjs.com/package/solana-agent-kit-plugin-madeonsol) |
