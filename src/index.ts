import type {
  KolFeedParams,
  KolFeedResponse,
  KolCoordinationParams,
  KolCoordinationResponse,
  KolLeaderboardParams,
  KolLeaderboardResponse,
  KolPairsParams,
  KolPairsResponse,
  KolTimingParams,
  KolTimingResponse,
  KolHotTokensParams,
  KolHotTokensResponse,
  KolEntryOrderParams,
  KolEntryOrderResponse,
  KolCompareParams,
  KolCompareResponse,
  KolAlertsParams,
  KolAlertsResponse,
  DeployerAlertsParams,
  DeployerAlertsResponse,
  DeployerTrajectoryResponse,
  DiscoveryResponse,
  CreateWebhookParams,
  UpdateWebhookParams,
  Webhook,
  WebhookWithSecret,
  WebhookDelivery,
  WebhookTestResult,
  StreamToken,
  StreamSessionsResponse,
  StreamSessionEvictResponse,
  AlphaLeaderboardParams,
  AlphaLeaderboardResponse,
  AlphaWalletResponse,
  AlphaLinkedResponse,
  TokenCapTableResponse,
  TokenBuyerQualityResponse,
  TokenRiskResponse,
  TokenBatchRiskResponse,
  TokenBundleResponse,
  TokenPoolsResponse,
  DeployerHistoryResponse,
  CandlesParams,
  CandlesResponse,
  TokenFlowParams,
  TokenFlowResponse,
  CopyTradeSubscription,
  CopyTradeCreateParams,
  CopyTradeCreateResponse,
  CopyTradeUpdateParams,
  CopyTradeSignal,
  CopyTradeSignalsParams,
  CoordinationAlertRule,
  CoordinationAlertCreateParams,
  CoordinationAlertUpdateParams,
  CoordinationAlertListResponse,
  CoordinationAlertCreateResponse,
  FirstTouchesParams,
  FirstTouchesResponse,
  FirstTouchSubscription,
  FirstTouchSubscriptionCreateParams,
  FirstTouchSubscriptionUpdateParams,
  FirstTouchSubscriptionListResponse,
  FirstTouchSubscriptionCreateResponse,
  WalletTrackerListResponse,
  WalletTrackerAddResponse,
  WalletTrackerUpdateResponse,
  WalletTrackerTradesParams,
  WalletTrackerTradesResponse,
  WalletTrackerSummaryParams,
  WalletTrackerSummaryResponse,
  MeResponse,
  TokensListParams,
  TokensListResponse,
  AlmostBondedParams,
  AlmostBondedResponse,
  WalletStatsResponse,
  WalletPnlResponse,
  WalletPositionsResponse,
  WalletTradesParams,
  WalletTradesResponse,
  PriceAlertCreateParams,
  PriceAlertUpdateParams,
  PriceAlertListResponse,
  PriceAlertCreateResponse,
  PriceAlertGetResponse,
  PriceAlertUpdateResponse,
  PriceAlertDeleteResponse,
  PriceAlertEventsParams,
  PriceAlertEventsResponse,
  ScoutLeaderboardParams,
  KolConsensusResponse,
  PeakHistoryResponse,
  CoordinationHistoryParams,
  TokenSnapshotResponse,
  SignalPerformanceResponse,
  SignalsCatalogResponse,
} from "./types.js";

import { MadeOnSolStream } from "./stream.js";
import type { StreamClientOptions } from "./stream.js";
import { VERSION } from "./version.js";

export { MadeOnSolStream } from "./stream.js";
export type {
  StreamClientOptions,
  StreamChannel,
  StreamEventName,
  StreamEvent,
  StreamLifecycleEvent,
} from "./stream.js";

