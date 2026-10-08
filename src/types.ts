/* ── KOL Feed ── */

export interface KolTrade {
  wallet_address: string;
  kol_name: string | null;
  kol_twitter: string | null;
  token_mint: string;
  token_name: string | null;
  token_symbol: string | null;
  action: "buy" | "sell";
  sol_amount: number;
  token_amount: number;
  /** Token market cap in USD at the moment of trade (real-time, sourced from
   *  our in-memory price tracker — not the Dexscreener spot which lags). */
  market_cap_usd_at_trade?: number | null;
  /** Token price in USD at the moment of trade. */
  price_usd_at_trade?: number | null;
  tx_signature: string;
  deployer?: {
    wallet: string;
    tier: string;
    bonding_rate: number | null;
  };
  /** Same as deployer.tier; present only when the deployer is known. */
  deployer_tier?: string;
  traded_at: string;
  /** Manual strategy tag, falling back to the auto tag. */
  kol_strategy_tag?: string | null;
  kol_auto_strategy_tag?: string | null;
  kol_winrate_7d?: number | null;
  kol_winrate_30d?: number | null;
  kol_early_entry_pct_30d?: number | null;
  kol_is_heating_up?: boolean;
  kol_percentile_pnl_7d?: number | null;
  kol_percentile_winrate_7d?: number | null;
  token_image_url?: string | null;
  /** Launchpad of origin; null for non-launchpad mints. */
  launchpad?: "pumpfun" | "launchlab" | "bags" | null;
  /** Token age in minutes (now − first seen); null when unknown. */
  token_age_minutes?: number | null;
  /** include=token only — the /token/{mint} snapshot (null past the 20-mint cap). */
  token?: TokenSnapshot | null;
}

/** Free (BASIC) tier delay metadata — present only on delayed responses. */
export interface FreeTierDelayMeta {
  /** e.g. "5m" */
  delay?: string;
  delay_seconds?: number;
  /** The delayed cutoff the page was served at. */
  as_of?: string;
  delay_note?: string;
  /** Pricing URL. */
  upgrade?: string;
}

/** WebSocket channel that pushes the same rows. */
export interface StreamPointer {
  channel: string;
  url: string;
  docs: string;
}

export interface KolFeedResponse extends FreeTierDelayMeta {
  trades: KolTrade[];
  count: number;
  /** Seconds since the newest returned row's traded_at; null on an empty page. */
  data_age_seconds?: number | null;
  /** Poll cursor — pass as `since` to fetch only newer rows. */
  next_since?: string | null;
  /** Echo of the `since` parameter. */
  since?: string | null;
  stream?: StreamPointer;
  /** Present only when include= was honoured. */
  included?: Array<"token">;
  /** Present only when include=token hit the 20-distinct-mint cap. */
  include_truncated?: { token: string[]; note: string };
  /** Present only when an unknown include= value was sent. */
  include_errors?: Record<string, { status: number; error: string }>;
  /** LEGACY strict timestamp cursor (skips same-timestamp siblings) — prefer next_cursor. */
  next_before?: string | null;
  /** Pass as `cursor` for the next (older) page; null at the end. */
  next_cursor?: string | null;
  /** false only when the feed is exhausted. */
  has_more?: boolean;
  /** Present when a filter was applied after the candidate fetch; scan_truncated=true means more matches MAY exist past next_cursor. */
  scan?: { post_filtered: boolean; scanned: number; scan_truncated: boolean; scan_budget: number };
}

export type KolStrategy = "scalper" | "day_trader" | "swing_trader" | "hodler" | "mixed";

export interface KolFeedParams {
  limit?: number;
  /** Poll cursor — only trades strictly newer than this ISO time (feed back next_since). */
  since?: string;
  /** REST only: "token" embeds the /token/{mint} snapshot on each row (≤20 distinct mints per page). The x402 route rejects it before payment (400 param_not_supported_on_x402). */
  include?: "token";
  /** LEGACY cursor — ISO 8601 timestamp; returns trades strictly older than this (skips same-timestamp rows). Prefer `cursor`. */
  before?: string;
  /** PREFERRED pagination: `next_cursor` from the previous page — opaque strict keyset (no skipped/repeated rows at shared timestamps). Cannot be combined with `before`. */
  cursor?: string;
  action?: "buy" | "sell";
  kol?: string;
  /** PRO+: minimum SOL size per trade */
  min_sol?: number;
  /** PRO+: max token age in minutes at time of trade */
  token_age_max_min?: number;
  /** PRO+: exclude sell-side trades */
  exclude_sells?: boolean;
  /** PRO+: minimum 7d winrate of the KOL (0-100) */
  min_kol_winrate?: number;
  /** PRO+: filter by auto-tagged strategy */
  strategy?: KolStrategy;
  /** v1.6 — lower bound on market_cap_usd_at_trade. Trades with unknown MC are dropped when this is set. */
  min_mc_usd?: number;
  /** v1.6 — upper bound on market_cap_usd_at_trade. */
  max_mc_usd?: number;
}

/* ── KOL Coordination ── */

export interface KolCoordinationKol {
  name: string;
  wallet: string;
  /** v1.1 — per-wallet SOL flow (PRO+). */
  buy_sol?: number;
  sell_sol?: number;
  /** v1.1 — true when sell_sol > buy_sol (net-flow-negative). */
  exited?: boolean;
}

/** Market-cap / volume deltas from mc-tracker history. The whole set is ABSENT (not null) when the token has no history yet. Window keys: 5m, 15m, 1h, 2h, 4h (sparse). */
export interface McDeltaFields {
  /** % change of market cap over each window (12.4 = +12.4 %). */
  mc_change_pct?: Record<string, number | null>;
  /** Organic (non-MEV) USD volume over each window. */
  volume_usd?: Record<string, number>;
  /** Share of volume attributed to MEV over each window. */
  mev_volume_pct?: Record<string, number | null>;
  /** Seconds of mc-tracker history behind the deltas. */
  history_age_seconds?: number;
}

/** The REST route (/api/v1) carries every field; the x402 route returns the base cluster (token, counts, flow, signal, kols name + wallet). */
export interface KolCoordinationToken extends McDeltaFields {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  kol_count: number;
  total_buys: number;
  total_sells: number;
  net_sol_flow: number;
  signal: "accumulating" | "distributing";
  kols: KolCoordinationKol[];
  /** Mean 7d winrate across the cluster's KOLs. */
  avg_winrate_7d?: number | null;
  /** Avg early-entry percentile (lower = earlier). */
  entry_rank_avg?: number | null;
  /** Count of distinct strategy tags across the KOLs. */
  unique_strategies?: number;
  strategies?: string[];
  first_buy_at?: string | null;
  last_buy_at?: string | null;
  /** Seconds between first and last KOL buy (full-period span). */
  time_to_consensus_sec?: number | null;
  /** v1.1 — peak density window (busiest N-min slice). */
  peak_window_start?: string;
  peak_window_end?: string;
  peak_kols?: number;
  peak_buys?: number;
  /** v1.1 — wallets that exited (net-flow-negative). */
  exited_count?: number;
  holders_count?: number;
  /** v1.1 — composite 0-100 score. */
  coordination_score?: number;
  /** v1.2 (2026-05-06) — market cap (USD) stamped on the cluster's chronologically-first KOL buy. */
  market_cap_usd_at_first_buy?: number | null;
  /** v1.2 — current market cap (USD), from token_prices. */
  market_cap_usd?: number | null;
  /** v1.2 — current last-trade price (USD). */
  last_price_usd?: number | null;
}

export interface KolCoordinationResponse {
  coordination: KolCoordinationToken[];
  period: string;
  min_kols: number;
  /** v1.1 — score formula version. */
  score_version?: string;
  /** 2026-09-21 — the clusters the ranking covered: top `max_size` by (kol_count DESC, net_sol_flow DESC); filters + score sort run inside it. */
  universe?: { kind: "top_by_kol_count"; order: string; max_size: number; size: number; truncated_at_max: boolean };
  /** v1.1 — peak-density window used. */
  window_minutes?: number;
}

export interface KolCoordinationParams {
  period?: "1h" | "6h" | "24h" | "7d";
  min_kols?: number;
  limit?: number;
  /** PRO+: require cluster average winrate_7d >= N (0-100) */
  min_avg_winrate?: number;
  /** PRO+: require the cluster's KOLs to span distinct strategies. The route accepts true|false (a number is a 400). */
  unique_strategies?: boolean;
  /** v1.1 — include major memecoins (WIF/BONK/POPCAT). Default false. */
  include_majors?: boolean;
  /** REST only: "risk" embeds /tokens/{mint}/risk per cluster (at most 20 distinct mints). The x402 route rejects it before payment (400 param_not_supported_on_x402). */
  include?: "risk";
  /** v1.1 — peak-density window in minutes (1-60). Default 15. */
  window_minutes?: number;
  /** v1.1 — minimum composite coordination score (0-100). */
  min_score?: number;
  /** v1.6 — lower bound on entry MC (MC at first KOL buy). Tokens with unknown MC are dropped when set. */
  min_mc_usd?: number;
  /** v1.6 — upper bound on entry MC. */
  max_mc_usd?: number;
}

/* ── Coordination alerts (v1.1) ── */

export type CoordinationDeliveryMode = "websocket" | "webhook" | "both";

export interface CoordinationAlertRule {
  id: string;
  name: string | null;
  min_kols: number;
  window_minutes: number;
  min_score: number;
  include_majors: boolean;
  cooldown_min: number;
  score_jump_break: number;
  delivery_mode: CoordinationDeliveryMode;
  webhook_url: string | null;
  /** v1.6 — entry-MC band on the rule (null = open-ended). */
  min_mc_usd?: number | null;
  max_mc_usd?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CoordinationAlertCreateParams {
  name?: string;
  min_kols?: number;
  window_minutes?: number;
  min_score?: number;
  include_majors?: boolean;
  cooldown_min?: number;
  score_jump_break?: number;
  delivery_mode?: CoordinationDeliveryMode;
  webhook_url?: string;
  /** v1.6 — entry-MC band the rule will require for triggers. */
  min_mc_usd?: number;
  max_mc_usd?: number;
}

export interface CoordinationAlertUpdateParams {
  name?: string | null;
  min_kols?: number;
  window_minutes?: number;
  min_score?: number;
  include_majors?: boolean;
  cooldown_min?: number;
  score_jump_break?: number;
  delivery_mode?: CoordinationDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
  /** v1.6 — pass null to clear; omit to leave unchanged. */
  min_mc_usd?: number | null;
  max_mc_usd?: number | null;
}

export interface CoordinationAlertListResponse {
  rules: CoordinationAlertRule[];
}

export interface CoordinationAlertCreateResponse {
  rule: CoordinationAlertRule;
  webhook_secret: string | null;
  note?: string;
}

/* ── First-touch signal ── */

export type ScoutTier = "S" | "A" | "B" | "C";

export interface FirstTouchesParams {
  /** ISO datetime — return events strictly newer than this. Use as a polling cursor. */
  since?: string;
  /** ISO datetime — return events strictly older than this. LEGACY pagination; prefer `cursor`. */
  before?: string;
  /** PREFERRED pagination: `next_cursor` from the previous page — opaque strict keyset (no skipped/repeated rows at shared timestamps). Cannot be combined with `before`. */
  cursor?: string;
  limit?: number;
  /** Filter to one KOL wallet address (32–44 base58 chars). */
  kol?: string;
  min_kol_winrate_7d?: number;
  /** Restrict to scouts of this tier or better (S > A > B > C). Requires n_first_touches_30d ≥ 30. */
  min_scout_tier?: ScoutTier;
  /** Lower minimum required first-touch sample size for scout scoring (default 30). */
  min_n_touches?: number;
  strategy?: "scalper" | "day_trader" | "swing_trader" | "hodler" | "mixed";
  token_age_max_min?: number;
  min_first_buy_sol?: number;
  /** Suffix-filter the token mint (e.g. "pump", "bonk"). */
  mint_suffix?: string;
  /** Shortcut filter sets — `scout` = min_scout_tier=B + min_n_touches=30 + token_age_max_min=60. */
  preset?: "scout" | "fresh_launch";
  /** Comma-separated includes — currently `followers_4h`. Computed only for events ≥4h old. */
  include?: string;
  /** v1.6 — lower bound on market_cap_usd_at_first_buy. Touches with unknown MC are dropped when set. */
  min_mc_usd?: number;
  /** v1.6 — upper bound on market_cap_usd_at_first_buy. */
  max_mc_usd?: number;
}

export interface FirstTouchEvent {
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  token_image_url: string | null;
  first_buy_at: string;
  sol_amount: number | null;
  token_amount: number | null;
  tx_signature: string | null;
  token_age_minutes: number | null;
  first_kol: {
    /** Wallet address — only present on Ultra tier. */
    wallet?: string;
    name: string | null;
    twitter_url: string | null;
    winrate_7d: number | null;
    strategy: string | null;
    scout_tier: ScoutTier | null;
    /** Same as swarm_3plus_pct on the leaderboard. */
    scout_score: number | null;
    n_first_touches_30d: number | null;
  };
  followers_4h?: number;
  /** v1.5 (2026-05-06) — market cap (USD) stamped on the exact tx that fired the first KOL buy, joined via tx_signature. */
  market_cap_usd_at_first_buy?: number | null;
  /** v1.5 — token price (USD) at the same moment. */
  price_usd_at_first_buy?: number | null;
  /** v1.5 — current market cap (USD), from token_prices. */
  market_cap_usd?: number | null;
  /** v1.5 — current last-trade price (USD). */
  last_price_usd?: number | null;
}

export interface FirstTouchesResponse {
  events: FirstTouchEvent[];
  count: number;
  next_before: string | null;
  /** Pass as `cursor` for the next (older) page; null at the end. */
  next_cursor?: string | null;
  /** false only when the feed is exhausted. */
  has_more?: boolean;
  /** Present when a filter was applied after the candidate fetch; scan_truncated=true means more matches MAY exist past next_cursor. */
  scan?: { post_filtered: boolean; scanned: number; scan_truncated: boolean; scan_budget: number };
  data_age_seconds: number | null;
  /** Poll cursor — pass back as `since` for only-newer rows. */
  next_since?: string | null;
  /** Echo of the `since` parameter. */
  since?: string | null;
  /** WebSocket channel (kol:first_touches) that pushes the same rows. */
  stream?: StreamPointer;
  /** Present only when include= was honoured. */
  included?: Array<"wallet">;
  /** Present only when include=wallet hit its distinct-wallet cap. */
  include_truncated?: { wallet: string[]; note: string };
  /** Present only when an include failed or was unknown. */
  include_errors?: Record<string, { status: number; error: string }>;
}

export interface FirstTouchSubscriptionFilters {
  kol?: string;
  mint_suffix?: string;
  min_first_buy_sol?: number;
  min_scout_tier?: ScoutTier;
  min_n_touches?: number;
}

export interface FirstTouchSubscription {
  id: string;
  name: string | null;
  filters: FirstTouchSubscriptionFilters;
  delivery_mode: CoordinationDeliveryMode;
  webhook_url: string | null;
  /** v1.6 — first-touch MC band on the subscription (null = open-ended). */
  min_mc_usd?: number | null;
  max_mc_usd?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FirstTouchSubscriptionCreateParams {
  name?: string;
  filters?: FirstTouchSubscriptionFilters;
  delivery_mode?: CoordinationDeliveryMode;
  webhook_url?: string;
  /** v1.6 — first-touch MC band on the subscription. */
  min_mc_usd?: number;
  max_mc_usd?: number;
}

export interface FirstTouchSubscriptionUpdateParams {
  name?: string | null;
  filters?: FirstTouchSubscriptionFilters;
  delivery_mode?: CoordinationDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
  /** v1.6 — pass null to clear; omit to leave unchanged. */
  min_mc_usd?: number | null;
  max_mc_usd?: number | null;
}

export interface FirstTouchSubscriptionListResponse {
  subscriptions: FirstTouchSubscription[];
}

export interface FirstTouchSubscriptionCreateResponse {
  subscription: FirstTouchSubscription;
  webhook_secret: string | null;
  note?: string;
}

/* ── KOL Leaderboard ── */

/**
 * One leaderboard row. The x402 route (MadeOnSolX402.kolLeaderboard) and the REST route
 * (MadeOnSolREST.kolLeaderboard) share the canonical v1 names since 3.0.0; the score fields
 * below are REST-only. (The x402 route still sends deprecated wallet_address / pnl_sol /
 * total_buy_sol / total_sell_sol aliases until 2026-11-03; they are not typed.)
 */
export interface KolLeaderboardEntry {
  wallet: string;
  name: string;
  /** Realized (cost-basis) PnL in SOL, 6 decimals. */
  pnl: number;
  /** Buy + sell volume in SOL, 6 decimals. */
  volume: number;
  buy_count: number;
  sell_count: number;
  win_rate: number | null;
  /** v1.12 — median hold time in minutes over the last 30 days. */
  median_hold_minutes_30d?: number | null;
  /** v1.12 — percentile rank (0-100) of early entry quality over the last 30 days. */
  percentile_early_entry_30d?: number | null;
  /** v1.24 — complete SQL aggregate over the period; null when that read failed (entry_mc_complete=false). */
  entry_mc_samples?: number | null;
  avg_entry_mc_usd?: number | null;
}

/** v1.24 — pagination walks a FIXED ranked universe, not every KOL. */
export interface LeaderboardUniverse {
  kind:     string;
  period?:  string;
  max_size: number;
  size:     number;
  note?:    string;
}

export interface KolLeaderboardResponse {
  leaderboard: KolLeaderboardEntry[];
  period: string;
  universe?: LeaderboardUniverse;
  entry_mc_window_start?: string | null;
  entry_mc_complete?: boolean;
  /** REST route only. `total` = KOLs left in the ranked universe after filters. */
  pagination?: OffsetPagination & { total: number };
}

/** The REST route's sort enum. (Earlier types listed "roi" / "early_entry", which the route rejects with a 400.) */
export type KolLeaderboardSort = "pnl" | "winrate" | "volume" | "avg_roi" | "profit_factor" | "early_entry_pct" | "consistency";

export interface KolLeaderboardParams {
  /** Time window. 90d/180d fill up over time as kol_trades retention (180 days) accumulates. */
  period?: "today" | "7d" | "30d" | "90d" | "180d";
  limit?: number;
  /** REST only (0-10000). The x402 route rejects it before payment (400 param_not_supported_on_x402). */
  offset?: number;
  /** PRO+: sort axis (default "pnl") */
  sort?: KolLeaderboardSort;
  /** PRO+: filter by auto-tagged strategy */
  strategy?: KolStrategy;
  /** PRO+: minimum winrate cutoff (0-100) */
  min_winrate?: number;
}

/* ── Deployer Alerts ── */

export interface DeployerAlert {
  id: string;
  token_mint: string;
  token_name: string | null;
  token_symbol: string | null;
  alert_type: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  market_cap_at_alert: number | null;
  /** v1.16 — deployer wallet SOL balance at the moment the alert fired. Null for historical rows. (An alert field; earlier types put it under `deployers`, where the route never sent it.) */
  deployer_sol_balance?: number | null;
  /** Launchpad of origin (e.g. pumpfun, launchlab, bags); null when unknown. */
  launchpad?: string | null;
  deployers: {
    wallet_address: string;
    tier: string;
    total_tokens_deployed: number;
    total_bonded: number;
    /** Tokens that bonded almost immediately after deploy. */
    instant_bonds?: number;
    bonding_rate: number;
    recent_outcomes: unknown;
    recent_bond_rate: number;
    /** Peak market cap (USD) of the deployer's best token. */
    best_token_peak_mc?: number | null;
    /** v1.11.1 — fraction of the deployer's labeled tokens that ran (peak ≥60min after deploy) vs dumped. */
    runner_rate?: number | null;
    /** Count of the deployer's labeled tokens that ran. */
    runner_tokens?: number | null;
    /** v1.11.1 — count of labeled tokens behind runner_rate; confidence denominator, gate on ≥3. */
    labeled_tokens?: number | null;
    /** v1.11.1 — average minutes from deploy to bond across the deployer's bonded tokens. */
    avg_time_to_bond_minutes?: number | null;
  };
  kol_buys: {
    count: number;
    total_sol: number;
    kols: string[];
  } | null;
}

export interface DeployerAlertsResponse extends FreeTierDelayMeta {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  alerts: DeployerAlert[];
  limit: number;
  offset: number;
  /** LEGACY strict timestamp cursor (skips alerts sharing the boundary created_at) — prefer next_cursor. */
  next_before?: string | null;
  /** Pass as `cursor` for the next (older) page; null at the end. */
  next_cursor?: string | null;
  /** false only when the feed is exhausted. */
  has_more?: boolean;
  /** false only if kol_buys could not be aggregated exactly (counts are then lower bounds). */
  kol_buys_complete?: boolean;
  /** Present with min_kol_buys; scan_truncated=true means more matches MAY exist past next_cursor. */
  scan?: { post_filtered: boolean; scanned: number; scan_truncated: boolean; scan_budget: number };
  /** Seconds since the newest returned alert's created_at; null on an empty page. */
  data_age_seconds?: number | null;
}

export interface DeployerAlertsParams {
  /** Only alerts for this token mint. */
  token_mint?: string;
  since?: string;
  /** Opaque strict (created_at, id) cursor — `next_cursor` from the previous page. Preferred. Not combinable with before/offset. */
  cursor?: string;
  /** LEGACY cursor — ISO 8601 timestamp; returns alerts strictly older than this (skips same-timestamp siblings). */
  before?: string;
  limit?: number;
  offset?: number;
  /** Filter alerts by deployer tier. PRO/ULTRA only — BASIC callers receive HTTP 403. */
  tier?: "elite" | "good" | "moderate" | "rising" | "cold";
  /** Filter by alert_type (e.g. "new_deploy", "bonded"). */
  alert_type?: string;
  /** Filter by alert priority. */
  priority?: "high" | "medium" | "low";
  /** Only alerts where at least N KOLs bought the token. */
  min_kol_buys?: number;
}

/* ── Webhooks (REST API — Pro/Ultra) ── */

/** v2.10: every event the registry accepts (src/lib/webhook-events.ts VALID_EVENTS); earlier types listed only the first four. */
export type WebhookEvent =
  | "kol:trade" | "kol:coordination" | "deployer:alert" | "deployer:bond"
  | "wallet_tracker:event" | "sniper:deploy" | "rhc:kol_trade"
  | "token:surge" | "token:revival"
  /** Realtime developer sells / buys / token transfers (PRO+; identity fields ULTRA+). Dedupe on payload `id`. */
  | "dev:activity"
  /** Robinhood Chain developer buys / sells only (never transfers), PRO+, projected per tier like dev:activity. */
  | "rhc:dev_activity";

export interface WebhookFilters {
  min_sol?: number;
  action?: "buy" | "sell";
  kol_name?: string;
  deployer_tier?: string[];
  min_kols?: number;
  /** token:surge / token:revival only. */
  kinds?: Array<"surge" | "revival">;
  tiers?: Array<"early" | "strong" | "breakout">;
  launchpads?: string[];
  exclude_flags?: string[];
  min_mc_usd?: number;
  max_mc_usd?: number;
  /** dev:activity only. */
  types?: Array<"dev_sell" | "dev_buy" | "dev_token_transfer_out" | "dev_token_transfer_in">;
  token_mints?: string[];
  /** dev:activity (base58) and rhc:dev_activity (0x, case-insensitive): deployer_wallet or actor_wallet. */
  deployers?: string[];
  /** rhc:dev_activity only: 0x token addresses. */
  addresses?: string[];
  /** ULTRA/BUSINESS custom conditions (max 10). */
  conditions?: WebhookCondition[];
}

export interface WebhookCondition {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: string | number | boolean | Array<string | number>;
}

/** `GET /webhooks` rows also carry the last-24 h delivery summary. */
export interface WebhookDeliverySummary {
  total_24h: number;
  success_24h: number;
  failed_24h: number;
  /** Percent, 100 when nothing was delivered. */
  success_rate: number;
}

/** `PATCH /webhooks/{id}` returns the updated row (no created_at / delivery counters). */
export interface UpdatedWebhook {
  id: number;
  url: string;
  events: WebhookEvent[];
  filters: WebhookFilters;
  is_active: boolean;
  updated_at: string;
}

export interface Webhook {
  id: number;
  url: string;
  events: WebhookEvent[];
  filters: WebhookFilters;
  is_active: boolean;
  created_at: string;
  last_delivered_at: string | null;
  consecutive_failures: number;
}

export interface WebhookWithSecret extends Webhook {
  secret: string;
}

export interface CreateWebhookParams {
  url: string;
  events: WebhookEvent[];
  filters?: WebhookFilters;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: WebhookEvent[];
  filters?: WebhookFilters;
  is_active?: boolean;
}

export interface WebhookDelivery {
  event_type: string;
  status_code: number | null;
  response_time_ms: number;
  delivered_at: string;
  error: string | null;
}

export interface WebhookTestResult {
  success: boolean;
  status_code?: number;
  response_time_ms: number;
  error?: string;
  /** Which event type the sample delivery used. Returned by servers from 2026-09-25 on. */
  event?: string;
}

/** Options for `testWebhook`. */
export interface WebhookTestOptions {
  /**
   * Which of the webhook's subscribed events to sample (sent as `event`).
   * Omit it to sample the first subscribed event. An event the webhook is not
   * subscribed to is answered with 400.
   */
  event?: WebhookEvent | (string & {});
}

export interface StreamToken {
  token: string;
  /** Always `null` since 2026-08-27 — stream tokens never expire. Kept for wire compatibility; do not schedule refreshes on it. */
  expires_at: string | null;
  /** Always `null` since 2026-08-27 — the server never rotates a token on its own. Kept for wire compatibility. */
  next_refresh_at?: string | null;
  /** `true` when this call replaced your previous token (`rotate: true`); the old value keeps working for 60 s. */
  rotated?: boolean;
  /** Human-readable lifetime statement ("This token does not expire. …"). */
  lifetime?: string;
  ws_url: string;
  /** Present only for activated ShredPrism and ULTRA/BUSINESS/ENTERPRISE. */
  early_ws_url?: string;
  early_stream?: {
    channels: ("early:deploys" | "early:locks" | "early:trades" | "early:liquidity" | "early:migrations" | "early:token_changes")[];
    subscribe_example: { type: "subscribe"; channels: ("early:deploys" | "early:locks" | "early:trades" | "early:liquidity" | "early:migrations" | "early:token_changes")[] };
    execution_status: "unknown";
    coverage: string;
    note: string;
  };
  /** DEX trade stream URL — only present for Ultra tier subscribers */
  dex_ws_url?: string;
  /** Human-readable connect instructions. */
  usage?: string;
  subscribe_example?: { type: "subscribe"; channels: string[] };
  /** The full registry of subscribable channel names. */
  channels?: string[];
  /** token:prices requires filters.mints (1..mint_cap). */
  token_prices?: { subscribe_example: Record<string, unknown>; mint_cap: number | null; note: string };
  /** rhc:token_prices requires filters.addresses (1..address_cap, per connection across named subscriptions). */
  rhc_token_prices?: { subscribe_example: Record<string, unknown>; address_cap: number | null; coalesce_ms: number; note: string };
  /** Named subscriptions: several channel + filter sets on one socket. */
  named_subscriptions?: { subscribe_example: Record<string, unknown>; max_per_connection: number | null; note: string };
}

/* ── Live stream sessions (v1.18) ── */

/** One live WebSocket session holding a connection slot. Returned by
 *  GET /stream/sessions; its `id` can be passed to DELETE /stream/sessions/{id}
 *  to force-release the slot. */
export interface StreamSession {
  id:            string;
  service:       "ws-streaming" | "dex-stream";
  tier:          string;
  channels:      string[];
  connected_at:  string;
  remote_ip:     string | null;
  messages_sent: number;
}

/** Response of GET /stream/sessions — the caller's live WebSocket sessions. */
export interface StreamSessionsResponse {
  sessions: StreamSession[];
  count:    number;
}

/** Response of DELETE /stream/sessions/{id} — a session slot was released. */
export interface StreamSessionEvictResponse {
  evicted: true;
  id:      string;
}

/* ── KOL Pairs ── */

export interface KolPair {
  kol_a: { name: string; wallet?: string };
  kol_b: { name: string; wallet?: string };
  shared_token_count: number;
  agreement_rate?: number;
  shared_tokens?: string[];
}

export interface KolPairsResponse {
  pairs: KolPair[];
  period: string;
  min_shared: number;
  /** REST route only. */
  pagination?: OffsetPagination;
}

export interface KolPairsParams {
  period?: "7d" | "30d";
  min_shared?: number;
  limit?: number;
  /** REST only (0-10000). The x402 route rejects it before payment (400 param_not_supported_on_x402). */
  offset?: number;
}

/* ── KOL Timing ── */

export interface KolTimingData {
  tokens_traded: number;
  positions_closed: number;
  avg_hold_minutes: number | null;
  median_hold_minutes?: number | null;
  pct_closed_1h?: number | null;
  pct_closed_6h?: number | null;
  pct_closed_24h?: number | null;
  avg_buy_size_sol?: number | null;
  avg_sell_size_sol?: number | null;
  most_active_hours?: number[] | null;
  hour_distribution?: Record<string, number> | null;
}

export interface KolTimingResponse {
  kol: { name: string; wallet?: string };
  timing: KolTimingData;
  period: string;
}

export interface KolTimingParams {
  period?: "7d" | "30d";
}

/* ── KOL Hot Tokens ── */

export interface HotToken {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  token_image_url?: string | null;
  kols_total: number;
  kols_recent: number;
  acceleration: number;
  total_buy_sol: number;
  total_sell_sol: number;
  net_flow: number;
  first_kol_buy_at?: string | null;
  first_kol_buy_age_minutes: number | null;
  /** Last KOL buy in the period (REST). */
  last_kol_buy_at?: string | null;
  /** Seconds between first and last KOL buy (REST). */
  time_to_consensus_sec?: number | null;
  /** Mean 7d winrate of the buying KOLs (REST). */
  avg_winrate_7d?: number | null;
  /** Avg early-entry percentile of the buying KOLs (REST). */
  entry_rank_avg?: number | null;
  /** Count of distinct strategy tags among the buyers (REST). */
  unique_strategies?: number;
  strategies?: string[];
  kols?: { name: string; wallet?: string }[];
}

/** Offset page descriptor used by the ranked KOL / token lists. */
export interface OffsetPagination {
  limit:    number;
  offset:   number;
  returned: number;
  has_more: boolean;
}

export interface KolHotTokensResponse {
  hot_tokens: HotToken[];
  period: string;
  min_kols: number;
  /** REST only. */
  pagination?: OffsetPagination;
  /** Echo of min_avg_winrate, present only when it was set. */
  min_avg_winrate?: number;
  /** Echo (always true) of unique_strategies, present only when it was set. Distinct from the per-row integer. */
  unique_strategies?: boolean;
}

export interface KolHotTokensParams {
  period?: "1h" | "6h";
  min_kols?: number;
  limit?: number;
  /** REST only (0-10000): skip this many ranked tokens. The x402 route rejects it before payment (400 param_not_supported_on_x402). */
  offset?: number;
  /** PRO+: require average winrate_7d of buying KOLs >= N (0-100) */
  min_avg_winrate?: number;
  /** PRO+: require the buyers to span distinct strategies. The route accepts true|false (a number is a 400). */
  unique_strategies?: boolean;
}

/* ── Deployer Trajectory ── */

export interface TrajectoryData {
  current_streak: { type: "bond" | "fail" | "none"; count: number };
  longest_bond_streak: number;
  longest_fail_streak: number;
  rolling_bond_rates: { window_end: number; bond_rate: number }[];
  trend: "improving" | "declining" | "stable";
  avg_days_between_deploys: number | null;
  avg_recovery_tokens: number | null;
  best_stretch: { start_index: number; end_index: number; bond_rate: number } | null;
  worst_stretch: { start_index: number; end_index: number; bond_rate: number } | null;
  total_tokens_analyzed: number;
}

export interface DeployerTrajectoryResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  /** Present (false) only when the wallet is not a tracked deployer; `deployer` and `trajectory` are then null. */
  is_deployer?: false;
  /** Echo of the requested wallet — only on the is_deployer:false body. */
  wallet?: string;
  /** (The route never sent runner_rate / labeled_tokens / avg_time_to_bond_minutes here; use the deployer profile.) */
  deployer: {
    wallet_address: string;
    total_tokens_deployed: number;
    total_bonded: number;
    bonding_rate: number;
    recent_bond_rate: number;
    tier: string;
  } | null;
  trajectory: TrajectoryData | null;
  /** Only with include=daily_snapshots: up to 90 daily rows, newest first. */
  daily_snapshots?: DeployerTrajectorySnapshot[];
}

export interface DeployerTrajectorySnapshot {
  snapshot_date:         string;
  tier:                  string | null;
  total_tokens_deployed: number | null;
  total_bonded:          number | null;
  bonding_rate:          number | null;
  recent_bond_rate:      number | null;
  avg_peak_mc:           number | null;
  best_token_peak_mc:    number | null;
}

/* ── Discovery ── */

export interface DiscoveryEndpoint {
  path: string;
  method: string;
  price: string;
  description: string;
  params: Record<string, string>;
}

export interface DiscoveryResponse {
  name: string;
  description: string;
  website: string;
  x402Version: number;
  payTo: string;
  network: string;
  paymentToken: string;
  endpoints: DiscoveryEndpoint[];
  docs: string;
  totalKolsTracked: number;
  totalDeployersTracked: string;
}

/* ── KOL Token Entry Order ── */

export interface KolEntryOrderEntry {
  rank: number;
  /** The KOL wallet address (the route never sent `wallet_address`). */
  wallet: string;
  kol_name: string | null;
  kol_twitter: string | null;
  sol_amount: number | null;
  token_amount: number | null;
  /** This KOL's first buy of the token (the route never sent `traded_at`). */
  first_buy_at: string;
  seconds_after_first: number;
  tx_signature: string;
  strategy_tag?: KolStrategy | null;
  auto_strategy_tag?: string | null;
  winrate_7d?: number | null;
  winrate_30d?: number | null;
  early_entry_pct_30d?: number | null;
  percentile_pnl_7d?: number | null;
  percentile_winrate_7d?: number | null;
}

export interface KolEntryOrderResponse extends FreeTierDelayMeta {
  token_mint: string;
  token_name: string | null;
  token_symbol: string | null;
  /** First KOL buy of the token. */
  first_buy_at: string;
  /** First buy of the LAST KOL to enter, over all KOL buyers (not just this page). */
  last_buy_at: string;
  /** Seconds between first_buy_at and last_buy_at. */
  span_sec: number;
  entries: KolEntryOrderEntry[];
  /** v1.24 — total_kol_buyers counts ALL first buyers (was capped by a 2,000-row read). */
  total_kol_buyers?: number;
  returned?: number;
  has_more?: boolean;
  complete?: boolean;
}

/** v1.24 — HTTP 503 when the entry-order aggregate is unavailable (e.g. during a schema rollout). Retry. */
export interface KolEntryOrderUnavailableResponse {
  error:               string;
  retryable:           true;
  retry_after_seconds: number;
}

export interface KolEntryOrderParams {
  /** Cap number of ranked entries (default 50) */
  limit?: number;
}

/* ── KOL Compare ── */

/** One requested wallet. `found: false` (not an active KOL) carries only `wallet` + `found`. */
export interface KolCompareProfile {
  wallet: string;
  found: boolean;
  name?: string;
  twitter_url?: string | null;
  strategy_tag?: KolStrategy | null;
  auto_strategy_tag?: string | null;
  winrate_7d?: number | null;
  winrate_30d?: number | null;
  avg_roi_7d?: number | null;
  avg_roi_30d?: number | null;
  profit_factor_7d?: number | null;
  profit_factor_30d?: number | null;
  pnl_7d?: number | null;
  pnl_30d?: number | null;
  early_entry_pct_30d?: number | null;
  consistency_7d?: number | null;
  median_hold_minutes_30d?: number | null;
  closed_positions_7d?: number;
  closed_positions_30d?: number;
  is_heating_up?: boolean;
  is_cold?: boolean;
  percentile_pnl_7d?: number | null;
  percentile_winrate_7d?: number | null;
  percentile_pnl_30d?: number | null;
  percentile_winrate_30d?: number | null;
  percentile_early_entry_30d?: number | null;
}

export interface KolCompareOverlapToken {
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  wallets: string[];
  /** Buys by the provided wallets on this token in the 30 d window. */
  buy_count: number;
}

export interface KolCompareResponse {
  profiles: KolCompareProfile[];
  overlap?: KolCompareOverlapToken[];
  /** v1.24 — overlap is the top 25 of `total` qualifying tokens over the full 30 d window; null total = the aggregate failed. */
  overlap_meta?: { window_start: string; min_wallets: number; total: number | null; returned: number; has_more: boolean | null; complete: boolean };
}

export interface KolCompareParams {
  /** 2-5 wallet addresses. BASIC=2, PRO=4, ULTRA=5. */
  wallets: string[];
}

/* ── KOL Alerts Recent ── */

export type KolAlertType = "consensus_cluster" | "fresh_token_kol_buy" | "heating_up";
/** The route accepts 1h | 6h | 24h only (anything else is a 400). */
export type KolAlertWindow = "1h" | "6h" | "24h";
export type KolAlertSeverity = "low" | "medium" | "high";

/** One alert. The field set depends on `type` (each field's comment names the types that carry it). */
export interface KolAlert {
  type: KolAlertType;
  severity: KolAlertSeverity;
  /** null for heating_up. */
  detected_at: string | null;
  /** consensus_cluster, fresh_token_kol_buy only. */
  token_mint?: string;
  token_symbol?: string | null;
  token_name?: string | null;
  /** consensus_cluster only. */
  kol_count?: number;
  net_sol_flow?: number;
  signal?: "accumulating" | "distributing";
  time_to_consensus_sec?: number | null;
  first_buy_at?: string | null;
  market_cap_usd_at_first_buy?: number | null;
  /** consensus_cluster only — current MC. */
  market_cap_usd?: number | null;
  last_price_usd?: number | null;
  kols?: Array<{ name: string; wallet: string }>;
  /** fresh_token_kol_buy only. */
  token_age_minutes?: number;
  /** fresh_token_kol_buy, heating_up. */
  kol_name?: string | null;
  /** fresh_token_kol_buy, heating_up — the KOL wallet address. */
  wallet?: string;
  /** fresh_token_kol_buy only. */
  kol_winrate_7d?: number | null;
  kol_percentile_pnl_7d?: number | null;
  sol_amount?: number;
  market_cap_usd_at_trade?: number | null;
  price_usd_at_trade?: number | null;
  /** heating_up only. */
  kol_twitter?: string | null;
  strategy_tag?: string | null;
  winrate_7d?: number | null;
  pnl_7d?: number | null;
  closed_positions_7d?: number;
  percentile_pnl_7d?: number | null;
}

export interface KolAlertsResponse {
  alerts: KolAlert[];
  count: number;
  window: KolAlertWindow;
  /** The alert types that were evaluated. */
  types?: KolAlertType[];
}

export interface KolAlertsParams {
  /** Lookback window (default "6h") */
  window?: KolAlertWindow;
  /** Filter to specific alert types (default all) */
  types?: KolAlertType[];
  /** Cap number of alerts (1-100, default 30) */
  limit?: number;
}

/* ── Alpha wallet intelligence ── */

export type AlphaPeriod = "7d" | "30d" | "all";
export type AlphaSort   = "win_rate" | "pnl" | "roi";

export interface AlphaLeaderboardParams {
  period?:       AlphaPeriod;
  min_tokens?:   number;
  sort?:         AlphaSort;
  exclude_bots?: "true" | "false";
  /** 1-100, default 100 (the per-tier page cap applies). */
  limit?:        number;
  /** 0-10000. */
  offset?:       number;
}

/** Field shape varies by tier — BASIC is the smallest subset, ULTRA the richest. */
export interface AlphaLeaderboardEntry {
  rank:          number;
  wallet:        string;
  tokens_traded: number;
  wins:          number;
  losses:        number;
  win_rate:      number | null;
  net_pnl_sol:   number;
  // PRO+
  total_sol_bought?: number;
  total_sol_sold?:   number;
  roi?:              number | null;
  avg_rank?:         number | null;
  best_rank?:        number;
  total_buys?:       number;
  total_sells?:      number;
  last_seen?:        string;
  // ULTRA only
  bundle_rate?:     number;
  buy_size_stddev?: number;
  active_hours?:    number;
  bot_confidence?:  "low" | "medium" | "high" | "none";
  /** v1.24 — null (not 0) when the entry-MC aggregate failed. */
  entry_mc_samples?: number | null;
  avg_entry_mc_usd?: number | null;
}

export interface AlphaLeaderboardResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  leaderboard:  AlphaLeaderboardEntry[];
  total:        number;
  entry_mc_window_start?: string | null;
  entry_mc_complete?: boolean;
  period:       AlphaPeriod;
  sort:         AlphaSort;
  min_tokens:   number;
  exclude_bots: boolean;
  /** has_more = the page came back full (returned === limit). */
  pagination?:  OffsetPagination;
}

