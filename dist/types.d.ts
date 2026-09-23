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
    traded_at: string;
}
export interface KolFeedResponse {
    trades: KolTrade[];
    count: number;
    /** LEGACY strict timestamp cursor (skips same-timestamp siblings) — prefer next_cursor. */
    next_before?: string | null;
    /** Pass as `cursor` for the next (older) page; null at the end. */
    next_cursor?: string | null;
    /** false only when the feed is exhausted. */
    has_more?: boolean;
    /** Present when a filter was applied after the candidate fetch; scan_truncated=true means more matches MAY exist past next_cursor. */
    scan?: {
        post_filtered: boolean;
        scanned: number;
        scan_truncated: boolean;
        scan_budget: number;
    };
}
export type KolStrategy = "scalper" | "day_trader" | "swing_trader" | "hodler" | "mixed";
export interface KolFeedParams {
    limit?: number;
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
export interface KolCoordinationKol {
    name: string;
    wallet: string;
    /** v1.1 — per-wallet SOL flow (PRO+). */
    buy_sol?: number;
    sell_sol?: number;
    /** v1.1 — true when sell_sol > buy_sol (net-flow-negative). */
    exited?: boolean;
}
export interface KolCoordinationToken {
    token_mint: string;
    token_symbol: string;
    token_name: string;
    kol_count: number;
    total_buys: number;
    total_sells: number;
    net_sol_flow: number;
    signal: "accumulating" | "distributing";
    kols: KolCoordinationKol[];
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
    universe?: {
        kind: "top_by_kol_count";
        order: string;
        max_size: number;
        size: number;
        truncated_at_max: boolean;
    };
    /** v1.1 — peak-density window used. */
    window_minutes?: number;
}
export interface KolCoordinationParams {
    period?: "1h" | "6h" | "24h" | "7d";
    min_kols?: number;
    limit?: number;
    /** PRO+: require cluster average winrate_7d >= N (0-100) */
    min_avg_winrate?: number;
    /** PRO+: require cluster to span >= N distinct strategies */
    unique_strategies?: number;
    /** v1.1 — include major memecoins (WIF/BONK/POPCAT). Default false. */
    include_majors?: boolean;
    /** v1.1 — peak-density window in minutes (1-60). Default 15. */
    window_minutes?: number;
    /** v1.1 — minimum composite coordination score (0-100). */
    min_score?: number;
    /** v1.6 — lower bound on entry MC (MC at first KOL buy). Tokens with unknown MC are dropped when set. */
    min_mc_usd?: number;
    /** v1.6 — upper bound on entry MC. */
    max_mc_usd?: number;
}
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
    scan?: {
        post_filtered: boolean;
        scanned: number;
        scan_truncated: boolean;
        scan_budget: number;
    };
    data_age_seconds: number | null;
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
export interface KolLeaderboardEntry {
    wallet_address: string;
    name: string;
    pnl_sol: number;
    total_buy_sol: number;
    total_sell_sol: number;
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
    kind: string;
    period?: string;
    max_size: number;
    size: number;
    note?: string;
}
export interface KolLeaderboardResponse {
    leaderboard: KolLeaderboardEntry[];
    period: string;
    universe?: LeaderboardUniverse;
    entry_mc_window_start?: string | null;
    entry_mc_complete?: boolean;
}
export type KolLeaderboardSort = "pnl" | "winrate" | "profit_factor" | "roi" | "early_entry";
export interface KolLeaderboardParams {
    /** Time window. 90d/180d fill up over time as kol_trades retention (180 days) accumulates. */
    period?: "today" | "7d" | "30d" | "90d" | "180d";
    limit?: number;
    /** PRO+: sort axis (default "pnl") */
    sort?: KolLeaderboardSort;
    /** PRO+: filter by auto-tagged strategy */
    strategy?: KolStrategy;
    /** PRO+: minimum winrate cutoff (0-100) */
    min_winrate?: number;
}
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
    deployers: {
        wallet_address: string;
        tier: string;
        total_tokens_deployed: number;
        total_bonded: number;
        bonding_rate: number;
        recent_outcomes: unknown;
        recent_bond_rate: number;
        /** v1.11.1 — fraction of the deployer's labeled tokens that ran (peak ≥60min after deploy) vs dumped. */
        runner_rate?: number | null;
        /** v1.11.1 — count of labeled tokens behind runner_rate; confidence denominator, gate on ≥3. */
        labeled_tokens?: number | null;
        /** v1.11.1 — average minutes from deploy to bond across the deployer's bonded tokens. */
        avg_time_to_bond_minutes?: number | null;
        /** v1.16 — deployer wallet SOL balance at the moment the alert fired. Null for historical rows. */
        deployer_sol_balance?: number | null;
    };
    kol_buys: {
        count: number;
        total_sol: number;
        kols: string[];
    } | null;
}
export interface DeployerAlertsResponse {
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
    scan?: {
        post_filtered: boolean;
        scanned: number;
        scan_truncated: boolean;
        scan_budget: number;
    };
}
export interface DeployerAlertsParams {
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
export type WebhookEvent = "kol:trade" | "kol:coordination" | "deployer:alert" | "deployer:bond";
export interface WebhookFilters {
    min_sol?: number;
    action?: "buy" | "sell";
    kol_name?: string;
    deployer_tier?: string[];
    min_kols?: number;
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
    /** DEX trade stream URL — only present for Ultra tier subscribers */
    dex_ws_url?: string;
}
/** One live WebSocket session holding a connection slot. Returned by
 *  GET /stream/sessions; its `id` can be passed to DELETE /stream/sessions/{id}
 *  to force-release the slot. */
export interface StreamSession {
    id: string;
    service: "ws-streaming" | "dex-stream";
    tier: string;
    channels: string[];
    connected_at: string;
    remote_ip: string | null;
    messages_sent: number;
}
/** Response of GET /stream/sessions — the caller's live WebSocket sessions. */
export interface StreamSessionsResponse {
    sessions: StreamSession[];
    count: number;
}
/** Response of DELETE /stream/sessions/{id} — a session slot was released. */
export interface StreamSessionEvictResponse {
    evicted: true;
    id: string;
}
export interface KolPair {
    kol_a: {
        name: string;
        wallet?: string;
    };
    kol_b: {
        name: string;
        wallet?: string;
    };
    shared_token_count: number;
    agreement_rate?: number;
    shared_tokens?: string[];
}
export interface KolPairsResponse {
    pairs: KolPair[];
    period: string;
    min_shared: number;
}
export interface KolPairsParams {
    period?: "7d" | "30d";
    min_shared?: number;
    limit?: number;
}
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
    kol: {
        name: string;
        wallet?: string;
    };
    timing: KolTimingData;
    period: string;
}
export interface KolTimingParams {
    period?: "7d" | "30d";
}
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
    first_kol_buy_age_minutes: number | null;
    kols?: {
        name: string;
        wallet?: string;
    }[];
}
export interface KolHotTokensResponse {
    hot_tokens: HotToken[];
    period: string;
    min_kols: number;
}
export interface KolHotTokensParams {
    period?: "1h" | "6h";
    min_kols?: number;
    limit?: number;
    /** PRO+: require average winrate_7d of buying KOLs >= N (0-100) */
    min_avg_winrate?: number;
    /** PRO+: require >= N distinct strategies among buyers */
    unique_strategies?: number;
}
export interface TrajectoryData {
    current_streak: {
        type: "bond" | "fail" | "none";
        count: number;
    };
    longest_bond_streak: number;
    longest_fail_streak: number;
    rolling_bond_rates: {
        window_end: number;
        bond_rate: number;
    }[];
    trend: "improving" | "declining" | "stable";
    avg_days_between_deploys: number | null;
    avg_recovery_tokens: number | null;
    best_stretch: {
        start_index: number;
        end_index: number;
        bond_rate: number;
    } | null;
    worst_stretch: {
        start_index: number;
        end_index: number;
        bond_rate: number;
    } | null;
    total_tokens_analyzed: number;
}
export interface DeployerTrajectoryResponse {
    deployer: {
        wallet_address: string;
        total_tokens_deployed: number;
        total_bonded: number;
        bonding_rate: number;
        recent_bond_rate: number;
        tier: string;
        /** v1.11.1 — fraction of the deployer's labeled tokens that ran (peak ≥60min after deploy) vs dumped. */
        runner_rate?: number | null;
        /** v1.11.1 — count of labeled tokens behind runner_rate; confidence denominator, gate on ≥3. */
        labeled_tokens?: number | null;
        /** v1.11.1 — average minutes from deploy to bond across the deployer's bonded tokens. */
        avg_time_to_bond_minutes?: number | null;
    };
    trajectory: TrajectoryData;
}
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
export interface KolEntryOrderEntry {
    rank: number;
    wallet_address: string;
    kol_name: string | null;
    sol_amount: number;
    token_amount: number;
    traded_at: string;
    seconds_after_first: number;
    tx_signature: string;
    strategy_tag?: KolStrategy | null;
    winrate_7d?: number | null;
    winrate_30d?: number | null;
    early_entry_pct_30d?: number | null;
    percentile_pnl_7d?: number | null;
}
export interface KolEntryOrderResponse {
    token_mint: string;
    entries: KolEntryOrderEntry[];
    /** @deprecated the route never returned `count` — use `returned` (entries.length) / `total_kol_buyers`. */
    count?: number;
    /** v1.24 — total_kol_buyers counts ALL first buyers (was capped by a 2,000-row read). */
    total_kol_buyers?: number;
    returned?: number;
    has_more?: boolean;
    complete?: boolean;
}
/** v1.24 — HTTP 503 when the entry-order aggregate is unavailable (e.g. during a schema rollout). Retry. */
export interface KolEntryOrderUnavailableResponse {
    error: string;
    retryable: true;
    retry_after_seconds: number;
}
export interface KolEntryOrderParams {
    /** Cap number of ranked entries (default 50) */
    limit?: number;
}
export interface KolCompareProfile {
    wallet_address: string;
    name: string | null;
    twitter: string | null;
    strategy_tag?: KolStrategy | null;
    winrate_7d?: number | null;
    winrate_30d?: number | null;
    roi_30d?: number | null;
    profit_factor_30d?: number | null;
    early_entry_pct_30d?: number | null;
    consistency_30d?: number | null;
    pnl_7d?: number | null;
    pnl_30d?: number | null;
    percentile_pnl_7d?: number | null;
    percentile_pnl_30d?: number | null;
    is_cold?: boolean | null;
    is_heating_up?: boolean | null;
}
export interface KolCompareOverlapToken {
    token_mint: string;
    token_symbol: string | null;
    token_name: string | null;
    wallets: string[];
    first_buy_at: string;
    last_buy_at: string;
}
export interface KolCompareResponse {
    profiles: KolCompareProfile[];
    overlap?: KolCompareOverlapToken[];
    /** v1.24 — overlap is the top 25 of `total` qualifying tokens over the full 30 d window; null total = the aggregate failed. */
    overlap_meta?: {
        window_start: string;
        min_wallets: number;
        total: number | null;
        returned: number;
        has_more: boolean | null;
        complete: boolean;
    };
    count: number;
}
export interface KolCompareParams {
    /** 2-5 wallet addresses. BASIC=2, PRO=4, ULTRA=5. */
    wallets: string[];
}
export type KolAlertType = "consensus_cluster" | "fresh_token_kol_buy" | "heating_up";
export type KolAlertWindow = "5m" | "15m" | "1h" | "6h" | "24h";
export type KolAlertSeverity = "low" | "medium" | "high";
export interface KolAlert {
    type: KolAlertType;
    severity: KolAlertSeverity;
    detected_at: string;
    token_mint?: string | null;
    token_symbol?: string | null;
    token_name?: string | null;
    wallet_address?: string | null;
    kol_name?: string | null;
    details: Record<string, unknown>;
}
export interface KolAlertsResponse {
    alerts: KolAlert[];
    count: number;
    window: KolAlertWindow;
}
export interface KolAlertsParams {
    /** Lookback window (default "15m") */
    window?: KolAlertWindow;
    /** Filter to specific alert types (default all) */
    types?: KolAlertType[];
    /** Minimum severity to include */
    min_severity?: KolAlertSeverity;
    /** Cap number of alerts (default 50) */
    limit?: number;
}
export type AlphaPeriod = "7d" | "30d" | "all";
export type AlphaSort = "win_rate" | "pnl" | "roi";
export interface AlphaLeaderboardParams {
    period?: AlphaPeriod;
    min_tokens?: number;
    sort?: AlphaSort;
    exclude_bots?: "true" | "false";
}
/** Field shape varies by tier — BASIC is the smallest subset, ULTRA the richest. */
export interface AlphaLeaderboardEntry {
    rank: number;
    wallet: string;
    tokens_traded: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    net_pnl_sol: number;
    total_sol_bought?: number;
    total_sol_sold?: number;
    roi?: number | null;
    avg_rank?: number | null;
    best_rank?: number;
    total_buys?: number;
    total_sells?: number;
    last_seen?: string;
    bundle_rate?: number;
    buy_size_stddev?: number;
    active_hours?: number;
    bot_confidence?: "low" | "medium" | "high" | "none";
    /** v1.24 — null (not 0) when the entry-MC aggregate failed. */
    entry_mc_samples?: number | null;
    avg_entry_mc_usd?: number | null;
}
export interface AlphaLeaderboardResponse {
    leaderboard: AlphaLeaderboardEntry[];
    total: number;
    entry_mc_window_start?: string | null;
    entry_mc_complete?: boolean;
    period: AlphaPeriod;
    sort: AlphaSort;
    min_tokens: number;
    exclude_bots: boolean;
}
export interface AlphaWalletSummary {
    wallet: string;
    tokens_traded: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    net_pnl_sol: number;
    total_sol_bought: number;
    total_sol_sold: number;
    roi: number | null;
    avg_rank: number | null;
    best_rank: number;
    total_buys: number;
    total_sells: number;
    bundle_rate: number;
    active_hours: number;
    last_seen: string;
    bot_confidence: "low" | "medium" | "high" | "none";
    bot_signals: string[];
}
export interface AlphaWalletToken {
    token_mint: string;
    rank: number;
    first_buy_sol: number;
    first_buy_at: string;
    total_sol_bought: number;
    total_sol_sold: number;
    realized_pnl_sol: number;
    buy_count: number;
    sell_count: number;
    result: "win" | "loss" | "open";
}
export interface AlphaWalletResponse {
    summary: AlphaWalletSummary;
    tokens: AlphaWalletToken[];
}
export interface AlphaLinkedWallet {
    wallet_address: string;
    shared_tokens: number;
    avg_time_diff_secs: number;
    avg_sol_diff: number;
    similarity_score: number;
}
export interface AlphaLinkedResponse {
    wallet: string;
    linked: AlphaLinkedWallet[];
}
/** v1.24 (audit 2026-09-21) — "insufficient_data" when no buyer's win rate fed the
 *  score (the neutral-50 placeholder or an all-excluded cohort). Treat unknown
 *  future values as low confidence. */
