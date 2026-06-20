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
}
export type KolStrategy = "scalper" | "day_trader" | "swing_trader" | "hodler" | "mixed";
export interface KolFeedParams {
    limit?: number;
    /** Cursor — ISO 8601 timestamp; returns trades strictly older than this. Pass `next_before` from the previous response for polling. */
    before?: string;
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
    /** ISO datetime — return events strictly older than this. Use for pagination. */
    before?: string;
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
}
export interface KolLeaderboardResponse {
    leaderboard: KolLeaderboardEntry[];
    period: string;
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
    /** Cursor for the next page — pass as `before` to fetch older alerts. */
    next_before?: string | null;
}
export interface DeployerAlertsParams {
    since?: string;
    /** Cursor — ISO 8601 timestamp; returns alerts strictly older than this. Preferred over `offset` at scale. */
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
    expires_at: string;
    ws_url: string;
    /** DEX trade stream URL — only present for Ultra tier subscribers */
    dex_ws_url?: string;
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
    count: number;
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
}
export interface AlphaLeaderboardResponse {
    leaderboard: AlphaLeaderboardEntry[];
    total: number;
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
export type BuyerQualityConfidence = "low" | "medium" | "high";
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
export interface TokenCapTableResponse {
    mint: string;
    buyers: CapTableBuyer[];
    summary: CapTableSummary;
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
    };
    note?: string;
}
export type TokenRiskBand = "safe" | "caution" | "danger";
export type TokenRiskStatus = "ok" | "warn" | "danger";
export interface TokenRiskFactor {
    key: string;
    label: string;
    status: TokenRiskStatus;
    points: number;
    detail: string;
}
export interface TokenRiskInputs {
    mint_authority_revoked: boolean | null;
    freeze_authority_revoked: boolean | null;
    liquidity_usd: number | null;
    liquidity_to_mc_ratio: number | null;
    transfer_fee_bps: number | null;
    is_token_2022: boolean | null;
    burn_detected: boolean | null;
    launch_cohort_sol: number | null;
    launch_cohort_size: number | null;
    deployer_bonding_rate: number | null;
    deployer_total_deployed: number | null;
    kol_signal: string | null;
    is_blacklisted: boolean | null;
    [key: string]: unknown;
}
/** Transparent 0–100 token rug-risk/safety score (higher = riskier). PRO/ULTRA only. */
export interface TokenRiskResponse {
    mint: string;
    risk_score: number;
    band: TokenRiskBand;
    factors: TokenRiskFactor[];
    inputs: TokenRiskInputs;
    score_version: string;
    as_of: string;
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
    kol_exit_rate: number | null;
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
    top_buyers: TokenSnapshotTopBuyer[];
}
/** Response of GET /token/{mint} — live token snapshot. */
export interface TokenSnapshotResponse {
    token: TokenSnapshot;
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
    /** v1.12 — number of wallets in the launch cohort (0–20). */
    launch_cohort_size?: number;
    [key: string]: unknown;
}
export type ApiTier = "BASIC" | "TRADER" | "PRO" | "ULTRA";
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
export type TokenListSort = "mc_desc" | "mc_asc" | "last_trade_desc" | "liquidity_desc" | "cumulative_volume_desc";
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
}
export interface TokensListResponse {
    tokens: TokenSummary[];
    pagination: {
        limit: number;
        offset: number;
        returned: number;
        has_more: boolean;
        post_filtered: boolean;
    };
    filters: Record<string, unknown>;
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
export interface WalletFlags {
    is_kol: boolean;
    kol_name: string | null;
    is_alpha_tracked: boolean;
    bot_confidence: number | null;
    alpha_win_rate: number | null;
    alpha_net_pnl_sol: number | null;
    alpha_tokens_traded: number | null;
    is_deployer: boolean;
    deployer_tokens_deployed: number | null;
    deployer_bonding_rate: number | null;
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
    };
    cache_hit?: boolean;
    computed_at?: string;
    ttl_seconds?: number;
}
export interface WalletPositionsResponse {
    address: string;
    positions: WalletOpenPosition[];
    cache_hit?: boolean;
    computed_at?: string | null;
    ttl_seconds?: number | null;
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
//# sourceMappingURL=types.d.ts.map