export interface AlphaWalletSummary {
  wallet:           string;
  tokens_traded:    number;
  wins:             number;
  losses:           number;
  win_rate:         number | null;
  net_pnl_sol:      number;
  total_sol_bought: number;
  total_sol_sold:   number;
  roi:              number | null;
  avg_rank:         number | null;
  best_rank:        number;
  total_buys:       number;
  total_sells:      number;
  bundle_rate:      number;
  active_hours:     number;
  last_seen:        string;
  bot_confidence:   "low" | "medium" | "high" | "none";
  bot_signals:      string[];
}

export interface AlphaWalletToken {
  token_mint:       string;
  rank:             number;
  first_buy_sol:    number;
  first_buy_at:     string;
  total_sol_bought: number;
  total_sol_sold:   number;
  realized_pnl_sol: number;
  buy_count:        number;
  sell_count:       number;
  result:           "win" | "loss" | "open";
}

export interface AlphaWalletResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  summary: AlphaWalletSummary;
  tokens:  AlphaWalletToken[];
}

export interface AlphaLinkedWallet {
  wallet_address:     string;
  shared_tokens:      number;
  avg_time_diff_secs: number;
  avg_sol_diff:       number;
  similarity_score:   number;
}

export interface AlphaLinkedResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  wallet: string;
  linked: AlphaLinkedWallet[];
}

/* ── Token quality ── */

/** v1.24 (audit 2026-09-21) — "insufficient_data" when no buyer's win rate fed the
 *  score (the neutral-50 placeholder or an all-excluded cohort). Treat unknown
 *  future values as low confidence. */
export type BuyerQualityConfidence = "insufficient_data" | "low" | "medium" | "high";
export type BuyerQualitySignal     = "positive" | "neutral" | "negative";

export interface CapTableBuyer {
  rank:                 number;
  wallet:               string;
  first_buy_sol:        number;
  first_buy_at:         string;
  /** Realized PnL on this token from confirmed swaps; null when unknown. */
  realized_pnl_sol?:    number | null;
  total_sol_bought?:    number | null;
  total_sol_sold?:      number | null;
  /** First confirmed sell; null = no sell seen. */
  first_sell_at?:       string | null;
  /** first_sell_at == null (swap-ledger scoped: a plain transfer out still reads as holding). */
  still_holding?:       boolean;
  is_bundle:            boolean;
  is_kol:               boolean;
  kol_name:             string | null;
  bot_confidence:       "low" | "medium" | "high" | "none" | null;
  historical_win_rate:  number | null;
  historical_pnl_sol:   number | null;
  historical_tokens:    number | null;
}

export interface CapTableSummary {
  known_alpha_wallets:  number;
  known_kols:           number;
  bundle_buyers:        number;
  buyer_quality_score:  number;
  confidence:           BuyerQualityConfidence;
  signal:               BuyerQualitySignal;
  /** REST route — confirmed-swap exit status of the full early-buyer cohort. */
  cohort_size?:         number;
  still_holding?:       number;
  sold?:                number;
  /** 0-100, one decimal. */
  still_holding_pct?:   number;
}

/** Trade-coverage honesty block (v1.23.4). The trade tape starts 2026-04-12
 *  (`history_start`, unix sec) and is launchpad-pipeline scoped (`scope`).
 *  `in_scope`: `true` = persisted trades exist for the mint/wallet · `false` =
 *  outside the write-gate (read zeros as "not covered", NOT "no activity") ·
 *  `null` = probe unavailable. `note` explains the gap when `in_scope` is
 *  `false`/`null`. Returned on keyed (v1) token/wallet intel endpoints and on
 *  the x402 buyer-quality / top-traders mirrors; absent on other x402 mirrors
 *  and on older cached responses. */
export interface TradeCoverage {
  history_start: number;
  scope:         string;
  in_scope?:     boolean | null;
  note?:         string;
  /** v1.24 — same value as in_scope: persisted rows exist (presence, not completeness). */
  data_observed?:     boolean | null;
  /** v1.24 — does the CURRENT capture gate admit this mint? */
  eligibility?:       TradeEligibility | null;
  eligibility_basis?: string | null;
  /** v1.24 — always "not_verified": rows existing never proves a complete interval. */
  completeness?:      "not_verified";
  /** v2.10 — persistence size floor of the trade tape (server 2026-09-30). */
  size_floor?:        TradeSizeFloor;
}

/**
 * v2.10 — the stored trade tape drops buys under `min_sol` SOL (under
 * `min_stable_usd` when paid in USDC/USDT); sells that RECEIVE SOL are kept at
 * any size. Live streams, prices, market caps and candles are not subject to it.
 */
export interface TradeSizeFloor {
  min_sol:        number;
  min_stable_usd: number;
  applies_to:     string;
}

/** v1.24 — treat unknown future values as "unknown". */
export type TradeEligibility = "eligible" | "lapsed" | "excluded" | "unknown" | "admitted_previously" | "not_applicable";

export interface TokenCapTableResponse {
  mint:    string;
  buyers:  CapTableBuyer[];
  summary: CapTableSummary;
  /** v1.23.4 — trade-coverage disclosure (keyed route; absent on the x402 mirror and older cached responses). */
  coverage?: TradeCoverage;
  /** 2026-10 — whether early-buyer ranks 1..20 can be trusted (a recorded ingest gap overlapping launch→last ranked buy means a true early buyer may be missing). Absent on older responses. */
  ranks_completeness?: {
    ranks_complete: "observed_from_launch" | "gap_overlap" | "not_verified" | "no_ranks";
    rank_basis: "first_persisted_buys_at_or_above_floor";
    window: { from: string; to: string } | null;
    gaps_overlapping: number;
    open_slots: number;
    gaps_in_open_slots: number;
  };
}

export interface TokenBuyerQualityResponse {
  mint:        string;
  score:       number;
  confidence:  BuyerQualityConfidence;
  signal:      BuyerQualitySignal;
  cached_at:   string;
  /** Present only when breakdown.dump_cluster_count ≥ 1 and the daily signal-performance snapshot has a bucket for it (REST route). */
  signal_stats?: {
    dump_cluster_count: {
      value:       number;
      /** "k>=1" | "k>=3" | "k>=5" */
      bucket:      string;
      /** "dump" | "runner" */
      outcome:     string;
      hit_rate:    number;
      base_rate:   number;
      lift:        number;
      sample_n:    number;
      window_days: number;
      as_of:       string;
      summary:     string;
    };
  };
  /** Returned on all tiers. */
  breakdown?: {
    alpha_wallet_count:      number;
    kol_count:               number;
    bundle_buyer_count:      number;
    avg_historical_win_rate: number | null;
    bot_dominated:           boolean;
    /**
     * First-20 buyers on the rolling dump-cluster list (wallets whose 5+
     * recent first-20 appearances are exclusively on tokens that peaked
     * <15 min after deploy; trailing 42d, refreshed daily). Out-of-sample:
     * 3+ such wallets predicted a sub-15-min peak 94% of the time vs 61%
     * base. Informational — does not move the score.
     */
    dump_cluster_count:        number;
    /**
     * First-20 buyers with 5+ recent first-20 appearances of any kind.
     * Alone it predicts nothing; a heavily recycled cohort with
     * dump_cluster_count 0 historically leans runner.
     */
    recycled_early_buyer_count: number;
    /** v1.24 — buyers with ≥3 tokens of history (cohort identification, not predictive). */
    wallets_with_history?:       number;
    /** v1.24 — buyers whose win rate fed the score; the basis of `confidence`. */
    qualified_win_rate_wallets?: number;
  };
  note?: string;
  /** v1.23.4 — trade-coverage disclosure (absent on older cached responses). */
  coverage?: TradeCoverage;
}

/* ── Token risk score (v1.13) ── */

export type TokenRiskBand   = "safe" | "caution" | "danger";
/** v1.24 (score v2) — unknown = the input should exist but could not be read / is insufficient;
 *  not_assessed = no evidence source applies to this token. Both carry 0 points and are never
 *  positive evidence. Treat any future value as not-ok. */
export type TokenRiskStatus = "ok" | "warn" | "danger" | "unknown" | "not_assessed";

export interface TokenRiskFactor {
  key:    string;
  label:  string;
  status: TokenRiskStatus;
  points: number;
  detail: string;
}

/** Slot-window snipe rollup (v1.21) — buys landed in slots [-1..+3] around a
 *  token's deploy. `null` on the parent means the rollup hasn't been computed
 *  yet (deploys younger than the ~10-min settle window) or the mint is outside
 *  the pump.fun-pipeline write-gate — absent, not zero. */
export interface SniperFootprint {
  buys:               number;
  buyers:             number;
  sol:                number;
  /** Share of token supply bought inside the window (%, or null when supply unknown). */
  supply_pct:         number | null;
  /** Buys from wallets on the known-sniper list. */
  sniper_wallet_buys: number;
  /** False when the window fell outside capture coverage — counts are unknown, not 0. */
  data_available:     boolean;
  as_of:              string;
}

export interface TokenRiskInputs {
  mint_authority_revoked:   boolean | null;
  freeze_authority_revoked: boolean | null;
  liquidity_usd:            number | null;
  liquidity_to_mc_ratio:    number | null;
  transfer_fee_bps:         number | null;
  is_token_2022:            boolean | null;
  /** DEPRECATED alias of token_supply_burn_detected — a token-SUPPLY burn, never an LP burn (score v2). */
  burn_detected:            boolean | null;
  /** v1.24 — the mint's on-chain supply decreased. Not LP evidence. */
  token_supply_burn_detected?: boolean | null;
  /** v1.24 — verified LP custody; "unknown" for every Solana pool today. */
  lp_burn_status?:          LpBurnStatus;
  /** v1.24 — creator history label; only "established" moves the score. */
  deployer_history_status?: DeployerHistoryStatus | null;
  deployer_reputation_scored?: boolean;
  supply_inflation_pct?:    number | null;
  /** v1.24 — when the liquidity figure was last observed; a not-assessed creator needs it < 6 h for "safe" (a policy threshold, not proof of safety). */
  liquidity_observed_at?:   string | null;
  launch_cohort_sol:        number | null;
  launch_cohort_size:       number | null;
  deployer_bonding_rate:    number | null;
  deployer_total_deployed:  number | null;
  kol_signal:               string | null;
  is_blacklisted:           boolean | null;
  /** v1.21 — slot-window snipe rollup. Informational (does not move the score); null when not yet computed. */
  sniper_footprint?:        SniperFootprint | null;
  [key: string]: unknown;
}

/** v1.22 — Deployer self-activity block on GET /tokens/{mint}/risk (migration 225).
 *  Create-tx self-buy snapshot + dev-sell rollup + a LIVE on-chain holdings check
 *  answering "is the dev wallet empty NOW". `null` on the parent means the mint
 *  has no pending_deploys row (outside deployer-pipeline coverage) — absent, not
 *  clean. Rollup fields (`bought_tokens_after`/`sold_*`) come from a ~2-min-lag
 *  cron; `holdings_tokens` is a cached live RPC read (null = RPC unavailable). */
export interface TokenRiskDev {
  /** Deployer wallet (base58), or null when unresolvable. */
  wallet:               string | null;
  launchpad:            string | null;
  deployed_at:          string | null;
  /** Create-tx self-buy snapshot — null on rows pre-dating migration 225 or launchlab. */
  buy_sol:              number | null;
  buy_tokens:           number | null;
  buy_supply_pct:       number | null;
  /** Post-create buys on the dev's own mint — catches the same-second-separate-tx dev buy the create-tx snapshot misses. */
  bought_tokens_after:  number | null;
  sold_tokens:          number | null;
  sold_sol:             number | null;
  first_sell_at:        string | null;
  last_sell_at:         string | null;
  /** Live on-chain holdings (cached RPC read). null = RPC unavailable right now. */
  holdings_tokens:      number | null;
  /** holdings as % of supply — pump.fun's fixed 1B denominator; null for other launchpads. */
  holdings_supply_pct:  number | null;
  /** Is the dev wallet empty NOW (holdings < 1 token)? null when holdings unknown. */
  wallet_empty:         boolean | null;
  /** DEPRECATED boolean view of transfer_status: true = "suspected" (never a verified transfer), false = "none_detected", null = "unknown". */
  transferred_out:      boolean | null;
  /** v1.24 — suspected | none_detected | unknown (batch: always unknown). */
  transfer_status?:     "suspected" | "none_detected" | "unknown";
  transfer_reason?:     string;
  expected_tokens_from_trades?: number | null;
  /** v1.24 — observation times: holdings (RPC) vs the dev-activity rollup. */
  holdings_observed_at?:   string | null;
  activity_rollup_through?: string | null;
  activity_rollup_ran_at?:  string | null;
}

