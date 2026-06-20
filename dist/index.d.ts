import type { KolFeedParams, KolFeedResponse, KolCoordinationParams, KolCoordinationResponse, KolLeaderboardParams, KolLeaderboardResponse, KolPairsParams, KolPairsResponse, KolTimingParams, KolTimingResponse, KolHotTokensParams, KolHotTokensResponse, KolEntryOrderParams, KolEntryOrderResponse, KolCompareParams, KolCompareResponse, KolAlertsParams, KolAlertsResponse, DeployerAlertsParams, DeployerAlertsResponse, DeployerTrajectoryResponse, DiscoveryResponse, CreateWebhookParams, UpdateWebhookParams, Webhook, WebhookWithSecret, WebhookDelivery, WebhookTestResult, StreamToken, AlphaLeaderboardParams, AlphaLeaderboardResponse, AlphaWalletResponse, AlphaLinkedResponse, TokenCapTableResponse, TokenBuyerQualityResponse, TokenRiskResponse, CandlesParams, CandlesResponse, CopyTradeSubscription, CopyTradeCreateParams, CopyTradeCreateResponse, CopyTradeUpdateParams, CopyTradeSignal, CopyTradeSignalsParams, CoordinationAlertRule, CoordinationAlertCreateParams, CoordinationAlertUpdateParams, CoordinationAlertListResponse, CoordinationAlertCreateResponse, FirstTouchesParams, FirstTouchesResponse, FirstTouchSubscription, FirstTouchSubscriptionCreateParams, FirstTouchSubscriptionUpdateParams, FirstTouchSubscriptionListResponse, FirstTouchSubscriptionCreateResponse, WalletTrackerListResponse, WalletTrackerAddResponse, WalletTrackerUpdateResponse, WalletTrackerTradesParams, WalletTrackerTradesResponse, WalletTrackerSummaryParams, WalletTrackerSummaryResponse, MeResponse, TokensListParams, TokensListResponse, WalletStatsResponse, WalletPnlResponse, WalletPositionsResponse, WalletTradesParams, WalletTradesResponse, PriceAlertCreateParams, PriceAlertUpdateParams, PriceAlertListResponse, PriceAlertCreateResponse, PriceAlertGetResponse, PriceAlertUpdateResponse, PriceAlertDeleteResponse, PriceAlertEventsParams, PriceAlertEventsResponse, ScoutLeaderboardParams, KolConsensusResponse, PeakHistoryResponse, CoordinationHistoryParams, TokenSnapshotResponse, SignalPerformanceResponse, SignalsCatalogResponse } from "./types.js";
import { MadeOnSolStream } from "./stream.js";
import type { StreamClientOptions } from "./stream.js";
export { MadeOnSolStream } from "./stream.js";
export type { StreamClientOptions, StreamChannel, StreamEventName, StreamEvent, StreamLifecycleEvent, } from "./stream.js";
export type { KolTrade, KolStrategy, KolFeedParams, KolFeedResponse, KolCoordinationToken, KolCoordinationParams, KolCoordinationResponse, KolLeaderboardEntry, KolLeaderboardSort, KolLeaderboardParams, KolLeaderboardResponse, KolPair, KolPairsParams, KolPairsResponse, KolTimingData, KolTimingParams, KolTimingResponse, HotToken, KolHotTokensParams, KolHotTokensResponse, KolEntryOrderEntry, KolEntryOrderParams, KolEntryOrderResponse, KolCompareProfile, KolCompareOverlapToken, KolCompareParams, KolCompareResponse, KolAlert, KolAlertType, KolAlertWindow, KolAlertSeverity, KolAlertsParams, KolAlertsResponse, TrajectoryData, DeployerTrajectoryResponse, DeployerAlert, DeployerAlertsParams, DeployerAlertsResponse, DiscoveryEndpoint, DiscoveryResponse, WebhookEvent, WebhookFilters, Webhook, WebhookWithSecret, CreateWebhookParams, UpdateWebhookParams, WebhookDelivery, WebhookTestResult, StreamToken, AlphaPeriod, AlphaSort, AlphaLeaderboardParams, AlphaLeaderboardEntry, AlphaLeaderboardResponse, AlphaWalletSummary, AlphaWalletToken, AlphaWalletResponse, AlphaLinkedWallet, AlphaLinkedResponse, BuyerQualityConfidence, BuyerQualitySignal, CapTableBuyer, CapTableSummary, TokenCapTableResponse, TokenBuyerQualityResponse, TokenRiskBand, TokenRiskStatus, TokenRiskFactor, TokenRiskInputs, TokenRiskResponse, CandleTimeframe, CandlesParams, Candle, CandlesResponse, CopyTradeAction, CopyTradeSizingMode, CopyTradeDeliveryMode, CopyTradeSubscription, CopyTradeCreateParams, CopyTradeUpdateParams, CopyTradeCreateResponse, CopyTradeSignal, CopyTradeSignalsParams, CoordinationDeliveryMode, CoordinationAlertRule, CoordinationAlertCreateParams, CoordinationAlertUpdateParams, CoordinationAlertListResponse, CoordinationAlertCreateResponse, ScoutTier, FirstTouchesParams, FirstTouchEvent, FirstTouchesResponse, FirstTouchSubscriptionFilters, FirstTouchSubscription, FirstTouchSubscriptionCreateParams, FirstTouchSubscriptionUpdateParams, FirstTouchSubscriptionListResponse, FirstTouchSubscriptionCreateResponse, KolCoordinationKol, WalletTrackerEntry, WalletTrackerListResponse, WalletTrackerAddResponse, WalletTrackerUpdateResponse, WalletTrackerAction, WalletTrackerEventType, WalletTrackerTradesParams, WalletTrackerTrade, WalletTrackerTradesResponse, WalletTrackerSummaryParams, WalletTrackerSummaryStats, WalletTrackerSummaryResponse, WalletStats, WalletFlags, WalletStatsResponse, WalletTopToken, WalletTradingStyle, WalletDeployerTierEntry, WalletDeployerBreakdown, WalletRecentTrade, WalletPnlSummary, WalletPnlCurvePoint, WalletClosedPosition, WalletOpenPosition, WalletPnlResponse, WalletPositionsResponse, WalletTradesParams, WalletTrade, WalletTradesResponse, WalletStandoutTrade, WalletBiggestMiss, WalletVerdictTone, WalletVerdict, WalletDerivedStats, PriceAlertDeliveryMode, PriceAlertStatus, PriceAlert, PriceAlertCreateParams, PriceAlertUpdateParams, PriceAlertListResponse, PriceAlertCreateResponse, PriceAlertGetResponse, PriceAlertUpdateResponse, PriceAlertDeleteResponse, PriceAlertEvent, PriceAlertEventsParams, PriceAlertEventsResponse, ScoutLeaderboardSort, ScoutLeaderboardParams, KolConsensusResponse, PeakHistoryResponse, CoordinationHistoryParams, TokenSnapshotTopBuyer, TokenSnapshot, TokenSnapshotResponse, SignalName, SignalPerformanceBucket, SignalPerformanceSeriesPoint, SignalPerformanceResponse, SignalsCatalogEntry, SignalsCatalogResponse, } from "./types.js";
interface MadeOnSolClientOptions {
    /** MadeOnSol API key — get one free at https://madeonsol.com/pricing. */
    apiKey?: string;
    /** Base58-encoded Solana private key for x402 USDC micropayments (for AI agents). */
    privateKey?: string;
    /** API base URL (default: https://madeonsol.com) */
    baseUrl?: string;
}
/** @deprecated Use MadeOnSolClient instead */
interface MadeOnSolX402Options {
    privateKey: string;
    baseUrl?: string;
}
export declare class MadeOnSolX402 {
    private paidFetch;
    private baseUrl;
    private authMode;
    private authHeaders;
    private ready;
    constructor(opts: MadeOnSolX402Options | MadeOnSolClientOptions);
    private initX402;
    private request;
    /** Real-time KOL trade feed from 1,000+ tracked wallets. */
    kolFeed(params?: KolFeedParams): Promise<KolFeedResponse>;
    /** KOL convergence signals — tokens being accumulated by multiple KOLs. */
    kolCoordination(params?: KolCoordinationParams): Promise<KolCoordinationResponse>;
    /** KOL performance rankings by PnL and win rate. */
    kolLeaderboard(params?: KolLeaderboardParams): Promise<KolLeaderboardResponse>;
    /** KOL affinity matrix — which KOLs frequently co-trade the same tokens. */
    kolPairs(params?: KolPairsParams): Promise<KolPairsResponse>;
    /** KOL momentum tokens — tokens with accelerating KOL buy interest. */
    kolHotTokens(params?: KolHotTokensParams): Promise<KolHotTokensResponse>;
    /** Tokens ranked by KOL buy volume. Sub-hour periods require PRO/ULTRA. */
    kolTrendingTokens(params?: {
        period?: string;
        min_kols?: number;
        limit?: number;
    }): Promise<unknown>;
    /** Ranked KOL first-buyer order for a token. PRO+ adds percentile_pnl_7d. */
    kolTokenEntryOrder(mint: string, params?: KolEntryOrderParams): Promise<KolEntryOrderResponse>;
    /** Side-by-side comparison of 2-5 KOL wallets. PRO+ adds overlap tokens (30d). */
    kolCompareWallets(params: KolCompareParams): Promise<KolCompareResponse>;
    /** Live KOL alert feed — consensus clusters, fresh-token buys, heating-up wallets. */
    kolAlertsRecent(params?: KolAlertsParams): Promise<KolAlertsResponse>;
    /** Real-time alerts from elite Pump.fun deployers. */
    deployerAlerts(params?: DeployerAlertsParams): Promise<DeployerAlertsResponse>;
    /**
     * Universal wallet stats for any Solana wallet (90d window) plus cross-product
     * flags (KOL / alpha / deployer). **x402: $0.005**
     * @param address Base58 wallet address.
     */
    walletStats(address: string): Promise<WalletStatsResponse>;
    /**
     * Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max
     * drawdown, hold-time stats, daily UTC PnL curve, closed positions sorted
     * by pnl desc, open positions hydrated with live prices from mc-tracker.
     * Cached server-side — cache hits return immediately. **x402: $0.02**
     */
    walletPnl(address: string): Promise<WalletPnlResponse>;
    /**
     * Open positions only — lighter slice of `walletPnl`. Shares the same cache.
     * **x402: $0.01**
     */
    walletPositions(address: string): Promise<WalletPositionsResponse>;
    /**
     * Cursor-paginated raw trades for any wallet. Filter by action / token_mint /
     * since-until. Default limit 100, max 500. Cursor is stable across DESC
     * pagination. **x402: $0.005**
     */
    walletTrades(address: string, params?: WalletTradesParams): Promise<WalletTradesResponse>;
    /**
     * v1.9 — Scout leaderboard: top KOLs ranked by scout score, first-touch frequency,
     * and swarm attraction rate. ULTRA only.
     */
    scoutLeaderboard(params?: ScoutLeaderboardParams): Promise<unknown>;
    /**
     * v1.9 — Coordination history: past coordination alert fires with token, score, KOL count.
     * ULTRA only.
     */
    coordinationHistory(params?: CoordinationHistoryParams): Promise<unknown>;
    /**
     * v1.9 — KOL consensus on a token: how many KOLs bought/sold, exit rate,
     * net flow, median entry MC. ULTRA gets individual wallet arrays.
     */
    kolConsensus(mint: string): Promise<KolConsensusResponse>;
    /**
     * v1.9 — Peak MC history for a token: ATH, decline from peak, MC at bond
     * and at 1h/6h/24h/7d after bond.
     */
    peakHistory(mint: string): Promise<PeakHistoryResponse>;
    /** Token rug/safety score (0–100) with a per-factor breakdown — the "is this safe to buy?" call. */
    tokenRisk(mint: string): Promise<TokenRiskResponse>;
    /** Early-buyer quality score (dump-cluster exposure, recycled wallets, smart money) + live Signal Scorecard efficacy. */
    tokenBuyerQuality(mint: string): Promise<TokenBuyerQualityResponse>;
    /** Live token snapshot — price, market cap, FDV, liquidity, primary DEX, KOL buyer activity. */
    token(mint: string): Promise<TokenSnapshotResponse>;
    /** Signal Scorecard — out-of-sample, machine-readable reliability for a named signal. `history` adds the per-day drift series. */
    signalPerformance(name: string, params?: {
        history?: boolean;
    }): Promise<SignalPerformanceResponse>;
    /** Free — catalog of available signals (name, methodology, performance endpoint). */
    signals(): Promise<SignalsCatalogResponse>;
    /** Free discovery endpoint — lists all available endpoints and prices. */
    discovery(): Promise<DiscoveryResponse>;
}
/** Create a client with API key auth (simplest option). */
export declare function createClient(apiKeyOrPrivateKey: string, baseUrl?: string): MadeOnSolX402;
interface MadeOnSolRESTOptions {
    /** MadeOnSol API key — get one free at https://madeonsol.com/pricing. */
    apiKey: string;
    /** API base URL (default: https://madeonsol.com) */
    baseUrl?: string;
}
/** Rate-limit headers exposed alongside every successful response. */
export interface RateLimitInfo {
    limit: number | null;
    remaining: number | null;
    reset: number | null;
    requestId: string | null;
}
/**
 * REST API client for webhook management, WebSocket streaming tokens, alpha
 * intelligence, token quality, copy-trade rules, and wallet tracker.
 * Requires a Pro or Ultra subscription for most endpoints.
 */