export type {
  KolTrade,
  KolStrategy,
  KolFeedParams,
  KolFeedResponse,
  KolCoordinationToken,
  KolCoordinationParams,
  KolCoordinationResponse,
  KolLeaderboardEntry,
  KolLeaderboardSort,
  KolLeaderboardParams,
  KolLeaderboardResponse,
  KolPair,
  KolPairsParams,
  KolPairsResponse,
  KolTimingData,
  KolTimingParams,
  KolTimingResponse,
  HotToken,
  KolHotTokensParams,
  KolHotTokensResponse,
  KolEntryOrderEntry,
  KolEntryOrderParams,
  KolEntryOrderResponse,
  KolCompareProfile,
  KolCompareOverlapToken,
  KolCompareParams,
  KolCompareResponse,
  KolAlert,
  KolAlertType,
  KolAlertWindow,
  KolAlertSeverity,
  KolAlertsParams,
  KolAlertsResponse,
  TrajectoryData,
  DeployerTrajectoryResponse,
  DeployerAlert,
  DeployerAlertsParams,
  DeployerAlertsResponse,
  DiscoveryEndpoint,
  DiscoveryResponse,
  WebhookEvent,
  WebhookFilters,
  Webhook,
  WebhookWithSecret,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookDelivery,
  WebhookTestResult,
  StreamToken,
  StreamSession,
  StreamSessionsResponse,
  StreamSessionEvictResponse,
  AlphaPeriod,
  AlphaSort,
  AlphaLeaderboardParams,
  AlphaLeaderboardEntry,
  AlphaLeaderboardResponse,
  AlphaWalletSummary,
  AlphaWalletToken,
  AlphaWalletResponse,
  AlphaLinkedWallet,
  AlphaLinkedResponse,
  BuyerQualityConfidence,
  BuyerQualitySignal,
  CapTableBuyer,
  CapTableSummary,
  TokenCapTableResponse,
  TokenBuyerQualityResponse,
  TokenRiskBand,
  TokenRiskStatus,
  TokenRiskFactor,
  TokenRiskInputs,
  TokenRiskResponse,
  TokenBatchRiskError,
  TokenBatchRiskResult,
  TokenBatchRiskResponse,
  BundleKind,
  BundleSummary,
  BundleWallet,
  TokenBundleResponse,
  TokenPool,
  TokenPoolsSummary,
  TokenPoolsResponse,
  DeployerHistorySnapshot,
  DeployerHistoryResponse,
  CandleTimeframe,
  CandlesParams,
  Candle,
  CandlesResponse,
  TokenFlowWindow,
  TokenFlowParams,
  TokenFlowResponse,
  CopyTradeAction,
  CopyTradeSizingMode,
  CopyTradeDeliveryMode,
  CopyTradeSubscription,
  CopyTradeCreateParams,
  CopyTradeUpdateParams,
  CopyTradeCreateResponse,
  CopyTradeSignal,
  CopyTradeSignalsParams,
  CoordinationDeliveryMode,
  CoordinationAlertRule,
  CoordinationAlertCreateParams,
  CoordinationAlertUpdateParams,
  CoordinationAlertListResponse,
  CoordinationAlertCreateResponse,
  ScoutTier,
  FirstTouchesParams,
  FirstTouchEvent,
  FirstTouchesResponse,
  FirstTouchSubscriptionFilters,
  FirstTouchSubscription,
  FirstTouchSubscriptionCreateParams,
  FirstTouchSubscriptionUpdateParams,
  FirstTouchSubscriptionListResponse,
  FirstTouchSubscriptionCreateResponse,
  KolCoordinationKol,
  WalletTrackerEntry,
  WalletTrackerListResponse,
  WalletTrackerAddResponse,
  WalletTrackerUpdateResponse,
  WalletTrackerAction,
  WalletTrackerEventType,
  WalletTrackerTradesParams,
  WalletTrackerTrade,
  WalletTrackerTradesResponse,
  WalletTrackerSummaryParams,
  WalletTrackerSummaryStats,
  WalletTrackerSummaryResponse,
  WalletStats,
  WalletFlags,
  WalletStatsResponse,
  WalletTopToken,
  WalletTradingStyle,
  WalletDeployerTierEntry,
  WalletDeployerBreakdown,
  WalletRecentTrade,
  WalletPnlSummary,
  WalletPnlCurvePoint,
  WalletClosedPosition,
  WalletOpenPosition,
  WalletPnlResponse,
  WalletPositionsResponse,
  WalletTradesParams,
  WalletTrade,
  WalletTradesResponse,
  WalletStandoutTrade,
  WalletBiggestMiss,
  WalletVerdictTone,
  WalletVerdict,
  WalletDerivedStats,
  PriceAlertDeliveryMode,
  PriceAlertStatus,
  PriceAlert,
  PriceAlertCreateParams,
  PriceAlertUpdateParams,
  PriceAlertListResponse,
  PriceAlertCreateResponse,
  PriceAlertGetResponse,
  PriceAlertUpdateResponse,
  PriceAlertDeleteResponse,
  PriceAlertEvent,
  PriceAlertEventsParams,
  PriceAlertEventsResponse,
  ScoutLeaderboardSort,
  ScoutLeaderboardParams,
  KolConsensusResponse,
  PeakHistoryResponse,
  CoordinationHistoryParams,
  TokenSnapshotTopBuyer,
  TokenSnapshot,
  TokenSnapshotResponse,
  SignalName,
  SignalPerformanceBucket,
  SignalPerformanceSeriesPoint,
  SignalPerformanceResponse,
  SignalsCatalogEntry,
  SignalsCatalogResponse,
  AlmostBondedSort,
  AlmostBondedParams,
  AlmostBondedToken,
  AlmostBondedResponse,
} from "./types.js";

const DEFAULT_BASE_URL = "https://madeonsol.com";

/* ── Auth helpers ── */

type AuthMode = "madeonsol" | "x402";

function resolveAuthHeaders(mode: AuthMode, key: string): Record<string, string> {
  const h: Record<string, string> = { "User-Agent": `madeonsol-x402/${VERSION}` };
  if (mode === "madeonsol") h.Authorization = `Bearer ${key}`;
  return h;
}

/* ── Main client options ── */

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

export class MadeOnSolX402 {
  private paidFetch!: typeof fetch;
  private baseUrl: string;
  private authMode: AuthMode;
  private authHeaders: Record<string, string>;
  private ready: Promise<void>;

  constructor(opts: MadeOnSolX402Options | MadeOnSolClientOptions) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.authHeaders = {};

