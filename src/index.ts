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