export type BuyerQualityConfidence = "insufficient_data" | "low" | "medium" | "high";
export type BuyerQualitySignal = "positive" | "neutral" | "negative";
export interface CapTableBuyer {
    rank: number;
    wallet: string;
    first_buy_sol: number;
    first_buy_at: string;
    is_bundle: boolean;
    is_kol: boolean;
    kol_name: string | null;
    bot_confidence: "low" | "medium" | "high" | "none" | null;
    historical_win_rate: number | null;
    historical_pnl_sol: number | null;
    historical_tokens: number | null;
}
export interface CapTableSummary {
    known_alpha_wallets: number;
    known_kols: number;
    bundle_buyers: number;
    buyer_quality_score: number;
    confidence: BuyerQualityConfidence;
    signal: BuyerQualitySignal;
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
    scope: string;
    in_scope?: boolean | null;
    note?: string;
    /** v1.24 — same value as in_scope: persisted rows exist (presence, not completeness). */
    data_observed?: boolean | null;
    /** v1.24 — does the CURRENT capture gate admit this mint? */
    eligibility?: TradeEligibility | null;
    eligibility_basis?: string | null;
    /** v1.24 — always "not_verified": rows existing never proves a complete interval. */
    completeness?: "not_verified";
}
/** v1.24 — treat unknown future values as "unknown". */
export type TradeEligibility = "eligible" | "lapsed" | "excluded" | "unknown" | "admitted_previously" | "not_applicable";
export interface TokenCapTableResponse {
    mint: string;
    buyers: CapTableBuyer[];
    summary: CapTableSummary;
    /** v1.23.4 — trade-coverage disclosure (keyed route; absent on the x402 mirror and older cached responses). */
    coverage?: TradeCoverage;
}
export interface TokenBuyerQualityResponse {
    mint: string;
    score: number;
    confidence: BuyerQualityConfidence;
    signal: BuyerQualitySignal;
    cached_at: string;
    /** Returned on all tiers. */
    breakdown?: {
        alpha_wallet_count: number;
        kol_count: number;
        bundle_buyer_count: number;
        avg_historical_win_rate: number | null;
        bot_dominated: boolean;
        /**
         * First-20 buyers on the rolling dump-cluster list (wallets whose 5+
         * recent first-20 appearances are exclusively on tokens that peaked
         * <15 min after deploy; trailing 42d, refreshed daily). Out-of-sample:
         * 3+ such wallets predicted a sub-15-min peak 94% of the time vs 61%
         * base. Informational — does not move the score.
         */
        dump_cluster_count: number;
        /**
         * First-20 buyers with 5+ recent first-20 appearances of any kind.
         * Alone it predicts nothing; a heavily recycled cohort with
         * dump_cluster_count 0 historically leans runner.
         */
        recycled_early_buyer_count: number;
        /** v1.24 — buyers with ≥3 tokens of history (cohort identification, not predictive). */
        wallets_with_history?: number;
        /** v1.24 — buyers whose win rate fed the score; the basis of `confidence`. */
        qualified_win_rate_wallets?: number;
    };
    note?: string;
    /** v1.23.4 — trade-coverage disclosure (absent on older cached responses). */
    coverage?: TradeCoverage;
}
export type TokenRiskBand = "safe" | "caution" | "danger";
/** v1.24 (score v2) — unknown = the input should exist but could not be read / is insufficient;
 *  not_assessed = no evidence source applies to this token. Both carry 0 points and are never
 *  positive evidence. Treat any future value as not-ok. */
export type TokenRiskStatus = "ok" | "warn" | "danger" | "unknown" | "not_assessed";
export interface TokenRiskFactor {
    key: string;
    label: string;
    status: TokenRiskStatus;
    points: number;
    detail: string;
}
/** Slot-window snipe rollup (v1.21) — buys landed in slots [-1..+3] around a
 *  token's deploy. `null` on the parent means the rollup hasn't been computed
 *  yet (deploys younger than the ~10-min settle window) or the mint is outside
 *  the pump.fun-pipeline write-gate — absent, not zero. */
export interface SniperFootprint {
    buys: number;
    buyers: number;
    sol: number;
    /** Share of token supply bought inside the window (%, or null when supply unknown). */
    supply_pct: number | null;
    /** Buys from wallets on the known-sniper list. */
    sniper_wallet_buys: number;
    /** False when the window fell outside capture coverage — counts are unknown, not 0. */
    data_available: boolean;
    as_of: string;
}
export interface TokenRiskInputs {
    mint_authority_revoked: boolean | null;
    freeze_authority_revoked: boolean | null;
    liquidity_usd: number | null;
    liquidity_to_mc_ratio: number | null;
    transfer_fee_bps: number | null;
    is_token_2022: boolean | null;
    /** DEPRECATED alias of token_supply_burn_detected — a token-SUPPLY burn, never an LP burn (score v2). */
    burn_detected: boolean | null;
    /** v1.24 — the mint's on-chain supply decreased. Not LP evidence. */
    token_supply_burn_detected?: boolean | null;
    /** v1.24 — verified LP custody; "unknown" for every Solana pool today. */
    lp_burn_status?: LpBurnStatus;
    /** v1.24 — creator history label; only "established" moves the score. */
    deployer_history_status?: DeployerHistoryStatus | null;
    deployer_reputation_scored?: boolean;
    supply_inflation_pct?: number | null;
    /** v1.24 — when the liquidity figure was last observed; a not-assessed creator needs it < 6 h for "safe" (a policy threshold, not proof of safety). */
    liquidity_observed_at?: string | null;
    launch_cohort_sol: number | null;
    launch_cohort_size: number | null;
    deployer_bonding_rate: number | null;
    deployer_total_deployed: number | null;
    kol_signal: string | null;
    is_blacklisted: boolean | null;
    /** v1.21 — slot-window snipe rollup. Informational (does not move the score); null when not yet computed. */
    sniper_footprint?: SniperFootprint | null;
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
    wallet: string | null;
    launchpad: string | null;
    deployed_at: string | null;
    /** Create-tx self-buy snapshot — null on rows pre-dating migration 225 or launchlab. */
    buy_sol: number | null;
    buy_tokens: number | null;
    buy_supply_pct: number | null;
    /** Post-create buys on the dev's own mint — catches the same-second-separate-tx dev buy the create-tx snapshot misses. */
    bought_tokens_after: number | null;
    sold_tokens: number | null;
    sold_sol: number | null;
    first_sell_at: string | null;
    last_sell_at: string | null;
    /** Live on-chain holdings (cached RPC read). null = RPC unavailable right now. */
    holdings_tokens: number | null;
    /** holdings as % of supply — pump.fun's fixed 1B denominator; null for other launchpads. */
    holdings_supply_pct: number | null;
    /** Is the dev wallet empty NOW (holdings < 1 token)? null when holdings unknown. */
    wallet_empty: boolean | null;
    /** DEPRECATED boolean view of transfer_status: true = "suspected" (never a verified transfer), false = "none_detected", null = "unknown". */
    transferred_out: boolean | null;
    /** v1.24 — suspected | none_detected | unknown (batch: always unknown). */
    transfer_status?: "suspected" | "none_detected" | "unknown";
    transfer_reason?: string;
    expected_tokens_from_trades?: number | null;
    /** v1.24 — observation times: holdings (RPC) vs the dev-activity rollup. */
    holdings_observed_at?: string | null;
    activity_rollup_through?: string | null;
    activity_rollup_ran_at?: string | null;
}
/** v1.24 — LP custody evidence. */
export type LpBurnStatus = "verified" | "not_verified" | "unknown";
/** v1.24 — creator history label (audit F08). "unranked" tier is NOT "new". */
export type DeployerHistoryStatus = "new_in_our_index" | "limited_history" | "reputation_pending" | "established";
/** v1.24 — what the score could not observe. status "incomplete" ⇒ the score is a lower bound and band is never "safe". */
export interface TokenRiskAssessment {
    status: "complete" | "incomplete";
    unknown_inputs: string[];
    not_assessed: string[];
    /** Reason per listed input, keyed by input name, plus `band_cap` when the band was capped at caution. */
    explanations?: Record<string, string> & {
        band_cap?: string;
    };
}
/** Transparent 0–100 token rug-risk/safety score (higher = riskier). PRO/ULTRA only. */
export interface TokenRiskResponse {
    mint: string;
    risk_score: number;
    band: TokenRiskBand;
    factors: TokenRiskFactor[];
    inputs: TokenRiskInputs;
    score_version: string;
    /** v1.22 — deployer self-activity block. Present on single-mint GET /tokens/{mint}/risk (null = no pending_deploys row); absent on batch-risk entries. */
    dev?: TokenRiskDev | null;
    /** v1.23.4 — trade-coverage disclosure (keyed single-mint route only). Its `note` names the split: trade-derived sub-fields are launchpad-pipeline scoped, on-chain sub-fields are unaffected. */
    coverage?: TradeCoverage;
    /** v1.24 (score_version "v2") — unknown vs not-assessed inputs. */
    assessment?: TokenRiskAssessment;
    /** v1.24 — ok | not_found (no pending_deploys row) | unavailable (lookup failed). */
    dev_status?: "ok" | "not_found" | "unavailable";
    as_of: string;
}
/** v1.24 — HTTP 503 body when a score-critical input could not be read (retry; never a partial score).
 *  A 503 can also carry the generic statement-timeout body { error, error_kind: "statement_timeout", retry_after_seconds }. */
export interface TokenRiskUnavailableResponse {
    error: string;
    code: "risk_inputs_unavailable";
    unavailable_inputs: string[];
    retryable: true;
    retry_after_seconds: number;
}
/** Per-mint error object for untracked / failed mints in a batch risk response.
 *  Untracked mints come back as `not_tracked` and do NOT fail the batch; a
 *  per-mint compute failure comes back as `error`. */
export interface TokenBatchRiskError {
    mint: string;
    /** v1.24 — "unavailable" = a score-critical input could not be read (retryable). */
    error: "not_tracked" | "error" | "unavailable";
    code?: "risk_inputs_unavailable";
    unavailable_inputs?: string[];
    retryable?: boolean;
}
/** One entry in the `tokens` array of POST /tokens/batch/risk — either a full
 *  risk result (same shape as GET /tokens/{mint}/risk) or a per-mint error. */
export type TokenBatchRiskResult = TokenRiskResponse | TokenBatchRiskError;
/** Response of POST /tokens/batch/risk — bulk risk scoring for 1–50 mints.
 *  `tokens` preserves de-duplicated input order; `count` = number of unique
 *  mints. Counts as 1 request against quota. */
export interface TokenBatchRiskResponse {
    tokens: TokenBatchRiskResult[];
    count: number;
}
export type CandleTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export interface CandlesParams {
    /** Candle timeframe. Default "1h". */
    tf?: CandleTimeframe;
    /** Number of candles to return (1–1000). Default 200. */
    limit?: number;
    /** ISO 8601 start of range (inclusive). */
    from?: string;
    /** ISO 8601 end of range (inclusive). */
    to?: string;
}
/**
 * One OHLC bucket. The `t`…`market_cap_usd` fields are present on all tiers
 * (PRO = OHLCV, last 30 days). The remaining fields are ULTRA-only and present
 * when the response's `net_flow_included` is true (buy/sell volume + net flow,
 * trade counts, MEV volume, liquidity delta, MC band).
 */
export interface Candle {
    /** ISO 8601 bucket start. */
    t: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume_usd: number;
    trades: number;
    market_cap_usd: number | null;
    buy_volume_usd?: number | null;
    sell_volume_usd?: number | null;
    net_volume_usd?: number | null;
    buy_count?: number | null;
    sell_count?: number | null;
    volume_mev_usd?: number | null;
    open_liquidity_usd?: number | null;
    close_liquidity_usd?: number | null;
    high_mc_usd?: number | null;
    low_mc_usd?: number | null;
}
/** 1-minute-derived OHLC candles for a token. PRO/ULTRA only. */
export interface CandlesResponse {
    mint: string;
    timeframe: string;
    from: string;
    to: string;
    count: number;
    /** True when ULTRA net-flow/liquidity fields are populated on each candle. */
    net_flow_included: boolean;
    candles: Candle[];
}
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
    mint: string;
    window: TokenFlowWindow;
    /** ISO 8601 lower bound of the window. */
    from: string;
    unique_wallets: number;
    unique_buyers: number;
    unique_sellers: number;
    buy_count: number;
    sell_count: number;
    total_trades: number;
    buy_sol: number;
    sell_sol: number;
    /** sell_sol − buy_sol; positive = net SOL leaving the pool (net selling). */
    net_sol: number;
    /** total_trades / unique_wallets — wash-trading proxy. */
    trades_per_wallet: number;
}
/** How the bundle cohort was grouped — `atomic_tx` (same transaction),
 *  `same_slot` (same block slot), or `none` (no bundle detected). */
export type BundleKind = "atomic_tx" | "same_slot" | "none";
/** Aggregate bundle-cohort holdings for a token. Returned on all tiers. */
export interface BundleSummary {
    /** Number of wallets in the bundle cohort. */
    wallet_count: number;
    bundle_kind: BundleKind;
    /** Net held / buy volume (0–1). Churn-sensitive secondary read; null when unknown. */
    held_ratio: number | null;
    /** Net held / circulating supply (0–1) — the HEADLINE signal. Null when supply is unknown. */
    held_pct_of_supply: number | null;
    fully_exited: boolean;
    /** Cumulative buy volume — NOT distinct tokens; can exceed supply. */
    buy_volume: number;
    /** Swap-derived net position (proxy for on-chain balance). */
    tokens_held: number;
}
/**
 * One wallet in the bundle cohort. `rank`…`is_kol` are returned on PRO (top-10)
 * and ULTRA (full cohort). The identity fields (`kol_name`, `win_rate`,
 * `bot_confidence`, `tokens_held`) are ULTRA-only.
 */
export interface BundleWallet {
    rank: number;
    wallet: string;
    held_ratio: number | null;
    has_sold: boolean;
    atomic: boolean;
    is_kol: boolean;
    kol_name?: string | null;
    win_rate?: number | null;
    bot_confidence?: string | null;
    tokens_held?: number;
}
/**
 * Bundle-cohort holdings for a token. `held_pct_of_supply` (net held / circulating
 * supply) is the headline signal. Field-gated by tier: BASIC get the
 * `bundle` block only (`wallets: []`); PRO adds the top-10 wallets with flags;
 * ULTRA returns the full cohort plus per-wallet identity fields.
 */
export interface TokenBundleResponse {
    mint: string;
    bundle: BundleSummary;
    wallets: BundleWallet[];
    /** v1.23.4 — trade-coverage disclosure (keyed route; absent on older cached responses). */
    coverage?: TradeCoverage;
}
/** Payload of a `token:graduation` event — every pump.fun graduation
 * (bonding curve complete → PumpSwap migration), tracked deployer or not. */