/** v1.24 — LP custody evidence. */
export type LpBurnStatus = "verified" | "not_verified" | "unknown";
/** v1.24 — creator history label (audit F08). "unranked" tier is NOT "new". */
export type DeployerHistoryStatus = "new_in_our_index" | "limited_history" | "reputation_pending" | "established";

/** v1.24 — what the score could not observe. status "incomplete" ⇒ the score is a lower bound and band is never "safe". */
export interface TokenRiskAssessment {
  status:         "complete" | "incomplete";
  unknown_inputs: string[];
  not_assessed:   string[];
  /** Reason per listed input, keyed by input name, plus `band_cap` when the band was capped at caution. */
  explanations?:  Record<string, string> & { band_cap?: string };
}

/** Transparent 0–100 token risk score (higher = riskier): risk evidence for your own policy, not a verdict. PRO/ULTRA only. */
export interface TokenRiskResponse {
  mint:          string;
  risk_score:    number;
  band:          TokenRiskBand;
  factors:       TokenRiskFactor[];
  inputs:        TokenRiskInputs;
  score_version: string;
  /** v1.22 — deployer self-activity block. Present on single-mint GET /tokens/{mint}/risk (null = no pending_deploys row); absent on batch-risk entries. */
  dev?:          TokenRiskDev | null;
  /** v1.23.4 — trade-coverage disclosure (keyed single-mint route only). Its `note` names the split: trade-derived sub-fields are launchpad-pipeline scoped, on-chain sub-fields are unaffected. */
  coverage?:     TradeCoverage;
  /** v1.24 (score_version "v2") — unknown vs not-assessed inputs. */
  assessment?:   TokenRiskAssessment;
  /** v1.24 — ok | not_found (no pending_deploys row) | unavailable (lookup failed). */
  dev_status?:   "ok" | "not_found" | "unavailable";
  as_of:         string;
}

/** v1.24 — HTTP 503 body when a score-critical input could not be read (retry; never a partial score).
 *  A 503 can also carry the generic statement-timeout body { error, error_kind: "statement_timeout", retry_after_seconds }. */
export interface TokenRiskUnavailableResponse {
  error:               string;
  code:                "risk_inputs_unavailable";
  unavailable_inputs:  string[];
  retryable:           true;
  retry_after_seconds: number;
}

/* ── Batch token risk (v1.18) ── */

/** Per-mint error object for untracked / failed mints in a batch risk response.
 *  Untracked mints come back as `not_tracked` and do NOT fail the batch; a
 *  per-mint compute failure comes back as `error`. */
export interface TokenBatchRiskError {
  mint:  string;
  /** v1.24 — "unavailable" = a score-critical input could not be read (retryable). */
  error: "not_tracked" | "error" | "unavailable";
  code?:               "risk_inputs_unavailable";
  unavailable_inputs?: string[];
  retryable?:          boolean;
}

/** One entry in the `tokens` array of POST /tokens/batch/risk — either a full
 *  risk result (same shape as GET /tokens/{mint}/risk) or a per-mint error. */
export type TokenBatchRiskResult = TokenRiskResponse | TokenBatchRiskError;

/** GET /tokens/{mint}/risk (single mint). `resolved_from` is present when the caller passed a POOL address and the answer is for its token mint; batch entries never carry it. */
export interface TokenRiskSingleResponse extends TokenRiskResponse {
  resolved_from?: { address: string; kind: "pool"; dex: string; source: string };
}

/** Response of POST /tokens/batch/risk — bulk risk scoring for 1–50 mints.
 *  `tokens` preserves de-duplicated input order; `count` = number of unique
 *  mints. Counts as 1 request against quota. */
export interface TokenBatchRiskResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  tokens: TokenBatchRiskResult[];
  count:  number;
}

/* ── Token OHLC candles (v1.14) ── */

export type CandleTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface CandlesParams {
  /** Candle timeframe. Default "1h". */
  tf?:    CandleTimeframe;
  /** Number of candles to return (1–1000). Default 200. */
  limit?: number;
  /** ISO 8601 start of range (inclusive). */
  from?:  string;
  /** ISO 8601 end of range (inclusive). */
  to?:    string;
}

/**
 * One OHLC bucket. The `t`…`market_cap_usd` fields are present on all tiers
 * (PRO = OHLCV, last 30 days). The remaining fields are ULTRA-only and present
 * when the response's `net_flow_included` is true (buy/sell volume + net flow,
 * trade counts, MEV volume, liquidity delta, MC band).
 */
export interface Candle {
  /** ISO 8601 bucket start. */
  t:                  string;
  open:               number;
  high:               number;
  low:                number;
  close:              number;
  volume_usd:         number;
  trades:             number;
  market_cap_usd:     number | null;
  /* ── ULTRA-only (present when net_flow_included) ── */
  buy_volume_usd?:    number | null;
  sell_volume_usd?:   number | null;
  net_volume_usd?:    number | null;
  buy_count?:         number | null;
  sell_count?:        number | null;
  volume_mev_usd?:    number | null;
  open_liquidity_usd?: number | null;
  close_liquidity_usd?: number | null;
  high_mc_usd?:       number | null;
  low_mc_usd?:        number | null;
}

/** 1-minute-derived OHLC candles for a token. PRO/ULTRA only. */
export interface CandlesResponse {
  mint:              string;
  timeframe:         string;
  from:              string;
  to:                string;
  count:             number;
  /** True when ULTRA net-flow/liquidity fields are populated on each candle. */
  net_flow_included: boolean;
  candles:           Candle[];
  /** true = the page budget ran out before `limit` candles or `from` was reached; covered_from is then the oldest instant actually searched. */
  truncated?:            boolean;
  covered_from?:         string;
  /** Oldest instant the caller's plan may read (PRO: 30 days); null = no plan floor. */
  history_floor?:        string | null;
  /** true = `from` was moved forward to history_floor. */
  history_clamped?:      boolean;
  /** true = the whole requested window is older than the plan floor (200 with no candles). */
  history_outside_plan?: boolean;
}

/* ── Token trade flow (v1.16) ── */

export type TokenFlowWindow = "1h" | "24h";

export interface TokenFlowParams {
  /** Lookback window. Default "1h". */
  window?: TokenFlowWindow;
}

/**
 * Trade-flow aggregate for a token over the lookback window — organic-vs-fake
 * volume read. `trades_per_wallet` is a wash-trading proxy (high = a small set of
 * wallets churning volume). `net_sol` = sell_sol − buy_sol (positive = net SOL
 * leaving the pool). PRO/ULTRA only. KEYED (v1) — no x402 route.
 */
export interface TokenFlowResponse {
  /** Trade-data coverage disclosure. */
  coverage?: TradeCoverage;
  mint:              string;
  window:            TokenFlowWindow;
  /** ISO 8601 lower bound of the window. */
  from:              string;
  unique_wallets:    number;
  unique_buyers:     number;
  unique_sellers:    number;
  buy_count:         number;
  sell_count:        number;
  total_trades:      number;
  buy_sol:           number;
  sell_sol:          number;
  /** sell_sol − buy_sol; positive = net SOL leaving the pool (net selling). */
  net_sol:           number;
  /** total_trades / unique_wallets — wash-trading proxy. */
  trades_per_wallet: number;
}

/* ── Token bundle cohort (v1.19) ── */

/** How the bundle cohort was grouped — `atomic_tx` (same transaction),
 *  `same_slot` (same block slot), or `none` (no bundle detected). */
export type BundleKind = "atomic_tx" | "same_slot" | "none";

/** Aggregate bundle-cohort holdings for a token. Returned on all tiers. */
export interface BundleSummary {
  /** Number of wallets in the bundle cohort. */
  wallet_count:        number;
  bundle_kind:         BundleKind;
  /** Net held / buy volume (0–1). Churn-sensitive secondary read; null when unknown. */
  held_ratio:          number | null;
  /** Net held / circulating supply (0–1) — the HEADLINE signal. Null when supply is unknown. */
  held_pct_of_supply:  number | null;
  fully_exited:        boolean;
  /** Cumulative buy volume — NOT distinct tokens; can exceed supply. */
  buy_volume:          number;
  /** Swap-derived net position (proxy for on-chain balance). */
  tokens_held:         number;
  /** 2026-10 (COV-23) — `swap_only` = token transfers are not applied: a member that transferred tokens out and sold elsewhere still reads as holding. Absent on older responses. */
  holdings_basis?:     "swap_only" | "swap_and_transfers";
  /** 2026-10 (COV-23) — how cohort membership is decided today: ≥3 wallets buying in one ingest batch with the same block_time second (not the same slot). Absent on older responses. */
  bundle_detection?:   "same_batch_block_time_second";
}

/**
 * One wallet in the bundle cohort. `rank`…`is_kol` are returned on PRO (top-10)
 * and ULTRA (full cohort). The identity fields (`kol_name`, `win_rate`,
 * `bot_confidence`, `tokens_held`) are ULTRA-only.
 */
export interface BundleWallet {
  rank:            number;
  wallet:          string;
  held_ratio:      number | null;
  has_sold:        boolean;
  atomic:          boolean;
  is_kol:          boolean;
  /* ── ULTRA-only ── */
  kol_name?:       string | null;
  win_rate?:       number | null;
  bot_confidence?: string | null;
  tokens_held?:    number;
}

/**
 * Bundle-cohort holdings for a token. `held_pct_of_supply` (net held / circulating
 * supply) is the headline signal. Field-gated by tier: BASIC get the
 * `bundle` block only (`wallets: []`); PRO adds the top-10 wallets with flags;
 * ULTRA returns the full cohort plus per-wallet identity fields.
 */
export interface TokenBundleResponse {
  mint:    string;
  bundle:  BundleSummary;
  wallets: BundleWallet[];
  /** v1.23.4 — trade-coverage disclosure (keyed route; absent on older cached responses). */
  coverage?: TradeCoverage;
}

/* ── Graduation events (token:graduations WS channel) ── */

/** Payload of a `token:graduation` event — every pump.fun graduation
 * (bonding curve complete → PumpSwap migration), tracked deployer or not. */
export interface GraduationEvent {
  token_mint:           string;
  token_name:           string | null;
  token_symbol:         string | null;
  time_to_bond_minutes: number | null;
  deployer_wallet:      string | null;
  /** 'unranked' when the deployer is unknown to deployer-hunter. */
  deployer_tier:        string;
  market_cap_usd:       number | null;
  bonded_at:            string;
}

/* ── Copy-trade ── */

export type CopyTradeAction       = "buy" | "sell" | "both";
export type CopyTradeSizingMode   = "fixed" | "proportional" | "percent_source";
export type CopyTradeDeliveryMode = "webhook" | "websocket" | "both";

export interface CopyTradeSubscription {
  id:             number;
  name:           string | null;
  source_wallets: string[];
  min_trade_sol:  number;
  only_action:    CopyTradeAction;
  sizing_mode:    CopyTradeSizingMode;
  sizing_amount:  number;
  delivery_mode:  CopyTradeDeliveryMode;
  webhook_url:    string | null;
  /** Market-cap band (USD) on the source trade; `null` = no bound. */
  min_mc_usd:     number | null;
  max_mc_usd:     number | null;
  is_active:      boolean;
  created_at:     string;
  updated_at?:    string;
  /**
   * Source wallets that are tracked KOL wallets, read at response time. Under
   * `source_admission: "any_wallet"` (production since 2026-10-04) this is KOL
   * enrichment only; under the legacy `"kol_only"` engine only these produce signals.
   * @deprecated 2026-10-04, kept and still filled. `null` when the tracking lookup failed (see `warnings`).
   * Returned by servers from 2026-09-25 on; absent on older ones.
   */
  source_wallets_tracked?:   string[] | null;
  /**
   * Source wallets that are NOT tracked KOL wallets. Under
   * `source_admission: "any_wallet"` they fire like any other wallet (no
   * Wallet Tracker entry or quota needed); under the legacy `"kol_only"` engine
   * they never produce a signal.
   * @deprecated 2026-10-04 — KOL membership is enrichment only; kept and still filled.
   */
  source_wallets_untracked?: string[] | null;
  /** Present when at least one wallet is untracked (legacy kol_only only), or tracking could not be determined. */
  warnings?:                 CopyTradeRuleWarning[];
  /**
   * Whether the rule can fire right now, separate from `is_active`. Legacy
   * `kol_only`: `eligible` | `no_tracked_sources` | `unknown`. Server
   * 2026-10-04 `any_wallet`: `eligible`, or an infrastructure state —
   * `monitoring_pending` (rule changed after the engine's last load, live
   * within seconds), `monitoring_unavailable` (engine / trade stream not
   * reporting; it fires nothing then, see `monitoring_reasons`),
   * `source_capacity_unavailable`.
   */
  operational_state?: "eligible" | "monitoring_pending" | "monitoring_unavailable" | "source_capacity_unavailable" | "no_tracked_sources" | "unknown";
  /** Server 2026-10-04 — which trades the RUNNING engine admits. Absent = unknown (legacy kol_only semantics). */
  source_admission?: "kol_only" | "any_wallet";
  /** Server 2026-10-04 — present only with `monitoring_unavailable`: e.g. `trade_stream_stale`, `source_producer_stale`, `map_stale`, `engine_state_stale`. */
  monitoring_reasons?: string[];
}

/** A non-fatal note on a copy-trade rule. The rule is saved unchanged. */
export interface CopyTradeRuleWarning {
  code:    "untracked_source_wallets" | "source_wallet_tracking_unavailable" | (string & {});
  message: string;
}

/**
 * Create body for POST /copytrade/subscriptions.
 *
 * `source_wallets`: the per-rule limit is set by your tier and enforced by the
 * server (Pro 5, Ultra 50, Business and Enterprise 250; `GET /me` reports
 * yours as `copytrade_wallets_per_rule`). Any valid Solana wallet can be a
 * source, KOL or not (`source_admission: "any_wallet"`, production since
 * 2026-10-04; no Wallet Tracker quota used). On a server still running the
 * legacy `"kol_only"` engine only tracked KOL wallets (`GET /kol/wallets`) fire.
 */
export interface CopyTradeCreateParams {
  name?:          string;
  source_wallets: string[];
  min_trade_sol?: number;
  /** Default `"buy"` (server side) when omitted. */
  only_action?:   CopyTradeAction;
  /** `proportional` and `percent_source` are the same maths: source size × `sizing_amount`. */
  sizing_mode?:   CopyTradeSizingMode;
  /** SOL when `fixed`; otherwise a multiplier / fraction (0.25 = a quarter of the source size), never a percent. */
  sizing_amount:  number;
  delivery_mode?: CopyTradeDeliveryMode;
  webhook_url?:   string;
  /**
   * Market-cap band (USD, 0 to 1e12, min ≤ max) on the source trade's market
   * cap at trade time. When either bound is set, trades with an unknown market
   * cap are dropped.
   */
  min_mc_usd?:    number | null;
  max_mc_usd?:    number | null;
}

/** PATCH body. Omit a field to leave it unchanged; pass `null` to clear an MC bound. */
export interface CopyTradeUpdateParams {
  name?:          string | null;
  source_wallets?: string[];
  min_trade_sol?: number;
  only_action?:   CopyTradeAction;
  sizing_mode?:   CopyTradeSizingMode;
  sizing_amount?: number;
  delivery_mode?: CopyTradeDeliveryMode;
  webhook_url?:   string | null;
  is_active?:     boolean;
  min_mc_usd?:    number | null;
  max_mc_usd?:    number | null;
}

export interface CopyTradeCreateResponse {
  subscription:    CopyTradeSubscription;
  /** Returned ONCE on creation when `webhook_url` is set — store it to verify HMAC signatures. */
  webhook_secret:  string | null;
  note?:           string;
  /** Same as `subscription.warnings`, repeated at top level when present. */
  warnings?:       CopyTradeRuleWarning[];
}

/** Response of PATCH /copytrade/subscriptions/{id} (and GET of one rule). */
export interface CopyTradeUpdateResponse {
  subscription:    CopyTradeSubscription;
  /** Same as `subscription.warnings`, repeated at top level when present. */
  warnings?:       CopyTradeRuleWarning[];
  /**
   * Returned ONCE, only when this PATCH set a `webhook_url` on a rule that had
   * no signing secret yet (for example a websocket-only rule). Store it. An
   * existing secret is never rotated or re-shown.
   */
  webhook_secret?: string;
  /** Explains the one-time `webhook_secret` when it is present. */
  note?:           string;
}

/** REST rows also carry the McDeltaFields set when mc-tracker has history for the mint (absent otherwise). */
export interface CopyTradeSignal extends McDeltaFields {
  id:                    number;
  subscription_id:       number;
  fired_at:              string;
  source_wallet:         string;
  action:                "buy" | "sell";
  token_mint:            string;
  token_symbol:          string | null;
  token_name:            string | null;
  source_sol_amount:     number;
  suggested_sol_amount:  number;
  tx_signature:          string;
  delivered:             boolean;
  delivered_at:          string | null;
  /** v1.5 (2026-05-06) — market cap (USD) stamped on the source kol_trades row at the moment the rule fired. */
  market_cap_usd_at_trade?: number | null;
  /** v1.5 — token price (USD) at the same moment. */
  price_usd_at_trade?: number | null;
  /** v1.5 — current market cap (USD) from token_prices — useful to compare against at-trade for chase-vs-dip context. */
  market_cap_usd?: number | null;
  /** v1.5 — current last-trade price (USD). */
  last_price_usd?: number | null;
  /** Present once copy-trade identity v2 is active: the independent action this signal copies (null on identity_version 1 rows). Dedupe on id or economic_action_id, never on tx_signature. */
  economic_action_id?: string | null;
  /** Present once copy-trade identity v2 is active: the followed wallet that performed the action. */
  source_actor?: string | null;
  /** Present once copy-trade identity v2 is active: other followed wallets in the same action. */
  co_actors?: string[];
  /** Present once copy-trade identity v2 is active: 1 = per (rule, tx), 2 = per (rule, economic action). */
  identity_version?: 1 | 2;
}

export interface CopyTradeSignalsParams {
  subscription_id?: number;
  /** ISO 8601 timestamp — only signals fired at-or-after this time. */
  since?:           string;
  /** 1–500, default 50. */
  limit?:           number;
  /** Keep signals whose source trade's market cap (USD) was at least this. Drops unknown-MC signals. */
  min_mc_usd?:      number;
  /** Keep signals whose source trade's market cap (USD) was at most this. Drops unknown-MC signals. */
  max_mc_usd?:      number;
  /** `next_cursor` from the previous page — opaque strict (fired_at, id) keyset. The MC band is applied before limit and cursor. */
  cursor?:          string;
}

export interface CopyTradeSignalsResponse {
  signals: CopyTradeSignal[];
  /** Pass as `cursor` for the next (older) page; null at the end. */
  next_cursor?: string | null;
  /** false only when your signals ran out. */
  has_more?: boolean;
  /** Present with min_mc_usd / max_mc_usd; scan_truncated=true means more matches MAY exist past next_cursor. */
  scan?: { post_filtered: boolean; scanned: number; scan_truncated: boolean; scan_budget: number };
}

/* ── Wallet tracker ── */

export interface WalletTrackerEntry {
  wallet_address: string;
  label:          string | null;
  added_at:       string;
}

/**
 * v2.10 FIX: the route returns `wallets` + `count` (earlier type versions said
 * `watchlist`, which was always undefined at runtime).
 */
export interface WalletTrackerListResponse {
  wallets:   WalletTrackerEntry[];
  count:     number;
  remaining: number;
  limit:     number;
}

/** v2.10 FIX: `{ wallet }` (HTTP 201); earlier types said `added` / `watchlist` / `remaining`. */
export interface WalletTrackerAddResponse {
  wallet: WalletTrackerEntry;
}

/** v2.10 FIX: `{ wallet }`; earlier types said `updated` / `watchlist`. */
export interface WalletTrackerUpdateResponse {
  wallet: WalletTrackerEntry;
}

/**
 * The `action` filter and field. Swaps only: a swap is `buy` or `sell`.
 * Transfers carry `action: null` (their direction is not stored), so select
 * them with `event_type: "transfer"`. The API answers any other value with 400.
 * Before 2.6.0 this union also listed `transfer_in` / `transfer_out`, which the
 * API never accepted.
 */
export type WalletTrackerAction    = "buy" | "sell";
export type WalletTrackerEventType = "swap" | "transfer";

export interface WalletTrackerTradesParams {
  wallet?:      string;
  /** Swaps only; see {@link WalletTrackerAction}. */
  action?:      WalletTrackerAction;
  event_type?:  WalletTrackerEventType;
  /** 1–200, default 50. */
  limit?:       number;
  /**
   * Sort column. `slot` = on-chain position (the default on a first page).
   * `block_time` = our INGEST clock (the default when you pass the legacy
   * `before` cursor). An explicit value always wins.
   */
  order?:       "slot" | "block_time";
  /** Cursor for `order: "block_time"`: the previous page's `next_cursor`. */
  before?:      number;
  /** Cursor for `order: "slot"`: the previous page's `next_cursor_slot`. */
  before_slot?: number;
}

/** One event of GET /wallet-tracker/trades. The field set mirrors the route. */
export interface WalletTrackerTrade {
  wallet_address: string;
  label:          string | null;
  event_type:     WalletTrackerEventType;
  /** `buy` / `sell` on swaps, `null` on transfers. */
  action:         WalletTrackerAction | null;
  token_mint:     string | null;
  token_symbol:   string | null;
  token_name:     string | null;
  sol_amount:     number | null;
  token_amount:   number | null;
  /** Present only when a counterparty was matched (the key is absent otherwise). */
  counterparty?:  string;
  tx_signature:   string;
  /** Unix seconds on the tracker's INGEST clock, not chain time. Use `slot` for chain order. */
  block_time:     number;
  /** On-chain slot. `null` on rows written before slot tracking existed. */
  slot:           number | null;
  /** `true` when the row arrived through a replay (reconnect or restart recovery), not live delivery. */
  replayed:       boolean;
  /** ISO 8601 form of `block_time` (ingest time). */
  ingested_at:    string;
  /** Alias of `ingested_at`, kept for older consumers. It never meant chain time. */
  timestamp:      string;
}

/**
 * Response of GET /wallet-tracker/trades. Before 2.6.0 this type declared
 * `trades` / `has_more` / `next`, which the API never returned.
 */
export interface WalletTrackerTradesResponse {
  events:           WalletTrackerTrade[];
  count:            number;
  /** Which column this page was ordered by. */
  ordered_by:       "slot" | "block_time";
  /** `block_time` cursor for the next page (`before`); `null` on the last page. */
  next_cursor:      number | null;
  /** Slot cursor for the next page (`before_slot`); `null` on the last page or on a page of pre-slot rows. */
  next_cursor_slot: number | null;
}

export interface WalletTrackerSummaryParams {
  /** "24h" | "7d" | "30d" — default "7d" */
  period?: "24h" | "7d" | "30d";
  wallet?: string;
}

/** One tracked wallet. (Earlier types declared a flat wallet / buy_count / sell_count / last_activity_at row the route never sent.) */
export interface WalletTrackerSummaryStats {
  wallet_address: string;
  label:          string | null;
  added_at:       string;
  stats: {
    swap_count:     number;
    transfer_count: number;
    buys:           number;
    sells:          number;
    sol_bought:     number;
    sol_sold:       number;
    last_event_at:  string | null;
  };
}

export interface WalletTrackerSummaryResponse {
  period:  "24h" | "7d" | "30d";
  wallets: WalletTrackerSummaryStats[];
  /** Postgres interval for the period (e.g. "7 days"); absent when the tracker is empty. */
  interval?: string;
}


// ─── Wallet derived stats (v1.9) ────────────────────────────────────────────

export interface WalletStandoutTrade {
  token_mint:    string;
  token_symbol:  string | null;
  pnl_sol:       number;
  sol_in:        number;
  sol_out:       number;
  roi_pct:       number;
}

export interface WalletBiggestMiss {
  token_mint:           string;
  token_symbol:         string | null;
  actual_sol_out:       number;
  potential_sol_at_ath:  number;
  missed_sol:           number;
  ath_mc_usd:           number;
  sold_at_mc_usd:       number | null;
}

export type WalletVerdictTone = "green" | "red" | "amber" | "muted";

export interface WalletVerdict {
  label:       string;
  description: string;
  tone:        WalletVerdictTone;
}

export interface WalletDerivedStats {
  win_rate:               number | null;
  roi_pct:                number | null;
  total_realized_pnl_sol: number;
  best_trade:             WalletStandoutTrade | null;
  worst_trade:            WalletStandoutTrade | null;
  biggest_miss:           WalletBiggestMiss | null;
  verdict:                WalletVerdict | null;
}

// ─── Price alerts (v1.9) ────────────────────────────────────────────────────

export type PriceAlertDeliveryMode = "webhook" | "websocket" | "both";
export type PriceAlertStatus = "watching" | "dipped" | "recovered" | "expired";

export interface PriceAlertCreateParams {
  token_mint: string;
  drop_pct: number;
  recovery_pct?: number;
  name?: string;
  delivery_mode?: PriceAlertDeliveryMode;
  webhook_url?: string;
}

export interface PriceAlertUpdateParams {
  name?: string | null;
  delivery_mode?: PriceAlertDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
}