export declare class MadeOnSolREST {
    private baseUrl;
    private headers;
    /** Last response's rate-limit headers (X-RateLimit-*, X-Request-Id). */
    lastRateLimit: RateLimitInfo;
    constructor(opts: MadeOnSolRESTOptions);
    private request;
    /** Create a webhook. Returns the webhook with HMAC secret (only shown once). */
    createWebhook(params: CreateWebhookParams): Promise<{
        webhook: WebhookWithSecret;
        note: string;
    }>;
    /** List all your webhooks. */
    listWebhooks(): Promise<{
        webhooks: Webhook[];
    }>;
    /** Get webhook detail with recent delivery log. */
    getWebhook(id: number): Promise<{
        webhook: Webhook;
        recent_deliveries: WebhookDelivery[];
    }>;
    /** Update a webhook (URL, events, filters, or re-enable). */
    updateWebhook(id: number, params: UpdateWebhookParams): Promise<{
        webhook: Webhook;
    }>;
    /** Delete a webhook permanently. */
    deleteWebhook(id: number): Promise<{
        deleted: boolean;
    }>;
    /** Send a test payload to verify your webhook URL. */
    testWebhook(webhookId: number): Promise<WebhookTestResult>;
    /** KOL entry/exit timing profile — hold duration, exit speed, activity patterns. */
    kolTiming(wallet: string, params?: KolTimingParams): Promise<KolTimingResponse>;
    /** Deep per-wallet PnL breakdown — equity curve, risk metrics, positions. */
    kolPnl(wallet: string, params?: {
        period?: string;
    }): Promise<unknown>;
    /** Deployer skill curve — streaks, rolling bond rate, improvement trend. */
    deployerTrajectory(wallet: string): Promise<DeployerTrajectoryResponse>;
    /** Generate a 24h WebSocket streaming token. */
    getStreamToken(): Promise<StreamToken>;
    /**
     * Open a managed real-time WebSocket stream. Handles token fetch + refresh,
     * auto-reconnect with backoff, heartbeat liveness, and typed events for you.
     *
     * @example
     * const stream = client.stream();
     * stream.on("kol:trade", (t) => console.log(t));
     * stream.subscribe(["kol:trades", "deployer:alerts"]);
     */
    stream(opts?: Omit<StreamClientOptions, "getToken">): MadeOnSolStream;
    /**
     * v1.7 — Inspect your account: tier, daily/burst quota state, subscription
     * expiry, and per-feature usage. Use `quota.daily.remaining` for self-throttling
     * without parsing rate-limit headers.
     */
    me(): Promise<MeResponse>;
    /**
     * v1.7 — Filtered, sortable token directory (PRO+). Default `min_liq=2000`
     * skips phantom-MC dust (set 0 to disable). Computed filters
     * (`min_volume_1h_usd`, `max_mev_share_pct`, `mc_change_1h_*`) over-fetch
     * and post-filter — `pagination.post_filtered=true` flags this.
     */
    tokensList(params?: TokensListParams): Promise<TokensListResponse>;
    /** Top statistically profitable early-buyer wallets. BASIC=25, PRO=100, ULTRA=500. */
    alphaLeaderboard(params?: AlphaLeaderboardParams): Promise<AlphaLeaderboardResponse>;
    /** Full alpha profile for one wallet: per-token breakdown + bot signals. ULTRA only. */
    alphaWallet(wallet: string): Promise<AlphaWalletResponse>;
    /** Wallets behaviorally linked to this one (co-bought 3+ tokens within 2s). ULTRA only. */
    alphaLinked(wallet: string): Promise<AlphaLinkedResponse>;
    /** First non-deployer early buyers for a token, enriched with PnL/KOL/bot flags. PRO=10, ULTRA=20. */
    tokenCapTable(mint: string): Promise<TokenCapTableResponse>;
    /** 0–100 buyer-quality score for a token's first-buyer cohort. 5-min cached. */
    tokenBuyerQuality(mint: string): Promise<TokenBuyerQualityResponse>;
    /**
     * Transparent 0–100 token rug-risk/safety score (higher = riskier). Returns a
     * `band` (safe/caution/danger), an explainable `factors` array, and the raw
     * `inputs` (authorities, liquidity, transfer fee, launch cohort, deployer bond
     * rate, KOL signal, blacklist). PRO/ULTRA only — BASIC receives HTTP 403.
     */
    tokenRisk(mint: string): Promise<TokenRiskResponse>;
    /**
     * 1-minute-derived OHLC candles for a token. `tf` selects the timeframe
     * (1m/5m/15m/1h/4h/1d, default 1h); `limit` (1–1000, default 200) and the
     * `from`/`to` ISO 8601 bounds page the range. PRO returns OHLCV for the last
     * 30 days; ULTRA adds net flow (buy/sell volume, `net_volume_usd`, trade
     * counts, MEV volume), liquidity delta, and full history — signalled by
     * `net_flow_included`. PRO/ULTRA only — BASIC receives HTTP 403.
     */
    tokenCandles(mint: string, params?: CandlesParams): Promise<CandlesResponse>;
    /**
     * Live token snapshot — price (USD/SOL), VWAP, market cap, FDV, liquidity,
     * liquidity-to-MC ratio, primary DEX + pool, Token-2022 / transfer-fee flags,
     * and a `top_buyers` array ({ name, sol_amount }). Returns `{ token: {...} }`.
     */
    token(mint: string): Promise<TokenSnapshotResponse>;
    /**
     * Signal Scorecard — out-of-sample reliability for a named signal. Returns
     * `buckets` (each with hit_rate, base_rate, lift, sample_n, window_days,
     * test_from/test_to) plus the signal, metric_type, outcome, methodology, and
     * as_of. Pass `{ history: true }` to also get a per-day `series`. Valid names:
     * dump_cluster_count, runner_rate, recycled_early_buyer_count, coordination_count.
     */
    signalPerformance(name: string, params?: {
        history?: boolean;
    }): Promise<SignalPerformanceResponse>;
    /** Free signals catalog — name, description, the available signals with methodology + performance_endpoint, and docs. No payment required. */
    signals(): Promise<SignalsCatalogResponse>;
    /** List your copy-trade rules. */
    copyTradeList(): Promise<{
        subscriptions: CopyTradeSubscription[];
    }>;
    /** Create a copy-trade rule. Returns webhook_secret once — save it. */
    copyTradeCreate(params: CopyTradeCreateParams): Promise<CopyTradeCreateResponse>;
    /** Get one copy-trade rule by id. */
    copyTradeGet(id: number): Promise<{
        subscription: CopyTradeSubscription;
    }>;
    /** Update a copy-trade rule. */
    copyTradeUpdate(id: number, params: CopyTradeUpdateParams): Promise<{
        subscription: CopyTradeSubscription;
    }>;
    /** Delete a copy-trade rule. */
    copyTradeDelete(id: number): Promise<{
        deleted: boolean;
    }>;
    /** Recent fired copy-trade signals (up to 7 days). */
    copyTradeSignals(params?: CopyTradeSignalsParams): Promise<{
        signals: CopyTradeSignal[];
    }>;
    /** List your coordination alert rules. */
    coordinationAlertsList(): Promise<CoordinationAlertListResponse>;
    /** Create a coordination alert rule. Returns webhook_secret once — save it. */
    coordinationAlertsCreate(params: CoordinationAlertCreateParams): Promise<CoordinationAlertCreateResponse>;
    /** Get one coordination alert rule by id. */
    coordinationAlertsGet(id: string): Promise<{
        rule: CoordinationAlertRule;
    }>;
    /** Update a coordination alert rule. */
    coordinationAlertsUpdate(id: string, params: CoordinationAlertUpdateParams): Promise<{
        rule: CoordinationAlertRule;
    }>;
    /** Delete a coordination alert rule. */
    coordinationAlertsDelete(id: string): Promise<{
        deleted: boolean;
    }>;
    /**
     * Recent first-KOL-touch events on tokens. Each event = the first time a
     * tracked KOL bought that token mint. Filterable by scout tier, KOL winrate,
     * token age, etc. Backed by a 38d backtest where top scouts (S-tier) see ≥3
     * follow-on KOLs within 4h ~50% of the time vs ~14% baseline.
     */
    firstTouches(params?: FirstTouchesParams): Promise<FirstTouchesResponse>;
    /** List your first-touch webhook subscriptions (Ultra). */
    firstTouchSubscriptionsList(): Promise<FirstTouchSubscriptionListResponse>;
    /** Create a first-touch webhook subscription (Ultra). Returns webhook_secret once — save it. */
    firstTouchSubscriptionsCreate(params: FirstTouchSubscriptionCreateParams): Promise<FirstTouchSubscriptionCreateResponse>;
    /** Get one first-touch subscription by id. */
    firstTouchSubscriptionsGet(id: string): Promise<{
        subscription: FirstTouchSubscription;
    }>;
    /** Update a first-touch subscription. */
    firstTouchSubscriptionsUpdate(id: string, params: FirstTouchSubscriptionUpdateParams): Promise<{
        subscription: FirstTouchSubscription;
    }>;
    /** Delete a first-touch subscription. */
    firstTouchSubscriptionsDelete(id: string): Promise<{
        ok: boolean;
    }>;
    /** List tracked wallets with labels and remaining capacity. */
    walletTrackerList(): Promise<WalletTrackerListResponse>;
    /** Add a wallet to the watchlist. */
    walletTrackerAdd(wallet_address: string, label?: string): Promise<WalletTrackerAddResponse>;
    /** Remove a wallet from the watchlist. */
    walletTrackerRemove(wallet_address: string): Promise<{
        removed: boolean;
    }>;
    /** Update the label for a tracked wallet (pass `null` to clear). */
    walletTrackerUpdateLabel(wallet_address: string, label: string | null): Promise<WalletTrackerUpdateResponse>;
    /** Historical swap/transfer events across watched wallets. */
    walletTrackerTrades(params?: WalletTrackerTradesParams): Promise<WalletTrackerTradesResponse>;
    /** Per-wallet stats (counts, SOL bought/sold, last activity). */
    walletTrackerSummary(params?: WalletTrackerSummaryParams): Promise<WalletTrackerSummaryResponse>;
    /** List your price alerts. */
    priceAlertsList(): Promise<PriceAlertListResponse>;
    /** Create a price alert. Returns webhook_secret ONCE — store it. */
    priceAlertsCreate(params: PriceAlertCreateParams): Promise<PriceAlertCreateResponse>;
    /** Get one price alert by id. */
    priceAlertsGet(id: number | string): Promise<PriceAlertGetResponse>;
    /** Update alert name, delivery mode, webhook URL, or is_active. Thresholds are immutable. */
    priceAlertsUpdate(id: number | string, params: PriceAlertUpdateParams): Promise<PriceAlertUpdateResponse>;
    /** Delete a price alert and its event history. */
    priceAlertsDelete(id: number | string): Promise<PriceAlertDeleteResponse>;
    /** Fired event history (30-day retention). Filter by alert_id, event_type, since. */
    priceAlertsEvents(params?: PriceAlertEventsParams): Promise<PriceAlertEventsResponse>;
    /** Scout leaderboard: top KOLs ranked by scout score and swarm attraction rate. ULTRA only. */
    scoutLeaderboard(params?: ScoutLeaderboardParams): Promise<unknown>;
    /** Coordination history: past coordination alert fires with token, score, KOL count. ULTRA only. */
    coordinationHistory(params?: CoordinationHistoryParams): Promise<unknown>;
    /** KOL consensus on a token: buyers/sellers, exit rate, net flow, median entry MC. ULTRA gets wallet arrays. */
    kolConsensus(mint: string): Promise<KolConsensusResponse>;
    /** Peak MC history: ATH, decline from peak, MC at bond and at 1h/6h/24h/7d after bond. */
    peakHistory(mint: string): Promise<PeakHistoryResponse>;
    /** Aggregate stats + cross-product flags (is_kol / is_alpha_tracked / is_deployer) for any Solana wallet. PRO+. */
    walletStats(address: string): Promise<WalletStatsResponse>;
    /** Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max drawdown, hold times, daily curve, closed + open positions. Cached server-side. PRO+. */
    walletPnl(address: string): Promise<WalletPnlResponse>;
    /** Open positions only — lighter slice of `walletPnl`. Shares the same cache. PRO+. */
    walletPositions(address: string): Promise<WalletPositionsResponse>;
    /** Cursor-paginated raw trades for any wallet. Filter by action / token_mint / since-until. PRO+. */
    walletTrades(address: string, params?: WalletTradesParams): Promise<WalletTradesResponse>;
}
/** Convenience factory — creates a REST API client for webhooks + streaming. */
export declare function createRESTClient(apiKey: string, baseUrl?: string): MadeOnSolREST;
//# sourceMappingURL=index.d.ts.map