export interface GraduationEvent {
    token_mint: string;
    token_name: string | null;
    token_symbol: string | null;
    time_to_bond_minutes: number | null;
    deployer_wallet: string | null;
    /** 'unranked' when the deployer is unknown to deployer-hunter. */
    deployer_tier: string;
    market_cap_usd: number | null;
    bonded_at: string;
}
export type CopyTradeAction = "buy" | "sell" | "both";
export type CopyTradeSizingMode = "fixed" | "proportional" | "percent_source";
export type CopyTradeDeliveryMode = "webhook" | "websocket" | "both";
export interface CopyTradeSubscription {
    id: number;
    name: string | null;
    source_wallets: string[];
    min_trade_sol: number;
    only_action: CopyTradeAction;
    sizing_mode: CopyTradeSizingMode;
    sizing_amount: number;
    delivery_mode: CopyTradeDeliveryMode;
    webhook_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}
export interface CopyTradeCreateParams {
    name?: string;
    source_wallets: string[];
    min_trade_sol?: number;
    only_action?: CopyTradeAction;
    sizing_mode?: CopyTradeSizingMode;
    sizing_amount: number;
    delivery_mode?: CopyTradeDeliveryMode;
    webhook_url?: string;
}
export interface CopyTradeUpdateParams {
    name?: string | null;
    source_wallets?: string[];
    min_trade_sol?: number;
    only_action?: CopyTradeAction;
    sizing_mode?: CopyTradeSizingMode;
    sizing_amount?: number;
    delivery_mode?: CopyTradeDeliveryMode;
    webhook_url?: string | null;
    is_active?: boolean;
}
export interface CopyTradeCreateResponse {
    subscription: CopyTradeSubscription;
    /** Returned ONCE on creation when `webhook_url` is set — store it to verify HMAC signatures. */
    webhook_secret: string | null;
    note?: string;
}
export interface CopyTradeSignal {
    id: number;
    subscription_id: number;
    fired_at: string;
    source_wallet: string;
    action: "buy" | "sell";
    token_mint: string;
    token_symbol: string | null;
    token_name: string | null;
    source_sol_amount: number;
    suggested_sol_amount: number;
    tx_signature: string;
    delivered: boolean;
    delivered_at: string | null;
    /** v1.5 (2026-05-06) — market cap (USD) stamped on the source kol_trades row at the moment the rule fired. */
    market_cap_usd_at_trade?: number | null;
    /** v1.5 — token price (USD) at the same moment. */
    price_usd_at_trade?: number | null;
    /** v1.5 — current market cap (USD) from token_prices — useful to compare against at-trade for chase-vs-dip context. */
    market_cap_usd?: number | null;
    /** v1.5 — current last-trade price (USD). */
    last_price_usd?: number | null;
}
export interface CopyTradeSignalsParams {
    subscription_id?: number;
    /** ISO 8601 timestamp — only signals fired at-or-after this time. */
    since?: string;
    /** 1–500, default 50. */
    limit?: number;
}
export interface WalletTrackerEntry {
    wallet_address: string;
    label: string | null;
    added_at: string;
}
export interface WalletTrackerListResponse {
    watchlist: WalletTrackerEntry[];
    remaining: number;
    limit: number;
}
export interface WalletTrackerAddResponse {
    added: boolean;
    watchlist: WalletTrackerEntry;
    remaining: number;
}
export interface WalletTrackerUpdateResponse {
    updated: boolean;
    watchlist: WalletTrackerEntry;
}
export type WalletTrackerAction = "buy" | "sell" | "transfer_in" | "transfer_out";
export type WalletTrackerEventType = "swap" | "transfer";
export interface WalletTrackerTradesParams {
    wallet?: string;
    action?: WalletTrackerAction;
    event_type?: WalletTrackerEventType;
    /** 1–200, default 50. */
    limit?: number;
    /** Pagination cursor — block_time of the last event from previous page. */
    before?: number;
}
export interface WalletTrackerTrade {
    block_time: number;
    wallet: string;
    action: WalletTrackerAction;
    event_type: WalletTrackerEventType;
    token_mint?: string;
    token_symbol?: string;
    sol_amount?: number;
    token_amount?: number;
    tx_signature?: string;
    counterparty?: string;
    label?: string | null;
}
export interface WalletTrackerTradesResponse {
    trades: WalletTrackerTrade[];
    has_more: boolean;
    next?: number;
}
export interface WalletTrackerSummaryParams {
    /** "24h" | "7d" | "30d" — default "7d" */
    period?: "24h" | "7d" | "30d";
    wallet?: string;
}
export interface WalletTrackerSummaryStats {
    wallet: string;
    label: string | null;
    swap_count: number;
    buy_count: number;
    sell_count: number;
    sol_bought: number;
    sol_sold: number;
    last_activity_at: string | null;
}
export interface WalletTrackerSummaryResponse {
    period: "24h" | "7d" | "30d";
    wallets: WalletTrackerSummaryStats[];
}
export interface WalletStandoutTrade {
    token_mint: string;
    token_symbol: string | null;
    pnl_sol: number;
    sol_in: number;
    sol_out: number;
    roi_pct: number;
}
export interface WalletBiggestMiss {
    token_mint: string;
    token_symbol: string | null;
    actual_sol_out: number;
    potential_sol_at_ath: number;
    missed_sol: number;
    ath_mc_usd: number;
    sold_at_mc_usd: number | null;
}
export type WalletVerdictTone = "green" | "red" | "amber" | "muted";
export interface WalletVerdict {
    label: string;
    description: string;
    tone: WalletVerdictTone;
}
export interface WalletDerivedStats {
    win_rate: number | null;
    roi_pct: number | null;
    total_realized_pnl_sol: number;
    best_trade: WalletStandoutTrade | null;
    worst_trade: WalletStandoutTrade | null;
    biggest_miss: WalletBiggestMiss | null;
    verdict: WalletVerdict | null;
}
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
export type ScoutLeaderboardSort = "swarm_3plus_pct" | "n_first_touches_30d" | "swarm_5plus_pct" | "scout_score";
export interface ScoutLeaderboardParams {
    limit?: number;
    scout_tier?: ScoutTier;
    sort?: ScoutLeaderboardSort;
}
export interface KolConsensusResponse {
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
    buyers?: string[];
    exited?: string[];
}
export interface PeakHistoryResponse {
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
}
export interface CoordinationHistoryParams {
    limit?: number;
    since?: string;
    min_score?: number;
}
/** One of the token's top buyers, as returned in TokenSnapshot.top_buyers. */
export interface TokenSnapshotTopBuyer {
    name: string;
    sol_amount: number;
}
/** Live token snapshot returned in the `token` field of GET /token/{mint}. */
export interface TokenSnapshot {
    mint?: string;
    symbol?: string | null;
    name?: string | null;
    price_usd: number | null;
    price_sol: number | null;
    vwap_usd?: number | null;
    market_cap: number | null;
    fdv_usd: number | null;
    liquidity_usd: number | null;
    liquidity_to_mc_ratio: number | null;
    primary_dex: string | null;
    primary_pool_address: string | null;
    is_token_2022: boolean | null;
    transfer_fee_bps: number | null;
    /** @deprecated never returned at this level — the route nests it as kol_activity.top_buyers. Kept optional for source compatibility. */
    top_buyers?: TokenSnapshotTopBuyer[];
    /** v1.24 — DEPRECATED meaning: a token-SUPPLY burn (mint supply decreased), never LP evidence. null = unknown (no mc-tracker observation). */
    burn_detected?: boolean | null;
    /** v1.24 — creator + reputation; resolved for unbonded launches too. null ⇒ read deployer_identity. */
    deployer?: TokenSnapshotDeployer | null;
    /** v1.24 — complete 7-day aggregate; status "unavailable" ⇒ every figure is null (never 0 / "neutral"). */
    kol_activity?: TokenSnapshotKolActivity;
    /** null = the cohort read failed; 0 = no cohort rows. */
    launch_cohort_size?: number | null;
    /** Last trade seen by ANY source — not a price-age anchor (use price_observed_at). */
    last_trade_at?: string | null;
    /** v1.24 — mc_tracker | dex_stream; null when there is no price. */
    price_source?: "mc_tracker" | "dex_stream" | null;
    /** v1.24 — observation time of the SELECTED price source (price age anchor). */
    price_observed_at?: string | null;
    /** null = a price exists but its age is unknown (never a false "fresh"). */
    price_is_stale?: boolean | null;
    price_age_seconds?: number | null;
    /** v1.24 — why `deployer` is null: unknown creator vs failed lookup. */
    deployer_identity?: {
        identity_status: "resolved" | "unknown" | "lookup_failed";
        history_status: DeployerHistoryStatus | null;
        address: string | null;
        source: "deployer_tokens" | "pending_deploys" | null;
    };
    /** v1.24 — per-block read status; "unavailable" blocks are null, never defaults. */
    data_status?: Record<string, "ok" | "unavailable">;
    token_supply_burn_detected?: boolean | null;
    lp_burn_status?: LpBurnStatus;
    /** null = the blacklist lookup failed (unknown). */
    is_blacklisted?: boolean | null;
}
/** v1.24 — GET /token/{mint} creator block (audit F08). */
export interface TokenSnapshotDeployer {
    wallet: string;
    address: string;
    tier: string;
    bonding_rate: number;
    total_deployed: number;
    total_bonded: number;
    recent_bond_rate: number;
    identity_status: "resolved";
    identity_source: "deployer_tokens" | "pending_deploys";
    /** Only "established" means bonding_rate is a real track record. */
    history_status: DeployerHistoryStatus;
    first_seen_at: string | null;
    observed_launch_count: number;
    resolved_outcome_count: number;
    stats_computed_at: string | null;
}
/** v1.24 — GET /token/{mint} KOL activity (audit F05): a complete window aggregate, never a newest-N sample. */
export interface TokenSnapshotKolActivity {
    status: "ok" | "unavailable";
    buying_kols: number | null;
    selling_kols: number | null;
    net_flow_sol: number | null;
    signal: "accumulating" | "distributing" | "neutral" | null;
    /** Wallet addresses are ULTRA-only. */
    top_buyers: Array<TokenSnapshotTopBuyer & {
        wallet?: string;
    }>;
    window_hours: number;
    window_start: string | null;
    computed_at: string | null;
    last_trade_at: string | null;
    unique_kols: number | null;
    unique_wallets: number | null;
    buys: number | null;
    sells: number | null;
    buy_sol: number | null;
    sell_sol: number | null;
    counts_basis: "complete_window" | null;
}
/** Response of GET /token/{mint} — live token snapshot. */
export interface TokenSnapshotResponse {
    token: TokenSnapshot;
    /** v1.24 — response assembly time; NOT the observation time of any field. */
    as_of?: string;
}
/** Valid signal names accepted by GET /signals/{name}/performance. */
export type SignalName = "dump_cluster_count" | "runner_rate" | "recycled_early_buyer_count" | "coordination_count";
/** One out-of-sample reliability bucket within a Signal Scorecard. */
export interface SignalPerformanceBucket {
    bucket: string;
    hit_rate: number | null;
    base_rate: number | null;
    lift: number | null;
    sample_n: number | null;
    window_days: number | null;
    test_from: string | null;
    test_to: string | null;
}
/** One per-day reliability point, returned in `series` when history=true. */
export interface SignalPerformanceSeriesPoint {
    date: string;
    hit_rate: number | null;
    base_rate: number | null;
    lift: number | null;
    sample_n: number | null;
}
/** Response of GET /signals/{name}/performance — the Signal Scorecard. */
export interface SignalPerformanceResponse {
    signal: string;
    metric_type: string;
    outcome: string;
    methodology: string;
    as_of: string;
    buckets: SignalPerformanceBucket[];
    /** Per-day reliability series — only present when called with `history: true`. */
    series?: SignalPerformanceSeriesPoint[];
}
/** One entry in the signals catalog returned by GET /signals. */
export interface SignalsCatalogEntry {
    name: string;
    methodology: string;
    performance_endpoint: string;
}
/** Response of GET /signals — the free signals catalog. */
export interface SignalsCatalogResponse {
    name: string;
    description: string;
    signals: SignalsCatalogEntry[];
    docs: string;
}
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
export type ApiTier = "BASIC" | "PRO" | "ULTRA";
export interface MeQuotaWindow {
    limit: number;
    used: number;
    remaining: number;
}
export interface MeResponse {
    subscriber: string;
    tier: ApiTier;
    tier_label: string;
    subscription: {
        status: string;
        billing_cycle: "monthly" | "annual";
        current_period_end: string | null;
        started_at: string;
    } | null;
    quota: {
        daily: MeQuotaWindow & {
            resets_at: string;
        };
        burst: MeQuotaWindow & {
            window_seconds: number;
        };
    };
    features: {
        webhooks: {
            limit: number;
            used: number;
        };
        ws_connections: {
            limit: number;
        };
        dex_connections: {
            limit: number;
        };
        copytrade_wallets: {
            limit: number;
            used: number;
        };
        copytrade_rules: {
            limit: number;
            used: number;
        };
        coordination_rules: {
            limit: number;
            used: number;
        };
        first_touch_subscriptions: {
            limit: number;
            used: number;
        };
        wallet_tracker_watchlist: {
            used: number;
        };
    };
}
export type TokenListSort = "mc_desc" | "mc_asc" | "last_trade_desc" | "liquidity_desc" | "cumulative_volume_desc" | "mc_change_5m_desc" | "mc_change_1h_desc" | "volume_1h_desc" | "trending";
export type TokenPrimaryDex = "pumpfun" | "pumpswap" | "raydium" | "meteora" | "orca" | "raydium_clmm";
export interface TokensListParams {
    min_mc?: number;
    max_mc?: number;
    /** Default 2000. Pass 0 to disable the dust floor. */
    min_liq?: number;
    active_h?: number;
    primary_dex?: TokenPrimaryDex;
    authority_revoked?: boolean;
    exclude_token2022?: boolean;
    min_lp_burnt_pct?: number;
    /** Computed (post-filter): organic-volume floor in last 1h. */
    min_volume_1h_usd?: number;
    /** Computed (post-filter): MEV/bot volume ceiling as % of total. */
    max_mev_share_pct?: number;
    /** Computed (post-filter): min 1h MC change %. */
    mc_change_1h_min_pct?: number;
    /** Computed (post-filter): max 1h MC change %. */
    mc_change_1h_max_pct?: number;
    /** v1.12 — minimum liquidity-to-MC ratio (0-1). */
    min_liq_mc_ratio?: number;
    /** v1.12 — maximum liquidity-to-MC ratio (0-1). */
    max_liq_mc_ratio?: number;
    /** v1.12 — filter by deployer tier. */
    deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
    /**
     * @deprecated use `lp_burn_status` per token, or `supply_burn` for the token-supply burn flag.
     * v1.24 — VERIFIED LP evidence only: true = lp_burnt_pct ≥ 99, false = measured AND below 99.
     * Unknown LP custody (every token today) matches NEITHER value, so both match nothing until an
     * LP-evidence writer exists. Sending it adds a `deprecations` entry to the response.
     */
    lp_burned?: boolean;
    /** v1.24 — the token-SUPPLY burn flag (what lp_burned used to filter on). */
    supply_burn?: boolean;
    launchpad?: "pumpfun" | "launchlab" | "bags";
    sort?: TokenListSort;
    limit?: number;
    offset?: number;
}
export interface TokenSummary {
    mint: string;
    symbol: string | null;
    name: string | null;
    price_usd: number | null;
    market_cap_usd: number | null;
    fdv_usd: number | null;
    liquidity_usd: number | null;
    primary_dex: string | null;
    authorities_revoked: boolean;
    lp_burnt_pct: number | null;
    is_token_2022: boolean;
    last_trade_time: string | null;
    mc_change_5m_pct: number | null;
    mc_change_1h_pct: number | null;
    organic_volume_1h_usd: number | null;
    mev_share_pct: number | null;
    /** v1.12 — ratio of liquidity USD to market cap USD; null when either is unknown. */
    liquidity_to_mc_ratio?: number | null;
    /** v1.12 — deployer tier for this token's deployer; null when deployer is untracked. */
    deployer_tier?: string | null;
    launchpad?: string | null;
    /** v1.24 — VERIFIED LP evidence only; null = unknown (every token today). Was a supply-burn proxy before. */
    lp_burned?: boolean | null;
    lp_burn_status?: LpBurnStatus;
    token_supply_burn_detected?: boolean | null;
}
export interface TokensListResponse {
    tokens: TokenSummary[];
    pagination: {
        limit: number;
        offset: number;
        returned: number;
        has_more: boolean;
        post_filtered: boolean;
        /** v1.24 — resume offset (a RAW candidate offset on post-filtered scans); null = end. */
        next_offset?: number | null;
        /** v1.24 — offsets walk a live ranking, not a snapshot: dedupe on mint. */
        order_is_live?: boolean;
        scanned?: number;
        scanned_until_offset?: number;
        /** v1.24 — the scan budget ran out: more matches MAY exist past next_offset. */
        scan_truncated?: boolean;
        scan_budget?: number;
    };
    filters: Record<string, unknown>;
    /** v1.24 — present only when a deprecated parameter (today: lp_burned) was sent. */
    deprecations?: TokensDeprecation[];
}
/** v1.24 — disclosure for a deprecated /tokens parameter. */
export interface TokensDeprecation {
    param: string;
    status: "deprecated";
    /** Exactly what the parameter matches today. */
    matches: string;
    replacement: string;
}
export type AlmostBondedSort = "velocity_desc" | "progress_desc" | "eta_asc";
export interface AlmostBondedParams {
    /** Lower bound on bonding progress %. Default 80. */
    min_progress?: number;
    /** Upper bound on bonding progress %. Default 99.99 (already-bonded excluded). */
    max_progress?: number;
    /** Minimum Δprogress/min. Tokens without a 5m-ago snapshot are dropped when set. */
    min_velocity_pct_per_min?: number;
    /** Max minutes since deploy (post-filter). */
    max_age_minutes?: number;
    /** Filter by deployer reputation tier. */
    deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
    /** Restrict to one launchpad venue (default: both). */
    launchpad?: "pumpfun" | "launchlab";
    /** Only tokens whose mint+freeze authorities are revoked. */
    authority_revoked?: boolean;
    /** Minimum liquidity_usd. */
    min_liq?: number;
    /** Sort axis. Default "velocity_desc". */
    sort?: AlmostBondedSort;
    /** Page size (1–100). Default 50. */
    limit?: number;
}
export interface AlmostBondedToken {
    mint: string;
    symbol: string | null;
    name: string | null;
    /** Bonding-curve progress %, from on-chain real_token_reserves depletion. */
    progress_pct: number | null;
    /** Δprogress per minute; null until a 5m-ago snapshot exists. */
    velocity_pct_per_min: number | null;
    /** Linear projection of minutes-to-bond from current velocity; null when not measurable. */
    eta_minutes: number | null;
    /** True when |velocity| is below the stall threshold; null when velocity is unknown. */
    stalled: boolean | null;
    real_sol_reserves: number | null;
    market_cap_usd: number | null;
    liquidity_usd: number | null;
    authorities_revoked: boolean;
    deployer_tier: string | null;
    age_minutes: number | null;
}
export interface AlmostBondedResponse {
    tokens: AlmostBondedToken[];
    filters: Record<string, unknown>;
    returned: number;
    /** v1.24 — what the ranking covered; scan_truncated ⇒ velocity/eta ranks cover only `scanned` candidates. */
    scan?: {
        scanned: number;
        matched: number | null;
        complete: boolean;
        scan_truncated: boolean;
        scan_budget: number;
    };
    note: string;
}
export interface WalletStats {
    first_seen: string;
    last_seen: string;
    total_trades: number;
    buys: number;
    sells: number;
    bought_sol: number;
    sold_sol: number;
    unique_tokens: number;
    window_days: number;
}
/** Rolling dump-cluster stats for a wallet (trailing 42 days, refreshed daily).
 *  A "dump cohort" is a first-20 buyer appearance on a token that peaked <15min
 *  after deploy. `null` on the parent means no cohort record for the wallet. */