export interface PriceAlert {
  id: number;
  name: string | null;
  token_mint: string;
  token_symbol: string | null;
  baseline_mc_usd: number;
  drop_pct: number;
  recovery_pct: number | null;
  status: PriceAlertStatus;
  dip_low_mc_usd: number | null;
  dip_fired_at: string | null;
  delivery_mode: PriceAlertDeliveryMode;
  webhook_url: string | null;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PriceAlertListResponse {
  alerts: PriceAlert[];
}

export interface PriceAlertCreateResponse {
  alert: PriceAlert;
  webhook_secret: string | null;
  note?: string;
}

export interface PriceAlertGetResponse {
  alert: PriceAlert;
}

export interface PriceAlertUpdateResponse {
  alert: PriceAlert;
}

export interface PriceAlertDeleteResponse {
  deleted: boolean;
}

export interface PriceAlertEvent {
  id: number;
  alert_id: number;
  event_type: "dip" | "recovery";
  fired_at: string;
  token_mint: string;
  baseline_mc_usd: number;
  current_mc_usd: number;
  drop_pct_actual: number | null;
  dip_low_mc_usd: number | null;
  recovery_pct_actual: number | null;
  delivered: boolean;
}

export interface PriceAlertEventsParams {
  alert_id?: number;
  event_type?: "dip" | "recovery";
  since?: string;
  limit?: number;
}

export interface PriceAlertEventsResponse {
  events: PriceAlertEvent[];
}

// ─── Scout leaderboard (v1.9) ──────────────────────────────────────────────

export type ScoutLeaderboardSort = "swarm_3plus_pct" | "n_first_touches_30d" | "swarm_5plus_pct" | "scout_score";

export interface ScoutLeaderboardParams {
  limit?: number;
  scout_tier?: ScoutTier;
  sort?: ScoutLeaderboardSort;
}

// ─── KOL consensus (v1.9) ──────────────────────────────────────────────────

/**
 * GET /tokens/{mint}/kol-consensus. v2.10 FIX: the figures are nested under
 * `consensus` (that is what the route has always returned); earlier type
 * versions declared them at the top level, where they were always undefined.
 * With no KOL trades: `consensus: null`, `total_kol_buyers: 0`,
 * `total_kol_sellers: 0`, `complete: true`.
 */
export interface KolConsensusResponse {
  mint:               string;
  current_mc_usd?:    number | null;
  current_price_usd?: number | null;
  consensus:          KolConsensus | null;
  /** Only on the no-trades answer (then 0). */
  total_kol_buyers?:  number;
  total_kol_sellers?: number;
  complete?:          boolean;
}

export interface KolConsensus {
  total_kol_buyers: number;
  total_kol_sellers: number;
  /** Share of KOL buyers with ≥1 recorded sell (any size) — NOT a full position exit. */
  kol_exit_rate: number | null;
  /** v1.24 — accurately named copy of kol_exit_rate. */
  kol_any_sell_rate?: number | null;
  /** v1.24 — false when the trade read hit its row ceiling (numbers cover the oldest rows_scanned trades). */
  complete?: boolean;
  truncated?: boolean;
  rows_scanned?: number;
  net_flow_sol: number;
  total_buy_sol: number;
  total_sell_sol: number;
  first_kol_buy_at: string | null;
  last_kol_buy_at: string | null;
  first_touch_wallet: string | null;
  first_touch_at: string | null;
  median_entry_mc_usd: number | null;
  /** Definition string for kol_exit_rate. */
  kol_exit_rate_definition?: string;
  total_trades?: number;
  /** ULTRA+ only. */
  buyers?: string[];
  exited?: string[];
}

// ─── Peak history (v1.9) ───────────────────────────────────────────────────

/**
 * GET /tokens/{mint}/peak-history. v2.10 FIX: the figures are nested under
 * `peak_history` (null with `found: false` for an unknown mint); earlier type
 * versions declared them at the top level, where they were always undefined.
 */
export interface PeakHistoryResponse {
  mint:         string;
  found:        boolean;
  token?:       { name: string | null; symbol: string | null; image_url: string | null };
  peak_history: PeakHistory | null;
}

export interface PeakHistory {
  peak_mc_usd: number | null;
  peak_mc_updated_at: string | null;
  current_mc_usd: number | null;
  current_price_usd: number | null;
  decline_from_peak_pct: number | null;
  mc_at_bond: number | null;
  mc_1h_after_bond: number | null;
  mc_6h_after_bond: number | null;
  mc_24h_after_bond: number | null;
  mc_7d_after_bond: number | null;
  still_alive_1h: boolean | null;
  time_to_bond_minutes: number | null;
  deployed_at: string | null;
  bonded_at: string | null;
  mc_tracking_complete?: boolean | null;
}

// ─── Coordination history (v1.9) ───────────────────────────────────────────

export interface CoordinationHistoryParams {
  limit?: number;
  since?: string;
  min_score?: number;
}

// ─── /token/{mint} live snapshot (v1.15) ──────────────────────────────────

/** One of the token's top buyers, as returned in TokenSnapshot.top_buyers. */
export interface TokenSnapshotTopBuyer {
  name:       string;
  sol_amount: number;
}

/** Live token snapshot returned in the `token` field of GET /token/{mint}. */
export interface TokenSnapshot {
  mint?:                  string;
  symbol?:                string | null;
  name?:                  string | null;
  /** Off-chain metadata from the token URI JSON; null until resolved. Deployer-controlled URL, passed through. */
  image_url?:             string | null;
  socials?:               { website: string | null; twitter: string | null; telegram: string | null; discord: string | null };
  /** How many OTHER mints reuse this X handle / exact URL. null = unknown, not zero. */
  twitter_reuse?:         { handle: string | null; mints_same_handle: number; mints_same_url: number } | null;
  description?:           string | null;
  price_usd:              number | null;
  price_sol:              number | null;
  vwap_price_usd?:        number | null;
  vwap_price_sol?:        number | null;
  market_cap:             number | null;
  fdv_usd:                number | null;
  liquidity_usd:          number | null;
  liquidity_to_mc_ratio:  number | null;
  primary_dex:            string | null;
  /** Launchpad of origin; null when unknown. */
  launchpad?:             "pumpfun" | "launchlab" | "bags" | null;
  primary_pool_address:   string | null;
  is_token_2022:          boolean | null;
  transfer_fee_bps:       number | null;
  mint_authority_revoked?:   boolean | null;
  freeze_authority_revoked?: boolean | null;
  volume_24h_usd?:        number | null;
  volume_24h_sol?:        number | null;
  trades_24h?:            number | null;
  first_seen_at?:         string | null;
  age_seconds?:           number | null;
  blacklist_category?:    string | null;
  /** Total SOL the first-20 buyers deployed on their first buy. */
  launch_cohort_sol?:     number | null;
  /** First-20 buyer cohort exit status from confirmed swaps; null when the cohort is unknown. */
  early_buyer_exit?:      { cohort: number; still_holding: number; sold: number; still_holding_pct: number } | null;
  /** Present only when history exists. Keys: 5m, 15m, 1h, 2h, 4h. */
  mc_change_pct?:         Record<string, number | null> | null;
  /** Present only when history exists. Keys: 5m, 15m, 1h, 2h, 4h. */
  volume_usd?:            Record<string, number> | null;
  /** Present only when history exists. Keys: 5m, 15m, 1h, 2h, 4h. */
  mev_volume_pct?:        Record<string, number | null> | null;
  /** Present only when history exists. */
  history_age_seconds?:   number | null;
  /** v1.24 — DEPRECATED meaning: a token-SUPPLY burn (mint supply decreased), never LP evidence. null = unknown (no mc-tracker observation). */
  burn_detected?:         boolean | null;
  /** v1.24 — creator + reputation; resolved for unbonded launches too. null ⇒ read deployer_identity. */
  deployer?:              TokenSnapshotDeployer | null;
  /** v1.24 — complete 7-day aggregate; status "unavailable" ⇒ every figure is null (never 0 / "neutral"). */
  kol_activity?:          TokenSnapshotKolActivity;
  /** null = the cohort read failed; 0 = no cohort rows. */
  launch_cohort_size?:    number | null;
  /** Last trade seen by ANY source — not a price-age anchor (use price_observed_at). */
  last_trade_at?:         string | null;
  /** v1.24 — mc_tracker | dex_stream; null when there is no price. */
  price_source?:          "mc_tracker" | "dex_stream" | null;
  /** v1.24 — observation time of the SELECTED price source (price age anchor). */
  price_observed_at?:     string | null;
  /** null = a price exists but its age is unknown (never a false "fresh"). */
  price_is_stale?:        boolean | null;
  price_age_seconds?:     number | null;
  /** v1.24 — why `deployer` is null: unknown creator vs failed lookup. */
  deployer_identity?:     { identity_status: "resolved" | "unknown" | "lookup_failed"; history_status: DeployerHistoryStatus | null; address: string | null; source: "deployer_tokens" | "pending_deploys" | null };
  /** v1.24 — per-block read status; "unavailable" blocks are null, never defaults. */
  data_status?:           Record<string, "ok" | "unavailable">;
  token_supply_burn_detected?: boolean | null;
  lp_burn_status?:        LpBurnStatus;
  /** null = the blacklist lookup failed (unknown). */
  is_blacklisted?:        boolean | null;
}

/** v1.24 — GET /token/{mint} creator block (audit F08). */
export interface TokenSnapshotDeployer {
  wallet:            string;
  address:           string;
  tier:              string;
  bonding_rate:      number;
  total_deployed:    number;
  total_bonded:      number;
  recent_bond_rate:  number;
  identity_status:   "resolved";
  identity_source:   "deployer_tokens" | "pending_deploys";
  /** Only "established" means bonding_rate is a real track record. */
  history_status:    DeployerHistoryStatus;
  first_seen_at:     string | null;
  observed_launch_count:  number;
  resolved_outcome_count: number;
  stats_computed_at: string | null;
}

/** v1.24 — GET /token/{mint} KOL activity (audit F05): a complete window aggregate, never a newest-N sample. */
export interface TokenSnapshotKolActivity {
  status:        "ok" | "unavailable";
  buying_kols:   number | null;
  selling_kols:  number | null;
  net_flow_sol:  number | null;
  signal:        "accumulating" | "distributing" | "neutral" | null;
  /** Wallet addresses are ULTRA-only. */
  top_buyers:    Array<TokenSnapshotTopBuyer & { wallet?: string }>;
  window_hours:  number;
  window_start:  string | null;
  computed_at:   string | null;
  last_trade_at: string | null;
  unique_kols:   number | null;
  unique_wallets: number | null;
  buys:          number | null;
  sells:         number | null;
  buy_sol:       number | null;
  sell_sol:      number | null;
  counts_basis:  "complete_window" | null;
}

/** Response of GET /token/{mint} — live token snapshot. */
export interface TokenSnapshotResponse {
  token: TokenSnapshot;
  /** v1.24 — response assembly time; NOT the observation time of any field. */
  as_of?: string;
  /** Present when include=buyer_quality — the /tokens/{mint}/buyer-quality body. */
  buyer_quality?: Record<string, unknown>;
  /** Present when include=deployer — the /deployer-hunter/{wallet} body. */
  deployer_profile?: Record<string, unknown>;
  /** Per-key errors for requested includes that failed (never fails the request). */
  include_errors?: Record<string, { status: number; error?: string; [k: string]: unknown }> | null;
  /** Includes that were requested. */
  included?: string[] | null;
}

// ─── Signal Scorecard (v1.15) ─────────────────────────────────────────────

/** Valid signal names accepted by GET /signals/{name}/performance. */
export type SignalName =
  | "dump_cluster_count"
  | "runner_rate"
  | "recycled_early_buyer_count"
  | "coordination_count";

/** One out-of-sample reliability bucket within a Signal Scorecard. */
export interface SignalPerformanceBucket {
  bucket:      string;
  hit_rate:    number | null;
  base_rate:   number | null;
  lift:        number | null;
  sample_n:    number | null;
}

/** One past snapshot, returned in `history` when called with history=true (newest first, ≤ 90). */
export interface SignalPerformanceHistoryPoint {
  /** computed_at of that snapshot. */
  as_of:   string;
  buckets: { bucket: string; hit_rate: number | null; lift: number | null; sample_n: number | null }[];
}

/** Response of GET /signals/{name}/performance — the Signal Scorecard.
 *  Before the first computation the body is only `{ signal, buckets: [], note }`. */
export interface SignalPerformanceResponse {
  signal:       string;
  metric_type?: string;
  outcome?:     string;
  methodology?: string;
  as_of?:       string;
  /** Evaluation window of the latest snapshot (the route never sent these per bucket). */
  window_days?: number | null;
  base_rate?:   number | null;
  test_from?:   string | null;
  test_to?:     string | null;
  buckets:      SignalPerformanceBucket[];
  /** Per-snapshot history — only present when called with `history: true`. (Earlier types called it `series`; the route never sent that.) */
  history?:     SignalPerformanceHistoryPoint[];
  /** Present only when no performance data has been computed yet. */
  note?:        string;
}

// ─── Signals catalog (v1.15, free) ────────────────────────────────────────

/** One entry in the signals catalog returned by GET /signals. */
export interface SignalsCatalogEntry {
  name:                 string;
  methodology:          string;
  performance_endpoint: string;
}

/** Response of GET /signals — the free signals catalog. */
export interface SignalsCatalogResponse {
  name:        string;
  description: string;
  signals:     SignalsCatalogEntry[];
  docs:        string;
}

// ─── /token/{mint} + /token/batch response (v1.12) ────────────────────────

/** Per-mint snapshot returned by GET /token/{mint} and POST /token/batch. */
export interface TokenResponseBody {
  /** v1.12 — ratio of liquidity USD to market cap USD; null when either is unknown. */
  liquidity_to_mc_ratio?: number | null;
  /** v1.12 — SOL raised in the token's launch cohort (first-N buyers). */
  launch_cohort_sol?: number | null;
  /** v1.12 — number of wallets in the launch cohort (0–20); v1.24: null when the cohort read failed. */
  launch_cohort_size?: number | null;
  [key: string]: unknown;
}

// ─── /me — v1.7 ──────────────────────────────────────────────────────────────

export type ApiTier = "BASIC" | "PRO" | "ULTRA" | "BUSINESS" | "ENTERPRISE";

export interface MeQuotaWindow {
  limit:     number;
  used:      number;
  remaining: number;
}

export interface MeResponse {
  subscriber: string;
  tier:       ApiTier;
  tier_label: string;
  subscription: {
    status:             string;
    billing_cycle:      "monthly" | "annual";
    current_period_end: string | null;
    started_at:         string;
  } | null;
  quota: {
    daily: MeQuotaWindow & { resets_at: string };
    burst: MeQuotaWindow & { window_seconds: number };
  };
  features: {
    webhooks:                   { limit: number; used: number };
    ws_connections:             { limit: number };
    dex_connections:            { limit: number };
    copytrade_wallets:          { limit: number; used: number };
    copytrade_rules:            { limit: number; used: number };
    coordination_rules:         { limit: number; used: number };
    first_touch_subscriptions:  { limit: number; used: number };
    /** `limit` = the watchlist cap POST /wallet-tracker/watchlist enforces (servers from 2026-09-25 on). */
    wallet_tracker_watchlist:   { limit?: number; used: number };
  };
}

// ─── /tokens (directory list) — v1.7 ─────────────────────────────────────────

export type TokenListSort =
  | "mc_desc"
  | "mc_asc"
  | "last_trade_desc"
  | "liquidity_desc"
  | "cumulative_volume_desc"
  // v1.17 — momentum / trending sorts (DB-native via token_prices_trending view)
  | "mc_change_5m_desc"
  | "mc_change_1h_desc"
  | "volume_1h_desc"
  | "trending";

export type TokenPrimaryDex =
  | "pumpfun"
  | "pumpswap"
  | "raydium"
  | "meteora"
  | "orca"
  | "raydium_clmm";

export interface TokensListParams {
  min_mc?:               number;
  max_mc?:               number;
  /** Default 2000. Pass 0 to disable the dust floor. */
  min_liq?:              number;
  active_h?:             number;
  primary_dex?:          TokenPrimaryDex;
  authority_revoked?:    boolean;
  exclude_token2022?:    boolean;
  // min_lp_burnt_pct removed: the route never read it (no LP-percentage filter exists; read lp_burn_status per token).
  /** Computed (post-filter): organic-volume floor in last 1h. */
  min_volume_1h_usd?:    number;
  /** Computed (post-filter): MEV/bot volume ceiling as % of total. */
  max_mev_share_pct?:    number;
  /** Computed (post-filter): min 1h MC change %. */
  mc_change_1h_min_pct?: number;
  /** Computed (post-filter): max 1h MC change %. */
  mc_change_1h_max_pct?: number;
  /** v1.12 — minimum liquidity-to-MC ratio (0-1). */
  min_liq_mc_ratio?:     number;
  /** v1.12 — maximum liquidity-to-MC ratio (0-1). */
  max_liq_mc_ratio?:     number;
  /** v1.12 — filter by deployer tier. */
  deployer_tier?:        "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
  /**
   * @deprecated use `lp_burn_status` per token, or `supply_burn` for the token-supply burn flag.
   * v1.24 — VERIFIED LP evidence only: true = lp_burnt_pct ≥ 99, false = measured AND below 99.
   * Unknown LP custody (every token today) matches NEITHER value, so both match nothing until an
   * LP-evidence writer exists. Sending it adds a `deprecations` entry to the response.
   */
  lp_burned?:            boolean;
  /** v1.24 — the token-SUPPLY burn flag (what lp_burned used to filter on). */
  supply_burn?:          boolean;
  launchpad?:            "pumpfun" | "launchlab" | "bags";
  sort?:                 TokenListSort;
  limit?:                number;
  offset?:               number;
}

export interface TokenSummary {
  mint:                   string;
  symbol:                 string | null;
  name:                   string | null;
  price_usd:              number | null;
  market_cap_usd:         number | null;
  fdv_usd:                number | null;
  liquidity_usd:          number | null;
  primary_dex:            string | null;
  authorities_revoked:    boolean;
  lp_burnt_pct:           number | null;
  is_token_2022:          boolean;
  last_trade_time:        string | null;
  mc_change_5m_pct:       number | null;
  mc_change_1h_pct:       number | null;
  organic_volume_1h_usd:  number | null;
  mev_share_pct:          number | null;
  /** v1.12 — ratio of liquidity USD to market cap USD; null when either is unknown. */
  liquidity_to_mc_ratio?: number | null;
  /** v1.12 — deployer tier for this token's deployer; null when deployer is untracked. */
  deployer_tier?:         string | null;
  launchpad?:             string | null;
  /** v1.24 — VERIFIED LP evidence only; null = unknown (every token today). Was a supply-burn proxy before. */
  lp_burned?:             boolean | null;
  lp_burn_status?:        LpBurnStatus;
  /**
   * D-22 — burned + non-cancelable LOCKED share of the LP (0–100), from LP
   * evidence; null = unknown (never 0 for unknown). `lp_burnt_pct` stays burn-only.
   */
  lp_secured_pct?:        number | null;
  /** permanent = burn and/or permanent locks only; temporary = only time-limited locks; mixed = both; null = nothing secured or unknown. */
  lp_secured_basis?:      "permanent" | "temporary" | "mixed" | null;
  /** Earliest end of a counted TEMPORARY LP lock (ISO); null when none. Permanent locks have no date. */
  lp_locked_until?:       string | null;
  token_supply_burn_detected?: boolean | null;
}

export interface TokensListResponse {
  tokens: TokenSummary[];
  pagination: {
    limit:         number;
    offset:        number;
    returned:      number;
    has_more:      boolean;
    post_filtered: boolean;
    /** v1.24 — resume offset (a RAW candidate offset on post-filtered scans); null = end. */
    next_offset?:   number | null;
    /** v1.24 — offsets walk a live ranking, not a snapshot: dedupe on mint. */
    order_is_live?: boolean;
    scanned?:       number;
    scanned_until_offset?: number;
    /** v1.24 — the scan budget ran out: more matches MAY exist past next_offset. */
    scan_truncated?: boolean;
    scan_budget?:   number;
  };
  filters: Record<string, unknown>;
  /** v1.24 — present only when a deprecated parameter (today: lp_burned) was sent. */
  deprecations?: TokensDeprecation[];
}

/** v1.24 — disclosure for a deprecated /tokens parameter. */
export interface TokensDeprecation {
  param:       string;
  status:      "deprecated";
  /** Exactly what the parameter matches today. */
  matches:     string;
  replacement: string;
}

// ─── /tokens/almost-bonded — v1.17 ───────────────────────────────────────────

export type AlmostBondedSort = "velocity_desc" | "progress_desc" | "eta_asc";

export interface AlmostBondedParams {
  /** Lower bound on bonding progress %. Default 80. */
  min_progress?:             number;
  /** Upper bound on bonding progress %. Default 99.99 (already-bonded excluded). */
  max_progress?:             number;
  /** Minimum Δprogress/min. Tokens without a 5m-ago snapshot are dropped when set. */
  min_velocity_pct_per_min?: number;
  /** Max minutes since deploy (post-filter). */
  max_age_minutes?:          number;
  /** Filter by deployer reputation tier. */
  deployer_tier?:            "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
  /** Restrict to one launchpad venue (default: both). */
  launchpad?:                "pumpfun" | "launchlab";
  /** Only tokens whose mint+freeze authorities are revoked. */
  authority_revoked?:        boolean;
  /** Minimum liquidity_usd. */
  min_liq?:                  number;
  /** Sort axis. Default "velocity_desc". */
  sort?:                     AlmostBondedSort;
  /** Page size (1–100). Default 50. */
  limit?:                    number;
}

export interface AlmostBondedToken {
  mint:                 string;
  symbol:               string | null;
  name:                 string | null;
  /** Launch venue: pump.fun curve or bonk/LetsBonk (Raydium LaunchLab). */
  launchpad?:           "pumpfun" | "launchlab";
  /** 2026-10 — where `launchpad` came from: `primary_dex`, or the token's single curve pool in `token_pools` when primary_dex is unset. */
  venue_source?:        "primary_dex" | "token_pools";
  /** Bonding-curve progress %, from on-chain real_token_reserves depletion. */
  progress_pct:         number | null;
  /** Δprogress per minute; null until a 5m-ago snapshot exists. */
  velocity_pct_per_min: number | null;
  /** Linear projection of minutes-to-bond from current velocity; null when not measurable. */
  eta_minutes:          number | null;
  /** True when |velocity| is below the stall threshold; null when velocity is unknown. */
  stalled:              boolean | null;
  real_sol_reserves:    number | null;
  market_cap_usd:       number | null;
  liquidity_usd:        number | null;
  authorities_revoked:  boolean;
  deployer_tier:        string | null;
  age_minutes:          number | null;
}

export interface AlmostBondedResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  tokens:   AlmostBondedToken[];
  filters:  Record<string, unknown>;
  returned: number;
  /** v1.24 — what the ranking covered; scan_truncated ⇒ velocity/eta ranks cover only `scanned` candidates. */
  scan?:    { scanned: number; matched: number | null; complete: boolean; scan_truncated: boolean; scan_budget: number };
  note:     string;
}

// ─── Universal wallet (x402 paid, $0.005-$0.02) ─────────────────────────────
// Same shape as /api/v1/wallet/* (Bearer-key path). Works on any Solana
// wallet, not just curated KOLs. FIFO cost-basis PnL over the last 90 days.

export interface WalletStats {
  first_seen:    string;
  last_seen:     string;
  total_trades:  number;
  buys:          number;
  sells:         number;
  bought_sol:    number;
  sold_sol:      number;
  unique_tokens: number;
  window_days:   number;
}

/** Rolling dump-cluster stats for a wallet (trailing 42 days, refreshed daily).
 *  A "dump cohort" is a first-20 buyer appearance on a token that peaked <15min
 *  after deploy. `null` on the parent means no cohort record for the wallet. */
export interface DumpClusterStats {
  dump_cohorts:   number;
  runner_cohorts: number;
  total_cohorts:  number;
  as_of:          string;
}

export interface WalletFlags {
  /** States that is_sniper / is_bundler / is_dumper come from the launchpad trade pipeline: false = not observed, not verified clean. */
  coverage_note?:           string;
  is_kol:                   boolean;
  kol_name:                 string | null;
  is_alpha_tracked:         boolean;
  /** v1.21 type fix (breaking-ish): was wrongly typed `number | null` — the API
   *  always returned null due to a server bug. Fixed; the real value is a
   *  STRING enum, never a number. */
  bot_confidence:           "low" | "medium" | "high" | "none" | null;
  alpha_win_rate:           number | null;
  alpha_net_pnl_sol:        number | null;
  alpha_tokens_traded:      number | null;
  is_deployer:              boolean;
  deployer_tokens_deployed: number | null;
  deployer_bonding_rate:    number | null;
  /** v1.21 — wallet is on the known-sniper list. Pump.fun-pipeline scoped:
   *  false = not observed, NOT verified clean. */
  is_sniper?:               boolean;
  /** v1.21 — wallet is on the bundler list (lifetime flag; never expires). */
  is_bundler?:              boolean;
  /** v1.21 — wallet is on the rolling-42d dump-cluster list. */
  is_dumper?:               boolean;
  /** v1.21 — cohort stats behind is_dumper, or null when no cohort record. */
  dump_cluster?:            DumpClusterStats | null;
}

/* ── Wallet batch classify (v1.21) ── */

/** One wallet's reputation flags in a batch-classify response. Values match the
 *  `flags` block of GET /wallet/{address} exactly. All flags are pump.fun-
 *  pipeline scoped — `false` means "not observed", NOT verified clean.
 *  `is_bundler` is lifetime; `is_dumper` is rolling-42d. */
export interface WalletClassification {
  address:        string;
  is_sniper:      boolean;
  is_bundler:     boolean;
  is_dumper:      boolean;
  is_kol:         boolean;
  kol_name:       string | null;
  bot_confidence: "low" | "medium" | "high" | "none" | null;
  dump_cluster:   DumpClusterStats | null;
  /** 2026-10 (COV-25) — whether each flag's rule actually evaluated this wallet. evaluated=false → the boolean is "no evidence", not "verified clean". */
  label_coverage?: Record<"sniper" | "bundler" | "dumper" | "kol", LabelCoverageEntry>;
}

export type LabelCoverageReason =
  | "flagged" | "rule_evaluated" | "insufficient_sample" | "not_checked_budget"
  | "sample_unavailable" | "population_not_checked" | "no_cohort_stats" | "registry";

export interface LabelCoverageEntry {
  evaluated: boolean;
  reason:    LabelCoverageReason;
}

export interface WalletBatchClassifyResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  wallets: WalletClassification[];
  count:   number;
  as_of:   string;
  /** 2026-10 (COV-25) — label rule version, e.g. `wallet-labels/368-v1`. */
  rule_version?: string;
  /** 2026-10 (COV-25) — one sentence per label: population + window. */
  evidence_horizon?: { sniper: string; bundler: string; dumper: string; kol: string };
}

// v1.8.1 enrichments — additive, nullable, returned alongside stats + flags.
export interface WalletTopToken {
  token_mint:       string;
  token_symbol:     string | null;
  buys:             number;
  sells:            number;
  sol_in:           number;
  sol_out:          number;
  realized_pnl_sol: number;
  current_mc_usd:   number | null;
  peak_mc_usd:      number | null;
  last_traded_at:   string;
}

