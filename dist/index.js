import { MadeOnSolStream } from "./stream.js";
export { MadeOnSolStream } from "./stream.js";
const DEFAULT_BASE_URL = "https://madeonsol.com";
function resolveAuthHeaders(mode, key) {
    const h = { "User-Agent": "madeonsol-x402/1.9.0" };
    if (mode === "madeonsol")
        h.Authorization = `Bearer ${key}`;
    return h;
}
export class MadeOnSolX402 {
    paidFetch;
    baseUrl;
    authMode;
    authHeaders;
    ready;
    constructor(opts) {
        this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
        this.authHeaders = {};
        // Resolve auth: apiKey > privateKey
        const clientOpts = opts;
        if (clientOpts.apiKey) {
            this.authMode = "madeonsol";
            this.authHeaders = resolveAuthHeaders("madeonsol", clientOpts.apiKey);
            this.ready = Promise.resolve();
        }
        else {
            this.authMode = "x402";
            const pk = clientOpts.privateKey ?? opts.privateKey;
            if (!pk) {
                console.error("\n[madeonsol-x402] Missing apiKey or privateKey.\n" +
                    "  → Get a free API key (200 req/day, no card) at https://madeonsol.com/pricing\n" +
                    "  → Then: createClient(process.env.MADEONSOL_API_KEY)\n");
                throw new Error("Provide apiKey or privateKey. Get a free API key at https://madeonsol.com/pricing");
            }
            this.ready = this.initX402(pk);
        }
    }
    async initX402(privateKey) {
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
    async request(path, params) {
        await this.ready;
        const apiPath = this.authMode === "x402" ? path : path.replace("/api/x402/", "/api/v1/");
        const url = new URL(apiPath, this.baseUrl);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v !== undefined)
                    url.searchParams.set(k, String(v));
            }
        }
        const res = this.authMode === "x402"
            ? await this.paidFetch(url.toString())
            : await fetch(url.toString(), { headers: this.authHeaders });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`MadeOnSol API error ${res.status}: ${body}`);
        }
        return res.json();
    }
    /** Real-time KOL trade feed from 1,000+ tracked wallets. */
    async kolFeed(params) {
        return this.request("/api/x402/kol/feed", params);
    }
    /** KOL convergence signals — tokens being accumulated by multiple KOLs. */
    async kolCoordination(params) {
        return this.request("/api/x402/kol/coordination", params);
    }
    /** KOL performance rankings by PnL and win rate. */
    async kolLeaderboard(params) {
        return this.request("/api/x402/kol/leaderboard", params);
    }
    /** KOL affinity matrix — which KOLs frequently co-trade the same tokens. */
    async kolPairs(params) {
        return this.request("/api/x402/kol/pairs", params);
    }
    /** KOL momentum tokens — tokens with accelerating KOL buy interest. */
    async kolHotTokens(params) {
        return this.request("/api/x402/kol/tokens/hot", params);
    }
    /** Tokens ranked by KOL buy volume. Sub-hour periods require PRO/ULTRA. */
    async kolTrendingTokens(params) {
        return this.request("/api/x402/kol/tokens/trending", params);
    }
    /** Ranked KOL first-buyer order for a token. PRO+ adds percentile_pnl_7d. */
    async kolTokenEntryOrder(mint, params) {
        return this.request(`/api/x402/kol/tokens/${encodeURIComponent(mint)}/entry-order`, params);
    }
    /** Side-by-side comparison of 2-5 KOL wallets. PRO+ adds overlap tokens (30d). */
    async kolCompareWallets(params) {
        return this.request("/api/x402/kol/compare", { wallets: params.wallets.join(",") });
    }
    /** Live KOL alert feed — consensus clusters, fresh-token buys, heating-up wallets. */
    async kolAlertsRecent(params) {
        const { types, ...rest } = params ?? {};
        const flat = { ...rest };
        if (types && types.length > 0)
            flat.types = types.join(",");
        return this.request("/api/x402/kol/alerts/recent", flat);
    }
    /** Real-time alerts from elite Pump.fun deployers. */
    async deployerAlerts(params) {
        return this.request("/api/x402/deployer-hunter/alerts", params);
    }
    /**
     * Universal wallet stats for any Solana wallet (90d window) plus cross-product
     * flags (KOL / alpha / deployer). **x402: $0.005**
     * @param address Base58 wallet address.
     */
    async walletStats(address) {
        return this.request(`/api/x402/wallet/${encodeURIComponent(address)}`);
    }
    /**
     * Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max
     * drawdown, hold-time stats, daily UTC PnL curve, closed positions sorted
     * by pnl desc, open positions hydrated with live prices from mc-tracker.
     * Cached server-side — cache hits return immediately. **x402: $0.02**
     */
    async walletPnl(address) {
        return this.request(`/api/x402/wallet/${encodeURIComponent(address)}/pnl`);
    }
    /**
     * Open positions only — lighter slice of `walletPnl`. Shares the same cache.
     * **x402: $0.01**
     */
    async walletPositions(address) {
        return this.request(`/api/x402/wallet/${encodeURIComponent(address)}/positions`);
    }
    /**
     * Cursor-paginated raw trades for any wallet. Filter by action / token_mint /
     * since-until. Default limit 100, max 500. Cursor is stable across DESC
     * pagination. **x402: $0.005**
     */
    async walletTrades(address, params) {
        return this.request(`/api/x402/wallet/${encodeURIComponent(address)}/trades`, params);
    }
    /**
     * v1.9 — Scout leaderboard: top KOLs ranked by scout score, first-touch frequency,
     * and swarm attraction rate. ULTRA only.
     */
    async scoutLeaderboard(params) {
        return this.request("/api/x402/kol/scouts/leaderboard", params);
    }
    /**
     * v1.9 — Coordination history: past coordination alert fires with token, score, KOL count.
     * ULTRA only.
     */
    async coordinationHistory(params) {
        return this.request("/api/x402/kol/coordination/history", params);
    }
    /**
     * v1.9 — KOL consensus on a token: how many KOLs bought/sold, exit rate,
     * net flow, median entry MC. ULTRA gets individual wallet arrays.
     */
    async kolConsensus(mint) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/kol-consensus`);
    }
    /**
     * v1.9 — Peak MC history for a token: ATH, decline from peak, MC at bond
     * and at 1h/6h/24h/7d after bond.
     */
    async peakHistory(mint) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/peak-history`);
    }
    /** Free discovery endpoint — lists all available endpoints and prices. */
    async discovery() {
        const res = await fetch(new URL("/api/x402", this.baseUrl).toString());
        if (!res.ok)
            throw new Error(`Discovery failed: ${res.status}`);
        return res.json();
    }
}
/** Create a client with API key auth (simplest option). */
export function createClient(apiKeyOrPrivateKey, baseUrl) {
    // Auto-detect: msk_ prefix = API key, otherwise assume private key for backwards compat
    if (apiKeyOrPrivateKey.startsWith("msk_")) {
        return new MadeOnSolX402({ apiKey: apiKeyOrPrivateKey, baseUrl });
    }
    return new MadeOnSolX402({ privateKey: apiKeyOrPrivateKey, baseUrl });
}
/**
 * REST API client for webhook management, WebSocket streaming tokens, alpha
 * intelligence, token quality, copy-trade rules, and wallet tracker.
 * Requires a Pro or Ultra subscription for most endpoints.
 */