    // Resolve auth: apiKey > privateKey
    const clientOpts = opts as MadeOnSolClientOptions;
    if (clientOpts.apiKey) {
      this.authMode = "madeonsol";
      this.authHeaders = resolveAuthHeaders("madeonsol", clientOpts.apiKey);
      this.ready = Promise.resolve();
    } else {
      this.authMode = "x402";
      const pk = clientOpts.privateKey ?? (opts as MadeOnSolX402Options).privateKey;
      if (!pk) {
        console.error(
          "\n[madeonsol-x402] Missing apiKey or privateKey.\n" +
          "  → Get a free API key (200 req/day, no card) at https://madeonsol.com/pricing\n" +
          "  → Then: createClient(process.env.MADEONSOL_API_KEY)\n",
        );
        throw new Error("Provide apiKey or privateKey. Get a free API key at https://madeonsol.com/pricing");
      }
      this.ready = this.initX402(pk);
    }
  }

  private async initX402(privateKey: string): Promise<void> {
    const { wrapFetchWithPayment } = await import("@x402/fetch");
    const { x402Client } = await import("@x402/core/client");
    const { ExactSvmScheme } = await import("@x402/svm/exact/client");
    const { createKeyPairSignerFromBytes } = await import("@solana/kit");
    const { base58 } = await import("@scure/base");

    const signer = await createKeyPairSignerFromBytes(base58.decode(privateKey));
    const client = new x402Client();
    client.register("solana:*", new ExactSvmScheme(signer));
    this.paidFetch = wrapFetchWithPayment(fetch, client);
  }

  private async request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    await this.ready;
    const apiPath = this.authMode === "x402" ? path : path.replace("/api/x402/", "/api/v1/");
    const url = new URL(apiPath, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = this.authMode === "x402"
      ? await this.paidFetch(url.toString())
      : await fetch(url.toString(), { headers: this.authHeaders });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`MadeOnSol API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  /** Real-time KOL trade feed from 1,000+ tracked wallets. */
  async kolFeed(params?: KolFeedParams): Promise<KolFeedResponse> {
    return this.request("/api/x402/kol/feed", params as Record<string, string | number | undefined>);
  }

  /** KOL convergence signals — tokens being accumulated by multiple KOLs. */
  async kolCoordination(params?: KolCoordinationParams): Promise<KolCoordinationResponse> {
    return this.request("/api/x402/kol/coordination", params as Record<string, string | number | undefined>);
  }

  /** KOL performance rankings by PnL and win rate. */
  async kolLeaderboard(params?: KolLeaderboardParams): Promise<KolLeaderboardResponse> {
    return this.request("/api/x402/kol/leaderboard", params as Record<string, string | number | undefined>);
  }

  /** KOL affinity matrix — which KOLs frequently co-trade the same tokens. */
  async kolPairs(params?: KolPairsParams): Promise<KolPairsResponse> {
    return this.request("/api/x402/kol/pairs", params as Record<string, string | number | undefined>);
  }

  /** KOL momentum tokens — tokens with accelerating KOL buy interest. */
  async kolHotTokens(params?: KolHotTokensParams): Promise<KolHotTokensResponse> {
    return this.request("/api/x402/kol/tokens/hot", params as Record<string, string | number | undefined>);
  }

  /** Tokens ranked by KOL buy volume. Sub-hour periods require PRO/ULTRA. */
  async kolTrendingTokens(params?: { period?: string; min_kols?: number; limit?: number }): Promise<unknown> {
    return this.request("/api/x402/kol/tokens/trending", params as Record<string, string | number | undefined>);
  }

  /** Ranked KOL first-buyer order for a token. PRO+ adds percentile_pnl_7d. */
  async kolTokenEntryOrder(mint: string, params?: KolEntryOrderParams): Promise<KolEntryOrderResponse> {
    return this.request(`/api/x402/kol/tokens/${encodeURIComponent(mint)}/entry-order`, params as Record<string, string | number | undefined>);
  }

  /** Side-by-side comparison of 2-5 KOL wallets. PRO+ adds overlap tokens (30d). */
  async kolCompareWallets(params: KolCompareParams): Promise<KolCompareResponse> {
    return this.request("/api/x402/kol/compare", { wallets: params.wallets.join(",") });
  }

  /** Live KOL alert feed — consensus clusters, fresh-token buys, heating-up wallets. */
  async kolAlertsRecent(params?: KolAlertsParams): Promise<KolAlertsResponse> {
    const { types, ...rest } = params ?? {};
    const flat: Record<string, string | number | undefined> = { ...(rest as Record<string, string | number | undefined>) };
    if (types && types.length > 0) flat.types = types.join(",");
    return this.request("/api/x402/kol/alerts/recent", flat);
  }

  /** Real-time alerts from elite Pump.fun deployers. */
  async deployerAlerts(params?: DeployerAlertsParams): Promise<DeployerAlertsResponse> {
    return this.request("/api/x402/deployer-hunter/alerts", params as Record<string, string | number | undefined>);
  }

  /**
   * Universal wallet stats for any Solana wallet (90d window) plus cross-product
   * flags (KOL / alpha / deployer). **x402: $0.005**
   * @param address Base58 wallet address.
   */
  async walletStats(address: string): Promise<WalletStatsResponse> {
    return this.request(`/api/x402/wallet/${encodeURIComponent(address)}`);
  }

  /**
   * Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max
   * drawdown, hold-time stats, daily UTC PnL curve, closed positions sorted
   * by pnl desc, open positions hydrated with live prices from mc-tracker.
   * Cached server-side — cache hits return immediately. **x402: $0.02**
   */
  async walletPnl(address: string): Promise<WalletPnlResponse> {
    return this.request(`/api/x402/wallet/${encodeURIComponent(address)}/pnl`);
  }

  /**
   * Open positions only — lighter slice of `walletPnl`. Shares the same cache.
   * **x402: $0.01**
   */
  async walletPositions(address: string): Promise<WalletPositionsResponse> {
    return this.request(`/api/x402/wallet/${encodeURIComponent(address)}/positions`);
  }

  /**
   * Cursor-paginated raw trades for any wallet. Filter by action / token_mint /
   * since-until. Default limit 100, max 500. Cursor is stable across DESC
   * pagination. **x402: $0.005**
   */
  async walletTrades(address: string, params?: WalletTradesParams): Promise<WalletTradesResponse> {
    return this.request(`/api/x402/wallet/${encodeURIComponent(address)}/trades`,
      params as Record<string, string | number | undefined>);
  }

  /**
   * v1.9 — Scout leaderboard: top KOLs ranked by scout score, first-touch frequency,
   * and swarm attraction rate. ULTRA only.
   */
  async scoutLeaderboard(params?: ScoutLeaderboardParams): Promise<unknown> {
    return this.request("/api/x402/kol/scouts/leaderboard", params as Record<string, string | number | undefined>);
  }

  /**
   * v1.9 — Coordination history: past coordination alert fires with token, score, KOL count.
   * ULTRA only.
   */
  async coordinationHistory(params?: CoordinationHistoryParams): Promise<unknown> {
    return this.request("/api/x402/kol/coordination/history", params as Record<string, string | number | undefined>);
  }

  /**
   * v1.9 — KOL consensus on a token: how many KOLs bought/sold, exit rate,
   * net flow, median entry MC. ULTRA gets individual wallet arrays.
   */
  async kolConsensus(mint: string): Promise<KolConsensusResponse> {
    return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/kol-consensus`);
  }

  /**
   * v1.9 — Peak MC history for a token: ATH, decline from peak, MC at bond
   * and at 1h/6h/24h/7d after bond.
   */
  async peakHistory(mint: string): Promise<PeakHistoryResponse> {
    return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/peak-history`);
  }

  /** Token rug/safety score (0–100) with a per-factor breakdown — the "is this safe to buy?" call. */
  async tokenRisk(mint: string): Promise<TokenRiskResponse> {
    return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/risk`);
  }

  /** Bundle-cohort holdings for a token — `held_pct_of_supply` (net held / supply) is the headline "are the bundlers still holding?" read. */
  async tokenBundle(mint: string): Promise<TokenBundleResponse> {
    return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/bundle`);
  }

  /**
   * Trade-flow aggregate for a token — organic-vs-fake volume read: unique
   * wallets/buyers/sellers, buy/sell counts + SOL, net SOL, and a
   * `trades_per_wallet` wash-trading proxy. PRO/ULTRA only. **KEYED (v1) — there
   * is no x402 route**; requires an `msk_` API key (x402-only clients can't reach it).
   * @param mint Token mint (base58).
   * @param params `window` ("1h" | "24h", default "1h").
   */
  async tokenFlow(mint: string, params?: TokenFlowParams): Promise<TokenFlowResponse> {
    if (this.authMode !== "madeonsol") {
      throw new Error(
        "tokenFlow requires an msk_ API key (no x402 route). Get one free at https://madeonsol.com/pricing",
      );
    }
    return this.request(
      `/api/v1/tokens/${encodeURIComponent(mint)}/flow`,
      params as Record<string, string | number | undefined>,
    );
  }

  /** Early-buyer quality score (dump-cluster exposure, recycled wallets, smart money) + live Signal Scorecard efficacy. */
  async tokenBuyerQuality(mint: string): Promise<TokenBuyerQualityResponse> {
    return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/buyer-quality`);
  }

  /** Live token snapshot — price, market cap, FDV, liquidity, primary DEX, KOL buyer activity. */
  async token(mint: string): Promise<TokenSnapshotResponse> {
    return this.request(`/api/x402/token/${encodeURIComponent(mint)}`);
  }

  /** Signal Scorecard — out-of-sample, machine-readable reliability for a named signal. `history` adds the per-day drift series. */
  async signalPerformance(name: string, params?: { history?: boolean }): Promise<SignalPerformanceResponse> {
    return this.request(
      `/api/x402/signals/${encodeURIComponent(name)}/performance`,
      params?.history ? { history: "true" } : undefined,
    );
  }

  /** Free — catalog of available signals (name, methodology, performance endpoint). */
  async signals(): Promise<SignalsCatalogResponse> {
    return this.request("/api/x402/signals");
  }

  /** Free discovery endpoint — lists all available endpoints and prices. */
  async discovery(): Promise<DiscoveryResponse> {
    const res = await fetch(new URL("/api/x402", this.baseUrl).toString());
    if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
    return res.json() as Promise<DiscoveryResponse>;
  }
}