export interface WalletTradingStyle {
  total_trades:            number;
  avg_trade_size_sol:      number;
  sniper_rate:             number;  // 0-1: fraction of trades with early_buyer_rank ≤ 10
  early_entries:           number;
  round_trip_rate:         number;  // 0-1: fraction of tokens with both buys and sells
  tokens_with_round_trips: number;
  median_hold_minutes:     number | null;
  dominant_action:         "buy" | "sell" | "balanced";
}

export interface WalletDeployerTierEntry {
  tier:  string;  // "elite" | "good" | "rising" | "moderate" | "cold" | "unranked"
  count: number;
}

export interface WalletDeployerBreakdown {
  total_tokens:      number;
  tracked_deployers: number;
  by_tier:           WalletDeployerTierEntry[];
}

export interface WalletRecentTrade {
  token_mint:    string;
  token_symbol:  string | null;
  action:        "buy" | "sell";
  sol_amount:    number;
  block_time:    number;
  traded_at:     string;
  tx_signature:  string;
}

export interface WalletStatsResponse {
  /** Trade-data coverage disclosure. */
  coverage?: TradeCoverage;
  address: string;
  stats:   WalletStats | null;
  flags:   WalletFlags;
  // v1.8.1: enrichments — top traded tokens with realized PnL, trading-style
  // signals, deployer-tier breakdown, recent-trades timeline. Fields are
  // optional on the type so old SDK consumers that don't decode them keep
  // working when the server adds more enrichment fields.
  top_tokens?:         WalletTopToken[];
  trading_style?:      WalletTradingStyle | null;
  deployer_breakdown?: WalletDeployerBreakdown | null;
  recent_trades?:      WalletRecentTrade[];
  /** Derived analytics: win rate, ROI, best/worst trade, biggest miss, verdict (v1.9+). */
  derived?:            WalletDerivedStats;
  /**
   * v2.10 (server 2026-10-01) — present (`true`) only when the 90-day aggregation
   * failed: `stats: null` is then UNKNOWN, not an inactive wallet.
   */
  stats_unavailable?:      boolean;
  /** v2.10 — present (`true`) only when one or more enrichment queries failed; see `degraded_fields`. */
  enrichment_unavailable?: boolean;
  /**
   * v2.10 — enrichment blocks whose query failed (e.g. a database timeout). Their
   * `null` / `[]` is UNKNOWN, not "no data"; retry later. `biggest_miss` refers
   * to `derived.biggest_miss`.
   */
  degraded_fields?:        Array<"top_tokens" | "trading_style" | "deployer_breakdown" | "recent_trades" | "biggest_miss" | (string & {})>;
}

export interface WalletPnlSummary {
  realized_sol:           number;
  unrealized_sol:         number;
  total_pnl_sol:          number;
  total_bought_sol:       number;
  total_sold_sol:         number;
  wins:                   number;
  losses:                 number;
  win_rate:               number | null;
  profit_factor:          number | null;
  avg_hold_minutes:       number | null;
  median_hold_minutes:    number | null;
  max_drawdown_sol:       number;
  open_positions_count:   number;
  closed_positions_count: number;
  total_tokens_traded:    number;
  best_realized:  { token_mint: string; realized_sol: number } | null;
  worst_realized: { token_mint: string; realized_sol: number } | null;
}

export interface WalletPnlCurvePoint {
  date:           string;
  day_pnl:        number;
  cumulative_pnl: number;
  trades:         number;
}

export interface WalletClosedPosition {
  token_mint:   string;
  buy_count:    number;
  sell_count:   number;
  bought_sol:   number;
  sold_sol:     number;
  pnl_sol:      number;
  roi_pct:      number | null;
  hold_minutes: number | null;
  result:       "win" | "loss" | "breakeven";
  first_trade:  string | null;
  last_trade:   string | null;
}

export interface WalletOpenPosition {
  token_mint:          string;
  token_amount:        number;
  cost_basis_sol:      number;
  avg_entry_price_sol: number;
  current_price_sol:   number | null;
  current_value_sol:   number | null;
  unrealized_sol:      number | null;
  unrealized_pct:      number | null;
  first_buy_at:        string | null;
  buys_in_position:    number;
  /** 2026-10 (COV-21) — positions are FIFO-open DEX buys (trade position), not a proven holding. */
  position_basis?:     "swap_derived";
  holding_status?:     "verified" | "unverified";
  holding_unverified_reason?: "not_checked" | "no_fresh_snapshot" | "snapshot_unreadable" | "snapshot_older_than_trades" | "decimals_mismatch" | "balance_invalid" | null;
  /** partial = a verified balance exceeds the trade position; the excess arrived without a swap and has no cost basis. */
  cost_basis_status?:  "known" | "partial";
  /** Present (non-null) only when holding_status = verified. */
  holding?:            WalletPositionHolding | null;
}

/** 2026-10 (COV-21) — proven on-chain holding for one swap-derived position. */
export interface WalletPositionHolding {
  status:                  "HELD" | "PARTIALLY_REDUCED" | "TRANSFERRED_OR_DISPOSED" | "EXTERNAL_INFLOW";
  onchain_balance:         number;
  held_known_amount:       number;
  external_inflow_amount:  number;
  cost_basis_held_sol:     number;
  unrealized_known_sol:    number | null;
  /** Cost of FIFO lots no longer in the wallet. Outcome unknown: neither realized nor unrealized. */
  cost_basis_not_held_sol: number;
  verified_at:             string;
  source:                  "wallet_holdings_cache";
}

/** 2026-10 (COV-21) — summary of the proven-holding check over the returned open positions. */
export interface WalletHoldingCheck {
  mode:        "off" | "cache";
  source:      "wallet_holdings_cache" | null;
  verified_at: string | null;
  verified:    number;
  unverified:  number;
  held:        number;
  partially_reduced:       number;
  transferred_or_disposed: number;
  external_inflow:         number;
  note:        string;
}

export interface WalletPnlResponse {
  address:          string;
  window_days:      number;
  summary:          WalletPnlSummary;
  pnl_curve:        WalletPnlCurvePoint[];
  closed_positions: WalletClosedPosition[];
  open_positions:   WalletOpenPosition[];
  /** partial / analyzed_trades / partial_reason are present only when the wallet exceeded the trade-analysis cap. (Earlier types declared `truncated_trades`, which the route never sent.) */
  notes:            { cost_basis_observable_from: string; trades_through?: string; trades_through_block_time?: number; trades_through_same_second?: number; partial?: true; analyzed_trades?: number; partial_reason?: string; /** 2026-10 (COV-21) — tokens with sells beyond in-window buys; excluded from realized PnL. */ sells_without_cost_basis?: { tokens: number; cost_basis: "unknown" } };
  /** 2026-10 (COV-21) — proven-holding check summary. Absent on older responses. */
  holding_check?:   WalletHoldingCheck;
  cache_hit?:       boolean;
  computed_at?:     string;
  ttl_seconds?:     number;
  /** v1.24 — seconds since computed_at (source age survives a cache hit). */
  cache_age_seconds?: number;
  /** v1.24 — hits: head_checked (no newer trade) | unverified (check failed). */
  cache_validation?: "head_checked" | "unverified";
  /** v1.24 — a cache row existed but the wallet traded since; this response was recomputed. */
  cache_invalidated?: "new_activity";
}

export interface WalletPositionsResponse {
  address:      string;
  positions:    WalletOpenPosition[];
  /** 2026-10 (COV-21) — proven-holding check summary. Absent on older responses. */
  holding_check?: WalletHoldingCheck;
  cache_hit?:   boolean;
  computed_at?: string | null;
  ttl_seconds?: number | null;
  cache_age_seconds?: number;
  cache_validation?: "head_checked" | "unverified";
  cache_invalidated?: "new_activity";
}

export interface WalletHoldingsParams {
  /** 1–500, default 200. */
  limit?:         number;
  /** Minimum USD value per holding to include, default 0. */
  min_value_usd?: number;
}

/** One current on-chain holding — an SPL or Token-2022 token account balance,
 * enriched with our price/MC/name data plus a `transfer_delta` vs the wallet's
 * trade-derived net position. */
export interface Holding {
  mint:                string;
  symbol:              string | null;
  name:                string | null;
  amount:              number;
  amount_raw:          string;
  decimals:            number;
  token_program:       "spl" | "token2022";
  price_usd:           number | null;
  value_usd:           number | null;
  market_cap_usd:      number | null;
  is_bonded:           boolean | null;
  /** Trade-derived net position from FIFO math over the data window, or null. */
  trade_derived_amount: number | null;
  /** On-chain `amount` − `trade_derived_amount`. Nonzero exposes tokens that
   * arrived/left WITHOUT a swap (airdrops, insider funding, wallet-hopping). */
  transfer_delta:      number | null;
}

export interface WalletHoldingsResponse {
  /** Trade-data coverage disclosure. */
  coverage?: TradeCoverage;
  address:     string;
  sol_balance: number;
  holdings:    Holding[];
  summary: {
    token_accounts:  number;
    non_zero:        number;
    returned:        number;
    priced:          number;
    total_value_usd: number;
    truncated:       boolean;
  };
  verified_at:       string;
  trade_window_days: number;
  cache_hit:         boolean;
  ttl_seconds:       number;
}

export interface WalletTradesParams {
  limit?:      number;
  cursor?:     string;
  action?:     "buy" | "sell";
  token_mint?: string;
  since?:      number;
  until?:      number;
}

export interface WalletTrade {
  tx_signature: string;
  token_mint:   string;
  action:       "buy" | "sell";
  sol_amount:   number;
  token_amount: number;
  /** This trade's executed price — `sol_amount / token_amount`. Added 2026-08-16;
   *  this route returned amounts and no price before. See {@link TokenTrade}. */
  price_sol:        number | null;
  /** {@link WalletTrade.price_sol} in USD at the trade's SOL/USD rate. */
  price_usd:        number | null;
  /** Canonical pool price near this trade's slot — NOT this trade's price. */
  market_price_sol: number | null;
  /** {@link WalletTrade.market_price_sol} in USD. */
  market_price_usd: number | null;
  block_time:   number;
  traded_at:    string;
}

export interface WalletTradesResponse {
  /** Trade-data coverage disclosure. */
  coverage?: TradeCoverage;
  address:     string;
  trades:      WalletTrade[];
  next_cursor: string | null;
  has_more:    boolean;
  filters: {
    action:     "buy" | "sell" | null;
    token_mint: string | null;
    since:      number;
    until:      number;
  };
  /** Postgres / Parquet-archive split for this page. */
  history?: TradeHistoryMeta;
}

/** Where a trade page came from: rows at/after `postgres_from` are Postgres, older rows the Parquet archive (one ordering, one cursor). */
export interface TradeHistoryMeta {
  /** Unix seconds. */
  postgres_from:     number;
  archive_used:      boolean;
  archive_months:    string[];
  /** null = archive reader not configured. */
  archive_available: boolean | null;
  /** true = older history was requested but the archive did not answer — has_more:false is then NOT the end of the tape. */
  truncated:         boolean;
  /** Present when the archive could not be reached or is not configured. */
  note?:             string;
}

/* ── Token trade tape (v1.21) ── */

export interface TokenTradesParams {
  /** 1–500, default 100. */
  limit?:  number;
  /** Opaque cursor from `next_cursor` of a previous response. */
  cursor?: string;
  action?: "buy" | "sell";
  /** Filter to a single wallet address. */
  wallet?: string;
  /** Unix epoch seconds — defaults to the full history (see coverage.history_start). */
  since?:  number;
  /** Unix epoch seconds — default now. */
  until?:  number;
}

export interface TokenTrade {
  tx_signature:     string;
  wallet_address:   string;
  action:           "buy" | "sell";
  sol_amount:       number;
  token_amount:     number;
  /** THIS TRADE's executed price: `sol_amount / token_amount`, so it reconciles
   *  exactly with the amounts on the same row and with the PnL endpoints.
   *  `sol_amount` is the wallet's net SOL movement, so this is the trader's
   *  all-in effective rate — it includes the swap fee and any account rent paid
   *  in the same transaction, and it is not the pool mid. `null` for dust and
   *  zero-SOL legs (a rugged sell that recovered nothing).
   *
   *  Changed 2026-08-16: this field previously carried the canonical pool price,
   *  which disagreed with the row's own amounts by a 7.9% median. That value now
   *  lives in {@link TokenTrade.market_price_sol}. */
  price_sol:        number | null;
  /** {@link TokenTrade.price_sol} in USD at the trade's SOL/USD rate. */
  price_usd:        number | null;
  /** The market-cap tracker's canonical pool price sampled near this trade's
   *  slot — one value per token per update, so every trade in the same slot
   *  shares it. Use this for a per-token series independent of trade size and
   *  direction; use {@link TokenTrade.price_sol} for cost basis, fills and PnL. */
  market_price_sol: number | null;
  /** {@link TokenTrade.market_price_sol} in USD. */
  market_price_usd: number | null;
  /** Rank among the token's earliest buyers (1 = first), or null. */
  early_buyer_rank: number | null;
  slot:             number | null;
  block_time:       number;
  traded_at:        string;
}

/** Mint-scoped trade tape. `coverage` is the honesty block: the tape starts
 *  2026-04-12 (`history_start`, unix sec) and is pump.fun-pipeline scoped
 *  (`scope`) — trades outside that pipeline are not on the tape. */
export interface TokenTradesResponse {
  mint:        string;
  trades:      TokenTrade[];
  next_cursor: string | null;
  has_more:    boolean;
  filters: {
    action: "buy" | "sell" | null;
    wallet: string | null;
    since:  number;
    until:  number;
  };
  coverage: TradeCoverage;
  /** Postgres / Parquet-archive split for this page. */
  history?: TradeHistoryMeta;
}

/* ── Token top traders (v1.21) ── */

export interface TokenTopTradersParams {
  /** 1–25, default 25 (ULTRA keys may request up to 100 on the keyed route). */
  limit?:          number;
  /** Rank axis. Default "pnl". */
  sort?:           "pnl" | "roi";
  /** Lookback window in days (1–180, default 90). */
  window_days?:    number;
  /** Minimum SOL bought to qualify (default 0.1). */
  min_bought_sol?: number;
  /** REST only: skip this many ranked traders (bounded by the tier's row cap). The x402 route rejects it before payment (400 param_not_supported_on_x402). */
  offset?:         number;
}

/** One wallet in a top-traders response, enriched with our own reputation data
 *  (KOL identity + alpha-wallet stats) so you can tell smart money from bots. */
export interface TokenTopTrader {
  rank:                number;
  wallet:              string;
  trades:              number;
  buys:                number;
  sells:               number;
  bought_sol:          number;
  sold_sol:            number;
  realized_pnl_sol:    number;
  unrealized_pnl_sol:  number;
  total_pnl_sol:       number;
  held_value_sol:      number;
  roi:                 number | null;
  still_holding:       boolean;
  first_trade_at:      string;
  last_trade_at:       string;
  is_kol:              boolean;
  kol_name:            string | null;
  is_alpha_tracked:    boolean;
  bot_confidence:      "low" | "medium" | "high" | "none" | null;
  historical_win_rate: number | null;
  historical_pnl_sol:  number | null;
  historical_tokens:   number | null;
}

export interface TokenTopTradersResponse {
  mint:        string;
  sort:        "pnl" | "roi";
  window_days: number;
  traders:     TokenTopTrader[];
  summary: {
    returned:             number;
    known_kols:           number;
    known_alpha_wallets:  number;
    net_realized_pnl_sol: number;
  };
  /** v1.23.4 — trade-coverage disclosure; when `in_scope` is false an empty
   *  `traders` list means "outside the write-gate", not "nobody traded". */
  coverage?: TradeCoverage;
}

/** Early WebSocket control contract; only channels advertised in `early_stream.channels` are served. */
export type EarlyChannel = "early:deploys" | "early:locks" | "early:trades" | "early:liquidity" | "early:migrations" | "early:token_changes";
export type EarlyEventFormat = "full" | "compact-v1";
export type EarlyAmountField = "requested_amount_raw" | "requested_input_raw" | "max_input_raw" | "min_output_raw" | "target_output_raw"
  | "target_lp_output_raw" | "requested_lp_input_raw" | "max_base_input_raw" | "max_quote_input_raw"
  | "min_base_output_raw" | "min_quote_output_raw" | "requested_base_input_raw" | "requested_quote_input_raw";
/** One or both inclusive bounds, canonical unsigned decimal u64 strings.
 * These fields are requested instruction arguments, never realized fills or USD. */
export type EarlyAmountFilter = { field: EarlyAmountField; mint: string } & (
  { min_raw: string; max_raw?: string } | { min_raw?: string; max_raw: string }
);
export interface EarlyStreamFilters {
  mints?: string[];
  /** Instruction actor, not any account/fee payer. Do not combine with actors. */
  wallets?: string[];
  actors?: string[];
  launchpads?: ("pumpfun" | "launchlab")[];
  protocols?: string[];
  actions?: string[];
  /** Both directions and wallet_labels require a trade-only subscription. */
  directions?: ("buy" | "sell")[];
  wallet_labels?: ("kol" | "dev" | "alpha")[];
  /** Maximum four rules, combined with AND. Unknown/missing amount or mint fails the filter. */
  amounts?: EarlyAmountFilter[];
}
export interface EarlyWalletList {
  id: string; name: string; wallets: string[]; revision: string; updated_at: string;
}
export type EarlyWalletListSummary = Omit<EarlyWalletList, 'wallets'> & { wallet_count: number };
export type EarlyWalletListControl =
  | { op: 'list' }
  | { op: 'get'; id: string }
  | { op: 'create'; name: string; wallets: string[] }
  | { op: 'replace'; id: string; revision: string; name: string; wallets: string[] }
  | { op: 'delete'; id: string; revision: string };
export interface EarlyWalletListResult {
  type: 'wallet_list_result'; op: EarlyWalletListControl['op'];
  lists?: (EarlyWalletList | EarlyWalletListSummary)[];
  list?: EarlyWalletList | { id: string; deleted: true; revision: string };
  limits: { lists: number; wallets: number };
}
export interface EarlySubscribeControl {
  type: "subscribe";
  sub_id?: string;
  /** Owner-scoped saved wallet list; trade-only and mutually exclusive with wallets/actors. */
  wallet_list?: string | null;
  channels: EarlyChannel[];
  filters?: EarlyStreamFilters;
  format?: EarlyEventFormat;
  resume?: { instance: string; seq: number };
}
export interface EarlyUpdateControl {
  wallet_list?: string | null;
  type: "update";
  sub_id?: string;
  /** Omit to preserve existing filters; {} explicitly clears them. */
  filters?: EarlyStreamFilters;
  format?: EarlyEventFormat;
}

/* ── ULTRA+ early sniper observations ── */

export interface SniperRecentParams {
  /** Only deploys detected after this ISO-8601 timestamp. */
  since?:         string;
  /** Filter by deployer reputation tier (ULTRA/BUSINESS/ENTERPRISE). */
  deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
  /** Minimum deployer lifetime bond rate (0–1). */
  min_bond_rate?: number;
  /** Max results, 1–200 (default 50). */
  limit?:         number;
  /** Keyed ULTRA/BUSINESS/ENTERPRISE: narrow to your custom deployer watchlist. Keyless sniper access is retired. */
  watchlist?:     boolean;
}

/** Encoded v1 requests. Missing bits are null, not zero; these are not execution measurements. */
export interface EarlyTransactionConfig {
  config_mask: number;
  priority_fee_lamports: string | null;
  compute_unit_limit: number | null;
  loaded_accounts_data_size_limit: number | null;
  heap_size: number | null;
}

/** Early instruction observation. Execution is unknown until separately resolved.
 *  No guaranteed timing lead. Deduplicate by event_id, never by mint alone. */
export interface SniperDeploy {
  event_id?: string;
  source?: "shredprism" | "deshred";
  outer_instruction_index?: number | null;
  observation_stage?: "observed";
  execution_status?: "unknown" | "succeeded" | "failed" | "unresolved";
  transaction_version?: "legacy" | 0 | 1 | null;
  transaction_config?: EarlyTransactionConfig | null;
  fee_payer?: string | null;
  mint:                     string;
  name:                     string | null;
  symbol:                   string | null;
  deployer_wallet:          string;
  signature:                string;
  slot:                     number;
  detected_at:              string;
  detection_region:         string;
  detection_confirmed:      boolean;
  /** Deployer attribution: 'unverified' | 'confirmed' | 'corrected' (mig 313). */
  attribution_status?:      "unverified" | "confirmed" | "corrected" | null;
  attribution_checked_at?:  string | null;
  deployer_tier:            string | null;
  deployer_bond_rate:       number | null;
  deployer_total_bonded:    number | null;
  deployer_recent:          string | null;
  deployer_runner_rate?:    number | null;
  deployer_labeled_tokens?: number | null;
  confirmed_on_chain:       boolean | null;
  confirmed_at:             string | null;
  /** v1.21 — slot-window snipe rollup (slots [-1..+3]). Null until the ~10-min
   *  settle window has passed — absent, not zero. */
  footprint?:               SniperFootprint | null;
}

export interface SniperByDeployerResponse {
  coverage?: LaunchCoverage;
  deployer: string;
  deploys: SniperDeploy[];
  count: number;
}

export interface SniperRecentResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  deploys:          SniperDeploy[];
  count:            number;
  data_age_seconds: number | null;
  /** Present (true) only when watchlist=true and your watchlist is empty. */
  watchlist_empty?: boolean;
}

/* ── Token pools (per-venue liquidity map) ── */

/** One DEX pool a token trades in. `is_active` distinguishes live vs parked venues. */
export interface TokenPool {
  pool_address:   string;
  dex:            string;
  quote_mint:     string;
  liquidity_usd:  number | null;
  last_price_sol: number | null;
  last_swap_at:   string | null;
  amm_id:         string | null;
  is_active:      boolean;
}

/** Aggregate venue map for a token — pool/dex counts, total liquidity, fragmentation. */
export interface TokenPoolsSummary {
  pool_count:         number;
  active_pool_count:  number;
  dex_count:          number;
  dexes:              string[];
  total_liquidity_usd: number | null;
  primary_pool:       string | null;
  primary_dex:        string | null;
  /** Share of total liquidity held by the largest pool (0–100). */
  top_pool_share_pct: number | null;
}

/**
 * Per-venue liquidity map — every DEX pool a token trades in, live vs parked,
 * with fragmentation and top-pool share. PRO/ULTRA only.
 */
export interface TokenPoolsResponse {
  mint:    string;
  pools:   TokenPool[];
  summary: TokenPoolsSummary;
  /** The inventory is the deepest `max_pools` pools by liquidity; summary totals cover the returned pools. */
  universe?: { kind: "top_by_liquidity"; max_pools: number; returned: number; truncated: boolean };
}

/* ── Token depth / price impact (v1.22) ── */

export interface TokenDepthParams {
  /** SOL buy sizes to quote (max 8, each >0 and ≤10000). Default [0.5, 1, 5, 10]. Sent as a CSV `sizes` query param. */
  sizes?: number[];
}

/** One buy-size quote inside a depth pool. */
export interface TokenDepthQuote {
  /** The requested buy size, in SOL. */
  size_sol:         number;
  /**
   * Concentrated depth models only (server flag): "filled" | "pool_liquidity_exhausted"
   * (partial fill reported) | "exceeds_loaded_bins" | "price_out_of_range" (numbers null).
   */
  status?:          "filled" | "pool_liquidity_exhausted" | "exceeds_loaded_bins" | "exceeds_loaded_ticks" | "price_out_of_range";
  /** Tokens received for that buy (UI units, fee-adjusted). null only on a concentrated pool whose status is not quotable. */
  tokens_out:       number | null;
  /** Average execution price in SOL per token. */
  avg_price_sol:    number | null;
  /** Post-trade spot-price move, % (rounded to 2 decimals). */
  price_impact_pct: number | null;
}

/** SOL required to move the pool's spot price by 1% / 5% / 10%. */
export interface TokenDepthToMovePrice {
  /** null on a concentrated pool when the loaded window does not reach that price. */
  "1pct":  number | null;
  "5pct":  number | null;
  "10pct": number | null;
}

/** Fields shared by supported and unsupported depth pools. */
export interface TokenDepthPoolBase {
  pool_address:  string;
  dex:           string;
  quote_mint:    string;
  /** "constant_product" | "curve" | "concentrated" | null (unclassified). */
  pool_model:    string | null;
  liquidity_usd: number | null;
  /** Traded within the last hour. */
  is_active:     boolean;
}

/** A pool with computable depth. Curve pools (pump.fun/bonk) are priced from a
 *  LIVE read of the curve's virtual reserves (`source: "live_rpc"`); constant-
 *  product pools are served from stream reserves (`source: "stream"`, with
 *  `reserves_age_ms` since the last swap). */
export interface TokenDepthPool extends TokenDepthPoolBase {
  depth_available: true;
  /** "constant_product" | "curve" | "concentrated" (the last only with a concentrated depth model enabled). */
  model:           string;
  /** Concentrated pools only: the program-exact model that produced the numbers. */
  model_detail?:   "meteora_dlmm_bins" | "raydium_clmm_ticks" | "meteora_damm_v2_full_range";
  /** Meteora DAMM v2 only: the proven Pool account (pool_address is the vault). */
  pool_account?:   string;
  /** Swap fee, % (e.g. 0.25). */
  fee_pct:         number;
  /** "observed_event" (PumpSwap virtual-reserve model) | "dynamic_fee_at_quote_time" (Meteora DLMM base + variable fee). Absent = static venue fee. */
  fee_basis?:      "observed_event" | "dynamic_fee_at_quote_time" | "amm_config_at_quote_time";
  /** Meteora DLMM only: the loaded bin range and its slot; quotes never walk outside it. */
  bins_window?:    { from_bin: number; to_bin: number; slot: number };
  /** Raydium CLMM only: the loaded tick range [from_tick, to_tick) in the buy direction and its slot. */
  ticks_window?:   { from_tick: number; to_tick: number; slot: number };
  source:          "stream" | "live_rpc";
  /** Age of the reserves snapshot (0 for live_rpc). */
  reserves_age_ms: number;
  spot_price_sol:  number;
  /** One entry per requested size, same order as `sizes_sol`. */
  quotes:          TokenDepthQuote[];
  to_move_price:   TokenDepthToMovePrice;
}

/** A pool we track but can't compute depth for — the honesty marker. `reason` is
 *  e.g. "concentrated_liquidity_depth_not_supported", "pool_model_unknown",
 *  "curve_depth_not_yet_supported", "curve_graduated_use_amm_pool",
 *  "reserves_unavailable". */
