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

interface MadeOnSolX402Options {
  /** Base58-encoded Solana private key */
  privateKey: string;
  /** API base URL (default: https://madeonsol.com) */
  baseUrl?: string;
}

export class MadeOnSolX402 {
  private paidFetch!: typeof fetch;
  private baseUrl: string;
  private ready: Promise<void>;

  constructor(opts: MadeOnSolX402Options) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.ready = this.init(opts.privateKey);
  }

  private async init(privateKey: string): Promise<void> {
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
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.paidFetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`MadeOnSol API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  /** Real-time KOL trade feed from 946+ tracked wallets. ($0.005/req) */
  async kolFeed(params?: KolFeedParams): Promise<KolFeedResponse> {
    return this.request("/api/x402/kol/feed", params as Record<string, string | number | undefined>);
  }

  /** KOL convergence signals — tokens being accumulated by multiple KOLs. ($0.02/req) */
  async kolCoordination(params?: KolCoordinationParams): Promise<KolCoordinationResponse> {
    return this.request("/api/x402/kol/coordination", params as Record<string, string | number | undefined>);
  }

  /** KOL performance rankings by PnL and win rate. ($0.005/req) */
  async kolLeaderboard(params?: KolLeaderboardParams): Promise<KolLeaderboardResponse> {
    return this.request("/api/x402/kol/leaderboard", params as Record<string, string | number | undefined>);
  }

  /** Real-time alerts from elite Pump.fun deployers. ($0.01/req) */
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

/** Convenience factory — creates a ready-to-use client. */
export function createClient(privateKey: string, baseUrl?: string): MadeOnSolX402 {
  return new MadeOnSolX402({ privateKey, baseUrl });
}

/* ── REST API client (RapidAPI-authenticated, for webhooks + streaming) ── */

interface MadeOnSolRESTOptions {
  /** RapidAPI API key (passed as x-rapidapi-key header) */
  apiKey: string;
  /** API base URL (default: https://madeonsol.com) */
  baseUrl?: string;
  /** RapidAPI host header (default: auto-detected) */
  rapidApiHost?: string;
}

/**
 * REST API client for webhook management and WebSocket streaming tokens.
 * Requires a RapidAPI Pro or Ultra subscription.
 */
export class MadeOnSolREST {
  private apiKey: string;
  private baseUrl: string;
  private host: string;

  constructor(opts: MadeOnSolRESTOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.host = opts.rapidApiHost ?? "madeonsol-solana-kol-tracker-tools-api.p.rapidapi.com";
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": this.apiKey,
        "x-rapidapi-host": this.host,
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
export function createRESTClient(apiKey: string, baseUrl?: string): MadeOnSolREST {
  return new MadeOnSolREST({ apiKey, baseUrl });
}