export class MadeOnSolREST {
    baseUrl;
    headers;
    /** Last response's rate-limit headers (X-RateLimit-*, X-Request-Id). */
    lastRateLimit = { limit: null, remaining: null, reset: null, requestId: null };
    constructor(opts) {
        this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
        if (!opts.apiKey) {
            console.error("\n[madeonsol-x402] MadeOnSolREST: missing apiKey.\n" +
                "  → Get a free key (200 req/day, no card) at https://madeonsol.com/pricing\n");
            throw new Error("Provide apiKey. Get a free API key at https://madeonsol.com/pricing");
        }
        this.headers = resolveAuthHeaders("madeonsol", opts.apiKey);
    }
    async request(method, path, body, query) {
        const url = new URL(`/api/v1${path}`, this.baseUrl);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v !== undefined)
                    url.searchParams.set(k, String(v));
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
            limit: numHeader(res, "x-ratelimit-limit"),
            remaining: numHeader(res, "x-ratelimit-remaining"),
            reset: numHeader(res, "x-ratelimit-reset"),
            requestId: res.headers.get("x-request-id"),
        };
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`MadeOnSol API error ${res.status}: ${text}`);
        }
        return res.json();
    }
    /** Create a webhook. Returns the webhook with HMAC secret (only shown once). */
    async createWebhook(params) {
        return this.request("POST", "/webhooks", params);
    }
    /** List all your webhooks. */
    async listWebhooks() {
        return this.request("GET", "/webhooks");
    }
    /** Get webhook detail with recent delivery log. */
    async getWebhook(id) {
        return this.request("GET", `/webhooks/${id}`);
    }
    /** Update a webhook (URL, events, filters, or re-enable). */
    async updateWebhook(id, params) {
        return this.request("PATCH", `/webhooks/${id}`, params);
    }
    /** Delete a webhook permanently. */
    async deleteWebhook(id) {
        return this.request("DELETE", `/webhooks/${id}`);
    }
    /** Send a test payload to verify your webhook URL. */
    async testWebhook(webhookId) {
        return this.request("POST", "/webhooks/test", { webhook_id: webhookId });
    }
    /** KOL entry/exit timing profile — hold duration, exit speed, activity patterns. */
    async kolTiming(wallet, params) {
        return this.request("GET", `/kol/${encodeURIComponent(wallet)}/timing`, undefined, params);
    }
    /** Deep per-wallet PnL breakdown — equity curve, risk metrics, positions. */
    async kolPnl(wallet, params) {
        return this.request("GET", `/kol/${encodeURIComponent(wallet)}/pnl`, undefined, params);
    }
    /** Deployer skill curve — streaks, rolling bond rate, improvement trend. */
    async deployerTrajectory(wallet) {
        return this.request("GET", `/deployer-hunter/${encodeURIComponent(wallet)}/trajectory`);
    }
    /** Generate a 24h WebSocket streaming token. */
    async getStreamToken() {
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
    stream(opts) {
        return new MadeOnSolStream({ ...opts, getToken: () => this.getStreamToken() });
    }
    /**
     * v1.7 — Inspect your account: tier, daily/burst quota state, subscription
     * expiry, and per-feature usage. Use `quota.daily.remaining` for self-throttling
     * without parsing rate-limit headers.
     */
    async me() {
        return this.request("GET", "/me");
    }
    /**
     * v1.7 — Filtered, sortable token directory (PRO+). Default `min_liq=2000`
     * skips phantom-MC dust (set 0 to disable). Computed filters
     * (`min_volume_1h_usd`, `max_mev_share_pct`, `mc_change_1h_*`) over-fetch
     * and post-filter — `pagination.post_filtered=true` flags this.
     */
    async tokensList(params) {
        // Coerce booleans to "true"/"false" strings since the shared request
        // helper only accepts string|number|undefined query values.
        const query = {};
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v === undefined || v === null)
                    continue;
                query[k] = typeof v === "boolean" ? (v ? "true" : "false") : v;
            }
        }
        return this.request("GET", "/tokens", undefined, query);
    }
    /* ── Alpha Wallet Intelligence ── */
    /** Top statistically profitable early-buyer wallets. BASIC=25, PRO=100, ULTRA=500. */
    async alphaLeaderboard(params) {
        return this.request("GET", "/alpha/leaderboard", undefined, params);
    }
    /** Full alpha profile for one wallet: per-token breakdown + bot signals. ULTRA only. */
    async alphaWallet(wallet) {
        return this.request("GET", `/alpha/${encodeURIComponent(wallet)}`);
    }
    /** Wallets behaviorally linked to this one (co-bought 3+ tokens within 2s). ULTRA only. */
    async alphaLinked(wallet) {
        return this.request("GET", `/alpha/${encodeURIComponent(wallet)}/linked`);
    }
    /* ── Token quality ── */
    /** First non-deployer early buyers for a token, enriched with PnL/KOL/bot flags. PRO=10, ULTRA=20. */
    async tokenCapTable(mint) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/cap-table`);
    }
    /** 0–100 buyer-quality score for a token's first-buyer cohort. 5-min cached. */
    async tokenBuyerQuality(mint) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/buyer-quality`);
    }
    /* ── Copy-Trade (PRO/ULTRA) ── */
    /** List your copy-trade rules. */
    async copyTradeList() {
        return this.request("GET", "/copytrade/subscriptions");
    }
    /** Create a copy-trade rule. Returns webhook_secret once — save it. */
    async copyTradeCreate(params) {
        return this.request("POST", "/copytrade/subscriptions", params);
    }
    /** Get one copy-trade rule by id. */
    async copyTradeGet(id) {
        return this.request("GET", `/copytrade/subscriptions/${id}`);
    }
    /** Update a copy-trade rule. */
    async copyTradeUpdate(id, params) {
        return this.request("PATCH", `/copytrade/subscriptions/${id}`, params);
    }
    /** Delete a copy-trade rule. */
    async copyTradeDelete(id) {
        return this.request("DELETE", `/copytrade/subscriptions/${id}`);
    }
    /** Recent fired copy-trade signals (up to 7 days). */
    async copyTradeSignals(params) {
        return this.request("GET", "/copytrade/signals", undefined, params);
    }
    /* ── Coordination alerts (PRO/ULTRA) ── */
    /** List your coordination alert rules. */
    async coordinationAlertsList() {
        return this.request("GET", "/kol/coordination/alerts");
    }
    /** Create a coordination alert rule. Returns webhook_secret once — save it. */
    async coordinationAlertsCreate(params) {
        return this.request("POST", "/kol/coordination/alerts", params);
    }
    /** Get one coordination alert rule by id. */
    async coordinationAlertsGet(id) {
        return this.request("GET", `/kol/coordination/alerts/${encodeURIComponent(id)}`);
    }
    /** Update a coordination alert rule. */
    async coordinationAlertsUpdate(id, params) {
        return this.request("PATCH", `/kol/coordination/alerts/${encodeURIComponent(id)}`, params);
    }
    /** Delete a coordination alert rule. */
    async coordinationAlertsDelete(id) {
        return this.request("DELETE", `/kol/coordination/alerts/${encodeURIComponent(id)}`);
    }
    /* ── First-touch signal ── */
    /**
     * Recent first-KOL-touch events on tokens. Each event = the first time a
     * tracked KOL bought that token mint. Filterable by scout tier, KOL winrate,
     * token age, etc. Backed by a 38d backtest where top scouts (S-tier) see ≥3
     * follow-on KOLs within 4h ~50% of the time vs ~14% baseline.
     */
    async firstTouches(params) {
        return this.request("GET", "/kol/first-touches", undefined, params);
    }
    /** List your first-touch webhook subscriptions (Ultra). */
    async firstTouchSubscriptionsList() {
        return this.request("GET", "/kol/first-touches/subscriptions");
    }
    /** Create a first-touch webhook subscription (Ultra). Returns webhook_secret once — save it. */
    async firstTouchSubscriptionsCreate(params) {
        return this.request("POST", "/kol/first-touches/subscriptions", params);
    }
    /** Get one first-touch subscription by id. */
    async firstTouchSubscriptionsGet(id) {
        return this.request("GET", `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`);
    }
    /** Update a first-touch subscription. */
    async firstTouchSubscriptionsUpdate(id, params) {
        return this.request("PATCH", `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`, params);
    }
    /** Delete a first-touch subscription. */
    async firstTouchSubscriptionsDelete(id) {
        return this.request("DELETE", `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`);
    }
    /* ── Wallet Tracker ── */
    /** List tracked wallets with labels and remaining capacity. */
    async walletTrackerList() {
        return this.request("GET", "/wallet-tracker/watchlist");
    }
    /** Add a wallet to the watchlist. */
    async walletTrackerAdd(wallet_address, label) {
        return this.request("POST", "/wallet-tracker/watchlist", { wallet_address, label });
    }
    /** Remove a wallet from the watchlist. */
    async walletTrackerRemove(wallet_address) {
        return this.request("DELETE", `/wallet-tracker/watchlist/${encodeURIComponent(wallet_address)}`);
    }
    /** Update the label for a tracked wallet (pass `null` to clear). */
    async walletTrackerUpdateLabel(wallet_address, label) {
        return this.request("PATCH", `/wallet-tracker/watchlist/${encodeURIComponent(wallet_address)}`, { label });
    }
    /** Historical swap/transfer events across watched wallets. */
    async walletTrackerTrades(params) {
        return this.request("GET", "/wallet-tracker/trades", undefined, params);
    }
    /** Per-wallet stats (counts, SOL bought/sold, last activity). */
    async walletTrackerSummary(params) {
        return this.request("GET", "/wallet-tracker/summary", undefined, params);
    }
    /* ── Price alerts (PRO/ULTRA, v1.9) ── */
    /** List your price alerts. */
    async priceAlertsList() {
        return this.request("GET", "/price-alerts");
    }
    /** Create a price alert. Returns webhook_secret ONCE — store it. */
    async priceAlertsCreate(params) {
        return this.request("POST", "/price-alerts", params);
    }
    /** Get one price alert by id. */
    async priceAlertsGet(id) {
        return this.request("GET", `/price-alerts/${id}`);
    }
    /** Update alert name, delivery mode, webhook URL, or is_active. Thresholds are immutable. */
    async priceAlertsUpdate(id, params) {
        return this.request("PATCH", `/price-alerts/${id}`, params);
    }
    /** Delete a price alert and its event history. */
    async priceAlertsDelete(id) {
        return this.request("DELETE", `/price-alerts/${id}`);
    }
    /** Fired event history (30-day retention). Filter by alert_id, event_type, since. */
    async priceAlertsEvents(params) {
        return this.request("GET", "/price-alerts/events", undefined, params);
    }
    /* ── v1.9 new read endpoints ── */
    /** Scout leaderboard: top KOLs ranked by scout score and swarm attraction rate. ULTRA only. */
    async scoutLeaderboard(params) {
        return this.request("GET", "/kol/scouts/leaderboard", undefined, params);
    }
    /** Coordination history: past coordination alert fires with token, score, KOL count. ULTRA only. */
    async coordinationHistory(params) {
        return this.request("GET", "/kol/coordination/history", undefined, params);
    }
    /** KOL consensus on a token: buyers/sellers, exit rate, net flow, median entry MC. ULTRA gets wallet arrays. */
    async kolConsensus(mint) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/kol-consensus`);
    }
    /** Peak MC history: ATH, decline from peak, MC at bond and at 1h/6h/24h/7d after bond. */
    async peakHistory(mint) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/peak-history`);
    }
    // ── Universal wallet endpoints (PRO+, any wallet — not just curated KOLs) ──
    /** Aggregate stats + cross-product flags (is_kol / is_alpha_tracked / is_deployer) for any Solana wallet. PRO+. */
    async walletStats(address) {
        return this.request("GET", `/wallet/${encodeURIComponent(address)}`);
    }
    /** Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max drawdown, hold times, daily curve, closed + open positions. Cached server-side. PRO+. */
    async walletPnl(address) {
        return this.request("GET", `/wallet/${encodeURIComponent(address)}/pnl`);
    }
    /** Open positions only — lighter slice of `walletPnl`. Shares the same cache. PRO+. */
    async walletPositions(address) {
        return this.request("GET", `/wallet/${encodeURIComponent(address)}/positions`);
    }
    /** Cursor-paginated raw trades for any wallet. Filter by action / token_mint / since-until. PRO+. */
    async walletTrades(address, params) {
        return this.request("GET", `/wallet/${encodeURIComponent(address)}/trades`, undefined, params);
    }
}
function numHeader(res, name) {
    const v = res.headers.get(name);
    if (v == null)
        return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
/** Convenience factory — creates a REST API client for webhooks + streaming. */
export function createRESTClient(apiKey, baseUrl) {
    return new MadeOnSolREST({ apiKey, baseUrl });
}
//# sourceMappingURL=index.js.map