export interface DumpClusterStats {
    dump_cohorts: number;
    runner_cohorts: number;
    total_cohorts: number;
    as_of: string;
}
export interface WalletFlags {
    is_kol: boolean;
    kol_name: string | null;
    is_alpha_tracked: boolean;
    /** v1.21 type fix (breaking-ish): was wrongly typed `number | null` — the API
     *  always returned null due to a server bug. Fixed; the real value is a
     *  STRING enum, never a number. */
    bot_confidence: "low" | "medium" | "high" | "none" | null;
    alpha_win_rate: number | null;
    alpha_net_pnl_sol: number | null;
    alpha_tokens_traded: number | null;
    is_deployer: boolean;
    deployer_tokens_deployed: number | null;
    deployer_bonding_rate: number | null;
    /** v1.21 — wallet is on the known-sniper list. Pump.fun-pipeline scoped:
     *  false = not observed, NOT verified clean. */
    is_sniper?: boolean;
    /** v1.21 — wallet is on the bundler list (lifetime flag; never expires). */
    is_bundler?: boolean;
    /** v1.21 — wallet is on the rolling-42d dump-cluster list. */
    is_dumper?: boolean;
    /** v1.21 — cohort stats behind is_dumper, or null when no cohort record. */
    dump_cluster?: DumpClusterStats | null;
}
/** One wallet's reputation flags in a batch-classify response. Values match the
 *  `flags` block of GET /wallet/{address} exactly. All flags are pump.fun-
 *  pipeline scoped — `false` means "not observed", NOT verified clean.
 *  `is_bundler` is lifetime; `is_dumper` is rolling-42d. */
export interface WalletClassification {
    address: string;
    is_sniper: boolean;
    is_bundler: boolean;
    is_dumper: boolean;
    is_kol: boolean;
    kol_name: string | null;
    bot_confidence: "low" | "medium" | "high" | "none" | null;
    dump_cluster: DumpClusterStats | null;
}
export interface WalletBatchClassifyResponse {
    wallets: WalletClassification[];
    count: number;
    as_of: string;
}
export interface WalletTopToken {
    token_mint: string;
    token_symbol: string | null;
    buys: number;
    sells: number;
    sol_in: number;
    sol_out: number;
    realized_pnl_sol: number;
    current_mc_usd: number | null;
    peak_mc_usd: number | null;
    last_traded_at: string;
}
export interface WalletTradingStyle {
    total_trades: number;
    avg_trade_size_sol: number;
    sniper_rate: number;
    early_entries: number;
    round_trip_rate: number;
    tokens_with_round_trips: number;
    median_hold_minutes: number | null;
    dominant_action: "buy" | "sell" | "balanced";
}
export interface WalletDeployerTierEntry {
    tier: string;
    count: number;
}
export interface WalletDeployerBreakdown {
    total_tokens: number;
    tracked_deployers: number;
    by_tier: WalletDeployerTierEntry[];
}
export interface WalletRecentTrade {
    token_mint: string;
    token_symbol: string | null;
    action: "buy" | "sell";
    sol_amount: number;
    block_time: number;
    traded_at: string;
    tx_signature: string;
}
export interface WalletStatsResponse {
    address: string;
    stats: WalletStats | null;
    flags: WalletFlags;
    top_tokens?: WalletTopToken[];
    trading_style?: WalletTradingStyle | null;
    deployer_breakdown?: WalletDeployerBreakdown | null;
    recent_trades?: WalletRecentTrade[];
    /** Derived analytics: win rate, ROI, best/worst trade, biggest miss, verdict (v1.9+). */
    derived?: WalletDerivedStats;
}
export interface WalletPnlSummary {
    realized_sol: number;
    unrealized_sol: number;
    total_pnl_sol: number;
    total_bought_sol: number;
    total_sold_sol: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    profit_factor: number | null;
    avg_hold_minutes: number | null;
    median_hold_minutes: number | null;
    max_drawdown_sol: number;
    open_positions_count: number;
    closed_positions_count: number;
    total_tokens_traded: number;
    best_realized: {
        token_mint: string;
        realized_sol: number;
    } | null;
    worst_realized: {
        token_mint: string;
        realized_sol: number;
    } | null;
}
export interface WalletPnlCurvePoint {
    date: string;
    day_pnl: number;
    cumulative_pnl: number;
    trades: number;
}
export interface WalletClosedPosition {
    token_mint: string;
    buy_count: number;
    sell_count: number;
    bought_sol: number;
    sold_sol: number;
    pnl_sol: number;
    roi_pct: number | null;
    hold_minutes: number | null;
    result: "win" | "loss" | "breakeven";
    first_trade: string | null;
    last_trade: string | null;
}
export interface WalletOpenPosition {
    token_mint: string;
    token_amount: number;
    cost_basis_sol: number;
    avg_entry_price_sol: number;
    current_price_sol: number | null;
    current_value_sol: number | null;
    unrealized_sol: number | null;
    unrealized_pct: number | null;
    first_buy_at: string | null;
    buys_in_position: number;
}
export interface WalletPnlResponse {
    address: string;
    window_days: number;
    summary: WalletPnlSummary;
    pnl_curve: WalletPnlCurvePoint[];
    closed_positions: WalletClosedPosition[];
    open_positions: WalletOpenPosition[];
    notes: {
        cost_basis_observable_from: string;
        truncated_trades?: number;
        trades_through?: string;
        trades_through_block_time?: number;
        trades_through_same_second?: number;
    };
    cache_hit?: boolean;
    computed_at?: string;
    ttl_seconds?: number;
    /** v1.24 — seconds since computed_at (source age survives a cache hit). */
    cache_age_seconds?: number;
    /** v1.24 — hits: head_checked (no newer trade) | unverified (check failed). */
    cache_validation?: "head_checked" | "unverified";
    /** v1.24 — a cache row existed but the wallet traded since; this response was recomputed. */
    cache_invalidated?: "new_activity";
}
export interface WalletPositionsResponse {
    address: string;
    positions: WalletOpenPosition[];
    cache_hit?: boolean;
    computed_at?: string | null;
    ttl_seconds?: number | null;
    cache_age_seconds?: number;
    cache_validation?: "head_checked" | "unverified";
    cache_invalidated?: "new_activity";
}
export interface WalletHoldingsParams {
    /** 1–500, default 200. */
    limit?: number;
    /** Minimum USD value per holding to include, default 0. */
    min_value_usd?: number;
}
/** One current on-chain holding — an SPL or Token-2022 token account balance,
 * enriched with our price/MC/name data plus a `transfer_delta` vs the wallet's
 * trade-derived net position. */
export interface Holding {
    mint: string;
    symbol: string | null;
    name: string | null;
    amount: number;
    amount_raw: string;
    decimals: number;
    token_program: "spl" | "token2022";
    price_usd: number | null;
    value_usd: number | null;
    market_cap_usd: number | null;
    is_bonded: boolean | null;
    /** Trade-derived net position from FIFO math over the data window, or null. */
    trade_derived_amount: number | null;
    /** On-chain `amount` − `trade_derived_amount`. Nonzero exposes tokens that
     * arrived/left WITHOUT a swap (airdrops, insider funding, wallet-hopping). */
    transfer_delta: number | null;
}
export interface WalletHoldingsResponse {
    address: string;
    sol_balance: number;
    holdings: Holding[];
    summary: {
        token_accounts: number;
        non_zero: number;
        returned: number;
        priced: number;
        total_value_usd: number;
        truncated: boolean;
    };
    verified_at: string;
    trade_window_days: number;
    cache_hit: boolean;
    ttl_seconds: number;
}
export interface WalletTradesParams {
    limit?: number;
    cursor?: string;
    action?: "buy" | "sell";
    token_mint?: string;
    since?: number;
    until?: number;
}
export interface WalletTrade {
    tx_signature: string;
    token_mint: string;
    action: "buy" | "sell";
    sol_amount: number;
    token_amount: number;
    /** This trade's executed price — `sol_amount / token_amount`. Added 2026-08-16;
     *  this route returned amounts and no price before. See {@link TokenTrade}. */
    price_sol: number | null;
    /** {@link WalletTrade.price_sol} in USD at the trade's SOL/USD rate. */
    price_usd: number | null;
    /** Canonical pool price near this trade's slot — NOT this trade's price. */
    market_price_sol: number | null;
    /** {@link WalletTrade.market_price_sol} in USD. */
    market_price_usd: number | null;
    block_time: number;
    traded_at: string;
}
export interface WalletTradesResponse {
    address: string;
    trades: WalletTrade[];
    next_cursor: string | null;
    has_more: boolean;
    filters: {
        action: "buy" | "sell" | null;
        token_mint: string | null;
        since: number;
        until: number;
    };
}
export interface TokenTradesParams {
    /** 1–500, default 100. */
    limit?: number;
    /** Opaque cursor from `next_cursor` of a previous response. */
    cursor?: string;
    action?: "buy" | "sell";
    /** Filter to a single wallet address. */
    wallet?: string;
    /** Unix epoch seconds — defaults to the full history (see coverage.history_start). */
    since?: number;
    /** Unix epoch seconds — default now. */
    until?: number;
}
export interface TokenTrade {
    tx_signature: string;
    wallet_address: string;
    action: "buy" | "sell";
    sol_amount: number;
    token_amount: number;
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
    price_sol: number | null;
    /** {@link TokenTrade.price_sol} in USD at the trade's SOL/USD rate. */
    price_usd: number | null;
    /** The market-cap tracker's canonical pool price sampled near this trade's
     *  slot — one value per token per update, so every trade in the same slot
     *  shares it. Use this for a per-token series independent of trade size and
     *  direction; use {@link TokenTrade.price_sol} for cost basis, fills and PnL. */
    market_price_sol: number | null;
    /** {@link TokenTrade.market_price_sol} in USD. */
    market_price_usd: number | null;
    /** Rank among the token's earliest buyers (1 = first), or null. */
    early_buyer_rank: number | null;
    slot: number | null;
    block_time: number;
    traded_at: string;
}
/** Mint-scoped trade tape. `coverage` is the honesty block: the tape starts
 *  2026-04-12 (`history_start`, unix sec) and is pump.fun-pipeline scoped
 *  (`scope`) — trades outside that pipeline are not on the tape. */
