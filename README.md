# madeonsol-x402

[![npm version](https://img.shields.io/npm/v/madeonsol-x402?style=flat-square)](https://www.npmjs.com/package/madeonsol-x402)
[![npm downloads](https://img.shields.io/npm/dm/madeonsol-x402?style=flat-square)](https://www.npmjs.com/package/madeonsol-x402)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> 📂 **[Examples](./examples/)** · 📚 **[API docs](https://madeonsol.com/api-docs)** · 💰 **[Get a free API key](https://madeonsol.com/pricing)**

TypeScript SDK for the [MadeOnSol](https://madeonsol.com) Solana KOL intelligence API.

> Real-time Solana trading intelligence: track 1,069 KOL wallets with <3s latency, score 23,000+ Pump.fun deployers, surface deshred deploy signals ~500ms before on-chain confirmation, score 1M+ early-buyer wallets (incl. dump-cluster detection), read bundle-cohort holdings (`held_pct_of_supply` — are the bundlers still holding?), verify any wallet's current on-chain holdings (with airdrop/insider `transfer_delta` detection), push every pump.fun graduation, and stream every DEX trade. Free tier: 200 requests/day, every endpoint — no signup payment. Get a key at [madeonsol.com/pricing](https://madeonsol.com/pricing).

New customers get a 5-day free trial of Pro or Ultra when you pay by card — full access, nothing charged during the trial, cancel anytime. Start at https://madeonsol.com/pricing

> **New in 1.22.0** — **Token depth / price impact + deployer self-activity on risk.** `rest.tokenDepth(mint, { sizes? })` (`GET /tokens/{mint}/depth`, PRO+) answers "how much SOL moves this token's price N%" — per pool, not router-optimal. Pass up to 8 SOL buy `sizes` (each >0 and ≤10000; default `[0.5, 1, 5, 10]`, sent as a CSV `sizes` param); every computable pool returns `spot_price_sol`, `fee_pct`, a `quotes[]` entry per size (`tokens_out`, `avg_price_sol`, `price_impact_pct`), and `to_move_price` — the SOL required to move price **1% / 5% / 10%**. Constant-product AMMs are served from stream reserves (`source: "stream"` with `reserves_age_ms`); pump.fun/bonk curves from a **live** read of the curve's virtual reserves (`source: "live_rpc"`). Pools we can't price honestly — concentrated CLMM/Orca/DLMM, Meteora-DBC curves, unclassified models — come back in `unsupported_pools[]` with a `reason` (e.g. `concentrated_liquidity_depth_not_supported`, `curve_graduated_use_amm_pool`) rather than a wrong number; `primary_pool` names the deepest computable pool and `found: false` means no pools are tracked at all. Typed `TokenDepthResponse` (+ `TokenDepthParams`, `TokenDepthPool`, `TokenDepthQuote`, `TokenDepthToMovePrice`, `TokenDepthUnsupportedPool`). **KEYED (v1) — requires an `msk_` API key; there is no x402 route.** And `rest.tokenRisk(mint)` now returns a top-level **`dev` block** (typed `TokenRiskDev | null`) — the deployer's self-activity on its own mint: the create-tx self-buy snapshot (`buy_sol`, `buy_tokens`, `buy_supply_pct`), the post-create rollup (`bought_tokens_after` — catches the same-second-separate-tx dev buy the create snapshot reads as 0 — `sold_tokens`, `sold_sol`, `first_sell_at`/`last_sell_at`), **live on-chain holdings** (`holdings_tokens`, `holdings_supply_pct` — pump.fun 1B denominator, null elsewhere — and `wallet_empty`: is the dev wallet empty NOW), and `transferred_out` (tokens left without a sell; `null` = unknown when trade coverage or rollup freshness can't prove it — never a guess). `dev` is `null` when the mint has no pending_deploys row; the response also carries `as_of`. `deployer:alert` webhook/WS payloads gain `dev_buy_sol` + `dev_buy_supply_pct` — the dev's self-buy visible at alert time.
>
> **New in 1.21.0** — **Wallet batch classify, token trade tape, sniper footprint, and 7 new x402-payable endpoints.** `rest.walletClassify(wallets)` (`POST /wallet/batch/classify`, 1–100 addresses, PRO+) returns bulk reputation flags per wallet: `is_sniper`, `is_bundler` (lifetime), `is_dumper` (rolling 42d), `is_kol` + `kol_name`, `bot_confidence`, and `dump_cluster` cohort stats (typed `WalletBatchClassifyResponse`) — flags are pump.fun-pipeline scoped (`false` = not observed, NOT verified clean). `rest.tokenTrades(mint, params?)` (`GET /tokens/{mint}/trades`, PRO+) is the mint-scoped trade tape — cursor-paginated raw trades with `price_sol`/`price_usd`/`early_buyer_rank`/`slot`, filterable by `action`/`wallet`/`since`/`until`, defaulting to the **full history** (starts 2026-04-12; the `coverage` block carries `history_start` + `scope`). `rest.tokenTopTraders(mint, params?)` and `rest.sniperRecent(params?)` are new keyed methods too. The wallet profile `flags` block gains the same `is_sniper`/`is_bundler`/`is_dumper` + `dump_cluster` fields, and **`bot_confidence` is a type fix**: previously typed `number | null` but the API always returned `null` due to a bug — it now returns the real value as a string enum `"none" | "low" | "medium" | "high" | null`. `TokenRiskInputs` gains `sniper_footprint` (slot-window snipe rollup, `SniperFootprint | null`) and sniper deploys each carry the same `footprint` block. **x402 catalog grew 18 → 25**: `tokenCandles` ($0.01), `almostBonded` ($0.01), `tokenTopTraders` ($0.02), `tokenCapTable` ($0.02), `sniperRecent` ($0.01), `tokenFlow` ($0.01 — the 1.16 keyed-only guard is gone), and `deployerTrajectory` ($0.01) are now callable on the `MadeOnSolX402` client with per-request USDC micropayments. New types: `WalletClassification`, `WalletBatchClassifyResponse`, `TokenTradesParams`, `TokenTrade`, `TokenTradesResponse`, `TokenTopTradersParams`, `TokenTopTrader`, `TokenTopTradersResponse`, `SniperRecentParams`, `SniperDeploy`, `SniperRecentResponse`, `SniperFootprint`, `DumpClusterStats`.
>
> **New in 1.20.0** — **Verified wallet holdings.** `rest.walletHoldings(wallet, { limit?, min_value_usd? })` reads the wallet's actual current SPL + Token-2022 token accounts and SOL balance straight from chain, enriches each with our price/MC/name/symbol, and computes a `transfer_delta` (on-chain amount − trade-derived net position) — exposing tokens that arrived or left **without a swap** (airdrops, insider funding, wallet-hopping). Distinct from `walletPositions` (trade-derived FIFO): holdings is "what they actually hold right now". Returns typed `WalletHoldingsResponse` with a `summary` (token_accounts / non_zero / returned / priced / total_value_usd / truncated) and `verified_at`. **KEYED (v1) — requires an `msk_` API key; there is no x402 route.** ULTRA only.
>
> **New in 1.19.0** — **Bundle-cohort holdings.** `rest.tokenBundle(mint)` returns the bundle wallets' current position for a token — the "are the bundlers still holding, or did they dump on you?" read. The `bundle` block carries `wallet_count`, `bundle_kind` (`atomic_tx` / `same_slot` / `none`), `held_ratio` (net held / buy volume — churn-sensitive secondary), **`held_pct_of_supply`** (net held / circulating supply — the headline signal; null when supply is unknown), `fully_exited`, `buy_volume`, and `tokens_held` (typed `TokenBundleResponse`). Field-gated by tier: BASIC get the `bundle` block only (`wallets: []`); PRO adds the top-10 `wallets` with flags (`has_sold`, `atomic`, `is_kol`); ULTRA returns the full cohort plus per-wallet identity (`kol_name`, `win_rate`, `bot_confidence`, `tokens_held`). All tiers reach it.
>
> **New in 1.18.0** — **Batch risk scoring + live stream-session control.** `rest.tokensBatchRisk(mints)` scores up to 50 mints in one call (counts as 1 request) — each entry in `tokens` is either a full risk result (same shape as `rest.tokenRisk(mint)`, plus `as_of`) or `{ mint, error: "not_tracked" }`; untracked mints don't fail the batch, and `tokens` preserves de-duplicated input order (typed `TokenBatchRiskResponse`). PRO/ULTRA only. Plus `rest.streamSessions()` lists your live WebSocket sessions across ws-streaming + dex-stream (typed `StreamSessionsResponse`), and `rest.streamSessionKill(id)` force-releases a slot by id (typed `StreamSessionEvictResponse`) — the self-serve fix for a 4002 lockout when a deploy overlap leaves a ghost socket holding your slot. PRO/ULTRA only.
>
> **New in 1.17.0** — **Almost-bonded discovery + trending sorts.** `rest.almostBonded({ min_progress?, max_progress?, min_velocity_pct_per_min?, max_age_minutes?, deployer_tier?, authority_revoked?, min_liq?, sort?, limit? })` returns pre-bond pump.fun tokens near graduation, ranked by velocity (Δprogress/min) — "95% and accelerating" beats "92% stalled". Each token carries `progress_pct`, `velocity_pct_per_min`, `eta_minutes`, `stalled`, `real_sol_reserves`, `market_cap_usd`, `liquidity_usd`, `authorities_revoked`, `deployer_tier`, and `age_minutes` (typed `AlmostBondedResponse`). `sort` is `velocity_desc` (default) / `progress_desc` / `eta_asc`. **KEYED (v1) — requires an `msk_` API key; there is no x402 route.** PRO/ULTRA only. Plus `client.tokensList({ sort })` gains four momentum sorts — `mc_change_5m_desc`, `mc_change_1h_desc`, `volume_1h_desc`, and `trending` (composite recent-volume × positive-momentum rank).
>
> **New in 1.16.0** — **Token trade flow.** `client.tokenFlow(mint, { window? })` returns a trade-flow aggregate over a `1h`/`24h` window — `unique_wallets` / `unique_buyers` / `unique_sellers`, `buy_count` / `sell_count` / `total_trades`, `buy_sol` / `sell_sol` / `net_sol`, and a `trades_per_wallet` wash-trading proxy (typed `TokenFlowResponse`). It's an **organic-vs-fake volume** read. **KEYED (v1) — requires an `msk_` API key; there is no x402 route**, so x402-only clients can't reach it. PRO/ULTRA only. Deployer alerts now carry `deployers.deployer_sol_balance` — the deployer wallet's SOL balance at alert time (null for historical rows).
>
> **New in 1.15.0** — **Live token snapshot + Signal Scorecard.** `rest.token(mint)` returns a live snapshot — price (USD/SOL), VWAP, market cap, FDV, liquidity, liquidity-to-MC ratio, primary DEX + pool, Token-2022 / transfer-fee flags, and a `top_buyers[]` array (typed `TokenSnapshotResponse`). `rest.signalPerformance(name, { history? })` returns the **Signal Scorecard** — out-of-sample reliability buckets (hit_rate, base_rate, lift, sample_n, window_days) for `dump_cluster_count`, `runner_rate`, `recycled_early_buyer_count`, or `coordination_count`, with a per-day `series` when `history: true` (typed `SignalPerformanceResponse`). `rest.signals()` is the free catalog of all scored signals (typed `SignalsCatalogResponse`). `rest.tokenRisk(mint)` and `rest.tokenBuyerQuality(mint)` are now fully live server-side.
>
> **New in 1.13.0** — **Token risk score.** `rest.tokenRisk(mint)` returns a transparent 0–100 rug-risk/safety score (higher = riskier) with a `band` (safe/caution/danger), an explainable `factors[]` array, and the raw `inputs` (mint/freeze authority, liquidity, liq-to-MC ratio, transfer fee, launch cohort, deployer bond rate, KOL signal, blacklist). Typed as `TokenRiskResponse`. PRO/ULTRA only.
>
> **New in 1.12.0** — `/token/{mint}` and `/token/batch` responses now include `liquidity_to_mc_ratio`, `launch_cohort_sol`, and `launch_cohort_size`. `/tokens` gains three new filter params: `min_liq_mc_ratio`, `max_liq_mc_ratio`, and `deployer_tier`. `/tokens` list items now include `liquidity_to_mc_ratio` and `deployer_tier`. `/kol/leaderboard` entries now include `median_hold_minutes_30d` and `percentile_early_entry_30d`.
>
> **New in 1.11.1** — Deployer profiles now carry `runner_rate` + `labeled_tokens` (fraction of a deployer's labeled tokens that ran vs dumped, gate on `labeled_tokens` ≥3) plus `avg_time_to_bond_minutes`, on `DeployerAlert.deployers` and the deployer-trajectory profile.
>
> **New in 1.11** — **Graduation events + dump-cluster detection.** Subscribe `token:graduations` for every pump.fun bond in real time (tracked deployer or not, typed `GraduationEvent`). Buyer-quality `breakdown` adds `dump_cluster_count` (out-of-sample: 3+ → 94% dump vs 61% base) + `recycled_early_buyer_count`. DEX firehose: replay buffer deepened to ~5 min; mint-scoped subs get in-band `dex:graduations` frames.

> **New in 1.10** — **Deshred Sniper.** Deshred deploy feed ~500ms before on-chain confirmation (SDK method `rest.sniperRecent()` shipped in 1.21). PRO: elite/good. ULTRA: all tiers + watchlist. Use `sniper:deploys` WebSocket for push.
>
> **New in 1.9** — **Price alerts, scout leaderboard, coordination history.** `rest.priceAlertsCreate()` (PRO=5, ULTRA=25). `scoutLeaderboard()`, `kolConsensus()`, `peakHistory()`, `coordinationHistory()`. `walletStats()` now returns `derived`: win_rate, roi, verdict, biggest_miss.
>
> **New in 1.8** — **Universal Wallet API.** `rest.walletStats()`, `rest.walletPnl()`, `rest.walletPositions()`, `rest.walletTrades()` — FIFO cost-basis PnL for any Solana wallet. PRO+. Cache hits free.
>
> **New in 1.7.1** *(2026-05-13)* — Velocity field shape corrected to match the API: `mc_change_pct`, `volume_usd`, `mev_volume_pct` are top-level on the token response, each keyed by `5m`/`15m`/`1h`/`2h`/`4h`. The 1.7.0 README documented a `velocity[window]` shape that didn't match the wire format. Runtime is unchanged — fix is to typed shape + docs.
>
> **New in 1.7.0** *(2026-05-12)* — **Token directory + account inspection.** `client.tokensList({ min_liq, min_volume_1h_usd, max_mev_share_pct, mc_change_1h_min_pct, sort, min_liq_mc_ratio, max_liq_mc_ratio, deployer_tier, ... })` filters every active mint by MC band, liquidity floor, primary DEX, authority/safety flags, computed 1h volume, MEV-share ceiling, MC-change deltas, liq/MC ratio, and deployer tier. Response items now include `liquidity_to_mc_ratio` and `deployer_tier`. Default `min_liq=2000` skips phantom-MC dust; pass `min_liq=0` to opt out. `client.me()` — read your tier, daily/burst quota state, and per-feature usage in one call (no header parsing). Velocity / MEV-share fields added to every token response: `mc_change_pct`, `volume_usd`, `mev_volume_pct` (each keyed by `5m`/`15m`/`1h`/`2h`/`4h`) plus `history_age_seconds`. `/token/{mint}` 400s now ship structured `code`, `reason`, `received_length`, `example`, and `docs` — stop guessing why a mint failed. Deprecated `avg_entry_mc_usd` fully removed.

## Quick start (10 seconds)

```bash
npm install madeonsol-x402
```

```ts
import { createClient } from "madeonsol-x402";
const client = createClient("msk_..."); // free tier at https://madeonsol.com/pricing
const { trades } = await client.kolFeed({ limit: 5 });
```

## Authentication

Two options:

| Method | Option | Best for |
|---|---|---|
| **MadeOnSol API key** (recommended) | `apiKey` | Developers — [get a free key](https://madeonsol.com/pricing) |
| x402 micropayments | `privateKey` | AI agents with Solana wallets |

> **v1.0 breaking change:** RapidAPI auth has been removed. The MadeOnSol RapidAPI marketplace was retired on 2026-04-19. If you were using `rapidApiKey`, get a free `msk_` key at [madeonsol.com/pricing](https://madeonsol.com/pricing).

## Install

```bash
npm install madeonsol-x402
```

> x402 peer deps (`@x402/fetch @x402/svm @x402/core @solana/kit @scure/base`) are only needed when using `privateKey`.

## Quick Start

```ts
import { createClient } from "madeonsol-x402";

// Option 1: API key — get one free at madeonsol.com/pricing
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
  privateKey: "base58...",  // x402 micropayments
});
```

## x402 Endpoints (per-request micropayments)

| Method | Description |
|---|---|
| `kolFeed(params?)` | Real-time KOL trade feed from 1,000+ tracked wallets |
| `kolCoordination(params?)` | Tokens being accumulated by multiple KOLs simultaneously |
| `kolLeaderboard(params?)` | KOL performance rankings by PnL and win rate (180 days of trade history) |
| `kolPairs(params?)` | KOL affinity matrix — which KOLs frequently co-trade the same tokens |
| `kolHotTokens(params?)` | KOL momentum tokens — accelerating KOL buy interest |
| `kolTokenEntryOrder(mint, params?)` | Ranked KOL first-buyer order for a token |
| `kolCompareWallets({ wallets })` | Side-by-side comparison of 2–5 KOL wallets |
| `kolAlertsRecent(params?)` | Live KOL alert feed — clusters, fresh-token buys, heating-up wallets |
| `deployerAlerts(params?)` | Pump.fun deployer alerts with KOL enrichment. PRO/ULTRA: filter by tier. |
| `walletStats(address)` | **New 1.8** · Wallet stats + cross-product flags (is_kol / is_alpha_tracked + bot_confidence / is_deployer). 90-day window. **$0.005** |
| `walletPnl(address)` | **New 1.8** · FIFO cost-basis PnL: realized + unrealized SOL, profit factor, drawdown, hold times, daily curve, closed + open positions. **$0.02** |
| `walletPositions(address)` | **New 1.8** · Open positions only, live unrealized from market-cap tracker. Shares /pnl cache. **$0.01** |
| `walletTrades(address, params?)` | **New 1.8** · Cursor-paginated raw trades with action / token / since-until filters. **$0.005** |
| `tokenFlow(mint, params?)` | Trade-flow aggregate (organic-vs-fake volume) — unique wallets/buyers/sellers, buy/sell counts + SOL, net SOL, `trades_per_wallet` wash-trading proxy. `window` ("1h" \| "24h", default "1h"). **Now x402-payable (1.21).** **$0.01** |
| `tokenCandles(mint, params?)` | **New 1.21** · OHLCV candles (1m–1d timeframes, 30d history) with per-candle volume, trade count, and market cap. **$0.01** |
| `almostBonded(params?)` | **New 1.21** · Launchpad tokens approaching graduation (pump.fun + LetsBonk LaunchLab) — bonding progress, velocity (Δprogress/min), ETA, deployer tier. **$0.01** |
| `tokenTopTraders(mint, params?)` | **New 1.21** · Wallets ranked by realized PnL (or ROI) on a token, enriched with KOL identity + alpha reputation. **$0.02** |
| `tokenCapTable(mint)` | **New 1.21** · Early-buyer cap table — first 10 non-deployer buyers with PnL, exit status, bundle/KOL/alpha flags + buyer-quality score. **$0.02** |
| `sniperRecent(params?)` | **New 1.21** · Deshred sniper deploy feed (elite/good deployers) with per-deploy snipe `footprint`. **$0.01** |
| `deployerTrajectory(wallet, params?)` | **New 1.21** · Deployer bond-rate trajectory — streaks, rolling bond rates, trend, cadence. `include: "daily_snapshots"` adds 90 days. **$0.01** |
| `discovery()` | Lists all 25 endpoints, prices, and parameter docs (free) |

## REST API client

The `MadeOnSolREST` class exposes the full v1 API (alpha intelligence, token quality, copy-trade rules, wallet tracker, webhooks, streaming). Most endpoints require a Pro or Ultra subscription.

```ts
import { MadeOnSolREST } from "madeonsol-x402";

const rest = new MadeOnSolREST({ apiKey: "msk_your_key" });
const { leaderboard } = await rest.alphaLeaderboard({ period: "30d", sort: "win_rate" });

// Rate-limit headers from the most recent response
console.log(rest.lastRateLimit); // { limit, remaining, reset, requestId }
```

### Alpha wallet intelligence

Scored from 1M+ early-buyer records (wallets seen in the first 20 buyers of Pump.fun tokens).

| Method | Tier | Description |
|---|---|---|
| `rest.alphaLeaderboard(params?)` | All | Top profitable wallets. Up to 100 on Free/Pro; ULTRA unlocks 500 + bot signals |
| `rest.alphaWallet(wallet)` | ULTRA | Full per-token breakdown + bot_signals array |
| `rest.alphaLinked(wallet)` | ULTRA | Wallets behaviorally linked (co-bought 3+ tokens within 2s) |

**alphaLeaderboard params** — `period` ("7d" \| "30d" \| "all"), `min_tokens` (1–20), `sort` ("win_rate" \| "pnl" \| "roi"), `exclude_bots` ("true" \| "false")

### Token quality

| Method | Tier | Description |
|---|---|---|
| `rest.token(mint)` | All | **New 1.15** · Live token snapshot — price (USD/SOL), VWAP, market cap, FDV, liquidity, liq-to-MC ratio, primary DEX + pool, Token-2022 / transfer-fee flags, and `top_buyers[]`. Returns `{ token }` |
| `rest.tokenCapTable(mint)` | PRO+ | First non-deployer early buyers, enriched with PnL/KOL/bot flags. PRO=10, ULTRA=20 |
| `rest.tokenBuyerQuality(mint)` | All | 0–100 buyer-quality score + full breakdown (5-min cached). Live server-side |
| `rest.tokenRisk(mint)` | PRO+ | Transparent 0–100 rug-risk/safety score with `band`, explainable `factors[]`, and raw `inputs`. **1.22:** adds a top-level `dev` block (`TokenRiskDev \| null`) — deployer self-buy at create, sells rollup, live on-chain holdings, `wallet_empty`, `transferred_out`. Live server-side |
| `rest.tokenBundle(mint)` | All | **New 1.19** · Bundle-cohort holdings — `bundle` block (`wallet_count`, `bundle_kind`, `held_ratio`, headline `held_pct_of_supply`, `fully_exited`, `buy_volume`, `tokens_held`). BASIC = block only; PRO = top-10 `wallets` + flags; ULTRA = full cohort + identity fields |
| `rest.tokenPools(mint)` | PRO+ | **New 1.19.2** · Per-venue liquidity map — every DEX pool a token trades in (`pool_address`, `dex`, `liquidity_usd`, `last_price_sol`, `is_active`), plus a `summary` rollup (`pool_count`, `active_pool_count`, `dex_count`, `total_liquidity_usd`, `primary_pool`/`primary_dex`, `top_pool_share_pct`) |
| `rest.tokenDepth(mint, params?)` | PRO+ | **New 1.22** · Per-pool price impact / slippage — `quotes[]` per SOL buy size (`tokens_out`, `avg_price_sol`, `price_impact_pct`), `to_move_price` (SOL to move price 1%/5%/10%), `spot_price_sol`, `fee_pct`. Pools we can't price honestly land in `unsupported_pools[]` with a `reason`. `sizes` max 8, default `[0.5, 1, 5, 10]` |
| `rest.tokensBatchRisk(mints)` | PRO+ | **New 1.18** · Bulk risk scoring — up to 50 mints in one call (counts as 1 request). Each `tokens[]` entry is a full risk result or `{ mint, error: "not_tracked" }`; untracked mints don't fail the batch |
| `rest.tokenCandles(mint, params?)` | PRO+ | OHLC candles. PRO = OHLCV, last 30 days; ULTRA = + net flow (buy/sell volume, `net_volume_usd`, counts, MEV vol), liquidity delta, full history |
| `rest.tokenTrades(mint, params?)` | PRO+ | **New 1.21** · Mint-scoped trade tape — cursor-paginated raw trades (`price_sol`/`price_usd`, `early_buyer_rank`, `slot`), filter by `action`/`wallet`/`since`/`until`. Default window = **full history**; `coverage` block carries `history_start` (2026-04-12) + `scope` (pump.fun pipeline) |
| `rest.tokenTopTraders(mint, params?)` | PRO+ | **New 1.21** · Wallets ranked by realized PnL (or ROI) on a token — `sort` ("pnl" \| "roi"), `window_days` (1–180), `min_bought_sol`; enriched with KOL identity + alpha reputation (`bot_confidence`, historical win rate/PnL) |
| `rest.sniperRecent(params?)` | PRO+ | **New 1.21** · Deshred sniper deploy feed — PRO sees elite/good deployers, ULTRA all tiers. Each deploy carries a slot-window snipe `footprint` (`buys`/`buyers`/`sol`/`supply_pct`/`sniper_wallet_buys`; null until the ~10-min settle window) |

**tokenCandles params** — `tf` ("1m" \| "5m" \| "15m" \| "1h" \| "4h" \| "1d", default "1h"), `limit` (1–1000, default 200), `from` (ISO 8601), `to` (ISO 8601)

```ts
// Score a basket in one request (counts as 1 against quota)
const { tokens, count } = await rest.tokensBatchRisk([mintA, mintB, mintC]);
for (const t of tokens) {
  if ("error" in t) console.log(t.mint, t.error);        // e.g. "not_tracked"
  else console.log(t.mint, t.risk_score, t.band);        // full risk result + as_of
}
```

### Signal Scorecard *(new in 1.15)*

Out-of-sample reliability for the scored early-buyer / coordination signals — every claim is backed by a hit-rate vs base-rate measurement so you can size positions on evidence, not vibes.

| Method | Tier | Description |
|---|---|---|
| `rest.signals()` | All (free) | Catalog of scored signals — name, methodology, and each signal's `performance_endpoint`. No payment required |
| `rest.signalPerformance(name, params?)` | All | Signal Scorecard for one signal — `buckets[]` (hit_rate, base_rate, lift, sample_n, window_days, test_from/test_to) + metric_type, outcome, methodology, as_of. Pass `{ history: true }` for a per-day `series[]` |

Valid signal names: `dump_cluster_count`, `runner_rate`, `recycled_early_buyer_count`, `coordination_count`.

```ts
const { signals } = await rest.signals();
const scorecard = await rest.signalPerformance("dump_cluster_count", { history: true });
console.log(scorecard.buckets);  // [{ bucket, hit_rate, base_rate, lift, sample_n, ... }]
```

### KOL coordination alerts (v1.1 — push signals)

Real-time push alerts when a cluster of KOLs co-buys the same token. Fires within ~1s of the triggering trade (pg_notify push, not polling). Delivered via WebSocket (`kol:coordination` channel, user-scoped) and/or HMAC-signed webhook. PRO=5 rules, ULTRA=20.

```ts
// Create a rule
const { rule, webhook_secret } = await rest.coordinationAlertsCreate({
  name:           "fresh pump cluster",
  min_kols:       4,            // minimum distinct KOLs in window
  window_minutes: 15,           // peak-density window (1-60)
  min_score:      70,           // 0-100 composite score cutoff
  include_majors: false,        // filter WIF/BONK/POPCAT
  cooldown_min:   60,           // one fire per (rule,token) per 60min...
  score_jump_break: 10,         // ...unless score jumps +10 vs last fire
  delivery_mode:  "both",
  webhook_url:    "https://you.com/hooks/coord",
});
// → store webhook_secret — shown ONCE
```

`coordinationAlertsList`, `coordinationAlertsGet(id)`, `coordinationAlertsUpdate(id, params)`, `coordinationAlertsDelete(id)` round out the CRUD.

**Webhook signature:** `X-MadeOnSol-Signature: sha256=<hmac>` where `hmac = HMAC-SHA256(webhook_secret, timestamp + "." + rawBody)`, and `X-MadeOnSol-Timestamp` carries the unix seconds used.

**The `kolCoordination()` response** now includes v1.1 fields: `peak_window_start/end`, `peak_kols`, `peak_buys` (the busiest slice within the period), `exited_count` + per-KOL `exited` flag (net-flow-negative wallets), and `coordination_score` (0-100). Pass `min_score`, `window_minutes`, `include_majors` to filter.

### KOL first-touch signal *(new in 1.3)*

Every "first KOL buy on a token mint" event — the moment a tracked KOL is the first of the cohort to touch a token. Filterable by **scout tier** (S/A/B/C from `mv_kol_scout_score`), KOL winrate, token age, mint suffix.

**Backtest:** top scouts attract ≥3 follow-on KOLs within 4h ~50% of the time vs ~14% baseline (38d / 491k buys / 72,549 events). Live leaderboard at [madeonsol.com/kol/scouts](https://madeonsol.com/kol/scouts).

```ts
import { MadeOnSolREST } from "madeonsol-x402";
const rest = new MadeOnSolREST({ apiKey: process.env.MADEONSOL_API_KEY! });

// S-tier scouts on tokens younger than 1h
const { events } = await rest.firstTouches({ preset: "scout", min_scout_tier: "S" });

for (const e of events) {
  console.log(e.first_kol.name, "scouted", e.token_symbol, `(scout_score=${e.first_kol.scout_score}%)`);
}
```

Filter knobs: `since`, `before`, `limit`, `kol`, `min_kol_winrate_7d`, `min_scout_tier` (`"S"|"A"|"B"|"C"`), `min_n_touches`, `strategy`, `token_age_max_min`, `min_first_buy_sol`, `mint_suffix` (`"pump"`, `"bonk"`, …), `preset` (`"scout"`/`"fresh_launch"`), `include` (`"followers_4h"`).

> **Don't poll — push.** Median lead time before the second KOL is **12 seconds**. REST polling will miss the swarm. Subscribe to the `kol:first_touches` WebSocket channel (PRO+) or, on Ultra, create an HMAC-signed webhook subscription.

**Webhook subscriptions (Ultra)** — up to 10 active per user, mirrors `coordinationAlerts`:

```ts
const { subscription, webhook_secret } = await rest.firstTouchSubscriptionsCreate({
  name: "S-tier scouts on pump tokens",
  filters: { min_scout_tier: "S", mint_suffix: "pump" },
  delivery_mode: "webhook",
  webhook_url: "https://my.bot/hooks/scout",
});
// → store webhook_secret — shown ONCE
```

`firstTouchSubscriptionsList`, `firstTouchSubscriptionsGet(id)`, `firstTouchSubscriptionsUpdate(id, params)`, `firstTouchSubscriptionsDelete(id)` round out the CRUD.

### Price alerts *(new in 1.9)*

CRUD for token dip/recovery price alerts. Fires via WebSocket (`price:alerts` channel) and/or HMAC-signed webhook when a token's market cap crosses your threshold. PRO=5 rules, ULTRA=25.

```ts
const { alert, webhook_secret } = await rest.priceAlertsCreate({
  name: "SOL dip buy",
  token_mint: "So11111111111111111111111111111111111111112",
  condition: "below",       // "below" | "above"
  threshold_mc_usd: 5_000_000_000,
  cooldown_min: 120,
  delivery_mode: "both",
  webhook_url: "https://you.com/hooks/price",
});
// → store webhook_secret — shown ONCE
```

`priceAlertsList`, `priceAlertsGet(id)`, `priceAlertsUpdate(id, params)`, `priceAlertsDelete(id)` round out the CRUD.

### Scout leaderboard & KOL consensus *(new in 1.9)*

| Method | Tier | Description |
|---|---|---|
| `rest.scoutLeaderboard(params?)` | PRO+ | Top scout-tier KOLs ranked by first-touch follow-on rate, win rate, and ROI |
| `rest.kolConsensus(params?)` | PRO+ | Tokens with the strongest KOL agreement signal — weighted by scout score and recent PnL |
| `rest.peakHistory(mint)` | PRO+ | Historical peak-density windows for a token — every coordination spike with KOL breakdown |
| `rest.coordinationHistory(params?)` | PRO+ | Global coordination event log with token, KOL count, score, and outcome |

```ts
const { leaderboard } = await rest.scoutLeaderboard({ period: "30d", limit: 25 });
const { tokens } = await rest.kolConsensus({ min_kols: 5, period: "24h" });
```

### Wallet derived stats *(new in 1.9)*

`walletStats(address)` now includes a `stats` object with derived fields computed from the 90-day trade window:

```ts
const { stats } = await rest.walletStats("WALLET_ADDRESS");
// stats.win_rate     — fraction 0-1, tokens sold above cost basis
// stats.roi          — aggregate return on invested SOL
// stats.verdict      — "strong" | "profitable" | "neutral" | "losing"
// stats.biggest_miss — token with the highest post-exit gain the wallet missed
```

### Copy-trade rules

Server-side rules that fire signals when one of your watched source wallets trades. Delivered via webhook (HMAC-signed) and/or WebSocket. PRO=3 rules × 5 source wallets each; ULTRA=20 × 50.

| Method | Description |
|---|---|
| `rest.copyTradeList()` | List your rules |
| `rest.copyTradeCreate(params)` | Create a rule. Returns `webhook_secret` **once** — store it |
| `rest.copyTradeGet(id)` | Get one rule |
| `rest.copyTradeUpdate(id, params)` | Update fields or toggle `is_active` |
| `rest.copyTradeDelete(id)` | Delete permanently |
| `rest.copyTradeSignals(params?)` | Recent fired signals (up to 7 days). Filter by `subscription_id`, `since`, `limit` (1–500) |

### Wallet tracker

Per-account watchlist with historical swap/transfer history.

| Method | Description |
|---|---|
| `rest.walletTrackerList()` | List tracked wallets + remaining capacity |
| `rest.walletTrackerAdd(wallet, label?)` | Add a wallet |
| `rest.walletTrackerRemove(wallet)` | Remove a wallet |
| `rest.walletTrackerUpdateLabel(wallet, label)` | Update label (pass `null` to clear) |
| `rest.walletTrackerTrades(params?)` | Historical events. Params: `wallet`, `action`, `event_type`, `limit` (1–200), `before` (cursor) |
| `rest.walletTrackerSummary(params?)` | Per-wallet stats. Params: `period` ("24h" \| "7d" \| "30d"), `wallet` |
| `rest.walletStats(address)` | **New 1.8** · Universal wallet stats (90d) + cross-product flags. PRO+. |
| `rest.walletPnl(address)` | **New 1.8** · Full FIFO PnL + curve + closed/open positions. PRO+. |
| `rest.walletPositions(address)` | **New 1.8** · Open positions only with live unrealized. PRO+. |
| `rest.walletTrades(address, params?)` | **New 1.8** · Cursor-paginated raw trades. Params: `limit` (1-500), `cursor`, `action`, `token_mint`, `since`, `until`. PRO+. |
| `rest.walletClassify(wallets)` | **New 1.21** · Bulk reputation flags for 1–100 wallets in one request — `is_sniper` / `is_bundler` (lifetime) / `is_dumper` (rolling 42d) / `is_kol` + `kol_name` / `bot_confidence` / `dump_cluster`. Pump.fun-pipeline scoped: `false` = not observed, NOT verified clean. PRO+. |

### Webhooks

| Method | Description |
|---|---|
| `rest.createWebhook(params)` | Create webhook. Returns `secret` once — store it for HMAC verification |
| `rest.listWebhooks()` | List your webhooks |
| `rest.getWebhook(id)` | Get one + recent delivery log |
| `rest.updateWebhook(id, params)` | Update URL, events, filters, or re-enable |
| `rest.deleteWebhook(id)` | Delete |
| `rest.testWebhook(id)` | Send test payload |

### KOL/deployer detail

| Method | Description |
|---|---|
| `rest.kolTiming(wallet, params?)` | Entry/exit timing — hold duration, exit speed, hour distribution |
| `rest.kolPnl(wallet, params?)` | Per-wallet PnL breakdown |
| `rest.deployerTrajectory(wallet)` | Deployer skill curve — streaks, rolling bond rate, trend |
| `rest.deployerHistory(wallet, opts?)` | **New 1.19.2** · PRO+ · Daily reputation time-series — backtest "was this deployer elite when it launched token X?" without look-ahead. `snapshots[]` carry per-day `tier`, `is_tracked`, `total_deployed`/`total_bonded`, `bonding_rate`, `recent_bond_rate`, `avg_peak_mc`, `best_token_peak_mc`. `opts.limit` (1–365, default 90) |

### Streaming token

```ts
const token = await rest.getStreamToken();
// token.ws_url       — KOL/deployer streaming (Pro/Ultra)
// token.dex_ws_url   — all-DEX trade stream (Ultra only)
```

### Managed streaming client *(new in 1.10)*

`rest.stream()` handles the token fetch + 24h refresh, auto-reconnect (backoff + jitter), heartbeat liveness, and typed events — just subscribe and listen.

```ts
const stream = rest.stream();
stream.on("kol:trade", (t) => console.log(t.token_symbol, t.action));
stream.on("deployer:alert", (a) => console.log("new deploy", a.token_mint));
stream.subscribe(["kol:trades", "deployer:alerts"]);
// stream.unsubscribe([...]) / stream.close() when done
```

Channels: `kol:trades`, `kol:coordination`, `kol:first_touches`, `deployer:alerts`, `wallet_tracker:events`, `copytrade:signals`, `price_alert:events`, `sniper:deploys`, `token:graduations` (every pump.fun graduation in real time, tracked deployer or not — typed `GraduationEvent`). Lifecycle events: `open`, `close`, `reconnect`, `heartbeat`, `error`. Uses the global `WebSocket` on Node 22+; on Node < 22 also `npm i ws`.

### Live stream sessions *(new in 1.18)*

List and force-release the connection slots your key currently holds across both stream services (ws-streaming + dex-stream). Reflects in-memory state, so every listed slot is evictable — the self-serve fix when a deploy overlap leaves a ghost socket holding your slot and reconnects hit the 4002 connection limit. PRO/ULTRA only.

| Method | Tier | Description |
|---|---|---|
| `rest.streamSessions()` | PRO+ | List your live sessions — each with `id`, `service`, `tier`, `channels[]`, `connected_at`, `remote_ip`, `messages_sent`. Typed `StreamSessionsResponse` |
| `rest.streamSessionKill(id)` | PRO+ | Terminate one of your sessions by `id` and free its slot. Throws on a bad id (400) or no matching live session (404). Typed `StreamSessionEvictResponse` |

```ts
const { sessions } = await rest.streamSessions();
for (const s of sessions) console.log(s.id, s.service, s.channels, s.messages_sent);

// Free a stuck slot after a deploy overlap
if (sessions.length) await rest.streamSessionKill(sessions[0].id);  // { evicted: true, id }
```

## DEX Firehose (Ultra)

Connect to `dex_ws_url` and use the multi-subscription protocol — up to **10 named subs per connection**, each with its own `sub_id`, server-side filters, and optional replay (up to 500 most recent matching trades) from a server-side buffer holding ~5 minutes of firehose history — it backfills trades from before your connection existed. Replayed trades arrive newest-first flagged `"replay": true`, then a `replay_done` frame; sort by `block_time` client-side.

```ts
import WebSocket from "ws";

const { token, dex_ws_url } = await rest.getStreamToken();
const ws = new WebSocket(`${dex_ws_url}?token=${token}`);  // token MUST be in the query string

ws.on("open", () => {
  ws.send(JSON.stringify({
    type: "subscribe",
    sub_id: "fresh-pumpfun",
    replay: 50,                       // up to 500 from ring buffer
    filters: {
      dex: "pumpfun",                 // pumpfun | pumpamm | pumpswap | raydium | jupiter | orca | meteora | launchlab
      token_age_max_seconds: 300,
      min_sol: 0.5,
      action: "buy",
    },
  }));
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.channel === "dex:trades") {
    // { sub_id, data: { wallet, mint, action, sol_amount, dex, ... }, replay, ts }
  }
});
```

**Operations** (all carry `sub_id`): `subscribe`, `update` (replace filters in place), `unsubscribe`, `list`, `ping`. **Filters:** `token_mint(s)` (≤50), `wallet(s)` (≤50), `dex`, `program`, `deployer_tier`, `token_age_max_seconds`, `market_cap_min/max_sol`, `min_sol`, `max_sol`, `action`. At least one targeting filter is required. Inbound rate limit: 5 messages/sec.

Full protocol reference: [madeonsol.com/api-docs#streaming](https://madeonsol.com/api-docs#streaming).

## Rate-limit headers

Every successful REST response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `X-Request-Id`. The SDK exposes them via `rest.lastRateLimit`:

```ts
await rest.alphaLeaderboard();
const { limit, remaining, reset, requestId } = rest.lastRateLimit;
if (remaining !== null && remaining < 5) {
  console.warn(`Throttle warning — ${remaining}/${limit} requests left until ${reset}`);
}
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
| TypeScript SDK | [`madeonsol`](https://www.npmjs.com/package/madeonsol) on npm |
| Rust SDK | [`madeonsol`](https://crates.io/crates/madeonsol) on crates.io |
| Python (LangChain, CrewAI) | [`madeonsol-x402`](https://pypi.org/project/madeonsol-x402/) on PyPI |
| MCP Server (Claude, Cursor) | [`mcp-server-madeonsol`](https://www.npmjs.com/package/mcp-server-madeonsol) · [Smithery](https://smithery.ai/servers/madeonsol/solana-kol-intelligence) · [Glama](https://glama.ai/mcp/servers/madeonsol/mcp-server-madeonsol) |
| ElizaOS | [`@madeonsol/plugin-madeonsol`](https://www.npmjs.com/package/@madeonsol/plugin-madeonsol) |
| Solana Agent Kit | [`solana-agent-kit-plugin-madeonsol`](https://www.npmjs.com/package/solana-agent-kit-plugin-madeonsol) |