export interface TokenDepthUnsupportedPool extends TokenDepthPoolBase {
  reason: string;
}

/**
 * v1.22 — Per-pool price-impact / slippage for a token: "how much SOL to move
 * price N%" and impact per buy size, per pool (GET /tokens/{mint}/depth).
 * Impact is per-pool, NOT router-optimal. `found: false` = no pool with
 * sufficient authoritative data for depth: tracked pools that lack it are
 * listed in `unsupported_pools` with a `reason`; with no tracked pool at all
 * both arrays are empty. PRO/ULTRA only.
 */
export interface TokenDepthResponse {
  mint:              string;
  /** True when at least one pool has computable depth. */
  found:             boolean;
  /** Live SOL/USD used to convert stable-quoted pools (absent when found=false). */
  sol_usd?:          number | null;
  /** The SOL buy sizes actually quoted (deduped, sorted asc). */
  sizes_sol:         number[];
  /** Deepest pool with depth available (absent when found=false). */
  primary_pool?:     string | null;
  pools:             TokenDepthPool[];
  unsupported_pools: TokenDepthUnsupportedPool[];
  note?:             string;
  /** Only the deepest `max_pools` pools by stored liquidity are evaluated; pools past the cut are not listed. */
  universe?:         { kind: "top_by_liquidity"; max_pools: number; evaluated: number; truncated: boolean };
  /** Only with a concentrated depth model enabled: largest known pool vs the reported pool; routing is single-pool only. */
  pool_selection?:   { largest_known_pool: string; largest_known_pool_supported: boolean; primary_pool: string | null; routing: "single_pool_only" };
}

/* ── Token holders (live census + concentration) ── */

/** Wallet-intelligence labels on a holder. Empty = unknown to us, NOT verified clean. */
export type TokenHolderLabel = "deployer" | "kol" | "early_buyer" | "buyer" | "bundle" | "bot" | "dump_cluster";

/** One ranked holder (owner wallet, token accounts merged). */
export interface TokenHolder {
  rank:                number;
  /** Owner wallet of the token account(s). */
  owner:               string;
  token_accounts:      string[];
  /** Raw u64 balance as a decimal STRING — never a float. */
  amount_raw:          string;
  /** Decimal-adjusted convenience value (null when decimals unknown). */
  amount:              number | null;
  pct_of_supply:       number | null;
  /** Share of supply minus pools / bonding curves / burns. */
  pct_of_circulating:  number | null;
  labels:              TokenHolderLabel[];
  kol_name:            string | null;
  early_buyer_rank:    number | null;
  bot_confidence:      "none" | "low" | "medium" | "high" | null;
  historical_win_rate: number | null;
}

/**
 * An owner EXCLUDED from the circulating denominator, named where we can:
 * `pool` = vault authority of a known pool (`dex` + `pool_address` set);
 * `bonding_curve` = pump.fun / LaunchLab curve; `burn` = incinerator / system program;
 * `program_account` = off-curve owner we could not attribute (vault, escrow, staking, unknown pool).
 */
export interface TokenHolderExcluded {
  owner:          string;
  token_accounts: string[];
  /** Raw u64 as a STRING. */
  amount_raw:     string;
  pct_of_supply:  number | null;
  reason:         "pool" | "bonding_curve" | "burn" | "program_account";
  dex:            string | null;
  pool_address:   string | null;
}

/** Concentration over the FULL owner set (tier governs disclosure only). */
export interface TokenHoldersConcentration {
  /**
   * EXACT distinct non-zero owners minus excluded pools/curves/burns, at `slot`
   * (census). null ONLY when the census was not served: provider refusal for a mega-cap, a
   * timeout, or balances adding up to more than the mint supply (see
   * `source.census_fallback_reason`) — never estimated from trades.
   */
  holder_count:             number | null;
  holder_count_source:      "census" | null;
  token_accounts_nonzero:   number | null;
  /** Raw u64 as STRINGS. */
  supply_raw:               string | null;
  circulating_raw:          string | null;
  decimals:                 number | null;
  /** Shares over the circulating denominator (supply minus excluded). top50/top100 are null on the top-20 fallback. */
  top1_share:               number | null;
  top10_share:              number | null;
  top20_share:              number | null;
  top50_share:              number | null;
  top100_share:             number | null;
  /** Share of TOTAL supply in pools/curves/vaults/burns (= pool_pct + burned_pct + program_pct). */
  pool_and_program_pct:     number | null;
  /** Share of total supply in NAMED pools + bonding curves. */
  pool_pct:                 number | null;
  burned_pct:               number | null;
  /** Share of total supply held by off-curve owners we could not attribute. */
  program_pct:              number | null;
  deployer_pct:             number | null;
  kol_pct:                  number | null;
  early_buyer_pct:          number | null;
  bundle_pct:               number | null;
  bot_pct:                  number | null;
  dump_cluster_pct:         number | null;
  distinct_owners_in_top20: number;
  /** How many ranked owners the scan retained (≤100 census, ≤20 fallback). */
  ranked_owners_available:  number;
}

/**
 * Live holder census + concentration for a Solana mint (GET /tokens/{mint}/holders) —
 * who holds NOW, as opposed to {@link TokenCapTableResponse} (who bought first).
 * Read live from the ledger at `confirmed` via a mint-scoped `getProgramAccounts`
 * census merged per owner. Disclosure: PRO ranks 1–10, ULTRA 1–50, BUSINESS 1–100;
 * the maths is tier-independent. Big established tokens may first answer HTTP 503
 * `error_kind: "holder_scan_in_progress"` (`retry_after_seconds: 20`) — the scan
 * continues and is cached, so the retry is instant. **KEYED (v1) only — not on the
 * x402 rail.** PRO+.
 */
export interface TokenHoldersResponse {
  mint:      string;
  /** Ledger slot the holder set was read at. */
  slot:      number | null;
  as_of:     string;
  holders:   TokenHolder[];
  count:     number;
  /** Rank cap by tier: 10 PRO, 50 ULTRA, 100 BUSINESS. */
  disclosed: number;
  excluded:  TokenHolderExcluded[];
  concentration: TokenHoldersConcentration;
  deployer:  { wallet: string; tier: string; bonding_rate: number | null } | null;
  source: {
    method:                 "getProgramAccounts_census" | "getTokenLargestAccounts";
    token_program:          string | null;
    rpc_cap:                number;
    commitment:             string;
    scan_ms:                number | null;
    /**
     * Set when the full census was not served and the top-20 view was served
     * instead: `census_exceeds_provider_limit` (provider refusal, mega-caps),
     * `census_timed_out`, `census_inconsistent_sum_exceeds_supply` (balances
     * summed past the mint supply; refused since 2026-10-02) or
     * `census_failed: <detail>`. `source.note` explains it in prose.
     */
    census_fallback_reason: string | null;
    note:                   string;
  };
}

/* ── Token locks & vesting (Streamflow / Jupiter Lock / Bonfida) — GET /tokens/{mint}/locks, /tokens/locks, /tokens/unlocks ── */

/** Locker program a contract lives under. LP locks are NOT covered (token / vesting locks only). */
/** smithii_vesting / sablier_lockup are served only while listed in the response's meta.programs (verified admission). */
export type TokenLockProgram = "streamflow" | "jupiter_lock" | "bonfida_vesting" | "smithii_vesting" | "sablier_lockup";
/** sablier_lockup only: `current` = recipient proven by the latest read; anything else = recipient null (unknown / burned). */
export type TokenLockHolderStatus = "current" | "lost_proof" | "never_proven" | "burned" | "anomaly";
/** `lock` = whole amount released at one date; `vesting` = cliff and/or periodic release. */
export type TokenLockKind = "lock" | "vesting";
/** Contract status, derived at request time from the on-chain schedule + withdrawn/cancelled state. */
export type TokenLockStatus = "active" | "completed" | "cancelled" | "closed";
/** Kind of unlock event: `cliff`, periodic `period`, the `final` release, or a Bonfida `tranche`. */
export type TokenUnlockEventKind = "cliff" | "period" | "final" | "tranche";

/**
 * Who runs the lock contract, and how sure the server is (2026-10-02).
 * `verified` = a known provider deployment (Streamflow / Jupiter Lock / Bonfida,
 * identified by program id); `compatible` = only the instruction/event shape
 * matches a known provider (`compatible_with`), the operator is NOT identified;
 * `unverified` = unknown program. `id` / `website_url` are null unless verified.
 * `lock_url` is a per-lock page on the provider's site, set ONLY where its
 * format is proven — for the Solana providers it is always null (never guessed).
 */
export interface TokenLockProvider {
  id:              string | null;
  name:            string | null;
  identity:        "verified" | "compatible" | "unverified";
  compatible_with: string | null;
  website_url:     string | null;
  lock_url:        string | null;
}

/** Independent on-chain evidence on Solana Explorer (2026-10-02). */
export interface TokenLockExplorer {
  lock_account_url: string | null;
  creation_tx_url:  string | null;
}

/** One Bonfida vesting tranche (`TokenLock.schedule`). */
export interface TokenLockTranche {
  release_at: string | null;
  amount_raw: string;
}

/** Mint facts joined to a lock row / unlock event. All null when unknown (`facts_resolved`). */
export interface TokenLockToken {
  symbol:         string | null;
  name:           string | null;
  decimals:       number | null;
  price_usd:      number | null;
  market_cap_usd: number | null;
}

/** The next unlock event of a single contract. `amount_raw` is a base-unit STRING. */
export interface TokenLockNextUnlock {
  at:         string;
  kind:       TokenUnlockEventKind;
  amount_raw: string;
  amount:     number | null;
  amount_usd: number | null;
}

/**
 * One on-chain lock / vesting contract with a LIVE-derived view (computed at
 * request time). `*_raw` = base units as decimal STRINGS — never floats; the
 * ui (`amount`, `locked`, …), `*_usd` and `*_pct_of_supply` fields are null when
 * decimals / price are unknown.
 */
export interface TokenLock {
  /** The contract account (Streamflow stream / Jupiter VestingEscrow / Bonfida vesting account). */
  lock_account:            string;
  program:                 TokenLockProgram;
  /** 2026-10-02 — who runs the locker and how sure we are; see {@link TokenLockProvider}. */
  provider:                TokenLockProvider;
  /** 2026-10-02 — Solana Explorer links for the lock account and the creation tx. */
  explorer:                TokenLockExplorer;
  kind:                    TokenLockKind;
  status:                  TokenLockStatus;
  mint:                    string;
  /** Creator / locker. Bonfida has none on-chain. */
  sender:                  string | null;
  /** sablier_lockup: the CURRENT proven stream-NFT holder only, null otherwise (see holder_status). smithii_vesting: null for merkle receivers. */
  recipient:               string | null;
  /** sablier_lockup only (null for other programs). */
  holder_status:           TokenLockHolderStatus | null;
  /** sablier_lockup only: last holder a read proved — provenance, NOT the recipient unless holder_status is current. */
  last_proven_holder:      string | null;
  /** sablier_lockup only: slot of the read that last proved last_proven_holder. */
  holder_proven_at_slot:   number | null;
  name:                    string | null;
  /** Deposited amount. */
  amount_raw:              string;
  amount:                  number | null;
  amount_usd:              number | null;
  /** 2026-10-02 — the token price behind every `*_usd` field (null when unknown, stale or phantom). */
  price_usd:               number | null;
  /** % of CURRENT supply; null when unknown or above 100.5 (supply changed since the deposit). */
  amount_pct_of_supply:    number | null;
  /** Still locked right now (amount − unlocked-so-far); "0" unless active. */
  locked_raw:              string;
  locked:                  number | null;
  locked_usd:              number | null;
  locked_pct_of_supply:    number | null;
  unlocked_raw:            string;
  unlocked:                number | null;
  /** Claimed so far, read from the contract's own state; null when the program does not expose it (withdrawn_tracked false: smithii_vesting). */
  withdrawn_raw:           string | null;
  withdrawn:               number | null;
  /** false = withdrawn / claimable are unknown (null), not zero. */
  withdrawn_tracked:       boolean;
  /** Unlocked but not yet withdrawn; null when withdrawn is not tracked. */
  claimable_raw:           string | null;
  claimable:               number | null;
  start_at:                string | null;
  cliff_at:                string | null;
  /** Fully unlocked at; null = perpetual / no schedule. */
  end_at:                  string | null;
  /** 2026-10-02 — seconds until fully unlocked (>= 0); 0 once completed; null when perpetual or cancelled / closed. */
  seconds_until_end:       number | null;
  /** 2026-10-02 — seconds until `next_unlock.at` (>= 0); null without a next unlock. */
  seconds_until_next_unlock: number | null;
  period_seconds:          number | null;
  /** period < 1h (per-second stream, e.g. Streamflow payroll). */
  continuous:              boolean;
  amount_per_period_raw:   string | null;
  amount_per_period:       number | null;
  cliff_amount_raw:        string | null;
  cliff_amount:            number | null;
  perpetual:               boolean;
  next_unlock:             TokenLockNextUnlock | null;
  /** Bonfida vesting only: the tranche list (absent on other programs). */
  schedule?:               TokenLockTranche[];
  /** The locker can cancel — funds are locked against the RECIPIENT, not the locker (a weaker promise). */
  cancelable_by_sender:    boolean | null;
  cancelable_by_recipient: boolean | null;
  transferable:            boolean | null;
  can_topup:               boolean | null;
  cancelled_at:            string | null;
  created_at:              string | null;
  /** Backfilled row with no on-chain creation time (Jupiter Lock). */
  created_at_estimated:    boolean;
  tx_signature:            string | null;
}

/** A lock row on the cross-token feed — the contract plus its mint's facts. */
export interface TokenLockFeedEntry extends TokenLock {
  token: TokenLockToken;
}

/** Rollup over ALL contracts on a mint (the `status` / `program` filters only narrow `locks[]`). */
export interface TokenLocksSummary {
  /** Exact count of contracts on the mint. */
  lock_count:                  number;
  /** false when the mint holds more than 5000 contracts — totals then cover the newest 5000 (`rows_considered`). */
  complete:                    boolean;
  rows_considered:             number;
  active_count:                number;
  by_program:                  Record<string, number>;
  by_kind:                     Record<string, number>;
  distinct_lockers:            number;
  locked_raw:                  string;
  locked:                      number | null;
  locked_usd:                  number | null;
  locked_pct_of_supply:        number | null;
  deposited_raw:               string;
  deposited:                   number | null;
  deposited_usd:               number | null;
  /** Forward unlock schedule — everything releasing in the next 7 / 30 days. */
  unlocking_7d_raw:            string;
  unlocking_7d:                number | null;
  unlocking_7d_usd:            number | null;
  unlocking_7d_pct_of_supply:  number | null;
  unlocking_30d_raw:           string;
  unlocking_30d:               number | null;
  unlocking_30d_usd:           number | null;
  unlocking_30d_pct_of_supply: number | null;
  /** Nearest next unlock across all active contracts. */
  next_unlock:                 (TokenLockNextUnlock & { lock_account: string }) | null;
  /** Active contracts the sender can still cancel (pull the funds back). */
  active_cancelable_by_sender: number;
}

/** Query params for GET /tokens/{mint}/locks. */
export interface TokenLocksParams {
  /** Filter the list (the summary always covers all rows). */
  status?:  TokenLockStatus;
  program?: TokenLockProgram;
  /** 1–500, default 200. */
  limit?:   number;
}

/**
 * GET /tokens/{mint}/locks — every on-chain lock / vesting contract on a mint
 * (Streamflow, Jupiter Lock, Bonfida vesting) with a live-derived view + summary.
 * **LP locks are NOT included** (token / vesting locks only). PRO+, keyed only.
 */
export interface TokenLocksResponse {
  mint:    string;
  token:   TokenLockToken & { supply: number | null; facts_resolved: boolean };
  summary: TokenLocksSummary;
  locks:   TokenLock[];
  meta?:   Record<string, unknown>;
}

/** Query params for GET /tokens/locks (cross-token feed of NEW contracts). */
export interface TokenLocksFeedParams {
  /** ISO date-time — only contracts created after this instant (use `pagination.next_since`). */
  since?:             string;
  /** ISO date-time — page back: only contracts created before this instant (`pagination.next_before`). Legacy + strict: skips same-timestamp siblings — prefer `cursor`. */
  before?:            string;
  /** v1.24 — opaque `pagination.next_cursor` from the previous page: strict (created_at, id) keyset, no repeats, no skips. Not combinable with `before`. */
  cursor?:            string;
  mint?:              string;
  sender?:            string;
  recipient?:         string;
  program?:           TokenLockProgram;
  kind?:              TokenLockKind;
  status?:            TokenLockStatus;
  /** Deposited amount in USD ≥ (needs a known price; post-filter). */
  min_usd?:           number;
  /** 0–100 (post-filter). */
  min_pct_of_supply?: number;
  /** Include backfilled Jupiter Lock rows that have no on-chain creation time (default: excluded). */
  include_estimated?: boolean;
  /** 1–100, default 50. */
  limit?:             number;
}

/** Cursor pagination on the ISO-timestamp feeds. */
export interface TokenFeedPagination {
  limit:       number;
  count:       number;
  has_more:    boolean;
  /** Pass as `since` to fetch only what is newer. */
  next_since:  string | null;
  /** Pass as `before` to page back. */
  next_before: string | null;
}

/** The locks feed's pagination: adds the strict keyset cursor and the post-filter scan meta. (Earlier types put these on every feed; the fee-claims and surges routes never send them.) */
export interface TokenLocksFeedPagination extends TokenFeedPagination {
  /** v1.24 — pass as `cursor` to page back without skipping same-timestamp rows; null = end. */
  next_cursor?: string | null;
  /** v1.24 — present when a post-filter (min_usd / min_pct_of_supply / status) was scanned. */
  post_filtered?: boolean;
  scanned?: number;
  scan_truncated?: boolean;
  scan_budget?: number;
}

/** WebSocket pointer returned by the feed endpoints — the same rows are pushed live on `channel`. */
export interface TokenFeedStreamPointer {
  channel:         string;
  url:             string;
  token_endpoint?: string;
  subscribe?:      { type: "subscribe"; channels: string[] };
  note?:           string;
}

/** GET /tokens/locks — newest lock / vesting contracts across all mints. PRO+, keyed only. */
export interface TokenLocksFeedResponse {
  locks:      TokenLockFeedEntry[];
  pagination: TokenLocksFeedPagination;
  /** v1.24 — "mint_facts:<table>" when a per-mint enrichment read failed; those rows' usd/ui/pct are null (unknown) and min_usd / min_pct_of_supply could not be applied to them. */
  degraded_fields?: string[];
  /** Pointer to the `token:locks` WS channel (event `token:lock`). */
  stream:     TokenFeedStreamPointer;
  meta?:      Record<string, unknown>;
}

/** Look-ahead window for GET /tokens/unlocks. */
export type TokenUnlocksWithin = "1h" | "6h" | "24h" | "3d" | "7d" | "14d" | "30d" | "90d";

/** Query params for GET /tokens/unlocks. */
export interface TokenUnlocksParams {
  /** Default "7d". */
  within?:            TokenUnlocksWithin;
  mint?:              string;
  program?:           TokenLockProgram;
  kind?:              TokenLockKind;
  /** Next-event amount in USD ≥ (needs a known price). */
  min_usd?:           number;
  /** 0–100. */
  min_pct_of_supply?: number;
  /** Default "soonest". */
  sort?:              "soonest" | "largest_usd" | "largest_pct";
  /** 1–200, default 50. */
  limit?:             number;
}

/**
 * One upcoming unlock — the NEXT event of an active contract inside the window,
 * plus that contract's total release over the whole window (`window_amount_*`).
 */
export interface TokenUnlockEvent {
  unlock_at:                   string;
  in_seconds:                  number;
  event:                       TokenUnlockEventKind;
  amount_raw:                  string;
  amount:                      number | null;
  amount_usd:                  number | null;
  amount_pct_of_supply:        number | null;
  window_amount_raw:           string;
  window_amount:               number | null;
  window_amount_usd:           number | null;
  window_amount_pct_of_supply: number | null;
  mint:                        string;
  token:                       TokenLockToken;
  /** The contract this event belongs to (a subset of the {@link TokenLock} row). */
  lock: Pick<TokenLock,
    | "lock_account" | "program" | "kind" | "name" | "sender" | "recipient"
    | "amount_raw" | "amount" | "amount_usd" | "locked_raw" | "locked" | "locked_usd"
    | "cliff_at" | "end_at" | "period_seconds" | "continuous" | "cancelable_by_sender">;
}

/** GET /tokens/unlocks — upcoming unlock events across all active contracts. PRO+, keyed only. */
export interface TokenUnlocksResponse {
  window:     { within: TokenUnlocksWithin; from: string; to: string };
  unlocks:    TokenUnlockEvent[];
  pagination: { limit: number; count: number; total_in_window: number; has_more: boolean };
  meta?:      Record<string, unknown>;
}

/**
 * Payload of a `token:lock` WS event (channel `token:locks`) — pushed by the
 * lock-tracker the moment a NEW contract's account is first seen (~seconds after
 * the create tx). A compact writer payload, NOT the full live-derived REST row:
 * poll GET /tokens/{mint}/locks for the live state. Updates (claims / cancels /
 * closes) are NOT pushed on a plain subscription — since 2026-09-23 they are
 * opt-in lifecycle events on the same channel (`filters.lifecycle: true`, see
 * {@link TokenLockLifecycleFilters} / {@link TokenLockLifecycleEvent}).
 */
export interface TokenLockStreamEvent {
  lock_account: string;
  program:      TokenLockProgram;
  mint:         string;
  kind:         TokenLockKind;
  sender:       string | null;
  recipient:    string | null;
  /** Base-unit STRING. */
  amount_raw:   string;
  /** May be null on the very first sighting of a mint. */
  decimals:     number | null;
  start_at:     string | null;
  cliff_at:     string | null;
  end_at:       string | null;
  name:         string | null;
  tx_signature: string | null;
  slot:         number | null;
  created_at:   string;
}

/* ── Lock lifecycle on `token:locks` (WS Phase 3, 2026-09-23 — opt-in) ── */

/** Lifecycle event names delivered on `token:locks` to a subscription with `filters.lifecycle: true`. */
export type TokenLockLifecycleEventName =
  | "token:lock_claimed"
  | "token:lock_cancelled"
  | "token:lock_closed"
  | "token:lock_updated"
  | "token:unlock_upcoming"
  | "token:unlock_available";

/** Kind of unlock instant a schedule event describes. */
export type TokenUnlockKind = "cliff" | "period" | "final" | "tranche";

/**
 * Subscribe filters that switch `token:locks` to lifecycle mode. Without
 * `lifecycle: true` the channel carries only today's `token:lock` create event,
 * byte-identical. Every key is per (named) subscription and AND-combined; a
 * malformed value refuses the channel (`channels_rejected`) or the update
 * (`invalid_filters`), never widens it.
 */
export interface TokenLockLifecycleFilters {
  lifecycle: true;
  /** Subset of the lifecycle event names to receive. Create events (`token:lock`) always pass. */
  events?: TokenLockLifecycleEventName[];
  /** Narrows schedule events (`token:unlock_*`) only. */
  unlock_kinds?: TokenUnlockKind[];
  /**
   * Default false. Streamflow automatic-withdrawal streams are cranked by the
   * program's keeper many times a day (real transfers, ~90 % of all claims);
   * those `token:lock_claimed` events are hidden unless this is true.
   */
  include_automatic_claims?: boolean;
  /** Token scope for creates AND lifecycle events (≤ 500). Applied only with `lifecycle: true`. */
  mints?: string[];
}

/** Fields every Solana lifecycle event carries. `id` on the frame = `<event>:<event_key>`. */
export interface TokenLockLifecycleBase {
  /** Durable dedupe key: `<lock_account>:<type>:<slot>[:<change>]` (diffs) or `<lock_account>:<type>:<unlock epoch s>` (schedule). */
  event_key:    string;
  lock_account: string;
  mint:         string;
  program:      TokenLockProgram;
  /** Slot of the account update (null on schedule events). */
  slot:         number | null;
  /** When the tracker observed it (ISO). */
  observed_at:  string | null;
  /** The token's decimals; null when unknown. */
  decimals?:    number | null;
}

/** `token:lock_claimed` — withdrawn increased since OUR last observed state. */
export interface TokenLockClaimedEvent extends TokenLockLifecycleBase {
  /** Δ withdrawn since the last observed state (a claim during a stream gap folds into the next one). Raw string. */
  claimed_raw:          string;
  withdrawn_raw:        string;
  /** amount − withdrawn. */
  remaining_raw:        string;
  partial:              boolean;
  /** Streamflow keeper-cranked withdrawal (hidden unless `include_automatic_claims`). */
  automatic_withdrawal: boolean | null;
  before:               { withdrawn_raw: string };
  after:                { withdrawn_raw: string };
  tx_signature:         string | null;
}

/** `token:lock_cancelled`. */
export interface TokenLockCancelledEvent extends TokenLockLifecycleBase {
  cancelled_at:  string;
  withdrawn_raw: string | null;
  amount_raw:    string | null;
  before:        { cancelled_at: null; status: TokenLockStatus | null };
  after:         { cancelled_at: string; status: TokenLockStatus | null };
  tx_signature:  string | null;
}

/** `token:lock_closed` — Streamflow `closed` flag, or the account closed on chain. */
export interface TokenLockClosedEvent extends TokenLockLifecycleBase {
  reason:         "closed_flag" | "account_closed";
  withdrawn_raw?: string | null;
  amount_raw?:    string | null;
  before:         { status: TokenLockStatus | null };
  after:          { status: "closed" };
  tx_signature:   string | null;
}

/** `token:lock_updated` — one event per change, never merged; `before` / `after` hold only the changed fields. */
export interface TokenLockUpdatedEvent extends TokenLockLifecycleBase {
  change:       "topup" | "extended" | "schedule_changed" | "recipient_changed";
  /** `topup` only: amount added (raw string). */
  added_raw?:   string;
  /** `schedule_changed` only: cliff_at / period_seconds / amount_per_period_raw / cliff_amount_raw / end_at. */
  fields?:      string[];
  before:       Record<string, string | number | null>;
  after:        Record<string, string | number | null>;
  tx_signature: string | null;
}

/**
 * `token:unlock_upcoming` (the lock's next unlock is within 24 h) /
 * `token:unlock_available` (the unlock instant passed within the last 30 min).
 * `available` means claimable PER THE SCHEDULE, NOT claimed.
 */