export interface TokenTradesResponse {
    mint: string;
    trades: TokenTrade[];
    next_cursor: string | null;
    has_more: boolean;
    filters: {
        action: "buy" | "sell" | null;
        wallet: string | null;
        since: number;
        until: number;
    };
    coverage: TradeCoverage;
}
export interface TokenTopTradersParams {
    /** 1–25, default 25 (ULTRA keys may request up to 100 on the keyed route). */
    limit?: number;
    /** Rank axis. Default "pnl". */
    sort?: "pnl" | "roi";
    /** Lookback window in days (1–180, default 90). */
    window_days?: number;
    /** Minimum SOL bought to qualify (default 0.1). */
    min_bought_sol?: number;
}
/** One wallet in a top-traders response, enriched with our own reputation data
 *  (KOL identity + alpha-wallet stats) so you can tell smart money from bots. */
export interface TokenTopTrader {
    rank: number;
    wallet: string;
    trades: number;
    buys: number;
    sells: number;
    bought_sol: number;
    sold_sol: number;
    realized_pnl_sol: number;
    unrealized_pnl_sol: number;
    total_pnl_sol: number;
    held_value_sol: number;
    roi: number | null;
    still_holding: boolean;
    first_trade_at: string;
    last_trade_at: string;
    is_kol: boolean;
    kol_name: string | null;
    is_alpha_tracked: boolean;
    bot_confidence: "low" | "medium" | "high" | "none" | null;
    historical_win_rate: number | null;
    historical_pnl_sol: number | null;
    historical_tokens: number | null;
}
export interface TokenTopTradersResponse {
    mint: string;
    sort: "pnl" | "roi";
    window_days: number;
    traders: TokenTopTrader[];
    summary: {
        returned: number;
        known_kols: number;
        known_alpha_wallets: number;
        net_realized_pnl_sol: number;
    };
    /** v1.23.4 — trade-coverage disclosure; when `in_scope` is false an empty
     *  `traders` list means "outside the write-gate", not "nobody traded". */
    coverage?: TradeCoverage;
}
export interface SniperRecentParams {
    /** Only deploys detected after this ISO-8601 timestamp. */
    since?: string;
    /** Filter by deployer reputation tier (keyed ULTRA; PRO and x402 payers see elite/good). */
    deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
    /** Minimum deployer lifetime bond rate (0–1). */
    min_bond_rate?: number;
    /** Max results, 1–200 (default 50). */
    limit?: number;
}
/** One deshred-detected pump.fun deploy — surfaces ~500ms before on-chain
 *  confirmation, so the payload carries no MC/logs/balances. */
export interface SniperDeploy {
    mint: string;
    name: string | null;
    symbol: string | null;
    deployer_wallet: string;
    signature: string;
    slot: number;
    detected_at: string;
    detection_region: string;
    detection_confirmed: boolean;
    deployer_tier: string | null;
    deployer_bond_rate: number | null;
    deployer_total_bonded: number | null;
    deployer_recent: string | null;
    deployer_runner_rate?: number | null;
    deployer_labeled_tokens?: number | null;
    confirmed_on_chain: boolean | null;
    confirmed_at: string | null;
    /** v1.21 — slot-window snipe rollup (slots [-1..+3]). Null until the ~10-min
     *  settle window has passed — absent, not zero. */
    footprint?: SniperFootprint | null;
}
export interface SniperRecentResponse {
    deploys: SniperDeploy[];
    count: number;
    data_age_seconds: number | null;
}
/** One DEX pool a token trades in. `is_active` distinguishes live vs parked venues. */
export interface TokenPool {
    pool_address: string;
    dex: string;
    quote_mint: string;
    liquidity_usd: number | null;
    last_price_sol: number | null;
    last_swap_at: string | null;
    amm_id: string | null;
    is_active: boolean;
}
/** Aggregate venue map for a token — pool/dex counts, total liquidity, fragmentation. */
export interface TokenPoolsSummary {
    pool_count: number;
    active_pool_count: number;
    dex_count: number;
    dexes: string[];
    total_liquidity_usd: number | null;
    primary_pool: string | null;
    primary_dex: string | null;
    /** Share of total liquidity held by the largest pool (0–100). */
    top_pool_share_pct: number | null;
}
/**
 * Per-venue liquidity map — every DEX pool a token trades in, live vs parked,
 * with fragmentation and top-pool share. PRO/ULTRA only.
 */
export interface TokenPoolsResponse {
    mint: string;
    pools: TokenPool[];
    summary: TokenPoolsSummary;
}
export interface TokenDepthParams {
    /** SOL buy sizes to quote (max 8, each >0 and ≤10000). Default [0.5, 1, 5, 10]. Sent as a CSV `sizes` query param. */
    sizes?: number[];
}
/** One buy-size quote inside a depth pool. */
export interface TokenDepthQuote {
    /** The requested buy size, in SOL. */
    size_sol: number;
    /** Tokens received for that buy (UI units, fee-adjusted). */
    tokens_out: number;
    /** Average execution price in SOL per token. */
    avg_price_sol: number;
    /** Post-trade spot-price move, % (rounded to 2 decimals). */
    price_impact_pct: number;
}
/** SOL required to move the pool's spot price by 1% / 5% / 10%. */
export interface TokenDepthToMovePrice {
    "1pct": number;
    "5pct": number;
    "10pct": number;
}
/** Fields shared by supported and unsupported depth pools. */
export interface TokenDepthPoolBase {
    pool_address: string;
    dex: string;
    quote_mint: string;
    /** "constant_product" | "curve" | "concentrated" | null (unclassified). */
    pool_model: string | null;
    liquidity_usd: number | null;
    /** Traded within the last hour. */
    is_active: boolean;
}
/** A pool with computable depth. Curve pools (pump.fun/bonk) are priced from a
 *  LIVE read of the curve's virtual reserves (`source: "live_rpc"`); constant-
 *  product pools are served from stream reserves (`source: "stream"`, with
 *  `reserves_age_ms` since the last swap). */
