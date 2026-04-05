import type {
  KolFeedParams,
  KolFeedResponse,
  KolCoordinationParams,
  KolCoordinationResponse,
  KolLeaderboardParams,
  KolLeaderboardResponse,
  DeployerAlertsParams,
  DeployerAlertsResponse,
  DiscoveryResponse,
  CreateWebhookParams,
  UpdateWebhookParams,
  Webhook,
  WebhookWithSecret,
  WebhookDelivery,
  WebhookTestResult,
  StreamToken,
} from "./types.js";

export type {
  KolTrade,
  KolFeedParams,
  KolFeedResponse,
  KolCoordinationToken,
  KolCoordinationParams,
  KolCoordinationResponse,
  KolLeaderboardEntry,
  KolLeaderboardParams,
  KolLeaderboardResponse,
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
} from "./types.js";

const DEFAULT_BASE_URL = "https://madeonsol.com";
const RAPIDAPI_HOST = "madeonsol-solana-kol-tracker-tools-api.p.rapidapi.com";

/* ── Auth helpers ── */

type AuthMode = "madeonsol" | "rapidapi" | "x402";

function resolveAuthHeaders(mode: AuthMode, key: string, rapidApiHost?: string): Record<string, string> {
  if (mode === "madeonsol") return { Authorization: `Bearer ${key}` };
  if (mode === "rapidapi") return { "x-rapidapi-key": key, "x-rapidapi-host": rapidApiHost ?? RAPIDAPI_HOST };
  return {};
}

/* ── Main client options ── */

interface MadeOnSolClientOptions {
  /** MadeOnSol API key (get one free at madeonsol.com/developer). Preferred auth method. */
  apiKey?: string;
  /** RapidAPI subscription key. */
  rapidApiKey?: string;
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

    // Resolve auth: apiKey > rapidApiKey > privateKey
    const clientOpts = opts as MadeOnSolClientOptions;
    if (clientOpts.apiKey) {
      this.authMode = "madeonsol";
      this.authHeaders = resolveAuthHeaders("madeonsol", clientOpts.apiKey);
      this.ready = Promise.resolve();
    } else if (clientOpts.rapidApiKey) {
      this.authMode = "rapidapi";
      this.authHeaders = resolveAuthHeaders("rapidapi", clientOpts.rapidApiKey);
      this.ready = Promise.resolve();
    } else {
      this.authMode = "x402";
      const pk = clientOpts.privateKey ?? (opts as MadeOnSolX402Options).privateKey;
      if (!pk) throw new Error("Provide apiKey, rapidApiKey, or privateKey. Get a free API key at madeonsol.com/developer");
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

  /** Real-time KOL trade feed from 946+ tracked wallets. */
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

  /** Real-time alerts from elite Pump.fun deployers. */
  async deployerAlerts(params?: DeployerAlertsParams): Promise<DeployerAlertsResponse> {
    return this.request("/api/x402/deployer-hunter/alerts", params as Record<string, string | number | undefined>);
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
  /** MadeOnSol API key (get one free at madeonsol.com/developer). Preferred. */
  apiKey?: string;
  /** RapidAPI API key. */
  rapidApiKey?: string;
  /** API base URL (default: https://madeonsol.com) */
  baseUrl?: string;
  /** RapidAPI host header override */
  rapidApiHost?: string;
}

/**
 * REST API client for webhook management and WebSocket streaming tokens.
 * Requires a Pro or Ultra subscription.
 */
export class MadeOnSolREST {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(opts: MadeOnSolRESTOptions | { apiKey: string; baseUrl?: string; rapidApiHost?: string }) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    if (opts.apiKey) {
      this.headers = resolveAuthHeaders("madeonsol", opts.apiKey);
    } else if ((opts as MadeOnSolRESTOptions).rapidApiKey) {
      this.headers = resolveAuthHeaders("rapidapi", (opts as MadeOnSolRESTOptions).rapidApiKey!, opts.rapidApiHost);
    } else {
      throw new Error("Provide apiKey or rapidApiKey. Get a free API key at madeonsol.com/developer");
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
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

  /** Generate a 24h WebSocket streaming token. */
  async getStreamToken(): Promise<StreamToken> {
    return this.request("POST", "/stream/token");
  }
}

/** Convenience factory — creates a REST API client for webhooks + streaming. */
export function createRESTClient(apiKeyOrRapidApiKey: string, baseUrl?: string): MadeOnSolREST {
  if (apiKeyOrRapidApiKey.startsWith("msk_")) {
    return new MadeOnSolREST({ apiKey: apiKeyOrRapidApiKey, baseUrl });
  }
  return new MadeOnSolREST({ rapidApiKey: apiKeyOrRapidApiKey, baseUrl });
}
