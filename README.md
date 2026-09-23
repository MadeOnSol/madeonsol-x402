# madeonsol-x402

[![npm version](https://img.shields.io/npm/v/madeonsol-x402?style=flat-square)](https://www.npmjs.com/package/madeonsol-x402)
[![npm downloads](https://img.shields.io/npm/dm/madeonsol-x402?style=flat-square)](https://www.npmjs.com/package/madeonsol-x402)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> 📂 **[Examples](./examples/)** · 📚 **[API docs](https://madeonsol.com/api-docs)** · 💰 **[Get a free API key](https://madeonsol.com/pricing)**

TypeScript SDK for the [MadeOnSol](https://madeonsol.com) Solana KOL intelligence API.

<!-- Stats below are deliberate conservative floors kept in sync with the site's canonical labels (src/lib/constants.ts KOL_COUNT_LABEL / DEPLOYERS_PROFILED_LABEL / ALPHA_WALLETS_LABEL), rounded down from a live count measured on a known date and bumped only when the real count crosses the next threshold -- never the exact live number, which changes every minute. Do not replace with a live/volatile count. -->

> Real-time Solana trading intelligence: track 2,000+ KOL wallets with <3s latency on paid keys and x402 pay-per-call (free-tier live feeds are 5-min delayed), score 85K+ Pump.fun deployers, surface deshred deploy signals ~500ms before on-chain confirmation, score 1.5M+ early-buyer wallets (incl. dump-cluster detection), read bundle-cohort holdings (`held_pct_of_supply` — are the bundlers still holding?), verify any wallet's current on-chain holdings (with airdrop/insider `transfer_delta` detection), push every pump.fun graduation, and stream every DEX trade. Free tier: 200 requests/day across 40+ endpoints (live feeds 5-min delayed) — no signup payment. Get a key at [madeonsol.com/pricing](https://madeonsol.com/pricing).

> **New in 2.3.0 — named subscriptions: several independent subscriptions per socket.** `subscribe({ subId, channels, filters })`, `updateSubscription(subId, filters)`, `unsubscribe(subId)`, `getSubscriptions()` / `listSubscriptions()`. Each named subscription has its own channels and filters (the server caps the total per connection, default included: PRO 5, ULTRA 10, BUSINESS 20); frames carry `evt.sub_id`; an event matching several subscriptions is delivered once per subscription (dedupe per `(sub_id, id)`). Resume is per subscription with one commit for the connection. The plain `subscribe(channels, filters)` API is unchanged. See "Named subscriptions" in the stream section.

> **New in 2.2.0 — stream recovery: resume cursor, de-duplication, honest gaps.** The managed stream now tracks the cursor `{ instance, seq, ts }` of the last frame your handlers finished and resumes after it on every reconnect (the v1 `resume` request, with an automatic fallback to `replay_since_seq` / `replay_since_ts` on older servers). Delivery is at-least-once, de-duplicated by event `id`; new lifecycle events `cursor`, `replay`, `gap` (what could not be recovered — a `seq` gap is never loss) and `fatal`. Close codes are handled: 4001 re-fetches the token (bounded), 4002 waits ≥ 60 s instead of looping every second, 4003 stops, 4008 resumes; the backoff resets only after a `subscribed` ack. Every server `warning` frame is emitted (incl. `channels_rejected` / `channels_revoked`). `STREAM_CHANNELS` lists every Solana channel and `token:prices` joins the `StreamChannel` type. See the stream section's "Recovery" notes.

> **New in 2.0.0 — BREAKING for keyless (x402) mode only: an explicit `paymentPolicy` is required (security fix, SDK-01).** `new MadeOnSolX402({ privateKey, paymentPolicy: { payTo, feePayer, maxAmountAtomic, maxTotalAmountAtomic, rpcUrl } })` (optional `beforePayment`); the deprecated `MadeOnSolX402Options` type gains the same required field. Before, keyless mode signed whatever Solana USDC amount, recipient and fee payer a 402 challenge asked for. Now every challenge is checked BEFORE signing against a trusted merchant `payTo`, a trusted facilitator `feePayer` (which must differ from your wallet), the USDC mint, `solana:5eykt…` mainnet, the `exact` scheme, a per-call cap and a lifetime cap. Use the canonical values in the keyless section below; caps must be at least `20000` (0.02 USDC) per call to reach every endpoint. The budget is per client instance / process: not wallet-wide, not shared between processes, reset on a new instance or restart. Keyless requires the base URL exactly `https://madeonsol.com`. **API-key (`msk_`) users: no change, no new config.**

> **New in 1.30.0 — REST/x402 parity fix, top traders, and sniper detection.** Found by an internal agentic-infra coverage audit: `MadeOnSolREST` never got the free-tier/live-feed reads that `MadeOnSolX402` already had (`kolFeed`, `kolCoordination`, `kolLeaderboard`, `deployerAlerts`, `kolPairs`, `kolHotTokens`, `kolTrendingTokens`, `kolTokenEntryOrder`, `kolCompareWallets`, `kolAlertsRecent`), plus `tokenBatch`, `tokensBatchBuyerQuality`, and the sniper feature (`sniperByDeployer`, `sniperWatchlist`, `sniperWatchlistAdd`, `sniperWatchlistRemove` — `sniperRecent` already existed). `rest.tokenTopTraders(mint, params?)` — previously present but with no MCP/ElizaOS/SAK tool anywhere — and `rest.updateWebhook(id, params)` (PATCH) round out the surface.
>
> **New in 1.29.0 — deployer reputation as-of a date, and creator-fee rewards.** `rest.deployerAsOf(wallet, opts?)` (typed `DeployerAsOfResponse`) binds `GET /deployer-hunter/{wallet}/as-of`: the deployer's reputation exactly as it stood on `opts.date` (default today, UTC) — the latest write-on-change snapshot at or before it, so a backtest sees only what was knowable then. `snapshot.snapshot_date` can predate the requested date (write-on-change); `snapshot.carried: true` marks that. No snapshot at or before the date → `as_of: false, snapshot: null` — nothing is ever synthesized. `date` must be ≥ 2026-04-07 and not in the future. `rest.deployerRewards(wallet)` (typed `DeployerRewardsResponse`) binds `GET /deployer-hunter/{wallet}/rewards`: pump.fun creator-fee rewards, answered two ways that are never merged — `collected` (what actually reached the wallet: direct vault claims kept 90 days, social-handle claims, shareholder payouts on **any** token) and `attributed` (every payout on the tokens it **deployed**, split `to_self`/`to_others` + `redirected_pct`). Every money field is `{ sol, usdc, usd }`; `usd` is `null` (never a silent 0) when a SOL amount exists and no SOL price was available. `top_tokens`/`top_recipients` (≤10, USD-sorted) show where attributed fees went, recipients flagged `is_self`/`is_social_pda`. Works for non-deployers too (`is_deployer: false`, `attributed` empty). **PRO+, KEYED (v1) only — `msk_` API key, no x402 route.**

> **New in 1.28.0 — token surges & revivals: momentum fires with the honest half attached.** `rest.tokensSurges(params?)` (typed `TokenSurgesResponse`) binds `GET /tokens/surges` (PRO+): every token momentum fire, newest first. Two kinds, one row shape. **`surge`** — a token < 30 min old whose market cap runs hard against its *launch* MC, in three tiers that each fire at most once per mint: `early` (≤10 min, ≥$12k, ≥3× launch), `strong` (≤30 min, ≥$30k, ≥6× launch **and** ≥2× the lowest sample of the last 3 min — it is climbing *now*), `breakout` (≤2 min, ≥$45k, ≥8×). A tier must be **sustained** (current tick *and* a sample ≥10 s older; nothing fires before 20 s of age) — a same-slot bundle marked to $475k at age 1 s is a spike, not a surge. **`revival`** — a token with no 1-minute trade candle for ≥24 h that starts trading again, confirmed **only by the tape** (≥5 buys, ≥$500 buy volume, MC ≥1.5× the pre-dormancy close), never by the price mark; `tier` is `null`. Hard gates on both: liquidity ≥$1.5k and ≥2 % of MC, and the MC gained must be **paid for** by buy volume (a price mark in a spoof pool moves MC on ~$0). Every row carries the burst `tape` (`source` candles / wallet_trades, `unique_buyers` only where the mint is in trade coverage — `wallet_data_available:false` otherwise, never an inferred zero), `kol` buyers, the first-20 `early_buyers` cohort (bundled / sold / sniper wallets), `deployer` reputation and `risk_flags[]` (`bundled_launch`, `few_buyers`, `wash_pattern`, `thin_liquidity`, `cold_deployer`, `sniper_heavy`, `early_buyers_exiting`, `sell_pressure`, `no_tape_trades`, `no_prior_price`, `mint_authority_active`, `transfer_fee` — typed `TokenSurgeRiskFlag`). Rows ≥65 min old carry the +1 h `outcome`; `stats: true` prints per-(kind, tier) hit-rates (`up_1h_pct`, `median_peak_multiple`, `doubled_1h_pct`) — out-of-sample by construction. Filters `kind`, `tier`, `mint`, `launchpad`, `deployer_tier`, `min_mc_usd` / `max_mc_usd`, `min_buys`, `exclude_flags`, `only_clean`; cursors `since` / `before`. Pushed live on the new **`token:surges`** WS channel (events `token:surge` / `token:revival`, typed `TokenSurgeStreamEvent`; subscribe filters `kinds[]`, `tiers[]`, `launchpads[]`, `exclude_flags[]`, `min_mc_usd` / `max_mc_usd`, `deployer_tier[]`) and accepted by the webhook registry as events `token:surge` / `token:revival` with the same filters. The response echoes the live thresholds in `definitions`. **PRO+, KEYED (v1) only — `msk_` API key, no x402 route.**

> **New in 1.27.1 — stream tokens never expire.** `POST /stream/token` (`rest.getStreamToken()`) now returns the **same token on every call, forever**. It stops working only if your subscription lapses or you call `rest.getStreamToken({ rotate: true })` to replace it (the previous value keeps working for 60 s). `StreamToken.expires_at` and the new `next_refresh_at` are always `null` (kept for wire compatibility — do not schedule refreshes on them); the response gains `rotated: boolean` and `lifetime: string`. The server never rotates on its own and never sends `token_refresh` unless you rotated; a `4001` close means "mint again" (lapsed or rotated), never a timer. Prefer `Authorization: Bearer <token>` on the WebSocket handshake — `?token=` still works and is masked in access logs. `rest.stream()` already does the right thing (it calls `getStreamToken()` on every (re)connect); no code change needed on your side.

> **New in 1.27.0 — token locks & vesting, upcoming unlocks, and pump.fun creator-fee sharing / fee claims — five endpoints + two live channels.** `rest.tokenLocks(mint, params?)` (typed `TokenLocksResponse`) binds `GET /tokens/{mint}/locks`: every on-chain Streamflow / Jupiter Lock / Bonfida lock or vesting contract on a mint, decoded from the locker programs' account state, with a LIVE-derived view (`locked_raw` still locked, `unlocked`, `withdrawn`, `claimable`, `status`, `next_unlock`) and a `summary` (locked / deposited totals, the 7d / 30d forward unlock schedule, `active_cancelable_by_sender` — a lock the sender can cancel is a weaker promise). `rest.tokenLocksFeed(params?)` (`GET /tokens/locks`) is the cross-token feed of NEW contracts, cursor-paginated (`pagination.next_since` / `next_before`) and pushed live on the new **`token:locks`** WS channel (event `token:lock`, typed `TokenLockStreamEvent`). `rest.tokenUnlocks(params?)` (`GET /tokens/unlocks`) lists upcoming unlock EVENTS (cliff / period / final / tranche) inside `within=1h…90d` with `window_amount_*` per contract. `rest.tokenFeeShares(mint)` (`GET /tokens/{mint}/fee-shares`) decodes a pump.fun coin's on-chain `SharingConfig` — who its creator fees are redirected to (`share_bps`, `is_admin`, `is_social_pda` for fees earmarked for an X account etc., `redirected_bps`, `social_bps`, `is_default` = 100% to the creator) plus the distribution rollup per recipient and the config change log; `rest.tokenFeeClaims(params?)` (`GET /tokens/fee-claims`) is the fee-event feed (`distribution` with per-address `payouts[]`, `social_claim`, `shares_created` / `updated` / `reset`, `creator_transferred`, `creator_claim` on request), pushed live on the new **`token:fee_claims`** channel (event `token:fee_claim`, typed `TokenFeeClaimStreamEvent`). Honest limits: base-unit amounts are STRINGS and ui / usd / pct are `null` when decimals or price are unknown; **LP locks are NOT included** (token / vesting locks only); **fee-event history starts 2026-08-17**; all five are **PRO+** and **KEYED (v1) only — `msk_` API key, no x402 route.**

> **New in 1.26.0 — live holder census: exact holder count, labelled holders, and pools that are named, not just excluded.** `rest.tokenHolders(mint)` (typed `TokenHoldersResponse`) binds `GET /tokens/{mint}/holders` (PRO+): every token account of the mint read from the ledger at `confirmed` and merged per owner, so `concentration.holder_count` is EXACT (distinct non-zero owners minus pools / bonding curves / burns) — never a trade-derived estimate; it is `null` only when the provider refuses the census for a mega-cap, in which case you get the top-20 view and `source.census_fallback_reason` says so. Each disclosed owner carries our labels (`deployer` / `kol` / `early_buyer` / `bundle` / `bot` / `dump_cluster` — empty means unknown to us, not clean), and `excluded[]` NAMES what was taken out of the circulating denominator: `reason` = `pool` (with `dex` + `pool_address`), `bonding_curve` (pump.fun / LaunchLab), `burn`, or `program_account` only when we genuinely cannot attribute the PDA; `pool_pct` / `burned_pct` / `program_pct` split the exclusion. Amounts are raw u64 **strings**. Disclosure: PRO ranks 1–10, ULTRA 1–50, BUSINESS 1–100 — the maths is tier-independent. Big tokens take 5–30 s upstream: you get `503 holder_scan_in_progress` with `retry_after_seconds: 20` while the scan finishes into the cache, and the retry is instant. **KEYED (v1) — requires an `msk_` API key; the census is not on the x402 rail.**

> **New in 1.25.0 — two prices on the trade tape, and the right one is now the default.** The trade tape now tells you what a trade actually cost. `price_sol`/`price_usd` on each trade are THIS trade's executed price — `sol_amount / token_amount`, reconciling exactly with the amounts on the same row and with the PnL endpoints. Because `sol_amount` is the wallet's net SOL movement, that is the trader's all-in effective rate: swap fee and any account rent included, not the pool mid. The market-cap tracker's canonical pool price moved to the new **`market_price_sol`/`market_price_usd`** fields — it is sampled once per token per pool update, so every trade in the same slot shares it. Until now `price_sol` carried that canonical value and disagreed with the row's own amounts by a **7.9% median** (p90 ~74%): a stale market price reads low in a pump and high in a dump, so anything you averaged out of the tape inherited the bias instead of cancelling it. Use `price_sol` for cost basis, fills and PnL; `market_price_sol` for a per-token series independent of trade size and direction. Both `rest.tokenTrades(mint)` and `rest.walletTrades(address)` carry all four fields (typed on `TokenTrade` / `WalletTrade`) — `walletTrades` returned amounts and no price at all before.

> **New in 1.24.0 — the Deployer Hunter surface completed.** Seven new operations that existed on the API but had no SDK binding: `deployerLeaderboard()`, `deployerStats()`, `deployerProfile()`, `deployerTokens()`, `deployerAlertStats()`, `deployerBestTokens()` and `deployerRecentBonds()` (poll it incrementally with `next_since`). Read `bonding_rate` (lifetime) against `recent_bond_rate` (rolling) — the gap between them is the signal, not either number alone. `runner_rate` only means something once `labeled_tokens >= 3`, and an **untracked wallet returns a profile with zeroed counters, not a 404**, so check `total_deployed` before reading a 0% bond rate as a track record. Dependency ranges are now bounded to the versions actually tested (`@x402/*` `^2.x`, `@solana/kit` `^5.5.1`) instead of open-ended `>=0.0.1`, and the lazily-imported x402 peers are marked optional — a keyed install no longer pulls the whole Solana stack.

> **New in 1.23.0** — **Clean stream shutdown.** `rest.stream().close()` now fully tears down the underlying WebSocket so short-lived scripts exit promptly instead of hanging on a lingering socket. In Node the client now prefers the `ws` package (which exposes `terminate()`) and hard-terminates on close; the browser still uses the native WebSocket. No API changes — purely a lifecycle fix. (If you don't already depend on `ws` and want the fast exit on Node ≥22, `npm i ws`.)
>
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
// const client = createClient(process.env.SVM_PRIVATE_KEY!, undefined, paymentPolicy);
// See the required paymentPolicy example below.

const { trades } = await client.kolFeed({ limit: 10 });
console.log(trades);
```

### Advanced initialization

Keyless mode requires `paymentPolicy`. API-key mode does not initialize signing or require these settings.

```ts
import { MadeOnSolX402, type SolanaPaymentPolicy } from "madeonsol-x402";

const paymentPolicy: SolanaPaymentPolicy = {
  payTo: "GLu63pRCYrp4BJu5P5ciYKxgeZFW9c8TJ8jWzK3TB9AR",   // canonical merchant (see below)
  feePayer: "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4", // PayAI facilitator fee payer (see below)
  maxAmountAtomic: "20000",               // 0.02 USDC per authorization (the highest Solana leg)
  maxTotalAmountAtomic: "1000000",         // 1 USDC across this client's lifetime
  rpcUrl: process.env.SVM_RPC_URL!,        // your trusted HTTPS RPC
  timeoutMs: 30_000,
  // Optional additional approval; literal true is required if this hook is set.
  beforePayment: async proposal => BigInt(proposal.amountAtomic) <= 20000n,
};
const client = new MadeOnSolX402({ privateKey: process.env.SVM_PRIVATE_KEY!, paymentPolicy });
// Equivalent: createClient(privateKey, undefined, paymentPolicy).
console.log(client.authorizedAmountAtomic);
```

**Canonical MadeOnSol values (Solana mainnet USDC).** Pinned here (GitHub + npm README) so you do not have to take them from a 402:
- merchant `payTo` / `X402_PAY_TO`: `GLu63pRCYrp4BJu5P5ciYKxgeZFW9c8TJ8jWzK3TB9AR` (also shown on https://madeonsol.com/x402 and https://madeonsol.com/.well-known/x402)
- facilitator `feePayer` / `X402_FEE_PAYER`: `2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4`. This is the fee payer of **PayAI**, the third-party facilitator MadeOnSol's Solana rail uses. If PayAI rotates it, keyless calls fail closed (the client refuses to sign) until you update this value; a MadeOnSol release will announce the new one.
- prices: Solana legs are 5000–20000 atomic (0.005–0.02 USDC), so `maxAmountAtomic` / `X402_MAX_AMOUNT_ATOMIC` must be at least `20000` to reach every endpoint.

The budget is per client instance / process: not wallet-wide, not shared between processes, reset when a new instance or process starts. Keyless mode requires the base URL exactly `https://madeonsol.com`.

**Breaking keyless upgrade:** missing policy now fails closed. Only exact mainnet USDC payments to the configured merchant and facilitator are signed. The agent cannot also be the facilitator fee payer. URLs must use HTTPS; requests stay on the configured API origin and redirects are refused. There is no public RPC fallback. Amounts use positive integer strings or bigint, never floating-point numbers; USDC has 6 decimals. Choose caps for the endpoints you use.

Reuse one long-lived client. Concurrent calls share its allowance. An unsigned approval denial releases its reservation; once payment creation starts, the allowance remains consumed even after RPC/signing/network errors or an ambiguous response. This is **authorized attempts, not settled spend**, with no automatic refund or replay. The frozen `beforePayment` proposal cannot override built-in checks.

The 30-second default bounds challenge reading, approval, signing waits and submission. Late RPC results cannot invoke the signer after timeout. Solana transaction validity still follows the signed recent blockhash; the client deadline cannot revoke a proof already sent. Response-body consumption after returned headers is not covered by this deadline.

A new client or process starts a new allowance. These limits are not a durable, wallet-wide budget; coordinate externally when multiple agents/processes share a wallet. API-key behavior and precedence are unchanged.

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

Scored from 1.5M+ early-buyer records (wallets seen in the first 20 buyers of Pump.fun tokens).

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
| `rest.tokenHolders(mint)` | PRO+ | **New** · Live holder census + concentration — who holds NOW (vs `tokenCapTable` = who bought first). `concentration.holder_count` is EXACT (mint-scoped `getProgramAccounts` census, merged per owner; `null` only when the provider refuses a mega-cap → top-20 `getTokenLargestAccounts` fallback with `source.census_fallback_reason` — never trade-estimated). Each disclosed owner labelled `deployer` / `kol` / `early_buyer` / `bundle` / `bot` / `dump_cluster` (empty = unknown, not clean). Pools / bonding curves / burns EXCLUDED from the circulating denominator and NAMED in `excluded[]` (`reason`: `pool` + `dex` + `pool_address`, `bonding_curve`, `burn`, `program_account`). `amount_raw` / `supply_raw` / `circulating_raw` are raw u64 STRINGS. Disclosure PRO 10 / ULTRA 50 / BUSINESS 100; maths tier-independent. Big tokens: first call may be HTTP 503 `holder_scan_in_progress` (`retry_after_seconds: 20`) — the scan continues and is cached, the retry is instant. Keyed only (no x402 route) |
| `rest.tokenLocks(mint, params?)` | PRO+ | **New 1.27** · Token locks & vesting on a mint — every Streamflow / Jupiter Lock / Bonfida vesting contract with a live-derived view (`locked_raw` still locked, `unlocked`, `withdrawn`, `claimable`, `status`, `next_unlock`, `cancelable_by_sender`) + `summary` (locked / deposited raw + ui + usd + % of supply, `unlocking_7d` / `unlocking_30d`, nearest `next_unlock`, `active_cancelable_by_sender`). Params `status`, `program`, `limit` (≤500). Base-unit amounts are STRINGS; ui/usd/pct null when unknown. **LP locks NOT included.** Keyed only (no x402 route) |
| `rest.tokenLocksFeed(params?)` | PRO+ | **New 1.27** · Cross-token feed of NEW lock / vesting contracts, newest first (same row + `token` facts). Cursor `since` = `pagination.next_since`, `before` = `next_before`; filters `mint`, `sender`, `recipient`, `program`, `kind`, `status`, `min_usd`, `min_pct_of_supply`, `include_estimated` (backfilled Jupiter rows). Pushed live on WS `token:locks`. Keyed only |
| `rest.tokenUnlocks(params?)` | PRO+ | **New 1.27** · Upcoming unlock EVENTS across all active contracts inside `within` (1h · 6h · 24h · 3d · 7d · 14d · 30d · 90d) — each contract's NEXT cliff / period / final / tranche with `amount_*` + `window_amount_*` (total over the window). `sort` soonest · largest_usd · largest_pct; filters `mint`, `program`, `kind`, `min_usd`, `min_pct_of_supply`. Keyed only |
| `rest.tokenFeeShares(mint)` | PRO+ | **New 1.27** · pump.fun creator-fee sharing on a coin — the on-chain `SharingConfig` (`admin`, `shareholders[]` with `share_bps` / `is_admin` / `is_social_pda` + `social` identity (platform 2 = X, `user_id` = numeric id, lifetime claimed), `redirected_bps`, `social_bps`, `is_default` = 100% to creator, `source` stream/chain) + `distributions` rollup per recipient, `past_recipients`, `history` (config changes / creator transfers), `recent_distributions`. Quote base units as STRINGS. **History starts 2026-08-17.** Keyed only |
| `rest.tokenFeeClaims(params?)` | PRO+ | **New 1.27** · pump.fun fee-event feed, newest first — `distribution` (with pro-rata `payouts[]`), `social_claim`, `shares_created` / `shares_updated` / `shares_reset`, `creator_transferred`, `creator_claim` (only when asked via `type`). Filters `type` (comma list), `mint`, `recipient`, `actor`, `social_platform`, `social_user_id`, `min_sol`; cursor `since` = `pagination.next_since`. Pushed live on WS `token:fee_claims`. **History starts 2026-08-17.** Keyed only |
| `rest.tokensSurges(params?)` | PRO+ | **New 1.28** · Token momentum fires, newest first — `kind` `surge` (token < 30 min old vs its LAUNCH MC; `tier` `early` ≤10 min ≥$12k ≥3× · `strong` ≤30 min ≥$30k ≥6× and ≥2× the 3-min low · `breakout` ≤2 min ≥$45k ≥8×; each once per mint, sustained ≥10 s) or `revival` (no trade candle ≥24 h, then ≥5 buys / ≥$500 buy volume / ≥1.5× the pre-dormancy MC on the tape — never a price mark; `tier` null). Each row: burst `tape` (`unique_buyers` null outside trade coverage), `kol`, `early_buyers` (bundled / sold / sniper), `deployer`, `risk_flags[]`, and `outcome` (+1 h MC / peak / low) once ≥65 min old. `stats: true` = per-(kind, tier) hit-rates over `days`. Filters `kind`, `tier`, `mint`, `launchpad`, `deployer_tier`, `min_mc_usd` / `max_mc_usd`, `min_buys`, `exclude_flags` (comma list), `only_clean`; cursors `since` / `before`. Pushed live on WS `token:surges`. Retention 60 d. Keyed only |
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

CRUD for token dip/recovery price alerts. Fires via WebSocket (`price_alert:events` channel) and/or HMAC-signed webhook when a token's market cap crosses your threshold. PRO=5 rules, ULTRA=25.

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
// token.expires_at   — always null: stream tokens never expire (1.27.1)
const fresh = await rest.getStreamToken({ rotate: true }); // replace it; old value works 60 s more
```

Stream tokens **never expire**: the same token comes back on every call until your subscription lapses or you rotate it. Send it as `Authorization: Bearer <token>` on the WebSocket handshake (`?token=` still works). A `4001` close means "mint again", never a timer.

### Managed streaming client *(new in 1.10)*

`rest.stream()` handles the token fetch (the token never expires — `getStreamToken()` is called on every (re)connect), auto-reconnect (backoff + jitter), heartbeat liveness, and typed events — just subscribe and listen.

```ts
const stream = rest.stream();
stream.on("kol:trade", (t) => console.log(t.token_symbol, t.action));
stream.on("deployer:alert", (a) => console.log("new deploy", a.token_mint));
stream.subscribe(["kol:trades", "deployer:alerts"]);
// stream.unsubscribe([...]) / stream.close() when done
```

Channels: `kol:trades`, `kol:coordination`, `kol:first_touches`, `deployer:alerts`, `wallet_tracker:events`, `copytrade:signals`, `price_alert:events`, `sniper:deploys`, `token:graduations`, `token:prices` (**new** in the channel list — event `token:price`, per-mint price/MC ticks; PRO+, REQUIRES `filters.mints` — PRO 25 / ULTRA 100 / BUSINESS 250 per connection; a state stream, so ticks carry no id/seq and are never replayed) (every pump.fun graduation in real time, tracked deployer or not — typed `GraduationEvent`), `token:locks` (**new 1.27** — event `token:lock` for every NEW Streamflow / Jupiter Lock / Bonfida lock or vesting contract, typed `TokenLockStreamEvent`; PRO+; updates are not pushed — poll `rest.tokenLocks()`), `token:fee_claims` (**new 1.27** — event `token:fee_claim` for every pump.fun fee event: distributions, social-handle claims, config changes, typed `TokenFeeClaimStreamEvent`; PRO+), `token:surges` (**new 1.28** — events `token:surge` (a token < 30 min old running ≥3× / ≥6× / ≥8× its launch MC — `tier` early / strong / breakout, each once per mint, sustained) and `token:revival` (≥24 h with no trade candle, then confirmed buys on the tape; `tier` null), typed `TokenSurgeStreamEvent` — the same row as `rest.tokensSurges()` minus `outcome`, `risk_flags[]` included; subscribe filters `kinds[]`, `tiers[]`, `launchpads[]`, `exclude_flags[]`, `min_mc_usd` / `max_mc_usd`, `deployer_tier[]`; PRO+). Lifecycle events: `open`, `close`, `reconnect`, `subscribed`, `heartbeat`, `warning`, `cursor`, `replay`, `gap`, `fatal`, `error`. Uses the global `WebSocket` on Node 22+; on Node < 22 also `npm i ws`.

#### Recovery: cursor, resume, de-duplication *(new in 2.2.0)*

The stream client keeps a **resume cursor** `{ instance, seq, ts }` — the position of the last frame your handlers finished — and on every reconnect asks the server to resume after it (`subscribe { …, resume }`).

- **"Processed"** means every handler for that frame returned, or the promise it returned settled. Return a promise from an async handler and the cursor waits for it (and for every earlier frame). A handler that throws or rejects still counts as processed; the error goes to `error`.
- **At-least-once, never exactly-once.** After a reconnect a frame can arrive again. The client drops ids it delivered recently (the last 10,000, option `dedupeSize`); anything you persist should still dedupe on `evt.id`. Replayed frames carry `evt.replayed === true`.
- **Persistence.** The cursor lives in memory. Save `stream.getCursor()` (or on every `cursor` event) and pass it back as `{ resume }` to continue after a process restart. Persist the committed cursor, never `getProgress()`.
- **Committed cursor vs progress.** `getCursor()` is the COMMITTED, safe cursor — persist and resume from this one. `getProgress()` is what has been received and handled (replayed frames included) and is not safe to resume from. Live frames commit as they are handled. Replayed frames never commit: the server replays channel by channel, so only a `replay_end` the server calls complete — or one whose gaps are all final — commits, at the server's `last_seq` / `last_ts`. If a recovery is incomplete, or the socket closes mid-replay, the committed cursor stays at the pre-resume point, and live frames after it are delivered but not committed until a later recovery completes (`isRecoveryIncomplete()`). **Trade-off:** the next reconnect re-requests the unrecovered range from the old cursor, and what arrives twice is dropped by id. Call `acceptGap()` once you have backfilled the range the `gap` event named, or decided to skip it. A gap the server calls final is handled by `onUnrecoverableGap` (below).
- **Gaps: what is known, and who decides.** A `gap` event says which channels the server could not rebuild, the **range that may be incomplete** (`skipped.from` → `skipped.to`, plus `from`), the server's `reason`, whether it is `permanent`, and the bounds the server reported (`limits`, and per-channel `time_basis` / `truncated_at_ts` / `retry_after_ms` under `channels`). Events in that range **may** be missing — the number cannot be known, so it is never stated. Backfill the range from REST if you need certainty.
  - **Transient** (`retryable: true` — `backpressure`, `closed`, `source_busy`, `source_error`, `late_ingest_possible`, `row_cap`): the committed cursor stays put, live frames do not commit, and the client resumes again after the server's `retryAfterMs` (for `row_cap`, from `resumeTsHint`), then on every reconnect. `resumeTsHint` is used only when every incomplete **retryable** channel is `row_cap` (a channel whose gap is final does not block it, and is still reported); otherwise the retry asks from the committed cursor again. The client asks again after the server’s `retryAfterMs` at most `maxResumeRetries` times per connection (default 5; the budget resets on every reconnect); when that budget is spent the gap event says `exhausted: true`, the cursor stays where it is, and the next reconnect resumes again.
  - **Final** (`retryable: false` — `not_reconstructable`, `window_exceeded`, and an older server's `ring_truncated` / `instance_changed`): asking again can never fill it. **The SDK then decides to continue** — that is the client's decision, not your approval — and reports it on the same `gap` event with `advancedPastGap: true`, `source: "auto"` and the range being skipped, *before* the cursor moves. Set `onUnrecoverableGap: "stop"` to keep the cursor instead: the stream stops and emits `fatal` with the gap, and you decide (`acceptGap()` then `connect()` continues; `acceptGap()` reports the same gap with `source: "manual"`).
- **Older servers.** Against a server that does not understand `resume` yet, the client falls back to `replay_since_seq` (same server process) or `replay_since_ts` (the server restarted). That only covers the server's in-memory buffer (minutes), and a restart is reported as a `gap` with `instance_changed`.
- **Close codes.** `4001` → the token is re-fetched and the client reconnects (`maxAuthRetries`, default 3, then `fatal`); `4002` connection limit → `error` plus a wait of at least 60 s (`connectionLimitBackoffMs`) — free a ghost slot with the stream-sessions API; `4003` → `fatal`, the client stops; `4008` slow consumer → reconnect and resume. The backoff resets only when the server acks a subscribe, never on a bare socket open.
- **Warnings.** `warning` fires for every server warning frame, including `channels_rejected` and `channels_revoked` (revoked channels are removed from the subscription so reconnects do not re-request them) (a channel dropped after a plan change). A rejected or revoked channel is silent, so handle it.

```ts
const stream = rest.stream({ resume: loadCursor() ?? undefined });
stream.on("*", async (data, evt) => {
  await store.upsert(evt!.id, data); // the cursor advances once this resolves
});
stream.on("cursor", (c) => saveCursor(c));        // { instance, seq, ts }
stream.on("gap", (g) => console.warn("may be missing:", g.reasons, g.skipped)); // g.advancedPastGap: the SDK continued past it
stream.on("fatal", (f) => console.error("stream stopped:", f.code, f.reason));
```

#### Named subscriptions *(new in 2.3.0)*

One socket can hold several independent subscriptions, each with its own channels and filters; the server caps the total per connection, the default one included (PRO 5, ULTRA 10, BUSINESS 20). `subscribe(channels, filters)` stays the connection's `"default"` subscription and its wire is unchanged; `subscribe({ subId, channels, filters })` opens a named one (`subId`: 1-64 characters of `A-Z a-z 0-9 _ . -`). A frame delivered under a named subscription carries `evt.sub_id`. **An event that matches several subscriptions is delivered once per matching subscription**, each copy stamped with its `sub_id`: the client dedupes per `(sub_id, id)`, so the same event can legitimately reach a handler twice, under two sub_ids. Filters of one subscription never affect another. `updateSubscription(subId, filters)` REPLACES that subscription's filters (`"default"` addresses the plain one), `unsubscribe(subId)` removes it, `getSubscriptions()` is the local view and `listSubscriptions()` asks the server (`list` / `subscriptions`). Server refusals arrive as `warning` frames carrying the `sub_id` and one of `invalid_sub_id`, `too_many_subscriptions`, `unknown_sub_id`, `invalid_filters`, `channels_rejected`, `channels_revoked`, `replay_in_progress`; a subscription refused as `too_many_subscriptions` or `invalid_sub_id` is dropped locally so reconnects stop re-requesting it. Lifecycle events `updated` and `unsubscribed` surface the server acks.

**Resume with several subscriptions** is per subscription: on every reconnect each subscription is re-sent with the same cursor, the server serves one replay per subscription, one after another (`replay_start` … `replay_end` each carry the `sub_id`; live frames are held until the last one ends), and the cursor commits once ALL of them have ended, at the smallest `last_seq` / `last_ts` across them. The `replay` event lists `subscriptions` and the raw `ends` per subscription; a gap's `channels` entries are keyed `sub_id/channel` for named subscriptions, and an incomplete retryable replay is retried for those subscriptions only. Against an older server that ignores `sub_id`, the client emits `warning` `named_subscriptions_unsupported` once.

```ts
const stream = rest.stream();
stream.subscribe({ subId: "kol-buys", channels: ["kol:trades"], filters: { action: "buy", min_sol: 1 } });
stream.subscribe({ subId: "deploys", channels: ["deployer:alerts"], filters: { deployer_tier: ["elite"] } });
stream.on("kol:trade", (t, evt) => console.log(evt!.sub_id, t)); // "kol-buys"
stream.updateSubscription("kol-buys", { action: "buy", min_sol: 5 });
console.log(await stream.listSubscriptions()); // [{ subId, channels, filters }, …]
stream.unsubscribe("deploys");
```

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