export interface TokenDepthPool extends TokenDepthPoolBase {
    depth_available: true;
    model: string;
    /** Swap fee, % (e.g. 0.25). */
    fee_pct: number;
    source: "stream" | "live_rpc";
    /** Age of the reserves snapshot (0 for live_rpc). */
    reserves_age_ms: number;
    spot_price_sol: number;
    /** One entry per requested size, same order as `sizes_sol`. */
    quotes: TokenDepthQuote[];
    to_move_price: TokenDepthToMovePrice;
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
 * Impact is per-pool, NOT router-optimal. When no pools are tracked:
 * `{ found: false, pools: [], unsupported_pools: [] }`. PRO/ULTRA only.
 */
export interface TokenDepthResponse {
    mint: string;
    /** True when at least one pool has computable depth. */
    found: boolean;
    /** Live SOL/USD used to convert stable-quoted pools (absent when found=false). */
    sol_usd?: number | null;
    /** The SOL buy sizes actually quoted (deduped, sorted asc). */
    sizes_sol: number[];
    /** Deepest pool with depth available (absent when found=false). */
    primary_pool?: string | null;
    pools: TokenDepthPool[];
    unsupported_pools: TokenDepthUnsupportedPool[];
    note?: string;
}
/** Wallet-intelligence labels on a holder. Empty = unknown to us, NOT verified clean. */
export type TokenHolderLabel = "deployer" | "kol" | "early_buyer" | "buyer" | "bundle" | "bot" | "dump_cluster";
/** One ranked holder (owner wallet, token accounts merged). */
export interface TokenHolder {
    rank: number;
    /** Owner wallet of the token account(s). */
    owner: string;
    token_accounts: string[];
    /** Raw u64 balance as a decimal STRING — never a float. */
    amount_raw: string;
    /** Decimal-adjusted convenience value (null when decimals unknown). */
    amount: number | null;
    pct_of_supply: number | null;
    /** Share of supply minus pools / bonding curves / burns. */
    pct_of_circulating: number | null;
    labels: TokenHolderLabel[];
    kol_name: string | null;
    early_buyer_rank: number | null;
    bot_confidence: "none" | "low" | "medium" | "high" | null;
    historical_win_rate: number | null;
}
/**
 * An owner EXCLUDED from the circulating denominator, named where we can:
 * `pool` = vault authority of a known pool (`dex` + `pool_address` set);
 * `bonding_curve` = pump.fun / LaunchLab curve; `burn` = incinerator / system program;
 * `program_account` = off-curve owner we could not attribute (vault, escrow, staking, unknown pool).
 */
export interface TokenHolderExcluded {
    owner: string;
    token_accounts: string[];
    /** Raw u64 as a STRING. */
    amount_raw: string;
    pct_of_supply: number | null;
    reason: "pool" | "bonding_curve" | "burn" | "program_account";
    dex: string | null;
    pool_address: string | null;
}
/** Concentration over the FULL owner set (tier governs disclosure only). */
export interface TokenHoldersConcentration {
    /**
     * EXACT distinct non-zero owners minus excluded pools/curves/burns, at `slot`
     * (census). null ONLY when the provider refused the census for a mega-cap
     * (see `source.census_fallback_reason`) — never estimated from trades.
     */
    holder_count: number | null;
    holder_count_source: "census" | null;
    token_accounts_nonzero: number | null;
    /** Raw u64 as STRINGS. */
    supply_raw: string | null;
    circulating_raw: string | null;
    decimals: number | null;
    /** Shares over the circulating denominator (supply minus excluded). top50/top100 are null on the top-20 fallback. */
    top1_share: number | null;
    top10_share: number | null;
    top20_share: number | null;
    top50_share: number | null;
    top100_share: number | null;
    /** Share of TOTAL supply in pools/curves/vaults/burns (= pool_pct + burned_pct + program_pct). */
    pool_and_program_pct: number | null;
    /** Share of total supply in NAMED pools + bonding curves. */
    pool_pct: number | null;
    burned_pct: number | null;
    /** Share of total supply held by off-curve owners we could not attribute. */
    program_pct: number | null;
    deployer_pct: number | null;
    kol_pct: number | null;
    early_buyer_pct: number | null;
    bundle_pct: number | null;
    bot_pct: number | null;
    dump_cluster_pct: number | null;
    distinct_owners_in_top20: number;
    /** How many ranked owners the scan retained (≤100 census, ≤20 fallback). */
    ranked_owners_available: number;
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
    mint: string;
    /** Ledger slot the holder set was read at. */
    slot: number | null;
    as_of: string;
    holders: TokenHolder[];
    count: number;
    /** Rank cap by tier: 10 PRO, 50 ULTRA, 100 BUSINESS. */
    disclosed: number;
    excluded: TokenHolderExcluded[];
    concentration: TokenHoldersConcentration;
    deployer: {
        wallet: string;
        tier: string;
        bonding_rate: number | null;
    } | null;
    source: {
        method: "getProgramAccounts_census" | "getTokenLargestAccounts";
        token_program: string | null;
        rpc_cap: number;
        commitment: string;
        scan_ms: number | null;
        /** Set when the provider refused the census and the top-20 view was served instead. */
        census_fallback_reason: string | null;
        note: string;
    };
}
/** Locker program a contract lives under. LP locks are NOT covered (token / vesting locks only). */
export type TokenLockProgram = "streamflow" | "jupiter_lock" | "bonfida_vesting";
/** `lock` = whole amount released at one date; `vesting` = cliff and/or periodic release. */
export type TokenLockKind = "lock" | "vesting";
/** Contract status, derived at request time from the on-chain schedule + withdrawn/cancelled state. */
export type TokenLockStatus = "active" | "completed" | "cancelled" | "closed";
/** Kind of unlock event: `cliff`, periodic `period`, the `final` release, or a Bonfida `tranche`. */
export type TokenUnlockEventKind = "cliff" | "period" | "final" | "tranche";
/** Mint facts joined to a lock row / unlock event. All null when unknown (`facts_resolved`). */
export interface TokenLockToken {
    symbol: string | null;
    name: string | null;
    decimals: number | null;
    price_usd: number | null;
    market_cap_usd: number | null;
}
/** The next unlock event of a single contract. `amount_raw` is a base-unit STRING. */
export interface TokenLockNextUnlock {
    at: string;
    kind: TokenUnlockEventKind;
    amount_raw: string;
    amount: number | null;
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
    lock_account: string;
    program: TokenLockProgram;
    kind: TokenLockKind;
    status: TokenLockStatus;
    mint: string;
    /** Creator / locker. Bonfida has none on-chain. */
    sender: string | null;
    recipient: string | null;
    name: string | null;
    /** Deposited amount. */
    amount_raw: string;
    amount: number | null;
    amount_usd: number | null;
    amount_pct_of_supply: number | null;
    /** Still locked right now (amount − unlocked-so-far); "0" unless active. */
    locked_raw: string;
    locked: number | null;
    locked_usd: number | null;
    locked_pct_of_supply: number | null;
    unlocked_raw: string;
    unlocked: number | null;
    /** Claimed so far. */
    withdrawn_raw: string;
    withdrawn: number | null;
    /** Unlocked but not yet withdrawn. */
    claimable_raw: string;
    claimable: number | null;
    start_at: string | null;
    cliff_at: string | null;
    /** Fully unlocked at; null = perpetual / no schedule. */
    end_at: string | null;
    period_seconds: number | null;
    /** period < 1h (per-second stream, e.g. Streamflow payroll). */
    continuous: boolean;
    amount_per_period_raw: string | null;
    amount_per_period: number | null;
    cliff_amount_raw: string | null;
    cliff_amount: number | null;
    perpetual: boolean;
    next_unlock: TokenLockNextUnlock | null;
    /** The locker can cancel — funds are locked against the RECIPIENT, not the locker (a weaker promise). */
    cancelable_by_sender: boolean | null;
    cancelable_by_recipient: boolean | null;
    transferable: boolean | null;
    can_topup: boolean | null;
    cancelled_at: string | null;
    created_at: string | null;
    /** Backfilled row with no on-chain creation time (Jupiter Lock). */
    created_at_estimated: boolean;
    tx_signature: string | null;
}
/** A lock row on the cross-token feed — the contract plus its mint's facts. */
export interface TokenLockFeedEntry extends TokenLock {
    token: TokenLockToken;
}
/** Rollup over ALL contracts on a mint (the `status` / `program` filters only narrow `locks[]`). */
export interface TokenLocksSummary {
    /** Exact count of contracts on the mint. */
    lock_count: number;
    /** false when the mint holds more than 5000 contracts — totals then cover the newest 5000 (`rows_considered`). */
    complete: boolean;
    rows_considered: number;
    active_count: number;
    by_program: Record<string, number>;
    by_kind: Record<string, number>;
    distinct_lockers: number;
    locked_raw: string;
    locked: number | null;
    locked_usd: number | null;
    locked_pct_of_supply: number | null;
    deposited_raw: string;
    deposited: number | null;
    deposited_usd: number | null;
    /** Forward unlock schedule — everything releasing in the next 7 / 30 days. */
    unlocking_7d_raw: string;
    unlocking_7d: number | null;
    unlocking_7d_usd: number | null;
    unlocking_7d_pct_of_supply: number | null;
    unlocking_30d_raw: string;
    unlocking_30d: number | null;
    unlocking_30d_usd: number | null;
    unlocking_30d_pct_of_supply: number | null;
    /** Nearest next unlock across all active contracts. */
    next_unlock: (TokenLockNextUnlock & {
        lock_account: string;
    }) | null;
    /** Active contracts the sender can still cancel (pull the funds back). */
    active_cancelable_by_sender: number;
}
/** Query params for GET /tokens/{mint}/locks. */
export interface TokenLocksParams {
    /** Filter the list (the summary always covers all rows). */
    status?: TokenLockStatus;
    program?: TokenLockProgram;
    /** 1–500, default 200. */
    limit?: number;
}
/**
 * GET /tokens/{mint}/locks — every on-chain lock / vesting contract on a mint
 * (Streamflow, Jupiter Lock, Bonfida vesting) with a live-derived view + summary.
 * **LP locks are NOT included** (token / vesting locks only). PRO+, keyed only.
 */
export interface TokenLocksResponse {
    mint: string;
    token: TokenLockToken & {
        supply: number | null;
        facts_resolved: boolean;
    };
    summary: TokenLocksSummary;
    locks: TokenLock[];
    meta?: Record<string, unknown>;
}
/** Query params for GET /tokens/locks (cross-token feed of NEW contracts). */
export interface TokenLocksFeedParams {
    /** ISO date-time — only contracts created after this instant (use `pagination.next_since`). */
    since?: string;
    /** ISO date-time — page back: only contracts created before this instant (`pagination.next_before`). Legacy + strict: skips same-timestamp siblings — prefer `cursor`. */
    before?: string;
    /** v1.24 — opaque `pagination.next_cursor` from the previous page: strict (created_at, id) keyset, no repeats, no skips. Not combinable with `before`. */
    cursor?: string;
    mint?: string;
    sender?: string;
    recipient?: string;
    program?: TokenLockProgram;
    kind?: TokenLockKind;
    status?: TokenLockStatus;
    /** Deposited amount in USD ≥ (needs a known price; post-filter). */
    min_usd?: number;
    /** 0–100 (post-filter). */
    min_pct_of_supply?: number;
    /** Include backfilled Jupiter Lock rows that have no on-chain creation time (default: excluded). */
    include_estimated?: boolean;
    /** 1–100, default 50. */
    limit?: number;
}
/** Cursor pagination on the ISO-timestamp feeds. */
export interface TokenFeedPagination {
    limit: number;
    count: number;
    has_more: boolean;
    /** Pass as `since` to fetch only what is newer. */
    next_since: string | null;
    /** Pass as `before` to page back. */
    next_before: string | null;
    /** v1.24 (locks feed) — pass as `cursor` to page back without skipping same-timestamp rows; null = end. */
    next_cursor?: string | null;
    /** v1.24 — present when a post-filter (min_usd / min_pct_of_supply / status) was scanned. */
    post_filtered?: boolean;
    scanned?: number;
    scan_truncated?: boolean;
    scan_budget?: number;
}
/** WebSocket pointer returned by the feed endpoints — the same rows are pushed live on `channel`. */
export interface TokenFeedStreamPointer {
    channel: string;
    url: string;
    token_endpoint?: string;
    subscribe?: {
        type: "subscribe";
        channels: string[];
    };
    note?: string;
}
/** GET /tokens/locks — newest lock / vesting contracts across all mints. PRO+, keyed only. */
export interface TokenLocksFeedResponse {
    locks: TokenLockFeedEntry[];
    pagination: TokenFeedPagination;
    /** v1.24 — "mint_facts:<table>" when a per-mint enrichment read failed; those rows' usd/ui/pct are null (unknown) and min_usd / min_pct_of_supply could not be applied to them. */
    degraded_fields?: string[];
    /** Pointer to the `token:locks` WS channel (event `token:lock`). */
    stream: TokenFeedStreamPointer;
    meta?: Record<string, unknown>;
}
/** Look-ahead window for GET /tokens/unlocks. */
export type TokenUnlocksWithin = "1h" | "6h" | "24h" | "3d" | "7d" | "14d" | "30d" | "90d";
/** Query params for GET /tokens/unlocks. */
export interface TokenUnlocksParams {
    /** Default "7d". */
    within?: TokenUnlocksWithin;
    mint?: string;
    program?: TokenLockProgram;
    kind?: TokenLockKind;
    /** Next-event amount in USD ≥ (needs a known price). */
    min_usd?: number;
    /** 0–100. */
    min_pct_of_supply?: number;
    /** Default "soonest". */
    sort?: "soonest" | "largest_usd" | "largest_pct";
    /** 1–200, default 50. */
    limit?: number;
}
/**
 * One upcoming unlock — the NEXT event of an active contract inside the window,
 * plus that contract's total release over the whole window (`window_amount_*`).
 */
export interface TokenUnlockEvent {
    unlock_at: string;
    in_seconds: number;
    event: TokenUnlockEventKind;
    amount_raw: string;
    amount: number | null;
    amount_usd: number | null;
    amount_pct_of_supply: number | null;
    window_amount_raw: string;
    window_amount: number | null;
    window_amount_usd: number | null;
    window_amount_pct_of_supply: number | null;
    mint: string;
    token: TokenLockToken;
    /** The contract this event belongs to (a subset of the {@link TokenLock} row). */
    lock: Pick<TokenLock, "lock_account" | "program" | "kind" | "name" | "sender" | "recipient" | "amount_raw" | "amount" | "amount_usd" | "locked_raw" | "locked" | "locked_usd" | "cliff_at" | "end_at" | "period_seconds" | "continuous" | "cancelable_by_sender">;
}
/** GET /tokens/unlocks — upcoming unlock events across all active contracts. PRO+, keyed only. */
export interface TokenUnlocksResponse {
    window: {
        within: TokenUnlocksWithin;
        from: string;
        to: string;
    };
    unlocks: TokenUnlockEvent[];
    pagination: {
        limit: number;
        count: number;
        total_in_window: number;
        has_more: boolean;
    };
    meta?: Record<string, unknown>;
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
    program: TokenLockProgram;
    mint: string;
    kind: TokenLockKind;
    sender: string | null;
    recipient: string | null;
    /** Base-unit STRING. */
    amount_raw: string;
    /** May be null on the very first sighting of a mint. */
    decimals: number | null;
    start_at: string | null;
    cliff_at: string | null;
    end_at: string | null;
    name: string | null;
    tx_signature: string | null;
    slot: number | null;
    created_at: string;
}
/** Lifecycle event names delivered on `token:locks` to a subscription with `filters.lifecycle: true`. */
export type TokenLockLifecycleEventName = "token:lock_claimed" | "token:lock_cancelled" | "token:lock_closed" | "token:lock_updated" | "token:unlock_upcoming" | "token:unlock_available";
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
    event_key: string;
    lock_account: string;
    mint: string;
    program: TokenLockProgram;
    /** Slot of the account update (null on schedule events). */
    slot: number | null;
    /** When the tracker observed it (ISO). */
    observed_at: string | null;
    /** The token's decimals; null when unknown. */
    decimals?: number | null;
}
/** `token:lock_claimed` — withdrawn increased since OUR last observed state. */
export interface TokenLockClaimedEvent extends TokenLockLifecycleBase {
    /** Δ withdrawn since the last observed state (a claim during a stream gap folds into the next one). Raw string. */
    claimed_raw: string;
    withdrawn_raw: string;
    /** amount − withdrawn. */
    remaining_raw: string;
    partial: boolean;
    /** Streamflow keeper-cranked withdrawal (hidden unless `include_automatic_claims`). */
    automatic_withdrawal: boolean | null;
    before: {
        withdrawn_raw: string;
    };
    after: {
        withdrawn_raw: string;
    };
    tx_signature: string | null;
}
/** `token:lock_cancelled`. */
export interface TokenLockCancelledEvent extends TokenLockLifecycleBase {
    cancelled_at: string;
    withdrawn_raw: string | null;
    amount_raw: string | null;
    before: {
        cancelled_at: null;
        status: TokenLockStatus | null;
    };
    after: {
        cancelled_at: string;
        status: TokenLockStatus | null;
    };
    tx_signature: string | null;
}
/** `token:lock_closed` — Streamflow `closed` flag, or the account closed on chain. */
export interface TokenLockClosedEvent extends TokenLockLifecycleBase {
    reason: "closed_flag" | "account_closed";
    withdrawn_raw?: string | null;
    amount_raw?: string | null;
    before: {
        status: TokenLockStatus | null;
    };
    after: {
        status: "closed";
    };
    tx_signature: string | null;
}
/** `token:lock_updated` — one event per change, never merged; `before` / `after` hold only the changed fields. */
export interface TokenLockUpdatedEvent extends TokenLockLifecycleBase {
    change: "topup" | "extended" | "schedule_changed" | "recipient_changed";
    /** `topup` only: amount added (raw string). */
    added_raw?: string;
    /** `schedule_changed` only: cliff_at / period_seconds / amount_per_period_raw / cliff_amount_raw / end_at. */
    fields?: string[];
    before: Record<string, string | number | null>;
    after: Record<string, string | number | null>;
    tx_signature: string | null;
}
/**
 * `token:unlock_upcoming` (the lock's next unlock is within 24 h) /
 * `token:unlock_available` (the unlock instant passed within the last 30 min).
 * `available` means claimable PER THE SCHEDULE, NOT claimed.
 */
export interface TokenUnlockScheduleEvent extends TokenLockLifecycleBase {
    unlock_at: string;
    unlock_kind: TokenUnlockKind;
    /** Discrete jump unlocking at that instant (GET /tokens/unlocks model); null + `amount_reason` when unknown. */
    amount_raw: string | null;
    amount_reason: string | null;
    unlocked_total_raw: string | null;
    release_model: "periodic" | "continuous" | "tranched";
    /** Only on `token:unlock_available`. */
    claimable?: true;
    kind: TokenLockKind | null;
    sender: string | null;
    recipient: string | null;
    locked_amount_raw: string | null;
    withdrawn_raw: string | null;
}
/** Any lifecycle payload on `token:locks` — narrow on the frame's `event`. */
export type TokenLockLifecycleEvent = TokenLockClaimedEvent | TokenLockCancelledEvent | TokenLockClosedEvent | TokenLockUpdatedEvent | TokenUnlockScheduleEvent;
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
    chain: "solana";
    mint: string;
    bucket_start: string;
    /** bucket_start + 60 s. */
    bucket_end: string;
    /** When the row was first written (≈ ≤ 25 s after bucket_end). */
    closed_at: string | null;
    open_price_usd: number | null;
    high_price_usd: number | null;
    low_price_usd: number | null;
    close_price_usd: number | null;
    open_mc_usd: number | null;
    high_mc_usd: number | null;
    low_mc_usd: number | null;
    close_mc_usd: number | null;
    open_liquidity_usd: number | null;
    close_liquidity_usd: number | null;
    close_supply: number | null;
    volume_usd: number | null;
    volume_mev_usd: number | null;
    buy_volume_usd: number | null;
    sell_volume_usd: number | null;
    trades: number | null;
    buy_count: number | null;
    sell_count: number | null;
    dex: string | null;
    pool_address: string | null;
    write_id: string | null;
    final: true;
    source: "token_ohlc_1m";
}
/**
 * `candle:update` frame `data` (only with `filters.updates: true`) — the
 * producer's in-progress minute, ≤ 1 per mint per second. A state stream: no
 * id / seq, never replayed, no snapshot on subscribe.
 */
export interface TokenCandleUpdateEvent {
    chain: "solana";
    mint: string;
    bucket_start: string;
    bucket_end: string;
    open_price_usd: number | null;
    high_price_usd: number | null;
    low_price_usd: number | null;
    close_price_usd: number | null;
    close_mc_usd: number | null;
    volume_usd: number | null;
    trades: number | null;
    final: false;
    /** The producer's timestamp of this state (ISO). */
    as_of: string | null;
    source: "mc-tracker:open_candle";
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
    chain: "solana";
    mint: string;
    /** `<mint>:mint_authority:revoked` | `<mint>:freeze_authority:revoked` | `<mint>:transfer_fee:<before>><after>:<observed_at ms>`. */
    event_key: string;
    field: "mint_authority" | "freeze_authority" | "transfer_fee";
    /** `{revoked}` for the authorities, `{transfer_fee_bps}` for the fee. */
    before: {
        revoked: boolean;
    } | {
        transfer_fee_bps: number;
    };
    after: {
        revoked: boolean;
    } | {
        transfer_fee_bps: number;
    };
    /** The full picture after the change. */
    mint_authority_revoked: boolean | null;
    freeze_authority_revoked: boolean | null;
    transfer_fee_bps: number | null;
    is_token_2022: boolean | null;
    /** When mc-tracker parsed the mint account that showed the change. */
    observed_at: string | null;
    /** The parse before: the change happened on chain in between. */
    previous_observed_at: string | null;
    written_at: string;
    slot: null;
    source: "token_prices";
}
/**
 * `risk:supply_inflated` — the first `supply_drift_events` row for the mint
 * reaching a level (warn 0.5 % / danger 5 %). Per-observation drift, not a
 * cumulative inflation. Frame id = `risk:supply_inflated:<event_key>`.
 */
export interface TokenRiskSupplyInflatedEvent {
    chain: "solana";
    mint: string;
    /** `<mint>:supply_inflated:warn` | `<mint>:supply_inflated:danger`. */
    event_key: string;
    level: "warn" | "danger";
    /** 0.5 (warn) | 5 (danger). */
    threshold_pct: number;
    /** drift / expected of one drift row, in percent, 4 dp. */
    inflation_pct: number;
    /** Integer strings. */
    expected_supply_raw: string;
    onchain_supply_raw: string;
    drift_raw: string;
    detected_at: string;
    drift_event_id: number;
    window_days: 30;
    written_at: string;
    slot: null;
    source: "supply_drift_events";
}
/**
 * `risk:inputs` snapshot frame `data` (frame `snapshot: true`, no id / seq):
 * the CURRENT stored risk inputs of one scoped mint. Not the score or band —
 * `GET /tokens/{mint}/risk` computes those.
 */