export interface TokenUnlockScheduleEvent extends TokenLockLifecycleBase {
  unlock_at:          string;
  unlock_kind:        TokenUnlockKind;
  /** Discrete jump unlocking at that instant (GET /tokens/unlocks model); null + `amount_reason` when unknown. */
  amount_raw:         string | null;
  amount_reason:      string | null;
  unlocked_total_raw: string | null;
  release_model:      "periodic" | "continuous" | "tranched";
  /** Only on `token:unlock_available`. */
  claimable?:         true;
  kind:               TokenLockKind | null;
  sender:             string | null;
  recipient:          string | null;
  locked_amount_raw:  string | null;
  withdrawn_raw:      string | null;
}

/** Any lifecycle payload on `token:locks` — narrow on the frame's `event`. */
export type TokenLockLifecycleEvent =
  | TokenLockClaimedEvent
  | TokenLockCancelledEvent
  | TokenLockClosedEvent
  | TokenLockUpdatedEvent
  | TokenUnlockScheduleEvent;

/* ── WS Phase 4 (2026-09-23): live candles, risk inputs, wallet scores ── */

/**
 * `token:candles` subscribe filters (PRO+). `mints` is REQUIRED (base58) and
 * capped per CONNECTION across named subscriptions — PRO 25 / ULTRA 100 /
 * BUSINESS 250, a budget separate from `token:prices`. Over the cap, a missing
 * scope or a non-boolean `updates` rejects the channel, never truncates.
 */
export interface TokenCandlesFilters {
  mints: string[];
  /** Also receive the in-progress minute as `candle:update` (a state stream). Default false. */
  updates?: boolean;
}

/**
 * `candle:closed` frame `data` on `token:candles` — the STORED 1-minute row
 * (`token_ohlc_1m`), identical live and on a durable resume. Every key is
 * always present (null when unknown). Frame id =
 * `candle:solana:<mint>:<bucket_start epoch s>` (not event-prefixed). A fully
 * flat zero-trade candle (o = h = l = c, trades 0) is never emitted.
 */
export interface TokenCandleClosedEvent {
  chain:               "solana";
  mint:                string;
  bucket_start:        string;
  /** bucket_start + 60 s. */
  bucket_end:          string;
  /** When the row was first written (≈ ≤ 25 s after bucket_end). */
  closed_at:           string | null;
  open_price_usd:      number | null;
  high_price_usd:      number | null;
  low_price_usd:       number | null;
  close_price_usd:     number | null;
  open_mc_usd:         number | null;
  high_mc_usd:         number | null;
  low_mc_usd:          number | null;
  close_mc_usd:        number | null;
  open_liquidity_usd:  number | null;
  close_liquidity_usd: number | null;
  close_supply:        number | null;
  volume_usd:          number | null;
  volume_mev_usd:      number | null;
  buy_volume_usd:      number | null;
  sell_volume_usd:     number | null;
  trades:              number | null;
  buy_count:           number | null;
  sell_count:          number | null;
  dex:                 string | null;
  pool_address:        string | null;
  write_id:            string | null;
  final:               true;
  source:              "token_ohlc_1m";
}

/**
 * `candle:update` frame `data` (only with `filters.updates: true`) — the
 * producer's in-progress minute, ≤ 1 per mint per second. A state stream: no
 * id / seq, never replayed, no snapshot on subscribe.
 */
export interface TokenCandleUpdateEvent {
  chain:           "solana";
  mint:            string;
  bucket_start:    string;
  bucket_end:      string;
  open_price_usd:  number | null;
  high_price_usd:  number | null;
  low_price_usd:   number | null;
  close_price_usd: number | null;
  close_mc_usd:    number | null;
  volume_usd:      number | null;
  trades:          number | null;
  final:           false;
  /** The producer's timestamp of this state (ISO). */
  as_of:           string | null;
  source:          "mc-tracker:open_candle";
}

/** Event types on `token:risk`. */
export type TokenRiskEventName = "risk:authority_changed" | "risk:supply_inflated";

/**
 * `token:risk` subscribe filters (PRO+). `mints` is REQUIRED (base58), capped
 * per connection PRO 25 / ULTRA 100 / BUSINESS 250. Invalid values reject the
 * channel (`channels_rejected`) or the whole update (`invalid_filters`).
 */
export interface TokenRiskFilters {
  mints: string[];
  /** Non-empty subset of the channel's event types. */
  risk_events?: TokenRiskEventName[];
  /** Send one `risk:inputs` snapshot per mint on subscribe / scope change / resume. Default true. */
  risk_snapshot?: boolean;
}

/**
 * `risk:authority_changed` — the stored mint / freeze authority went from not
 * revoked to revoked (once per mint + field, ever), or the Token-2022 transfer
 * fee changed with both values known. Never a re-enable, never a first
 * observation. Frame id = `risk:authority_changed:<event_key>`.
 */
export interface TokenRiskAuthorityChangedEvent {
  chain:                    "solana";
  mint:                     string;
  /** `<mint>:mint_authority:revoked` | `<mint>:freeze_authority:revoked` | `<mint>:transfer_fee:<before>><after>:<observed_at ms>`. */
  event_key:                string;
  field:                    "mint_authority" | "freeze_authority" | "transfer_fee";
  /** `{revoked}` for the authorities, `{transfer_fee_bps}` for the fee. */
  before:                   { revoked: boolean } | { transfer_fee_bps: number };
  after:                    { revoked: boolean } | { transfer_fee_bps: number };
  /** The full picture after the change. */
  mint_authority_revoked:   boolean | null;
  freeze_authority_revoked: boolean | null;
  transfer_fee_bps:         number | null;
  is_token_2022:            boolean | null;
  /** When mc-tracker parsed the mint account that showed the change. */
  observed_at:              string | null;
  /** The parse before: the change happened on chain in between. */
  previous_observed_at:     string | null;
  written_at:               string;
  slot:                     null;
  source:                   "token_prices";
}

/**
 * `risk:supply_inflated` — the first `supply_drift_events` row for the mint
 * reaching a level (warn 0.5 % / danger 5 %). Per-observation drift, not a
 * cumulative inflation. Frame id = `risk:supply_inflated:<event_key>`.
 */
export interface TokenRiskSupplyInflatedEvent {
  chain:               "solana";
  mint:                string;
  /** `<mint>:supply_inflated:warn` | `<mint>:supply_inflated:danger`. */
  event_key:           string;
  level:               "warn" | "danger";
  /** 0.5 (warn) | 5 (danger). */
  threshold_pct:       number;
  /** drift / expected of one drift row, in percent, 4 dp. */
  inflation_pct:       number;
  /** Integer strings. */
  expected_supply_raw: string;
  onchain_supply_raw:  string;
  drift_raw:           string;
  detected_at:         string;
  drift_event_id:      number;
  window_days:         30;
  written_at:          string;
  slot:                null;
  source:              "supply_drift_events";
}

/**
 * `risk:inputs` snapshot frame `data` (frame `snapshot: true`, no id / seq):
 * the CURRENT stored risk inputs of one scoped mint. Not the score or band —
 * `GET /tokens/{mint}/risk` computes those.
 */
export interface TokenRiskInputsSnapshot {
  chain:                    "solana";
  mint:                     string;
  /** false = the mint is not in the price table (every input null). */
  tracked:                  boolean;
  mint_authority_revoked:   boolean | null;
  freeze_authority_revoked: boolean | null;
  transfer_fee_bps:         number | null;
  is_token_2022:            boolean | null;
  authority_observed_at:    string | null;
  /** Worst positive supply drift in the last 30 days; null when none. `level` null below 0.5 %. */
  supply_inflation: {
    inflation_pct: number;
    level:         "warn" | "danger" | null;
    detected_at:   string | null;
    window_days:   30;
  } | null;
  source: "token_prices+supply_drift_events";
}

/** Any event payload on `token:risk` — narrow on the frame's `event`. */
export type TokenRiskEvent = TokenRiskAuthorityChangedEvent | TokenRiskSupplyInflatedEvent;

/** Event types on `wallet:scores`. */
export type WalletScoreEventName = "deployer:tier_changed" | "kol:score_state_changed";

/**
 * `wallet:scores` subscribe filters (PRO+). `wallets` is REQUIRED — base58
 * deployer or KOL wallets — capped per connection per chain PRO 25 / ULTRA 100
 * / BUSINESS 250. A subscription that also holds `rhc:wallet_scores` may mix
 * in 0x addresses; an entry of a chain the subscription does not hold is refused.
 */
export interface WalletScoresFilters {
  wallets: string[];
  /** Optional subset of the held channels' event types (e.g. `"rhc:deployer_tier_changed"` when mixing chains). */
  score_events?: Array<WalletScoreEventName | "rhc:deployer_tier_changed">;
}

/**
 * Where a score event came from. `computed_at` means "recomputed at T", not
 * "changed at T": `live_write` = a bond / deploy re-classified the deployer
 * (real time); `scheduled_recompute` = the 6-hourly stats worker (can lag the
 * stats by hours); `matview_refresh` = the KOL diff after each 10-min refresh.
 */
export type WalletScoreSource = "live_write" | "scheduled_recompute" | "matview_refresh";

/** Solana deployer tier values on `deployer:tier_changed`. */
export type DeployerTierChangeValue = "elite" | "good" | "rising" | "moderate" | "cold" | "unranked";

/**
 * `deployer:tier_changed` — `deployers.tier` changed. Frame id =
 * `deployer:tier_changed:<event_key>`. A wallet appearing is not an event;
 * entering a ranked tier is (`entered_ranking: true`, `tier_before: "unranked"`).
 */
export interface DeployerTierChangedEvent {
  /** `<wallet>:<tier_before>><tier_after>:<txid>`. */
  event_key:       string;
  chain:           "solana";
  wallet:          string;
  tier_before:     DeployerTierChangeValue | null;
  tier_after:      DeployerTierChangeValue | null;
  entered_ranking: boolean;
  is_tracked:      boolean | null;
  /** As of the write. */
  stats: {
    total_tokens_deployed: number | null;
    total_bonded:          number | null;
    instant_bonds:         number | null;
    bonding_rate:          number | null;
    recent_bond_rate:      number | null;
    recent_outcomes:       string | null;
  };
  computed_at: string;
  source:      WalletScoreSource;
}

/** The categorical KOL score fields diffed on `kol:score_state_changed`. */
export interface KolScoreState {
  is_cold:           boolean | null;
  is_heating_up:     boolean | null;
  auto_strategy_tag: KolStrategy | null;
}

/**
 * `kol:score_state_changed` — one event per KOL per `mv_kol_scores` refresh
 * where `is_cold`, `is_heating_up` or `auto_strategy_tag` differs (fields never
 * split). Frame id = `kol:score_state_changed:<event_key>`.
 */
export interface KolScoreStateChangedEvent {
  /** `<wallet>:<computed_at epoch ms>`. */
  event_key:     string;
  chain:         "solana";
  wallet:        string;
  kol_wallet_id: string | null;
  kol_name:      string | null;
  /** All three for a KOL first seen after the seed. */
  changed:       Array<keyof KolScoreState>;
  /** null for a first appearance. */
  before:        KolScoreState | null;
  after:         KolScoreState;
  computed_at:   string;
  source:        "matview_refresh";
  matview:       "mv_kol_scores";
}

/** Any event payload on `wallet:scores` — narrow on the frame's `event`. */
export type WalletScoreEvent = DeployerTierChangedEvent | KolScoreStateChangedEvent;

/* ── pump.fun creator-fee sharing & fee claims — GET /tokens/{mint}/fee-shares, /tokens/fee-claims ── */

/** pump.fun fee event types (`creator_claim` and `holder_distribution` are excluded from the feed unless requested via `type=`). */
export type TokenFeeEventType =
  | "shares_created"
  | "shares_updated"
  | "shares_reset"
  | "distribution"
  | "social_pda_created"
  | "social_claim"
  | "creator_transferred"
  | "creator_claim"
  /** pump.fun DistributeFeeToHolders: creator fees airdropped pro-rata to holders (amount = total, payload.recipients = holder count). History from 2026-09-13. */
  | "holder_distribution";

/** A shareholder on a SharingConfig: `{ address, share_bps }` (bps of the creator fee). */
export interface TokenFeeShareEntry {
  address:   string;
  share_bps: number;
}

/**
 * A pump_fees SocialFeePda — fees earmarked for a platform identity (platform 2 = X;
 * `user_id` is the platform-native numeric id, NOT the handle) until the identity's
 * owner claims them.
 */
export interface TokenFeeSocialIdentity {
  platform:             number;
  /** "x" for platform 2; `platform_<n>` for platforms not yet observed. */
  platform_label:       string | null;
  user_id:              string;
  /** Base-unit STRING (quote lamports). */
  lifetime_claimed_raw: string;
  lifetime_claimed:     number | null;
  lifetime_claimed_usd: number | null;
  last_claimed_at:      string | null;
}

/** One shareholder / recipient of a coin's creator fees, with what it has received so far. */
export interface TokenFeeShareholder {
  address:        string;
  /** null for a past recipient no longer in the split. */
  share_bps:      number | null;
  share_pct:      number | null;
  /** The config admin (normally the coin creator). */
  is_admin:       boolean;
  /** Address is a pump_fees SocialFeePda — fees earmarked for a platform identity. */
  is_social_pda:  boolean;
  social:         TokenFeeSocialIdentity | null;
  /** Total received via distributions since 2026-08-17 — base-unit STRING. */
  received_raw:   string;
  received:       number | null;
  received_usd:   number | null;
  payout_count:   number;
  last_payout_at: string | null;
}

/** The on-chain SharingConfig of a pump.fun coin (pump_fees PDA ["sharing-config", mint]). */
export interface TokenFeeSharingConfig {
  sharing_config: string;
  admin:          string | null;
  admin_revoked:  boolean | null;
  status:         string | null;
  version:        number | null;
  /** true = 100% to the admin, no redirect (pump creates one per coin — a real answer, not "unknown"). */
  is_default:     boolean | null;
  /** Share going to NON-admin addresses. */
  redirected_bps: number;
  redirected_pct: number;
  /** Share going to social PDAs. */
  social_bps:     number;
  social_pct:     number;
  shareholders:   TokenFeeShareholder[];
  /** `stream` = our table (only non-default configs are stored); `chain` = live PDA read. */
  source:         "stream" | "chain";
  updated_at:     string | null;
}

/** Config change / creator transfer on the fee-shares history log. */
export interface TokenFeeShareHistoryEntry {
  id:           number;
  type:         TokenFeeEventType;
  at:           string;
  tx_signature: string;
  actor:        string | null;
  admin:        string | null;
  recipient:    string | null;
  shareholders: TokenFeeShareEntry[] | null;
  amount_raw:   string | null;
  amount:       number | null;
  social:       { platform: number; platform_label: string | null; user_id: string; pda: string | null } | null;
  /** Full decoded Anchor event. */
  payload:      Record<string, unknown> | null;
}

/** One `distribute_creator_fees` payout on the fee-shares view. */
export interface TokenFeeDistribution {
  at:           string;
  tx_signature: string;
  amount_raw:   string;
  amount:       number | null;
  amount_usd:   number | null;
  shareholders: TokenFeeShareEntry[] | null;
  actor:        string | null;
}

/**
 * GET /tokens/{mint}/fee-shares — pump.fun creator-fee sharing on a coin: who the
 * fees are redirected to (SharingConfig), the distribution rollup per recipient,
 * the config change log and recent payouts. **Event history starts 2026-08-17.**
 * PRO+, keyed only.
 */
export interface TokenFeeSharesResponse {
  mint:         string;
  /** null when the live read failed on every RPC endpoint (see `config_error`). */
  config:       TokenFeeSharingConfig | null;
  config_pda:   string;
  config_error: string | null;
  /** Quote asset the fees are paid in (SOL unless a stable-quoted coin). */
  quote:        { symbol: string; decimals: number; sol_usd: number | null };
  distributions: {
    count:              number;
    total_raw:          string;
    total:              number | null;
    total_usd:          number | null;
    last_at:            string | null;
    /** Everyone who received a payout (current + past shareholders), largest first. */
    recipients:         TokenFeeShareholder[];
    /** Recipients no longer in the split. */
    past_recipients:    TokenFeeShareholder[];
    payouts_considered: number;
    payouts_truncated:  boolean;
  };
  /** Config changes + creator transfers, newest first (max 100). */
  history:              TokenFeeShareHistoryEntry[];
  recent_distributions: TokenFeeDistribution[];
  meta?:                Record<string, unknown>;
}

/** Query params for GET /tokens/fee-claims. */
export interface TokenFeeClaimsParams {
  /** Comma list of {@link TokenFeeEventType} (default: all except `creator_claim`). */
  type?:            string;
  mint?:            string;
  /** Payout / claim recipient wallet, or the new creator. */
  recipient?:       string;
  /** Transaction signer. */
  actor?:           string;
  /** Raw platform id (2 = X). */
  social_platform?: number;
  /** Platform-native numeric user id. */
  social_user_id?:  string;
  /** Amount floor in SOL. */
  min_sol?:         number;
  /** ISO date-time (use `pagination.next_since`). */
  since?:           string;
  /** ISO date-time (use `pagination.next_before`). */
  before?:          string;
  /** 1–100, default 50. */
  limit?:           number;
}

/** Pro-rata payout to one shareholder inside a `distribution` event. */
export interface TokenFeePayout {
  address:    string;
  share_bps:  number;
  amount_raw: string;
  amount:     number | null;
  amount_usd: number | null;
}

/** One decoded pump.fun fee event on the feed. Amounts are quote base units (SOL lamports unless a stable-quoted coin) as STRINGS. */
export interface TokenFeeClaimEvent {
  id:           number;
  type:         TokenFeeEventType;
  at:           string;
  tx_signature: string;
  slot:         number | null;
  /** null for social claims and creator vault claims (per identity / per creator). */
  mint:         string | null;
  admin:        string | null;
  /** Transaction signer. */
  actor:        string | null;
  recipient:    string | null;
  amount_raw:   string | null;
  amount:       number | null;
  amount_usd:   number | null;
  /** Quote symbol, e.g. "SOL". */
  quote:        string;
  social:       { platform: number; platform_label: string | null; user_id: string; pda: string | null } | null;
  shareholders: TokenFeeShareEntry[] | null;
  /** `distribution` only: pro-rata amount per shareholder. */
  payouts:      TokenFeePayout[] | null;
  /** Full decoded Anchor event. */
  payload:      Record<string, unknown> | null;
}

/** GET /tokens/fee-claims — pump.fun fee-event feed, newest first. **History starts 2026-08-17.** PRO+, keyed only. */
export interface TokenFeeClaimsResponse {
  events:     TokenFeeClaimEvent[];
  pagination: TokenFeedPagination;
  /** Pointer to the `token:fee_claims` WS channel (event `token:fee_claim`). */
  stream:     TokenFeedStreamPointer;
  meta?:      Record<string, unknown>;
}

/**
 * Payload of a `token:fee_claim` WS event (channel `token:fee_claims`) — pushed by
 * the fee-claim-tracker the moment the tx confirms. A compact writer payload (flat
 * `event_type` / `block_time` / `social_*` fields), NOT the enriched REST row —
 * no ui / usd amounts or `payouts[]`; call GET /tokens/fee-claims for those.
 */
export interface TokenFeeClaimStreamEvent {
  id:             number;
  event_type:     TokenFeeEventType;
  tx_signature:   string;
  slot:           number | null;
  /** The event's own on-chain timestamp. */
  block_time:     string;
  /** null for social claims and creator vault claims. */
  mint:           string | null;
  sharing_config: string | null;
  admin:          string | null;
  actor:          string | null;
  recipient:      string | null;
  /** Quote base units as a STRING (SOL lamports unless a stable-quoted coin). */
  amount_raw:     string | null;
  quote_mint:     string | null;
  social_platform: number | null;
  social_user_id:  string | null;
  social_fee_pda:  string | null;
  shareholders:   TokenFeeShareEntry[] | null;
}

/* ── Token surges & revivals (token momentum fires, v1.28) ── */

export type TokenSurgeKind = "surge" | "revival";
/** Surge tiers — each fires at most once per mint; tiers are independent. `null` on revivals. */
export type TokenSurgeTier = "early" | "strong" | "breakout";
/** How the token's birth was established (surge only). */
export type TokenSurgeBirthSource = "sniper" | "deployer" | "first_seen";
/** `launch` = first MC sample ≤ 90 s after birth (multiple applied); `late` = engine saw the token later (USD floor + velocity only). */
export type TokenSurgeBaselineSource = "launch" | "late";
/** Where the burst tape numbers were measured: 1-minute candles (every DEX), live `token_trades` (pump-pipeline mints), or nothing yet. */
export type TokenSurgeTapeSource = "candles" | "wallet_trades";
export type TokenSurgeRiskFlag =
  | "bundled_launch"
  | "few_buyers"
  | "wash_pattern"
  | "thin_liquidity"
  | "cold_deployer"
  | "sniper_heavy"
  | "early_buyers_exiting"
  | "sell_pressure"
  | "no_tape_trades"
  | "no_prior_price"
  | "mint_authority_active"
  | "transfer_fee";
export type TokenSurgeDeployerTier = "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";

/** Burst tape since birth (surge) or since the revival started. Counts are null when no tape covers the window yet. */
export interface TokenSurgeTape {
  since:                 string | null;
  /** false = no tape carries the window yet (candle lag) — every count below is null, and no tape-derived flag is set. */
  available:             boolean;
  source:                TokenSurgeTapeSource | null;
  buys:                  number | null;
  sells:                 number | null;
  trades:                number | null;
  buy_volume_usd:        number | null;
  sell_volume_usd:       number | null;
  volume_usd:            number | null;
  mev_volume_usd:        number | null;
  buy_sol:               number | null;
  sell_sol:              number | null;
  /** Only when the mint is in `token_trades` coverage (`wallet_data_available`) — never an inferred zero. */
  unique_buyers:         number | null;
  unique_wallets:        number | null;
  trades_per_wallet:     number | null;
  wallet_data_available: boolean;
}
export interface TokenSurgeKol {
  buyers: number;
  buys:   number;
  sells:  number;
  /** Up to 10 tracked-KOL names. */
  names:  string[];
}
/** First-20 early-buyer cohort (pump-pipeline facts; zeros for mints outside coverage). */
export interface TokenSurgeEarlyBuyers {
  count:          number;
  /** Early buyers that bought in the same block. */
  bundled:        number;
  cohort_sol:     number | null;
  /** Cohort wallets that have already sold. */
  sold:           number;
  /** Cohort wallets that are known sniper wallets. */
  sniper_wallets: number;
}
export interface TokenSurgeDeployer {
  wallet:         string | null;
  tier:           TokenSurgeDeployerTier | string;
  bonding_rate:   number | null;
  total_bonded:   number | null;
  total_deployed: number | null;
  runner_rate:    number | null;
  labeled_tokens: number | null;
  /** Recent outcome string, e.g. "BDDBBDDDBD" (B = bonded, D = dead). */
  recent:         string | null;
}

/**
 * One token momentum fire — the `token:surge` / `token:revival` WS + webhook payload and the
 * REST row minus `outcome`. Both kinds share one shape: `tier`, `baseline_*`, `mc_multiple`,
 * `mc_change_3m_pct` are null on revivals; `dormant_hours`, `prev_mc_usd`, `mc_vs_prev_multiple`
 * are null on surges.
 */
export interface TokenSurgeEvent {
  id:                       number | null;
  kind:                     TokenSurgeKind;
  tier:                     TokenSurgeTier | null;
  mint:                     string;
  symbol:                   string | null;
  name:                     string | null;
  /** Venue at birth / classification (e.g. `pumpfun`, `launchlab`, `bags`). */
  launchpad:                string | null;
  /** Where it trades at fire time (a pump token that graduated is `pumpswap` here, `pumpfun` above). */
  primary_dex:              string | null;
  fired_at:                 string;
  birth_at:                 string | null;
  birth_source:             TokenSurgeBirthSource | null;
  age_seconds:              number | null;
  market_cap_usd:           number;
  liquidity_usd:            number | null;
  liquidity_to_mc_ratio:    number | null;
  price_usd:                number | null;
  /** Surge only: launch MC (first sample after birth). */
  baseline_mc_usd:          number | null;
  baseline_source:          TokenSurgeBaselineSource | null;
  /** Surge only: `market_cap_usd ÷ baseline_mc_usd` — null when `baseline_source` is `late`. */
  mc_multiple:              number | null;
  /** Surge only: % above the lowest sample of the last 3 minutes. */
  mc_change_3m_pct:         number | null;
  /** Revival only. */
  dormant_hours:            number | null;
  /** Revival only: pre-dormancy candle close MC (null → `no_prior_price` flag). */
  prev_mc_usd:              number | null;
  mc_vs_prev_multiple:      number | null;
  peak_mc_usd:              number | null;
  pct_of_peak:              number | null;
  bonding_progress_pct:     number | null;
  is_bonded:                boolean | null;
  tape:                     TokenSurgeTape;
  kol:                      TokenSurgeKol;
  early_buyers:             TokenSurgeEarlyBuyers;
  deployer:                 TokenSurgeDeployer | null;
  deployer_wallet:          string | null;
  deployer_tier:            string | null;
  mint_authority_revoked:   boolean | null;
  freeze_authority_revoked: boolean | null;
  is_token_2022:            boolean | null;
  /** Empty = no flag raised, NOT verified clean; absence of data never produces a flag. */
  risk_flags:               TokenSurgeRiskFlag[];
  detail_url:               string;
  /** false = the enrichment round-trip failed; tape / kol / early_buyers / deployer are then empty. */
  enrichment_available?:    boolean;
}

/** +1 h outcome, present on REST rows ≥ 65 min old (pg_cron, from candles). */
export interface TokenSurgeOutcome {
  computed_at:           string;
  mc_usd_1h_after:       number | null;
  peak_mc_usd_1h_after:  number | null;
  low_mc_usd_1h_after:   number | null;
  mc_1h_multiple:        number | null;
  peak_1h_multiple:      number | null;
  /** false = no candle within the hour (the token stopped being priced) — NOT zero. */
  priced_after_1h:       boolean;
}
/** A REST row of `GET /tokens/surges`: the fire payload plus `outcome` (null until ≥ 65 min old). */
export type TokenSurgeFeedEntry = TokenSurgeEvent & { id: number; outcome: TokenSurgeOutcome | null };