/** Create a client with API key auth (simplest option). */
export function createClient(apiKeyOrPrivateKey: string, baseUrl?: string): MadeOnSolX402 {
  // Auto-detect: msk_ prefix = API key, otherwise assume private key for backwards compat
  if (apiKeyOrPrivateKey.startsWith("msk_")) {
    return new MadeOnSolX402({ apiKey: apiKeyOrPrivateKey, baseUrl });
  }
  return new MadeOnSolX402({ privateKey: apiKeyOrPrivateKey, baseUrl });
}

/* ── REST API client (for webhooks + streaming) ── */

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
export class MadeOnSolREST {
  private baseUrl: string;
  private headers: Record<string, string>;
  /** Last response's rate-limit headers (X-RateLimit-*, X-Request-Id). */
  lastRateLimit: RateLimitInfo = { limit: null, remaining: null, reset: null, requestId: null };

  constructor(opts: MadeOnSolRESTOptions) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    if (!opts.apiKey) {
      console.error(
        "\n[madeonsol-x402] MadeOnSolREST: missing apiKey.\n" +
        "  → Get a free key (200 req/day, no card) at https://madeonsol.com/pricing\n",
      );
      throw new Error("Provide apiKey. Get a free API key at https://madeonsol.com/pricing");
    }
    this.headers = resolveAuthHeaders("madeonsol", opts.apiKey);
  }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`/api/v1${path}`, this.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    this.lastRateLimit = {
      limit:     numHeader(res, "x-ratelimit-limit"),
      remaining: numHeader(res, "x-ratelimit-remaining"),
      reset:     numHeader(res, "x-ratelimit-reset"),
      requestId: res.headers.get("x-request-id"),
    };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MadeOnSol API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  /** Create a webhook. Returns the webhook with HMAC secret (only shown once). */
  async createWebhook(params: CreateWebhookParams): Promise<{ webhook: WebhookWithSecret; note: string }> {
    return this.request("POST", "/webhooks", params);
  }

  /** List all your webhooks. */
  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    return this.request("GET", "/webhooks");
  }

  /** Get webhook detail with recent delivery log. */
  async getWebhook(id: number): Promise<{ webhook: Webhook; recent_deliveries: WebhookDelivery[] }> {
    return this.request("GET", `/webhooks/${id}`);
  }

  /** Update a webhook (URL, events, filters, or re-enable). */
  async updateWebhook(id: number, params: UpdateWebhookParams): Promise<{ webhook: Webhook }> {
    return this.request("PATCH", `/webhooks/${id}`, params);
  }

  /** Delete a webhook permanently. */
  async deleteWebhook(id: number): Promise<{ deleted: boolean }> {
    return this.request("DELETE", `/webhooks/${id}`);
  }

  /** Send a test payload to verify your webhook URL. */
  async testWebhook(webhookId: number): Promise<WebhookTestResult> {
    return this.request("POST", "/webhooks/test", { webhook_id: webhookId });
  }

  /** KOL entry/exit timing profile — hold duration, exit speed, activity patterns. */
  async kolTiming(wallet: string, params?: KolTimingParams): Promise<KolTimingResponse> {
    return this.request("GET", `/kol/${encodeURIComponent(wallet)}/timing`, undefined, params as Record<string, string | undefined>);
  }

  /** Deep per-wallet PnL breakdown — equity curve, risk metrics, positions. */
  async kolPnl(wallet: string, params?: { period?: string }): Promise<unknown> {
    return this.request("GET", `/kol/${encodeURIComponent(wallet)}/pnl`, undefined, params);
  }

  /** Deployer skill curve — streaks, rolling bond rate, improvement trend. */
  async deployerTrajectory(wallet: string): Promise<DeployerTrajectoryResponse> {
    return this.request("GET", `/deployer-hunter/${encodeURIComponent(wallet)}/trajectory`);
  }

  /**
   * A deployer's daily reputation time-series — backtest "was this deployer elite
   * when it launched token X?" without look-ahead bias. Each snapshot carries the
   * `tier`, `is_tracked` flag, and that day's cumulative `total_deployed` /
   * `total_bonded`, `bonding_rate`, `recent_bond_rate`, `avg_peak_mc`, and
   * `best_token_peak_mc`. `limit` (1–365, default 90) bounds the number of days.
   * PRO/ULTRA only.
   */
  async deployerHistory(wallet: string, opts?: { limit?: number }): Promise<DeployerHistoryResponse> {
    return this.request("GET", `/deployer-hunter/${encodeURIComponent(wallet)}/history`, undefined,
      opts?.limit !== undefined ? { limit: opts.limit } : undefined);
  }

  /** Generate a 24h WebSocket streaming token. */
  async getStreamToken(): Promise<StreamToken> {
    return this.request("POST", "/stream/token");
  }

  /**
   * Open a managed real-time WebSocket stream. Handles token fetch + refresh,
   * auto-reconnect with backoff, heartbeat liveness, and typed events for you.
   *
   * @example
   * const stream = client.stream();
   * stream.on("kol:trade", (t) => console.log(t));
   * stream.subscribe(["kol:trades", "deployer:alerts"]);
   */
  stream(opts?: Omit<StreamClientOptions, "getToken">): MadeOnSolStream {
    return new MadeOnSolStream({ ...opts, getToken: () => this.getStreamToken() });
  }

  /**
   * List your live WebSocket sessions across both stream services (ws-streaming
   * + dex-stream). Reflects in-memory connection state, so every listed slot is
   * evictable via {@link streamSessionKill}. Useful when a deploy overlap leaves
   * a ghost socket holding your slot and reconnects hit the 4002 connection
   * limit. PRO/ULTRA only.
   */
  async streamSessions(): Promise<StreamSessionsResponse> {
    return this.request("GET", "/stream/sessions");
  }

  /**
   * Terminate one of your own live WebSocket sessions by id and free its
   * connection slot immediately — the self-serve fix for a 4002 lockout after a
   * deploy overlap. `id` is the session id from {@link streamSessions}. Throws
   * on a non-positive-integer id (400) or when no live session with that id
   * belongs to your key (404). PRO/ULTRA only.
   */
  async streamSessionKill(id: number | string): Promise<StreamSessionEvictResponse> {
    return this.request("DELETE", `/stream/sessions/${encodeURIComponent(String(id))}`);
  }

  /**
   * v1.7 — Inspect your account: tier, daily/burst quota state, subscription
   * expiry, and per-feature usage. Use `quota.daily.remaining` for self-throttling
   * without parsing rate-limit headers.
   */
  async me(): Promise<MeResponse> {
    return this.request("GET", "/me");
  }

  /**
   * v1.7 — Filtered, sortable token directory (PRO+). Default `min_liq=2000`
   * skips phantom-MC dust (set 0 to disable). Computed filters
   * (`min_volume_1h_usd`, `max_mev_share_pct`, `mc_change_1h_*`) over-fetch
   * and post-filter — `pagination.post_filtered=true` flags this.
   */
  async tokensList(params?: TokensListParams): Promise<TokensListResponse> {
    // Coerce booleans to "true"/"false" strings since the shared request
    // helper only accepts string|number|undefined query values.
    const query: Record<string, string | number | undefined> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        query[k] = typeof v === "boolean" ? (v ? "true" : "false") : v as string | number;
      }
    }
    return this.request("GET", "/tokens", undefined, query);
  }

  /**
   * v1.17 — Pre-bond pump.fun tokens approaching graduation, ranked by velocity
   * (Δprogress/min) — "95% and accelerating" beats "92% stalled". Each token is
   * enriched with its deployer's reputation tier. `progress_pct` comes from
   * on-chain real_token_reserves depletion; `velocity_pct_per_min` is null until
   * a 5m snapshot exists; `eta_minutes` is a linear projection. PRO/ULTRA only.
   */
  async almostBonded(params?: AlmostBondedParams): Promise<AlmostBondedResponse> {
    // Coerce booleans to "true"/"false" strings since the shared request
    // helper only accepts string|number|undefined query values.
    const query: Record<string, string | number | undefined> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        query[k] = typeof v === "boolean" ? (v ? "true" : "false") : v as string | number;
      }
    }
    return this.request("GET", "/tokens/almost-bonded", undefined, query);
  }

  /* ── Alpha Wallet Intelligence ── */

  /** Top statistically profitable early-buyer wallets. BASIC=25, PRO=100, ULTRA=500. */
  async alphaLeaderboard(params?: AlphaLeaderboardParams): Promise<AlphaLeaderboardResponse> {
    return this.request("GET", "/alpha/leaderboard", undefined, params as Record<string, string | number | undefined>);
  }

  /** Full alpha profile for one wallet: per-token breakdown + bot signals. ULTRA only. */
  async alphaWallet(wallet: string): Promise<AlphaWalletResponse> {
    return this.request("GET", `/alpha/${encodeURIComponent(wallet)}`);
  }

  /** Wallets behaviorally linked to this one (co-bought 3+ tokens within 2s). ULTRA only. */
  async alphaLinked(wallet: string): Promise<AlphaLinkedResponse> {
    return this.request("GET", `/alpha/${encodeURIComponent(wallet)}/linked`);
  }

  /* ── Token quality ── */

  /** First non-deployer early buyers for a token, enriched with PnL/KOL/bot flags. PRO=10, ULTRA=20. */
  async tokenCapTable(mint: string): Promise<TokenCapTableResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/cap-table`);
  }

  /** 0–100 buyer-quality score for a token's first-buyer cohort. 5-min cached. */
  async tokenBuyerQuality(mint: string): Promise<TokenBuyerQualityResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/buyer-quality`);
  }

  /**
   * Transparent 0–100 token rug-risk/safety score (higher = riskier). Returns a
   * `band` (safe/caution/danger), an explainable `factors` array, and the raw
   * `inputs` (authorities, liquidity, transfer fee, launch cohort, deployer bond
   * rate, KOL signal, blacklist). PRO/ULTRA only — BASIC receives HTTP 403.
   */
  async tokenRisk(mint: string): Promise<TokenRiskResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/risk`);
  }

  /**
   * Bundle-cohort holdings for a token — "are the bundle wallets still holding?".
   * The `bundle` block carries the aggregate: `wallet_count`, `bundle_kind`
   * (atomic_tx/same_slot/none), `held_ratio` (net held / buy volume — churn-sensitive
   * secondary), `held_pct_of_supply` (net held / circulating supply — the HEADLINE;
   * null when supply is unknown), `fully_exited`, `buy_volume`, and `tokens_held`.
   * Field-gated by tier: BASIC get the `bundle` block only (`wallets: []`);
   * PRO adds the top-10 `wallets` with flags (`has_sold`, `atomic`, `is_kol`); ULTRA
   * returns the full cohort plus per-wallet identity (`kol_name`, `win_rate`,
   * `bot_confidence`, `tokens_held`). All tiers reach it.
   */
  async tokenBundle(mint: string): Promise<TokenBundleResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/bundle`);
  }

  /**
   * Per-venue liquidity map — every DEX pool a token trades in, live vs parked,
   * with fragmentation (`dex_count`) and `top_pool_share_pct`. Each pool carries
   * `liquidity_usd`, `last_price_sol`, `last_swap_at`, and an `is_active` flag;
   * the `summary` block rolls them up (`pool_count`, `active_pool_count`,
   * `total_liquidity_usd`, `primary_pool`/`primary_dex`). PRO/ULTRA only — BASIC
   * receives HTTP 403.
   */
  async tokenPools(mint: string): Promise<TokenPoolsResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/pools`);
  }

  /**
   * Bulk token rug-risk/safety scoring — up to 50 mints in one call (counts as 1
   * request against quota). Each entry in `tokens` is either a full risk result
   * (same shape as {@link tokenRisk}, plus `as_of`) or `{ mint, error: "not_tracked" }`
   * for untracked mints — untracked mints do NOT fail the batch. `tokens`
   * preserves de-duplicated input order; `count` is the number of unique mints.
   * PRO/ULTRA only — BASIC receives HTTP 403.
   * @param mints 1–50 base58 mint addresses.
   */
  async tokensBatchRisk(mints: string[]): Promise<TokenBatchRiskResponse> {
    return this.request("POST", "/tokens/batch/risk", { mints });
  }

  /**
   * 1-minute-derived OHLC candles for a token. `tf` selects the timeframe
   * (1m/5m/15m/1h/4h/1d, default 1h); `limit` (1–1000, default 200) and the
   * `from`/`to` ISO 8601 bounds page the range. PRO returns OHLCV for the last
   * 30 days; ULTRA adds net flow (buy/sell volume, `net_volume_usd`, trade
   * counts, MEV volume), liquidity delta, and full history — signalled by
   * `net_flow_included`. PRO/ULTRA only — BASIC receives HTTP 403.
   */
  async tokenCandles(mint: string, params?: CandlesParams): Promise<CandlesResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/candles`, undefined, params as Record<string, string | number | undefined>);
  }

  /**
   * Live token snapshot — price (USD/SOL), VWAP, market cap, FDV, liquidity,
   * liquidity-to-MC ratio, primary DEX + pool, Token-2022 / transfer-fee flags,
   * and a `top_buyers` array ({ name, sol_amount }). Returns `{ token: {...} }`.
   */
  async token(mint: string): Promise<TokenSnapshotResponse> {
    return this.request("GET", `/token/${encodeURIComponent(mint)}`);
  }

  /**
   * Signal Scorecard — out-of-sample reliability for a named signal. Returns
   * `buckets` (each with hit_rate, base_rate, lift, sample_n, window_days,
   * test_from/test_to) plus the signal, metric_type, outcome, methodology, and
   * as_of. Pass `{ history: true }` to also get a per-day `series`. Valid names:
   * dump_cluster_count, runner_rate, recycled_early_buyer_count, coordination_count.
   */
  async signalPerformance(name: string, params?: { history?: boolean }): Promise<SignalPerformanceResponse> {
    return this.request("GET", `/signals/${encodeURIComponent(name)}/performance`, undefined,
      params?.history ? { history: "true" } : undefined);
  }

  /** Free signals catalog — name, description, the available signals with methodology + performance_endpoint, and docs. No payment required. */
  async signals(): Promise<SignalsCatalogResponse> {
    return this.request("GET", "/signals");
  }

  /* ── Copy-Trade (PRO/ULTRA) ── */

  /** List your copy-trade rules. */
  async copyTradeList(): Promise<{ subscriptions: CopyTradeSubscription[] }> {
    return this.request("GET", "/copytrade/subscriptions");
  }

  /** Create a copy-trade rule. Returns webhook_secret once — save it. */
  async copyTradeCreate(params: CopyTradeCreateParams): Promise<CopyTradeCreateResponse> {
    return this.request("POST", "/copytrade/subscriptions", params);
  }

  /** Get one copy-trade rule by id. */
  async copyTradeGet(id: number): Promise<{ subscription: CopyTradeSubscription }> {
    return this.request("GET", `/copytrade/subscriptions/${id}`);
  }

  /** Update a copy-trade rule. */
  async copyTradeUpdate(id: number, params: CopyTradeUpdateParams): Promise<{ subscription: CopyTradeSubscription }> {
    return this.request("PATCH", `/copytrade/subscriptions/${id}`, params);
  }

  /** Delete a copy-trade rule. */
  async copyTradeDelete(id: number): Promise<{ deleted: boolean }> {
    return this.request("DELETE", `/copytrade/subscriptions/${id}`);
  }

  /** Recent fired copy-trade signals (up to 7 days). */
  async copyTradeSignals(params?: CopyTradeSignalsParams): Promise<{ signals: CopyTradeSignal[] }> {
    return this.request("GET", "/copytrade/signals", undefined, params as Record<string, string | number | undefined>);
  }

  /* ── Coordination alerts (PRO/ULTRA) ── */

  /** List your coordination alert rules. */
  async coordinationAlertsList(): Promise<CoordinationAlertListResponse> {
    return this.request("GET", "/kol/coordination/alerts");
  }

  /** Create a coordination alert rule. Returns webhook_secret once — save it. */
  async coordinationAlertsCreate(params: CoordinationAlertCreateParams): Promise<CoordinationAlertCreateResponse> {
    return this.request("POST", "/kol/coordination/alerts", params);
  }

  /** Get one coordination alert rule by id. */
  async coordinationAlertsGet(id: string): Promise<{ rule: CoordinationAlertRule }> {
    return this.request("GET", `/kol/coordination/alerts/${encodeURIComponent(id)}`);
  }

  /** Update a coordination alert rule. */
  async coordinationAlertsUpdate(id: string, params: CoordinationAlertUpdateParams): Promise<{ rule: CoordinationAlertRule }> {
    return this.request("PATCH", `/kol/coordination/alerts/${encodeURIComponent(id)}`, params);
  }

  /** Delete a coordination alert rule. */
  async coordinationAlertsDelete(id: string): Promise<{ deleted: boolean }> {
    return this.request("DELETE", `/kol/coordination/alerts/${encodeURIComponent(id)}`);
  }

  /* ── First-touch signal ── */

  /**
   * Recent first-KOL-touch events on tokens. Each event = the first time a
   * tracked KOL bought that token mint. Filterable by scout tier, KOL winrate,
   * token age, etc. Backed by a 38d backtest where top scouts (S-tier) see ≥3
   * follow-on KOLs within 4h ~50% of the time vs ~14% baseline.
   */
  async firstTouches(params?: FirstTouchesParams): Promise<FirstTouchesResponse> {
    return this.request("GET", "/kol/first-touches", undefined, params as Record<string, string | number | undefined>);
  }

  /** List your first-touch webhook subscriptions (Ultra). */
  async firstTouchSubscriptionsList(): Promise<FirstTouchSubscriptionListResponse> {
    return this.request("GET", "/kol/first-touches/subscriptions");
  }

  /** Create a first-touch webhook subscription (Ultra). Returns webhook_secret once — save it. */
  async firstTouchSubscriptionsCreate(params: FirstTouchSubscriptionCreateParams): Promise<FirstTouchSubscriptionCreateResponse> {
    return this.request("POST", "/kol/first-touches/subscriptions", params);
  }

  /** Get one first-touch subscription by id. */
  async firstTouchSubscriptionsGet(id: string): Promise<{ subscription: FirstTouchSubscription }> {
    return this.request("GET", `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`);
  }

  /** Update a first-touch subscription. */
  async firstTouchSubscriptionsUpdate(id: string, params: FirstTouchSubscriptionUpdateParams): Promise<{ subscription: FirstTouchSubscription }> {
    return this.request("PATCH", `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`, params);
  }

  /** Delete a first-touch subscription. */
  async firstTouchSubscriptionsDelete(id: string): Promise<{ ok: boolean }> {
    return this.request("DELETE", `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`);
  }

  /* ── Wallet Tracker ── */

  /** List tracked wallets with labels and remaining capacity. */
  async walletTrackerList(): Promise<WalletTrackerListResponse> {
    return this.request("GET", "/wallet-tracker/watchlist");
  }

  /** Add a wallet to the watchlist. */
  async walletTrackerAdd(wallet_address: string, label?: string): Promise<WalletTrackerAddResponse> {
    return this.request("POST", "/wallet-tracker/watchlist", { wallet_address, label });
  }

  /** Remove a wallet from the watchlist. */
  async walletTrackerRemove(wallet_address: string): Promise<{ removed: boolean }> {
    return this.request("DELETE", `/wallet-tracker/watchlist/${encodeURIComponent(wallet_address)}`);
  }

  /** Update the label for a tracked wallet (pass `null` to clear). */
  async walletTrackerUpdateLabel(wallet_address: string, label: string | null): Promise<WalletTrackerUpdateResponse> {
    return this.request("PATCH", `/wallet-tracker/watchlist/${encodeURIComponent(wallet_address)}`, { label });
  }

  /** Historical swap/transfer events across watched wallets. */
  async walletTrackerTrades(params?: WalletTrackerTradesParams): Promise<WalletTrackerTradesResponse> {
    return this.request("GET", "/wallet-tracker/trades", undefined, params as Record<string, string | number | undefined>);
  }

  /** Per-wallet stats (counts, SOL bought/sold, last activity). */
  async walletTrackerSummary(params?: WalletTrackerSummaryParams): Promise<WalletTrackerSummaryResponse> {
    return this.request("GET", "/wallet-tracker/summary", undefined, params as Record<string, string | number | undefined>);
  }

  /* ── Price alerts (PRO/ULTRA, v1.9) ── */

  /** List your price alerts. */
  async priceAlertsList(): Promise<PriceAlertListResponse> {
    return this.request("GET", "/price-alerts");
  }

  /** Create a price alert. Returns webhook_secret ONCE — store it. */
  async priceAlertsCreate(params: PriceAlertCreateParams): Promise<PriceAlertCreateResponse> {
    return this.request("POST", "/price-alerts", params);
  }

  /** Get one price alert by id. */
  async priceAlertsGet(id: number | string): Promise<PriceAlertGetResponse> {
    return this.request("GET", `/price-alerts/${id}`);
  }

  /** Update alert name, delivery mode, webhook URL, or is_active. Thresholds are immutable. */
  async priceAlertsUpdate(id: number | string, params: PriceAlertUpdateParams): Promise<PriceAlertUpdateResponse> {
    return this.request("PATCH", `/price-alerts/${id}`, params);
  }

  /** Delete a price alert and its event history. */
  async priceAlertsDelete(id: number | string): Promise<PriceAlertDeleteResponse> {
    return this.request("DELETE", `/price-alerts/${id}`);
  }

  /** Fired event history (30-day retention). Filter by alert_id, event_type, since. */
  async priceAlertsEvents(params?: PriceAlertEventsParams): Promise<PriceAlertEventsResponse> {
    return this.request("GET", "/price-alerts/events", undefined, params as Record<string, string | number | undefined>);
  }

  /* ── v1.9 new read endpoints ── */

  /** Scout leaderboard: top KOLs ranked by scout score and swarm attraction rate. ULTRA only. */
  async scoutLeaderboard(params?: ScoutLeaderboardParams): Promise<unknown> {
    return this.request("GET", "/kol/scouts/leaderboard", undefined, params as Record<string, string | number | undefined>);
  }

  /** Coordination history: past coordination alert fires with token, score, KOL count. ULTRA only. */
  async coordinationHistory(params?: CoordinationHistoryParams): Promise<unknown> {
    return this.request("GET", "/kol/coordination/history", undefined, params as Record<string, string | number | undefined>);
  }

  /** KOL consensus on a token: buyers/sellers, exit rate, net flow, median entry MC. ULTRA gets wallet arrays. */
  async kolConsensus(mint: string): Promise<KolConsensusResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/kol-consensus`);
  }

  /** Peak MC history: ATH, decline from peak, MC at bond and at 1h/6h/24h/7d after bond. */
  async peakHistory(mint: string): Promise<PeakHistoryResponse> {
    return this.request("GET", `/tokens/${encodeURIComponent(mint)}/peak-history`);
  }

  // ── Universal wallet endpoints (PRO+, any wallet — not just curated KOLs) ──

  /** Aggregate stats + cross-product flags (is_kol / is_alpha_tracked / is_deployer) for any Solana wallet. PRO+. */
  async walletStats(address: string): Promise<WalletStatsResponse> {
    return this.request("GET", `/wallet/${encodeURIComponent(address)}`);
  }

  /** Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max drawdown, hold times, daily curve, closed + open positions. Cached server-side. PRO+. */
  async walletPnl(address: string): Promise<WalletPnlResponse> {
    return this.request("GET", `/wallet/${encodeURIComponent(address)}/pnl`);
  }

  /** Open positions only — lighter slice of `walletPnl`. Shares the same cache. PRO+. */
  async walletPositions(address: string): Promise<WalletPositionsResponse> {
    return this.request("GET", `/wallet/${encodeURIComponent(address)}/positions`);
  }

  /** Cursor-paginated raw trades for any wallet. Filter by action / token_mint / since-until. PRO+. */
  async walletTrades(address: string, params?: WalletTradesParams): Promise<WalletTradesResponse> {
    return this.request("GET", `/wallet/${encodeURIComponent(address)}/trades`, undefined,
      params as Record<string, string | number | undefined>);
  }
}

function numHeader(res: Response, name: string): number | null {
  const v = res.headers.get(name);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Convenience factory — creates a REST API client for webhooks + streaming. */
export function createRESTClient(apiKey: string, baseUrl?: string): MadeOnSolREST {
  return new MadeOnSolREST({ apiKey, baseUrl });
}