export interface TokenRiskInputsSnapshot {
    chain: "solana";
    mint: string;
    /** false = the mint is not in the price table (every input null). */
    tracked: boolean;
    mint_authority_revoked: boolean | null;
    freeze_authority_revoked: boolean | null;
    transfer_fee_bps: number | null;
    is_token_2022: boolean | null;
    authority_observed_at: string | null;
    /** Worst positive supply drift in the last 30 days; null when none. `level` null below 0.5 %. */
    supply_inflation: {
        inflation_pct: number;
        level: "warn" | "danger" | null;
        detected_at: string | null;
        window_days: 30;
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
    event_key: string;
    chain: "solana";
    wallet: string;
    tier_before: DeployerTierChangeValue | null;
    tier_after: DeployerTierChangeValue | null;
    entered_ranking: boolean;
    is_tracked: boolean | null;
    /** As of the write. */
    stats: {
        total_tokens_deployed: number | null;
        total_bonded: number | null;
        instant_bonds: number | null;
        bonding_rate: number | null;
        recent_bond_rate: number | null;
        recent_outcomes: string | null;
    };
    computed_at: string;
    source: WalletScoreSource;
}
/** The categorical KOL score fields diffed on `kol:score_state_changed`. */
export interface KolScoreState {
    is_cold: boolean | null;
    is_heating_up: boolean | null;
    auto_strategy_tag: KolStrategy | null;
}
/**
 * `kol:score_state_changed` — one event per KOL per `mv_kol_scores` refresh
 * where `is_cold`, `is_heating_up` or `auto_strategy_tag` differs (fields never
 * split). Frame id = `kol:score_state_changed:<event_key>`.
 */
export interface KolScoreStateChangedEvent {
    /** `<wallet>:<computed_at epoch ms>`. */
    event_key: string;
    chain: "solana";
    wallet: string;
    kol_wallet_id: string | null;
    kol_name: string | null;
    /** All three for a KOL first seen after the seed. */
    changed: Array<keyof KolScoreState>;
    /** null for a first appearance. */
    before: KolScoreState | null;
    after: KolScoreState;
    computed_at: string;
    source: "matview_refresh";
    matview: "mv_kol_scores";
}
/** Any event payload on `wallet:scores` — narrow on the frame's `event`. */
export type WalletScoreEvent = DeployerTierChangedEvent | KolScoreStateChangedEvent;
/** pump.fun fee event types (`creator_claim` is excluded from the feed unless requested via `type=`). */
export type TokenFeeEventType = "shares_created" | "shares_updated" | "shares_reset" | "distribution" | "social_pda_created" | "social_claim" | "creator_transferred" | "creator_claim";
/** A shareholder on a SharingConfig: `{ address, share_bps }` (bps of the creator fee). */
export interface TokenFeeShareEntry {
    address: string;
    share_bps: number;
}
/**
 * A pump_fees SocialFeePda — fees earmarked for a platform identity (platform 2 = X;
 * `user_id` is the platform-native numeric id, NOT the handle) until the identity's
 * owner claims them.
 */
export interface TokenFeeSocialIdentity {
    platform: number;
    /** "x" for platform 2; `platform_<n>` for platforms not yet observed. */
    platform_label: string | null;
    user_id: string;
    /** Base-unit STRING (quote lamports). */
    lifetime_claimed_raw: string;
    lifetime_claimed: number | null;
    lifetime_claimed_usd: number | null;
    last_claimed_at: string | null;
}
/** One shareholder / recipient of a coin's creator fees, with what it has received so far. */
export interface TokenFeeShareholder {
    address: string;
    /** null for a past recipient no longer in the split. */
    share_bps: number | null;
    share_pct: number | null;
    /** The config admin (normally the coin creator). */
    is_admin: boolean;
    /** Address is a pump_fees SocialFeePda — fees earmarked for a platform identity. */
    is_social_pda: boolean;
    social: TokenFeeSocialIdentity | null;
    /** Total received via distributions since 2026-08-17 — base-unit STRING. */
    received_raw: string;
    received: number | null;
    received_usd: number | null;
    payout_count: number;
    last_payout_at: string | null;
}
/** The on-chain SharingConfig of a pump.fun coin (pump_fees PDA ["sharing-config", mint]). */
export interface TokenFeeSharingConfig {
    sharing_config: string;
    admin: string | null;
    admin_revoked: boolean | null;
    status: string | null;
    version: number | null;
    /** true = 100% to the admin, no redirect (pump creates one per coin — a real answer, not "unknown"). */
    is_default: boolean | null;
    /** Share going to NON-admin addresses. */
    redirected_bps: number;
    redirected_pct: number;
    /** Share going to social PDAs. */
    social_bps: number;
    social_pct: number;
    shareholders: TokenFeeShareholder[];
    /** `stream` = our table (only non-default configs are stored); `chain` = live PDA read. */
    source: "stream" | "chain";
    updated_at: string | null;
}
/** Config change / creator transfer on the fee-shares history log. */
export interface TokenFeeShareHistoryEntry {
    id: number;
    type: TokenFeeEventType;
    at: string;
    tx_signature: string;
    actor: string | null;
    admin: string | null;
    recipient: string | null;
    shareholders: TokenFeeShareEntry[] | null;
    amount_raw: string | null;
    amount: number | null;
    social: {
        platform: number;
        platform_label: string | null;
        user_id: string;
        pda: string | null;
    } | null;
    /** Full decoded Anchor event. */
    payload: Record<string, unknown> | null;
}
/** One `distribute_creator_fees` payout on the fee-shares view. */
export interface TokenFeeDistribution {
    at: string;
    tx_signature: string;
    amount_raw: string;
    amount: number | null;
    amount_usd: number | null;
    shareholders: TokenFeeShareEntry[] | null;
    actor: string | null;
}
/**
 * GET /tokens/{mint}/fee-shares — pump.fun creator-fee sharing on a coin: who the
 * fees are redirected to (SharingConfig), the distribution rollup per recipient,
 * the config change log and recent payouts. **Event history starts 2026-08-17.**
 * PRO+, keyed only.
 */
export interface TokenFeeSharesResponse {
    mint: string;
    /** null when the live read failed on every RPC endpoint (see `config_error`). */
    config: TokenFeeSharingConfig | null;
    config_pda: string;
    config_error: string | null;
    /** Quote asset the fees are paid in (SOL unless a stable-quoted coin). */
    quote: {
        symbol: string;
        decimals: number;
        sol_usd: number | null;
    };
    distributions: {
        count: number;
        total_raw: string;
        total: number | null;
        total_usd: number | null;
        last_at: string | null;
        /** Everyone who received a payout (current + past shareholders), largest first. */
        recipients: TokenFeeShareholder[];
        /** Recipients no longer in the split. */
        past_recipients: TokenFeeShareholder[];
        payouts_considered: number;
        payouts_truncated: boolean;
    };
    /** Config changes + creator transfers, newest first (max 100). */
    history: TokenFeeShareHistoryEntry[];
    recent_distributions: TokenFeeDistribution[];
    meta?: Record<string, unknown>;
}
/** Query params for GET /tokens/fee-claims. */
export interface TokenFeeClaimsParams {
    /** Comma list of {@link TokenFeeEventType} (default: all except `creator_claim`). */
    type?: string;
    mint?: string;
    /** Payout / claim recipient wallet, or the new creator. */
    recipient?: string;
    /** Transaction signer. */
    actor?: string;
    /** Raw platform id (2 = X). */
    social_platform?: number;
    /** Platform-native numeric user id. */
    social_user_id?: string;
    /** Amount floor in SOL. */
    min_sol?: number;
    /** ISO date-time (use `pagination.next_since`). */
    since?: string;
    /** ISO date-time (use `pagination.next_before`). */
    before?: string;
    /** 1–100, default 50. */
    limit?: number;
}
/** Pro-rata payout to one shareholder inside a `distribution` event. */
export interface TokenFeePayout {
    address: string;
    share_bps: number;
    amount_raw: string;
    amount: number | null;
    amount_usd: number | null;
}
/** One decoded pump.fun fee event on the feed. Amounts are quote base units (SOL lamports unless a stable-quoted coin) as STRINGS. */
export interface TokenFeeClaimEvent {
    id: number;
    type: TokenFeeEventType;
    at: string;
    tx_signature: string;
    slot: number | null;
    /** null for social claims and creator vault claims (per identity / per creator). */
    mint: string | null;
    admin: string | null;
    /** Transaction signer. */
    actor: string | null;
    recipient: string | null;
    amount_raw: string | null;
    amount: number | null;
    amount_usd: number | null;
    /** Quote symbol, e.g. "SOL". */
    quote: string;
    social: {
        platform: number;
        platform_label: string | null;
        user_id: string;
        pda: string | null;
    } | null;
    shareholders: TokenFeeShareEntry[] | null;
    /** `distribution` only: pro-rata amount per shareholder. */
    payouts: TokenFeePayout[] | null;
    /** Full decoded Anchor event. */
    payload: Record<string, unknown> | null;
}
/** GET /tokens/fee-claims — pump.fun fee-event feed, newest first. **History starts 2026-08-17.** PRO+, keyed only. */
export interface TokenFeeClaimsResponse {
    events: TokenFeeClaimEvent[];
    pagination: TokenFeedPagination;
    /** Pointer to the `token:fee_claims` WS channel (event `token:fee_claim`). */
    stream: TokenFeedStreamPointer;
    meta?: Record<string, unknown>;
}
/**
 * Payload of a `token:fee_claim` WS event (channel `token:fee_claims`) — pushed by
 * the fee-claim-tracker the moment the tx confirms. A compact writer payload (flat
 * `event_type` / `block_time` / `social_*` fields), NOT the enriched REST row —
 * no ui / usd amounts or `payouts[]`; call GET /tokens/fee-claims for those.
 */
export interface TokenFeeClaimStreamEvent {
    id: number;
    event_type: TokenFeeEventType;
    tx_signature: string;
    slot: number | null;
    /** The event's own on-chain timestamp. */
    block_time: string;
    /** null for social claims and creator vault claims. */
    mint: string | null;
    sharing_config: string | null;
    admin: string | null;
    actor: string | null;
    recipient: string | null;
    /** Quote base units as a STRING (SOL lamports unless a stable-quoted coin). */
    amount_raw: string | null;
    quote_mint: string | null;
    social_platform: number | null;
    social_user_id: string | null;
    social_fee_pda: string | null;
    shareholders: TokenFeeShareEntry[] | null;
}
export type TokenSurgeKind = "surge" | "revival";
/** Surge tiers — each fires at most once per mint; tiers are independent. `null` on revivals. */
export type TokenSurgeTier = "early" | "strong" | "breakout";
/** How the token's birth was established (surge only). */
export type TokenSurgeBirthSource = "sniper" | "deployer" | "first_seen";
/** `launch` = first MC sample ≤ 90 s after birth (multiple applied); `late` = engine saw the token later (USD floor + velocity only). */
export type TokenSurgeBaselineSource = "launch" | "late";
/** Where the burst tape numbers were measured: 1-minute candles (every DEX), live `token_trades` (pump-pipeline mints), or nothing yet. */
export type TokenSurgeTapeSource = "candles" | "wallet_trades";
export type TokenSurgeRiskFlag = "bundled_launch" | "few_buyers" | "wash_pattern" | "thin_liquidity" | "cold_deployer" | "sniper_heavy" | "early_buyers_exiting" | "sell_pressure" | "no_tape_trades" | "no_prior_price" | "mint_authority_active" | "transfer_fee";
export type TokenSurgeDeployerTier = "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
/** Burst tape since birth (surge) or since the revival started. Counts are null when no tape covers the window yet. */
export interface TokenSurgeTape {
    since: string | null;
    /** false = no tape carries the window yet (candle lag) — every count below is null, and no tape-derived flag is set. */
    available: boolean;
    source: TokenSurgeTapeSource | null;
    buys: number | null;
    sells: number | null;
    trades: number | null;
    buy_volume_usd: number | null;
    sell_volume_usd: number | null;
    volume_usd: number | null;
    mev_volume_usd: number | null;
    buy_sol: number | null;
    sell_sol: number | null;
    /** Only when the mint is in `token_trades` coverage (`wallet_data_available`) — never an inferred zero. */
    unique_buyers: number | null;
    unique_wallets: number | null;
    trades_per_wallet: number | null;
    wallet_data_available: boolean;
}
export interface TokenSurgeKol {
    buyers: number;
    buys: number;
    sells: number;
    /** Up to 10 tracked-KOL names. */
    names: string[];
}
/** First-20 early-buyer cohort (pump-pipeline facts; zeros for mints outside coverage). */
export interface TokenSurgeEarlyBuyers {
    count: number;
    /** Early buyers that bought in the same block. */
    bundled: number;
    cohort_sol: number | null;
    /** Cohort wallets that have already sold. */
    sold: number;
    /** Cohort wallets that are known sniper wallets. */
    sniper_wallets: number;
}
export interface TokenSurgeDeployer {
    wallet: string | null;
    tier: TokenSurgeDeployerTier | string;
    bonding_rate: number | null;
    total_bonded: number | null;
    total_deployed: number | null;
    runner_rate: number | null;
    labeled_tokens: number | null;
    /** Recent outcome string, e.g. "BDDBBDDDBD" (B = bonded, D = dead). */
    recent: string | null;
}
/**
 * One token momentum fire — the `token:surge` / `token:revival` WS + webhook payload and the
 * REST row minus `outcome`. Both kinds share one shape: `tier`, `baseline_*`, `mc_multiple`,
 * `mc_change_3m_pct` are null on revivals; `dormant_hours`, `prev_mc_usd`, `mc_vs_prev_multiple`
 * are null on surges.
 */
export interface TokenSurgeEvent {
    id: number | null;
    kind: TokenSurgeKind;
    tier: TokenSurgeTier | null;
    mint: string;
    symbol: string | null;
    name: string | null;
    /** Venue at birth / classification (e.g. `pumpfun`, `launchlab`, `bags`). */
    launchpad: string | null;
    /** Where it trades at fire time (a pump token that graduated is `pumpswap` here, `pumpfun` above). */
    primary_dex: string | null;
    fired_at: string;
    birth_at: string | null;
    birth_source: TokenSurgeBirthSource | null;
    age_seconds: number | null;
    market_cap_usd: number;
    liquidity_usd: number | null;
    liquidity_to_mc_ratio: number | null;
    price_usd: number | null;
    /** Surge only: launch MC (first sample after birth). */
    baseline_mc_usd: number | null;
    baseline_source: TokenSurgeBaselineSource | null;
    /** Surge only: `market_cap_usd ÷ baseline_mc_usd` — null when `baseline_source` is `late`. */
    mc_multiple: number | null;
    /** Surge only: % above the lowest sample of the last 3 minutes. */
    mc_change_3m_pct: number | null;
    /** Revival only. */
    dormant_hours: number | null;
    /** Revival only: pre-dormancy candle close MC (null → `no_prior_price` flag). */
    prev_mc_usd: number | null;
    mc_vs_prev_multiple: number | null;
    peak_mc_usd: number | null;
    pct_of_peak: number | null;
    bonding_progress_pct: number | null;
    is_bonded: boolean | null;
    tape: TokenSurgeTape;
    kol: TokenSurgeKol;
    early_buyers: TokenSurgeEarlyBuyers;
    deployer: TokenSurgeDeployer | null;
    deployer_wallet: string | null;
    deployer_tier: string | null;
    mint_authority_revoked: boolean | null;
    freeze_authority_revoked: boolean | null;
    is_token_2022: boolean | null;
    /** Empty = no flag raised, NOT verified clean; absence of data never produces a flag. */
    risk_flags: TokenSurgeRiskFlag[];
    detail_url: string;
    /** false = the enrichment round-trip failed; tape / kol / early_buyers / deployer are then empty. */
    enrichment_available?: boolean;
}
/** +1 h outcome, present on REST rows ≥ 65 min old (pg_cron, from candles). */
export interface TokenSurgeOutcome {
    computed_at: string;
    mc_usd_1h_after: number | null;
    peak_mc_usd_1h_after: number | null;
    low_mc_usd_1h_after: number | null;
    mc_1h_multiple: number | null;
    peak_1h_multiple: number | null;
    /** false = no candle within the hour (the token stopped being priced) — NOT zero. */
    priced_after_1h: boolean;
}
/** A REST row of `GET /tokens/surges`: the fire payload plus `outcome` (null until ≥ 65 min old). */
export type TokenSurgeFeedEntry = TokenSurgeEvent & {
    id: number;
    outcome: TokenSurgeOutcome | null;
};
export interface TokenSurgesParams {
    kind?: TokenSurgeKind;
    /** Surge only — 400 with `kind: "revival"`. */
    tier?: TokenSurgeTier;
    mint?: string;
    /** ISO date-time — only fires after this instant (use `pagination.next_since`). */
    since?: string;
    /** ISO date-time — page back (use `pagination.next_before`). */
    before?: string;
    min_mc_usd?: number;
    max_mc_usd?: number;
    /** Tape buys at fire time ≥. */
    min_buys?: number;
    launchpad?: string;
    deployer_tier?: TokenSurgeDeployerTier;
    /** Comma list — rows carrying ANY of these flags are dropped (unknown flag → 400 + `known_flags`). */
    exclude_flags?: string;
    /** Only rows with no risk flags at all. */
    only_clean?: boolean;
    /** Include per-(kind, tier) hit-rates over `days`. */
    stats?: boolean;
    /** 1–30, default 7 (stats window). */
    days?: number;
    /** 1–200, default 50. */
    limit?: number;
}
/** Per-(kind, tier) hit-rate over the `stats` window — out-of-sample by construction. */
export interface TokenSurgeStatsRow {
    kind: TokenSurgeKind;
    tier: TokenSurgeTier | null;
    fires: number;
    with_outcome: number;
    up_1h: number;
    up_1h_pct: number | null;
    median_peak_multiple: number | null;
    p75_peak_multiple: number | null;
    median_mc_1h_multiple: number | null;
    doubled_1h: number;
    doubled_1h_pct: number | null;
}
export interface TokenSurgeStats {
    days: number;
    note: string;
    rows: TokenSurgeStatsRow[];
}
export interface TokenSurgesResponse {
    events: TokenSurgeFeedEntry[];
    pagination: TokenFeedPagination;
    filters: {
        kind: TokenSurgeKind | null;
        tier: TokenSurgeTier | null;
        mint: string | null;
        launchpad: string | null;
        deployer_tier: string | null;
        min_mc_usd: number | null;
        max_mc_usd: number | null;
        min_buys: number | null;
        exclude_flags: string[];
        only_clean: boolean;
    };
    /** Present only when `stats` was requested. */
    stats?: TokenSurgeStats;
    /** Pointer to the `token:surges` WS channel (events `token:surge` / `token:revival`). */
    stream: TokenFeedStreamPointer;
    /** The live thresholds the engine fires on (read straight from the rule engine, so they cannot drift). */
    definitions: {
        surge: Record<string, unknown>;
        revival: Record<string, unknown>;
        shared: Record<string, unknown>;
        risk_flags: Record<string, string>;
        tiers: string[];
    };
    note: string;
    meta?: Record<string, unknown>;
}
/** Frame delivered on the `token:surges` channel (events `token:surge` / `token:revival`) — the fire payload, no `outcome`. */
export type TokenSurgeStreamEvent = TokenSurgeEvent;
/** One daily reputation snapshot for a deployer wallet. */
export interface DeployerHistorySnapshot {
    date: string;
    tier: string;
    is_tracked: boolean;
    total_deployed: number;
    total_bonded: number;
    bonding_rate: number | null;
    recent_bond_rate: number | null;
    avg_peak_mc: number | null;
    best_token_peak_mc: number | null;
}
/**
 * A deployer's daily reputation time-series — backtest "was this deployer elite
 * when it launched token X?" without look-ahead bias. PRO/ULTRA only.
 */
export interface DeployerHistoryResponse {
    is_deployer: boolean;
    wallet: string;
    snapshots: DeployerHistorySnapshot[];
}
/** The reputation snapshot current on the requested date. `snapshot_date` can be
 *  earlier than `requested_date` (snapshots are write-on-change); `carried: true`
 *  means the state was recorded earlier and had not changed by then. */
export interface DeployerAsOfSnapshot {
    snapshot_date: string;
    carried: boolean;
    tier: string | null;
    is_tracked: boolean | null;
    total_deployed: number | null;
    total_bonded: number | null;
    bonding_rate: number | null;
    recent_bond_rate: number | null;
    avg_peak_mc: number | null;
    best_token_peak_mc: number | null;
    captured_at: string | null;
}
/** A deployer's reputation exactly as it stood on `requested_date` — no look-ahead,
 *  and never a synthesized row (`as_of: false, snapshot: null` before its first
 *  snapshot). PRO/ULTRA only. */
export interface DeployerAsOfResponse {
    is_deployer: boolean;
    wallet: string;
    requested_date: string;
    as_of: boolean;
    snapshot: DeployerAsOfSnapshot | null;
    first_snapshot_date: string | null;
    note: string;
}
/** sol / usdc are summed separately (never mixed); usd is null (not 0) when a SOL
 *  amount exists and no SOL price was available. */
export interface DeployerRewardsMoney {
    sol: number;
    usdc: number;
    usd: number | null;
}
export interface DeployerRewardsRail extends DeployerRewardsMoney {
    count: number;
    first_at: string | null;
    last_at: string | null;
}
export interface DeployerRewardsSocial {
    platform: number;
    user_id: string;
}
export interface DeployerRewardsTopToken {
    mint: string;
    quote: "SOL" | "USDC";
    total: number;
    total_usd: number | null;
    to_self: number;
    to_self_usd: number | null;
    payouts: number;
    recipients: number;
    last_at: string;
}
export interface DeployerRewardsTopRecipient {
    address: string;
    quote: "SOL" | "USDC";
    total: number;
    total_usd: number | null;
    tokens: number;
    payouts: number;
    last_at: string;
    is_self: boolean;
    is_social_pda: boolean;
    social: DeployerRewardsSocial | null;
}
/**
 * pump.fun creator-fee rewards for a wallet, answered two ways that are never
 * merged: `collected` (what actually reached the wallet) and `attributed` (every
 * payout on the tokens it deployed, split `to_self`/`to_others`). Works for
 * non-deployers too (`is_deployer: false`, `attributed` empty). PRO/ULTRA only.
 */
export interface DeployerRewardsResponse {
    wallet: string;
    is_deployer: boolean;
    /** Tokens attributed to this wallet in our token table — the universe
     *  `attributed` is computed over. NOT the deployer profile's total deploy count. */
    tokens_in_scope: number;
    collected: DeployerRewardsMoney & {
        direct_claims: DeployerRewardsRail & {
            window_days: number;
        };
        social_claims: DeployerRewardsRail;
        share_payouts: DeployerRewardsRail & {
            tokens: number;
            on_own_tokens: DeployerRewardsMoney;
        };
    };
    attributed: DeployerRewardsRail & {
        to_self: DeployerRewardsMoney;
        to_others: DeployerRewardsMoney;
        redirected_pct: number | null;
        tokens_with_payouts: number;
        distributions: number;
        recipients: number;
    };
    top_tokens: DeployerRewardsTopToken[];
    top_recipients: DeployerRewardsTopRecipient[];
    quote: {
        sol_usd: number | null;
    };
    coverage: {
        payouts_since: string;
        direct_claims_window_days: number;
        note: string;
    };
}
/** Reputation grade. `unranked` = too few deploys to grade, not "bad". */
export type DeployerTier = "elite" | "good" | "rising" | "neutral" | "spammer" | "unranked";
export interface DeployerTierCounts {
    elite: number;
    good: number;
    rising: number;
}
/** Ecosystem-wide deployer stats. `GET /deployer-hunter/stats` */
export interface DeployerStatsResponse {
    tracked_count: number;
    signals_today: number;
    bonds_detected: number;
    bond_rate: number;
    tiers: DeployerTierCounts;
    /** Per-tier average MC at alert over 30 d. v1.24: complete SQL aggregate; all null when mc_at_alert_complete=false. */
    avg_mc_at_alert_usd_30d?: Record<string, number | null>;
    /** v1.24: values are null (not 0) when the aggregate read failed. */
    mc_at_alert_samples_30d?: Record<string, number | null>;
    mc_at_alert_window_start?: string;
    mc_at_alert_complete?: boolean;
}
export interface DeployerLeaderboardParams {
    /** Restrict to one grade. */
    tier?: DeployerTier;
    /** Default `bonding_rate`. */
    sort?: "bonding_rate" | "recent" | "total_bonded" | "last_deploy";
    /** 1–100, default 20. */
    limit?: number;
    /** Default 0. */
    offset?: number;
}
export interface DeployerLeaderboardEntry {
    id: string;
    wallet_address: string;
    tier: DeployerTier;
    /** Lifetime share of deploys that bonded. */
    bonding_rate: number;
    /** Rolling recent-window bond rate — diverges from lifetime when form changes. */
    recent_bond_rate: number;
    total_tokens_deployed: number;
    total_bonded: number;
    last_deploy_at?: string | null;
    recent_outcomes?: string | null;
    avg_time_to_bond_minutes?: number | null;
    /** Share of labeled tokens that ran (peak ≥60min after deploy) rather than dumped. */
    runner_rate?: number | null;
    /** Confidence denominator for `runner_rate` — gate on ≥3. */
    labeled_tokens?: number | null;
    best_token_peak_mc?: number | null;
    avg_peak_mc?: number | null;
    last_bond_at?: string | null;
    is_tracked?: boolean | null;
    label?: string | null;
    first_seen_at?: string | null;
}
/** `GET /deployer-hunter/leaderboard` — excludes unranked deployers. */
export interface DeployerLeaderboardResponse {
    deployers: DeployerLeaderboardEntry[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}
export interface DeployerToken {
    mint: string;
    name: string | null;
    symbol: string | null;
    bonded: boolean;
    deployed_at: string;
    bonded_at: string | null;
    peak_market_cap_usd: number | null;
}
/** `GET /deployer-hunter/{wallet}` — unknown wallets return a profile, not a 404. */
export interface DeployerProfileResponse {
    wallet: string;
    tier: DeployerTier;
    bonding_rate: number;
    recent_bond_rate: number;
    total_deployed: number;
    total_bonded: number;
    last_deploy_at: string | null;
    first_seen: string | null;
    runner_rate?: number | null;
    /** Gate `runner_rate` on this being ≥3. */
    labeled_tokens?: number | null;
    avg_time_to_bond_minutes?: number | null;
    tokens?: DeployerToken[] | null;
}
export interface DeployerTokensParams {
    /** 1–100, default 50. */
    limit?: number;
    /** Default 0. */
    offset?: number;
    /** Default false. */
    only_bonded?: boolean;
}
/** `GET /deployer-hunter/{wallet}/tokens` */
export interface DeployerTokensResponse {
    tokens: DeployerToken[];
    count: number;
    total: number;
}
export interface DeployerAlertStatsParams {
    /** Lookback window, e.g. `24h`, `7d`, `30d`. */
    period?: string;
}
export interface BondRateStats {
    total_deploys: number;
    total_bonded: number;
    rate: number;
}
export interface MultiplierStats {
    total_with_mc: number;
    pct_2x: number;
    pct_5x: number;
    pct_10x: number;
    pct_50x: number;
    avg_multiplier: number;
    best_multiplier: number;
}
export interface DeployerTierStats {
    deploys: number;
    bonded: number;
    bond_rate: number;
    avg_multiplier?: number | null;
    total_with_mc: number;
}
/** `GET /deployer-hunter/alert-stats` — size and monitor your alert usage. */
export interface DeployerAlertStatsResponse {
    bond_rate: BondRateStats;
    multiplier: MultiplierStats;
    /** Keyed by tier name. */
    tiers: Record<string, DeployerTierStats>;
    period: string;
}
export interface BestTokensParams {
    /** Lookback window, default `7d`. */
    period?: string;
    /** Default 5. */
    limit?: number;
}
export interface BestToken {
    id: string;
    token_mint: string;
    token_name?: string | null;
    token_symbol?: string | null;
    token_image_url?: string | null;
    bonded_at: string;
    peak_market_cap?: number | null;
    mc_at_bond?: number | null;
    market_cap_at_alert?: number | null;
    mc_multiplier?: number | null;
    deployer_wallet: string;
    deployer_tier: DeployerTier;
    alerted_at?: string | null;
}
/** `GET /deployer-hunter/best-tokens` — ranked (non-unranked) deployers only. */
export interface BestTokensResponse {
    tokens: BestToken[];
    period: string;
    limit: number;
}
export interface RecentBondsParams {
    /** 1–100, default 20. */
    limit?: number;
    /** Incremental-polling cursor — pass the previous `next_since`. */
    since?: string;
    tier?: DeployerTier;
    /** Floor on peak market cap (USD). */
    peak_mc_min?: number;
}
export interface DeployerSummary {
    wallet_address: string;
    tier: DeployerTier;
    bonding_rate?: number | null;
    total_bonded?: number | null;
    recent_outcomes?: string | null;
    recent_bond_rate?: number | null;
    total_tokens_deployed?: number | null;
    best_token_peak_mc?: number | null;
    runner_rate?: number | null;
    labeled_tokens?: number | null;
    avg_time_to_bond_minutes?: number | null;
}
export interface RecentBond {
    id: string;
    token_mint: string;
    token_name?: string | null;
    token_symbol?: string | null;
    token_image_url?: string | null;
    deployed_at: string;
    bonded_at: string;
    time_to_bond_minutes?: number | null;
    peak_market_cap?: number | null;
    mc_at_bond?: number | null;
    deployers: DeployerSummary;
}
/** `GET /deployer-hunter/recent-bonds` — tokens from tracked deployers that graduated. */
export interface RecentBondsResponse {
    tokens: RecentBond[];
    limit: number;
    /** Pass back as `since` to fetch only newer bonds. */
    next_since?: string | null;
}
//# sourceMappingURL=types.d.ts.map