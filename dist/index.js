import { MadeOnSolStream } from "./stream.js";
import { VERSION } from "./version.js";
export { MadeOnSolStream } from "./stream.js";
const DEFAULT_BASE_URL = "https://madeonsol.com";
function resolveAuthHeaders(mode, key) {
    const h = { "User-Agent": `madeonsol-x402/${VERSION}` };
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
    /** Token rug/safety score (0–100) with a per-factor breakdown — the "is this safe to buy?" call. */
    async tokenRisk(mint) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/risk`);
    }
    /** Bundle-cohort holdings for a token — `held_pct_of_supply` (net held / supply) is the headline "are the bundlers still holding?" read. */
    async tokenBundle(mint) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/bundle`);
    }
    /**
     * Trade-flow aggregate for a token — organic-vs-fake volume read: unique
     * wallets/buyers/sellers, buy/sell counts + SOL, net SOL, and a
     * `trades_per_wallet` wash-trading proxy. PRO/ULTRA for keyed callers.
     * **v1.21: now x402-payable** — the old keyed-only guard is gone. **x402: $0.01**
     * @param mint Token mint (base58).
     * @param params `window` ("1h" | "24h", default "1h").
     */
    async tokenFlow(mint, params) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/flow`, params);
    }
    /**
     * v1.21 — OHLCV candles for any tracked token, aggregated from the 1-minute
     * base. All timeframes (1m/5m/15m/1h/4h/1d), up to 30 days of history.
     * **x402: $0.01**
     * @param params `tf`, `limit` (1–1000), `from`/`to` (ISO 8601).
     */
    async tokenCandles(mint, params) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/candles`, params);
    }
    /**
     * v1.21 — Launchpad tokens approaching graduation (pump.fun + LetsBonk
     * LaunchLab) — bonding progress %, velocity (Δprogress/min), ETA to bond,
     * liquidity, authority flags, deployer reputation tier. Ranked by velocity.
     * **x402: $0.01**
     */
    async almostBonded(params) {
        // Coerce booleans to "true"/"false" strings for the shared request helper.
        const query = {};
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v === undefined || v === null)
                    continue;
                query[k] = typeof v === "boolean" ? (v ? "true" : "false") : v;
            }
        }
        return this.request("/api/x402/tokens/almost-bonded", query);
    }
    /**
     * v1.21 — The wallets that made (or lost) the most on a token, ranked by
     * realized PnL or ROI (up to 25). Each trader is enriched with KOL identity
     * and alpha-wallet reputation (win rate, bot confidence) so you can tell
     * smart money from bots. **x402: $0.02**
     * @param params `limit` (1–25), `sort` ("pnl" | "roi"), `window_days` (1–180), `min_bought_sol`.
     */
    async tokenTopTraders(mint, params) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/top-traders`, params);
    }
    /**
     * v1.21 — Early-buyer cap table: the first 10 non-deployer buyers with entry
     * size/time, realized PnL, exit status, bundle/KOL/alpha flags, plus a 0–100
     * buyer-quality score with confidence and signal. **x402: $0.02**
     */
    async tokenCapTable(mint) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/cap-table`);
    }
    /**
     * v1.21 — Recent deshred sniper deploys from elite/good-tier tracked
     * deployers, detected seconds after launch. Each deploy carries deployer
     * stats (bond rate, runner rate) and a slot-window snipe `footprint`
     * (null until the ~10-min settle window has passed). The keyed ULTRA
     * `?watchlist` filter is ignored on the x402 route. **x402: $0.01**
     */
    async sniperRecent(params) {
        return this.request("/api/x402/sniper/recent", params);
    }
    /**
     * v1.21 — Deployer bond-rate trajectory — current + longest streaks, rolling
     * 10-token bond rates, improving/declining trend, deploy cadence, recovery
     * speed, best/worst stretches. **x402: $0.01**
     * @param params `include: "daily_snapshots"` adds 90 days of daily stats.
     */
    async deployerTrajectory(wallet, params) {
        return this.request(`/api/x402/deployer-hunter/${encodeURIComponent(wallet)}/trajectory`, params);
    }
    /** Early-buyer quality score (dump-cluster exposure, recycled wallets, smart money) + live Signal Scorecard efficacy. */
    async tokenBuyerQuality(mint) {
        return this.request(`/api/x402/tokens/${encodeURIComponent(mint)}/buyer-quality`);
    }
    /** Live token snapshot — price, market cap, FDV, liquidity, primary DEX, KOL buyer activity. */
    async token(mint) {
        return this.request(`/api/x402/token/${encodeURIComponent(mint)}`);
    }
    /** Signal Scorecard — out-of-sample, machine-readable reliability for a named signal. `history` adds the per-day drift series. */
    async signalPerformance(name, params) {
        return this.request(`/api/x402/signals/${encodeURIComponent(name)}/performance`, params?.history ? { history: "true" } : undefined);
    }
    /** Free — catalog of available signals (name, methodology, performance endpoint). */
    async signals() {
        return this.request("/api/x402/signals");
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
    /**
     * A deployer's daily reputation time-series — backtest "was this deployer elite
     * when it launched token X?" without look-ahead bias. Each snapshot carries the
     * `tier`, `is_tracked` flag, and that day's cumulative `total_deployed` /
     * `total_bonded`, `bonding_rate`, `recent_bond_rate`, `avg_peak_mc`, and
     * `best_token_peak_mc`. `limit` (1–365, default 90) bounds the number of days.
     * PRO/ULTRA only.
     */
    async deployerHistory(wallet, opts) {
        return this.request("GET", `/deployer-hunter/${encodeURIComponent(wallet)}/history`, undefined, opts?.limit !== undefined ? { limit: opts.limit } : undefined);
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
     * List your live WebSocket sessions across both stream services (ws-streaming
     * + dex-stream). Reflects in-memory connection state, so every listed slot is
     * evictable via {@link streamSessionKill}. Useful when a deploy overlap leaves
     * a ghost socket holding your slot and reconnects hit the 4002 connection
     * limit. PRO/ULTRA only.
     */
    async streamSessions() {
        return this.request("GET", "/stream/sessions");
    }
    /**
     * Terminate one of your own live WebSocket sessions by id and free its
     * connection slot immediately — the self-serve fix for a 4002 lockout after a
     * deploy overlap. `id` is the session id from {@link streamSessions}. Throws
     * on a non-positive-integer id (400) or when no live session with that id
     * belongs to your key (404). PRO/ULTRA only.
     */
    async streamSessionKill(id) {
        return this.request("DELETE", `/stream/sessions/${encodeURIComponent(String(id))}`);
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
    /**
     * v1.17 — Pre-bond pump.fun tokens approaching graduation, ranked by velocity
     * (Δprogress/min) — "95% and accelerating" beats "92% stalled". Each token is
     * enriched with its deployer's reputation tier. `progress_pct` comes from
     * on-chain real_token_reserves depletion; `velocity_pct_per_min` is null until
     * a 5m snapshot exists; `eta_minutes` is a linear projection. PRO/ULTRA only.
     */
    async almostBonded(params) {
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
        return this.request("GET", "/tokens/almost-bonded", undefined, query);
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
    /**
     * Transparent 0–100 token rug-risk/safety score (higher = riskier). Returns a
     * `band` (safe/caution/danger), an explainable `factors` array, and the raw
     * `inputs` (authorities, liquidity, transfer fee, launch cohort, deployer bond
     * rate, KOL signal, blacklist). PRO/ULTRA only — BASIC receives HTTP 403.
     */
    async tokenRisk(mint) {
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
    async tokenBundle(mint) {
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
    async tokenPools(mint) {
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
    async tokensBatchRisk(mints) {
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
    async tokenCandles(mint, params) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/candles`, undefined, params);
    }
    /**
     * Live token snapshot — price (USD/SOL), VWAP, market cap, FDV, liquidity,
     * liquidity-to-MC ratio, primary DEX + pool, Token-2022 / transfer-fee flags,
     * and a `top_buyers` array ({ name, sol_amount }). Returns `{ token: {...} }`.
     */
    async token(mint) {
        return this.request("GET", `/token/${encodeURIComponent(mint)}`);
    }
    /**
     * Signal Scorecard — out-of-sample reliability for a named signal. Returns
     * `buckets` (each with hit_rate, base_rate, lift, sample_n, window_days,
     * test_from/test_to) plus the signal, metric_type, outcome, methodology, and
     * as_of. Pass `{ history: true }` to also get a per-day `series`. Valid names:
     * dump_cluster_count, runner_rate, recycled_early_buyer_count, coordination_count.
     */
    async signalPerformance(name, params) {
        return this.request("GET", `/signals/${encodeURIComponent(name)}/performance`, undefined, params?.history ? { history: "true" } : undefined);
    }
    /** Free signals catalog — name, description, the available signals with methodology + performance_endpoint, and docs. No payment required. */
    async signals() {
        return this.request("GET", "/signals");
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
    /**
     * Verified CURRENT on-chain holdings — reads the wallet's actual SPL + Token-2022
     * token accounts and SOL balance from chain, enriches with price/MC/name/symbol,
     * and computes `transfer_delta` (on-chain amount − trade-derived net position),
     * exposing tokens that arrived/left without a swap (airdrops, insider funding,
     * wallet-hopping). Distinct from `walletPositions` (trade-derived FIFO). ULTRA only.
     */
    async walletHoldings(address, params) {
        return this.request("GET", `/wallet/${encodeURIComponent(address)}/holdings`, undefined, params);
    }
    /** Cursor-paginated raw trades for any wallet. Filter by action / token_mint / since-until. PRO+. */
    async walletTrades(address, params) {
        return this.request("GET", `/wallet/${encodeURIComponent(address)}/trades`, undefined, params);
    }
    /**
     * v1.21 — Bulk wallet reputation flags for 1–100 addresses in one request
     * (`POST /wallet/batch/classify`). Each entry matches the `flags` block of
     * `walletStats` exactly: `is_sniper`, `is_bundler` (lifetime), `is_dumper`
     * (rolling 42d), `is_kol` + `kol_name`, `bot_confidence`
     * ("none"/"low"/"medium"/"high" | null), and `dump_cluster` cohort stats.
     * Flags are pump.fun-pipeline scoped — `false` means "not observed", NOT
     * verified clean. PRO/ULTRA only — BASIC receives HTTP 403.
     * @param wallets 1–100 base58 wallet addresses.
     */
    async walletClassify(wallets) {
        return this.request("POST", "/wallet/batch/classify", { wallets });
    }
    /**
     * v1.21 — Mint-scoped trade tape: every captured trade for a token, cursor-
     * paginated newest first (`GET /tokens/{mint}/trades`). Filter by `action`,
     * `wallet`, and a `since`/`until` unix-seconds window; unlike `walletTrades`
     * (90-day default), the default window here is the FULL history. Each trade
     * carries `price_sol`/`price_usd`, `early_buyer_rank`, and `slot`. The
     * `coverage` block is the honesty marker: history starts 2026-04-12
     * (`history_start`) and capture is pump.fun-pipeline scoped (`scope`).
     * PRO/ULTRA only — BASIC receives HTTP 403.
     */
    async tokenTrades(mint, params) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/trades`, undefined, params);
    }
    /**
     * v1.21 — The wallets that made (or lost) the most on a token, ranked by
     * realized PnL or ROI. Each trader is enriched with KOL identity and
     * alpha-wallet reputation (`bot_confidence`, historical win rate/PnL) so you
     * can tell smart money from bots. `limit` PRO≤25 / ULTRA≤100; `sort`
     * "pnl" (default) | "roi"; `window_days` 1–180 (default 90);
     * `min_bought_sol` default 0.1. PRO/ULTRA only.
     */
    async tokenTopTraders(mint, params) {
        return this.request("GET", `/tokens/${encodeURIComponent(mint)}/top-traders`, undefined, params);
    }
    /**
     * v1.21 — Deshred sniper deploy feed: new pump.fun deploys reconstructed from
     * shred-level data ~500ms before on-chain confirmation. PRO sees elite/good
     * deployers; ULTRA sees every tier. Each deploy carries deployer stats and a
     * slot-window snipe `footprint` (null until the ~10-min settle window has
     * passed — absent, not zero). PRO/ULTRA only.
     */
    async sniperRecent(params) {
        return this.request("GET", "/sniper/recent", undefined, params);
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