export interface TokenSurgesParams {
  kind?:          TokenSurgeKind;
  /** Surge only — 400 with `kind: "revival"`. */
  tier?:          TokenSurgeTier;
  mint?:          string;
  /** ISO date-time — only fires after this instant (use `pagination.next_since`). */
  since?:         string;
  /** ISO date-time — page back (use `pagination.next_before`). */
  before?:        string;
  min_mc_usd?:    number;
  max_mc_usd?:    number;
  /** Tape buys at fire time ≥. */
  min_buys?:      number;
  launchpad?:     string;
  deployer_tier?: TokenSurgeDeployerTier;
  /** Comma list — rows carrying ANY of these flags are dropped (unknown flag → 400 + `known_flags`). */
  exclude_flags?: string;
  /** Only rows with no risk flags at all. */
  only_clean?:    boolean;
  /** Include per-(kind, tier) hit-rates over `days`. */
  stats?:         boolean;
  /** 1–30, default 7 (stats window). */
  days?:          number;
  /** 1–200, default 50. */
  limit?:         number;
}
/** Per-(kind, tier) hit-rate over the `stats` window — out-of-sample by construction. */
export interface TokenSurgeStatsRow {
  kind:                  TokenSurgeKind;
  tier:                  TokenSurgeTier | null;
  fires:                 number;
  with_outcome:          number;
  up_1h:                 number;
  up_1h_pct:             number | null;
  median_peak_multiple:  number | null;
  p75_peak_multiple:     number | null;
  median_mc_1h_multiple: number | null;
  doubled_1h:            number;
  doubled_1h_pct:        number | null;
}
export interface TokenSurgeStats {
  days: number;
  note: string;
  rows: TokenSurgeStatsRow[];
}
export interface TokenSurgesResponse {
  events:     TokenSurgeFeedEntry[];
  pagination: TokenFeedPagination;
  filters: {
    kind:          TokenSurgeKind | null;
    tier:          TokenSurgeTier | null;
    mint:          string | null;
    launchpad:     string | null;
    deployer_tier: string | null;
    min_mc_usd:    number | null;
    max_mc_usd:    number | null;
    min_buys:      number | null;
    exclude_flags: string[];
    only_clean:    boolean;
  };
  /** Present only when `stats` was requested. */
  stats?:     TokenSurgeStats;
  /** Pointer to the `token:surges` WS channel (events `token:surge` / `token:revival`). */
  stream:     TokenFeedStreamPointer;
  /** The live thresholds the engine fires on (read straight from the rule engine, so they cannot drift). */
  definitions: {
    surge:      Record<string, unknown>;
    revival:    Record<string, unknown>;
    shared:     Record<string, unknown>;
    risk_flags: Record<string, string>;
    tiers:      string[];
  };
  note:       string;
}
/** Frame delivered on the `token:surges` channel (events `token:surge` / `token:revival`) — the fire payload, no `outcome`. */
export type TokenSurgeStreamEvent = TokenSurgeEvent;

/* ── Deployer reputation history (daily time-series) ── */

/** One daily reputation snapshot for a deployer wallet. */
export interface DeployerHistorySnapshot {
  date:               string;
  tier:               string;
  is_tracked:         boolean;
  total_deployed:     number;
  total_bonded:       number;
  bonding_rate:       number | null;
  recent_bond_rate:   number | null;
  avg_peak_mc:        number | null;
  best_token_peak_mc: number | null;
}

/**
 * A deployer's daily reputation time-series — backtest "was this deployer elite
 * when it launched token X?" without look-ahead bias. PRO/ULTRA only.
 */
export interface DeployerHistoryResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  is_deployer: boolean;
  wallet:      string;
  snapshots:   DeployerHistorySnapshot[];
}

/* ── Deployer as-of (point-in-time reputation) ── */

/** The reputation snapshot current on the requested date. `snapshot_date` can be
 *  earlier than `requested_date` (snapshots are write-on-change); `carried: true`
 *  means the state was recorded earlier and had not changed by then. */
export interface DeployerAsOfSnapshot {
  snapshot_date:       string;
  carried:             boolean;
  tier:                string | null;
  is_tracked:          boolean | null;
  total_deployed:      number | null;
  total_bonded:        number | null;
  bonding_rate:        number | null;
  recent_bond_rate:    number | null;
  avg_peak_mc:         number | null;
  best_token_peak_mc:  number | null;
  captured_at:         string | null;
}

/** A deployer's reputation exactly as it stood on `requested_date` — no look-ahead,
 *  and never a synthesized row (`as_of: false, snapshot: null` before its first
 *  snapshot). PRO/ULTRA only. */
export interface DeployerAsOfResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  is_deployer:         boolean;
  wallet:              string;
  requested_date:      string;
  as_of:                boolean;
  snapshot:            DeployerAsOfSnapshot | null;
  first_snapshot_date: string | null;
  note:                string;
}

/* ── Deployer creator-fee rewards ── */

/** sol / usdc are summed separately (never mixed); usd is null (not 0) when a SOL
 *  amount exists and no SOL price was available. */
export interface DeployerRewardsMoney {
  sol:  number;
  usdc: number;
  usd:  number | null;
}

export interface DeployerRewardsRail extends DeployerRewardsMoney {
  count:    number;
  first_at: string | null;
  last_at:  string | null;
}

export interface DeployerRewardsSocial {
  platform: number;
  user_id:  string;
}

export interface DeployerRewardsTopToken {
  mint:        string;
  quote:       "SOL" | "USDC";
  total:       number;
  total_usd:   number | null;
  to_self:     number;
  to_self_usd: number | null;
  payouts:     number;
  recipients:  number;
  last_at:     string;
}

export interface DeployerRewardsTopRecipient {
  address:       string;
  quote:         "SOL" | "USDC";
  total:         number;
  total_usd:     number | null;
  tokens:        number;
  payouts:       number;
  last_at:       string;
  is_self:       boolean;
  is_social_pda: boolean;
  social:        DeployerRewardsSocial | null;
}

/**
 * pump.fun creator-fee rewards for a wallet, answered two ways that are never
 * merged: `collected` (what actually reached the wallet) and `attributed` (every
 * payout on the tokens it deployed, split `to_self`/`to_others`). Works for
 * non-deployers too (`is_deployer: false`, `attributed` empty). PRO/ULTRA only.
 */
export interface DeployerRewardsResponse {
  wallet:          string;
  is_deployer:     boolean;
  /** Tokens attributed to this wallet in our token table — the universe
   *  `attributed` is computed over. NOT the deployer profile's total deploy count. */
  tokens_in_scope: number;
  collected: DeployerRewardsMoney & {
    direct_claims: DeployerRewardsRail & { window_days: number };
    social_claims: DeployerRewardsRail;
    share_payouts: DeployerRewardsRail & { tokens: number; on_own_tokens: DeployerRewardsMoney };
  };
  attributed: DeployerRewardsRail & {
    to_self:              DeployerRewardsMoney;
    to_others:             DeployerRewardsMoney;
    redirected_pct:        number | null;
    tokens_with_payouts:   number;
    distributions:         number;
    recipients:            number;
  };
  top_tokens:      DeployerRewardsTopToken[];
  top_recipients:  DeployerRewardsTopRecipient[];
  quote:           { sol_usd: number | null };
  coverage:        { payouts_since: string; direct_claims_window_days: number; note: string };
}

export type DeployerActivityEventType =
  | "launch" | "dev_buy" | "dev_sell" | "creator_transferred" | "fee_claim" | "funding_in" | "capital_out";

/**
 * One event of a deployer's activity timeline. Fields present depend on
 * `type`; addresses are raw facts of the concrete event, never identity claims.
 */
export interface DeployerActivityEvent {
  id:          string;
  type:        DeployerActivityEventType;
  /** Time of the event itself (the window applies to this). */
  at:          string;
  time_basis:  "chain" | "ingest" | "chain_or_ingest";
  mint?:       string | null;
  name?:       string | null;
  symbol?:     string | null;
  launchpad?:  string | null;
  bonded_at?:  string | null;
  /** launch: whether the creator paid the create fee (null = unknown). The payer address is never in this response. */
  fee_payer_is_creator?: boolean | null;
  external_fee_payer?:   boolean | null;
  dev_buy_sol?:          number | null;
  dev_buy_tokens?:       number | null;
  dev_buy_supply_pct?:   number | null;
  own_token?:  boolean;
  sol?:        number | null;
  tokens?:     number | null;
  price_usd?:  number | null;
  first_at?:   string | null;
  last_at?:    string | null;
  aggregate?:  boolean;
  from?:       string | null;
  to?:         string | null;
  direction?:  "in" | "out";
  initiated_by?: "creator" | "platform_admin" | "other_signer" | "unknown";
  tx?:         string;
  kind?:       "direct" | "social";
  amount_raw?: string | null;
  quote_mint?: string | null;
  source?:     string;
  recipient?:  string;
  asset?:      string;
  decimals?:   number | null;
  transfer_count?: number;
  sample_tx_ids?:  string[];
  first_tx?:   string | null;
  /** Developer token transfers: number of counterparties of this (tx, mint, direction, actor) aggregate; null on rows stored before 2026-10-06. */
  counterparty_count?: number | null;
  /** Developer token transfers: true when re-derived from the chain after a delivery gap (never delivered live); `at` is then chain time. */
  recovered?:  boolean;
  /** With `recovered: true`: when the recovery stored the event. */
  recovered_at?: string | null;
  /** Developer token transfers: true when classified after a short creator lookup; `at` stays the receive time. */
  late_classified?: boolean;
}

export interface DeployerActivityFamilyCoverage {
  source:      string;
  retention:   string;
  scope?:      string;
  truncated:   boolean;
  loaded:      boolean;
  /** false: part of the window lies outside the online store (trade months only in the archive), or the boundary is unknown. */
  complete:    boolean;
  /** Earliest instant the online store answers this family completely. */
  complete_from: string | null;
  /** Before this instant events exist only in the archive (not served yet); null when the window does not cross it. */
  archive_required_before: string | null;
  boundary_known: boolean;
  /** Set when the family was not queried because it cannot apply (a wallet with no attributed launch has no dev trades). */
  skipped_reason?: "no_attributed_launch";
  /** dev_trades only, only while archive reads are enabled and the window reaches below the online boundary. */
  archive?: {
    read: "ok" | "not_needed" | "failed";
    served: boolean;
    reason: DeployerActivityArchiveReason | null;
    missing_months: string[];
    months_read: string[];
  };
}

export interface DeployerActivityRange { from: string | null; to: string | null }

export type DeployerActivityArchiveReason =
  | "archive_unavailable" | "archive_timeout" | "archive_contract_mismatch" | "archive_ledger_unavailable" | "archive_months_missing";

/** Requested vs online vs archive-only history (archive reads are a planned follow-up). */
export interface DeployerActivityHistoryPlan {
  requested:    DeployerActivityRange & { source: "since_param" | "plan_default" };
  effective:    DeployerActivityRange & { clamped: boolean; max_days: number | null };
  online:       DeployerActivityRange & { served: boolean };
  archive_only: (DeployerActivityRange & { served: boolean; reason: "archive_reads_not_enabled" | DeployerActivityArchiveReason | null; missing_months?: string[] }) | null;
}

/**
 * GET /deployer-hunter/{wallet}/activity — PRO+, KEYED (v1) only. Feature-flagged
 * server-side (503 `feature_disabled` until enabled).
 */
export interface DeployerActivityResponse {
  wallet:      string;
  is_deployer: boolean;
  deployer:    { tier: string | null; first_deploy_at: string | null; last_deploy_at: string | null } | null;
  plan:        { entitlement: "pro" | "ultra" | "business"; window_days: number | null; max_limit: number; history: DeployerActivityHistoryPlan };
  window:      { since: string | null; until: string; max_days: number | null; applies_to: "event_time" };
  events:      DeployerActivityEvent[];
  pagination:  { limit: number; requested_limit: number; limit_capped: boolean; next_cursor: string | null; has_more: boolean };
  coverage: {
    status:   "observed" | "partial";
    families: Record<string, DeployerActivityFamilyCoverage>;
    future_events_dropped: number;
    note:     string;
  };
  /**
   * ULTRA/BUSINESS only, absent on PRO. Currently always not_available with
   * reason identity_stitching_not_released. When released: read from the
   * offline identity graph, `not_available` with another reason whenever the
   * graph is stale or fails a consistency check. Never means "operates alone".
   */
  identity?: DeployerActivityIdentityUnavailable | DeployerActivityIdentity;
}

export interface DeployerActivityIdentityUnavailable {
  status: "not_available";
  reason:
    | "identity_stitching_not_released" | "builder_never_ran" | "builder_stale" | "builder_rule_mismatch" | "builder_gate_failed"
    | "identity_not_active" | "identity_inconsistent" | "evidence_missing" | "member_excluded" | "identity_lookup_failed";
  note: string;
}

export interface DeployerActivityIdentityMember {
  wallet: string;
  role: string;
  confidence: "confirmed" | "strong" | "probable";
  path_len: number;
  best_evidence_class: string | null;
  evidence_count: number;
  is_anchor: boolean;
}

export interface DeployerActivityIdentity {
  status: "linked" | "no_strong_evidence";
  scope: "builder_one_hop";
  rule_version: string;
  identity_id: string | null;
  /** members + 1 (the asked wallet). */
  wallet_count: number;
  anchor: string | null;
  self: Omit<DeployerActivityIdentityMember, "wallet"> | null;
  members: DeployerActivityIdentityMember[];
  related: Array<{ wallet: string; evidence_class: string; strength: "context"; basis: string }>;
  evidence: Array<{
    wallet_a: string; wallet_b: string; evidence_class: string; direction: "a_to_b" | "symmetric";
    observed_at: string; time_basis: "chain" | "ingest" | "chain_or_ingest"; tx_ids: string[]; token_mint: string | null;
    strength: "confirmed" | "strong" | "probable" | "context"; basis: string; rule_version: string;
  }>;
  builder: { run_id: number; built_at: string; age_seconds: number; stale_after_seconds: number; hub_floor: number | null };
  disclaimer: string;
  coverage_note: string;
}

export interface DeployerActivityParams {
  /** Clamped server-side to 100 (PRO, ULTRA) or 500 (BUSINESS). */
  limit?:  number;
  cursor?: string;
  /** Requested window start (ISO 8601); clamped to the plan window. */
  since?:  string;
  /** Comma list of event types. */
  types?:  string;
}

/* ── Deployer Hunter: reputation, leaderboard, outcomes ──
 *
 * "Bonding" is the pump.fun graduation event. `bonding_rate` is lifetime,
 * `recent_bond_rate` is the rolling recent window — a deployer can have a
 * strong lifetime rate and a collapsing recent one, which is the whole point
 * of tracking both. `runner_rate` needs `labeled_tokens >= 3` before it means
 * anything; below that it is one or two tokens of noise.
 */

/** Reputation grade — the deployers.tier CHECK set (migration 031). `unranked` = too few deploys to grade, not "bad". (Earlier types listed "neutral" / "spammer", which are Robinhood Chain tiers and never appear here.) */
export type DeployerTier = "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";

export interface DeployerTierCounts {
  elite:  number;
  good:   number;
  rising: number;
}

/** Ecosystem-wide deployer stats. `GET /deployer-hunter/stats` */
export interface DeployerStatsResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  tracked_count:  number;
  signals_today:  number;
  bonds_detected: number;
  bond_rate:      number;
  tiers:          DeployerTierCounts;
  /** Per-tier average MC at alert over 30 d. v1.24: complete SQL aggregate; all null when mc_at_alert_complete=false. */
  avg_mc_at_alert_usd_30d?: Record<string, number | null>;
  /** v1.24: values are null (not 0) when the aggregate read failed. */
  mc_at_alert_samples_30d?: Record<string, number | null>;
  mc_at_alert_window_start?: string;
  mc_at_alert_complete?: boolean;
}

export interface DeployerLeaderboardParams {
  /** Restrict to one grade (unranked is not accepted). */
  tier?:   Exclude<DeployerTier, "unranked">;
  /** Default `bonding_rate`. The route's enum; earlier types listed "recent" / "last_deploy", which it rejects with a 400. */
  sort?:   "bonding_rate" | "recent_bond_rate" | "total_bonded" | "last_deploy_at" | "post_bond_survival_rate";
  /** 1–100, default 20. */
  limit?:  number;
  /** Default 0. */
  offset?: number;
}

export interface DeployerLeaderboardEntry {
  id:                     string;
  wallet_address:         string;
  /** The route excludes unranked deployers. */
  tier:                   Exclude<DeployerTier, "unranked">;
  /** Lifetime share of deploys that bonded. */
  bonding_rate:           number;
  /** Rolling recent-window bond rate — diverges from lifetime when form changes. */
  recent_bond_rate:       number;
  total_tokens_deployed:  number;
  total_bonded:           number;
  /** Tokens that bonded almost immediately after deploy. */
  instant_bonds?:         number | null;
  last_deploy_at?:        string | null;
  recent_outcomes?:       string | null;
  avg_time_to_bond_minutes?: number | null;
  /** Share of labeled tokens that ran (peak ≥60min after deploy) rather than dumped. (This route does not send `labeled_tokens`.) */
  runner_rate?:           number | null;
  /** Share of the deployer's bonded tokens that survived after bonding. */
  post_bond_survival_rate?: number | null;
  /** Share of the deployer's bonded tokens that did 2x after bonding. */
  post_bond_2x_rate?:     number | null;
  /** Bonded tokens labeled for the two post-bond rates (confidence denominator). */
  post_bond_labeled_count?: number | null;
  best_token_peak_mc?:    number | null;
  avg_peak_mc?:           number | null;
  last_bond_at?:          string | null;
  is_tracked?:            boolean | null;
  label?:                 string | null;
  first_seen_at?:         string | null;
}

/** `GET /deployer-hunter/leaderboard` — excludes unranked deployers. */
export interface DeployerLeaderboardResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  deployers: DeployerLeaderboardEntry[];
  total:     number;
  limit:     number;
  offset:    number;
  has_more:  boolean;
}

/**
 * One row of `GET /deployer-hunter/{wallet}/tokens` (the `deployer_tokens` row).
 * Earlier type versions declared mint/name/symbol/bonded/peak_market_cap_usd,
 * which the route never returned.
 */
export interface DeployerToken {
  id:                   string;
  token_mint:           string;
  token_name:           string | null;
  token_symbol:         string | null;
  deployed_at:          string;
  /** null = not bonded. */
  bonded_at:            string | null;
  time_to_bond_minutes: number | null;
  peak_market_cap:      number | null;
  mc_at_bond:           number | null;
  market_cap_at_alert:  number | null;
  alerted_at:           string | null;
  /** create → migrate within ~90 s (curve filled by a bundle). */
  instant_bond:         boolean;
}

/** Launch-pipeline dataset scope disclosure (deployer-hunter, sniper, alpha, almost-bonded, batch classify/risk). Absent ≠ clean. */
export interface LaunchCoverage {
  scope: string;
  note:  string;
}

/** `GET /deployer-hunter/{wallet}` — unknown wallets return a profile, not a 404. */
/**
 * `GET /deployer-hunter/{wallet}`. v2.10 FIX: the route has always returned the
 * deployer row under `deployer` (null with `is_deployer: false` for a wallet we
 * do not track); earlier type versions declared a flat shape whose fields were
 * always undefined at runtime.
 */
export interface DeployerProfileResponse {
  is_deployer:       boolean;
  /** Only on the `is_deployer: false` answer. */
  wallet?:           string;
  deployer:          DeployerProfile | null;
  /** Aggregated from the live pump.fun API (not our DB); null when not a deployer. */
  pump_stats:        { total: number; bonded: number; bondingRate: number; bestAthMc: number; avgAthMc: number } | null;
  /** Raw pump.fun API token list (pump.fun-launched tokens only). */
  pump_tokens:       Record<string, unknown>[];
  pump_error:        string | null;
  /** Our own LaunchLab/bonk + bags tokens for this deployer. */
  launchpad_tokens:  Record<string, unknown>[];
  /** Launchpad-pipeline scope disclosure. */
  coverage?:         { scope: string; note: string };
  /** PRO+ funding evidence (see the funding docs); absent below PRO. */
  funding?:          Record<string, unknown>;
  /** PRO+ flat funding features, incl. `funding_to_first_deploy_seconds` (to `deployer.first_deploy_at`). */
  funding_features?: Record<string, unknown>;
  /** PRO+ capital relationships from high-signal sources (`launched_at` = `deployer.first_deploy_at`); absent below PRO. */
  capital_intelligence?: Record<string, unknown>;
}

/** The `deployers` row inside {@link DeployerProfileResponse}. */
export interface DeployerProfile {
  id:                       string;
  wallet_address:           string;
  total_tokens_deployed:    number;
  total_bonded:             number;
  instant_bonds:            number | null;
  bonding_rate:             number | null;
  recent_bond_rate:         number | null;
  /** Solana deployer tiers (the `deployers.tier` column). */
  tier:                     "elite" | "good" | "moderate" | "rising" | "cold" | "unranked" | null;
  is_tracked:               boolean;
  avg_time_to_bond_minutes: number | null;
  best_token_peak_mc:       number | null;
  avg_peak_mc:              number | null;
  recent_outcomes:          Record<string, unknown> | null;
  /** Fraction of labeled tokens that ran (peak ≥ 60 min). Gate on `labeled_tokens` ≥ 3. */
  runner_rate:              number | null;
  runner_tokens:            number | null;
  labeled_tokens:           number | null;
  post_bond_survival_rate:  number | null;
  post_bond_2x_rate:        number | null;
  post_bond_labeled_count:  number | null;
  first_seen_at:            string | null;
  /** Earliest deploy observed by MadeOnSol for this wallet — not proof of its first-ever on-chain launch. Only moves earlier. */
  first_deploy_at:          string | null;
  /** Latest deploy observed by MadeOnSol for this wallet. Only moves later. */
  last_deploy_at:           string | null;
  last_bond_at:             string | null;
  label:                    string | null;
}

export interface DeployerTokensParams {
  /** 1–50, default 20. */
  limit?:       number;
  /** 0–10000, default 0. */
  offset?:      number;
  /** true = only tokens that graduated (bonded_at set); total / has_more count the bonded set. */
  only_bonded?: boolean;
}

/** `GET /deployer-hunter/{wallet}/tokens` — newest bond first. */
export interface DeployerTokensResponse {
  /** false (with wallet echoed and an empty page) when the wallet is not a tracked deployer. */
  is_deployer?: boolean;
  /** Only on the `is_deployer: false` answer. */
  wallet?:   string;
  tokens:    DeployerToken[];
  total:     number;
  limit:     number;
  offset:    number;
  has_more:  boolean;
  coverage?: LaunchCoverage;
}

export interface DeployerAlertStatsParams {
  /** Lookback window, e.g. `24h`, `7d`, `30d`. */
  period?: string;
}

export interface BondRateStats {
  total_deploys: number;
  total_bonded:  number;
  rate:          number;
}

export interface MultiplierStats {
  total_with_mc:   number;
  pct_2x:          number;
  pct_5x:          number;
  pct_10x:         number;
  pct_50x:         number;
  avg_multiplier:  number;
  best_multiplier: number;
}

export interface DeployerTierStats {
  deploys:         number;
  bonded:          number;
  bond_rate:       number;
  avg_multiplier?: number | null;
  total_with_mc:   number;
}

/** `GET /deployer-hunter/alert-stats` — size and monitor your alert usage. */
export interface DeployerAlertStatsResponse {
  bond_rate:  BondRateStats;
  multiplier: MultiplierStats;
  /** Keyed by tier name. */
  tiers:      Record<string, DeployerTierStats>;
  period:     string;
  /** Rows the aggregates were computed over. */
  sampled_rows?: number;
  /** true = the safety ceiling was reached; the aggregates are over a partial sample, not the population. */
  truncated?:    boolean;
}

export interface BestTokensParams {
  /** Lookback window, default `7d`. */
  period?: string;
  /** Default 5. */
  limit?:  number;
}

export interface BestToken {
  id:                     string;
  token_mint:             string;
  token_name?:            string | null;
  token_symbol?:          string | null;
  token_image_url?:       string | null;
  bonded_at:              string;
  peak_market_cap?:       number | null;
  mc_at_bond?:            number | null;
  market_cap_at_alert?:   number | null;
  mc_multiplier?:         number | null;
  deployer_wallet:        string;
  deployer_tier:          DeployerTier;
  alerted_at?:            string | null;
  /** Launchpad of the alert (e.g. pumpfun, launchlab); null when unknown. */
  launchpad?:             string | null;
}

/** `GET /deployer-hunter/best-tokens` — ranked (non-unranked) deployers only. */
export interface BestTokensResponse {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  tokens: BestToken[];
  period: string;
  limit:  number;
}

export interface RecentBondsParams {
  /** 1–100, default 20. */
  limit?:       number;
  /** Incremental-polling cursor — pass the previous `next_since`. */
  since?:       string;
  /** unranked is not accepted (400). */
  tier?:        Exclude<DeployerTier, "unranked">;
  /** Floor on peak market cap (USD). */
  peak_mc_min?: number;
}

export interface DeployerSummary {
  wallet_address:            string;
  tier:                      DeployerTier;
  bonding_rate?:             number | null;
  total_bonded?:             number | null;
  recent_outcomes?:          string | null;
  recent_bond_rate?:         number | null;
  total_tokens_deployed?:    number | null;
  best_token_peak_mc?:       number | null;
  runner_rate?:              number | null;
  labeled_tokens?:           number | null;
  avg_time_to_bond_minutes?: number | null;
}

export interface RecentBond {
  id:                     string;
  token_mint:             string;
  token_name?:            string | null;
  token_symbol?:          string | null;
  token_image_url?:       string | null;
  deployed_at:            string;
  bonded_at:              string;
  time_to_bond_minutes?:  number | null;
  peak_market_cap?:       number | null;
  mc_at_bond?:            number | null;
  /** create → migrate within ~90 s (curve filled by a bundle). */
  instant_bond:           boolean;
  /** The deployers columns this route selects (no runner / peak-MC stats — see DeployerSummary on other routes). */
  deployers:              RecentBondDeployer;
}

export interface RecentBondDeployer {
  wallet_address:         string;
  tier:                   DeployerTier | null;
  total_tokens_deployed?: number | null;
  total_bonded?:          number | null;
  instant_bonds?:         number | null;
  bonding_rate?:          number | null;
  recent_outcomes?:       string | null;
  recent_bond_rate?:      number | null;
}

/** `GET /deployer-hunter/recent-bonds` — tokens from tracked deployers that graduated. */
export interface RecentBondsResponse extends FreeTierDelayMeta {
  /** Launch-pipeline scope disclosure (absent ≠ clean). */
  coverage?: LaunchCoverage;
  tokens: RecentBond[];
  limit:  number;
  /** Pass back as `since` to fetch only newer bonds. */
  next_since?: string | null;
}
