import type { KolFeedParams, KolFeedResponse, KolCoordinationParams, KolCoordinationResponse, KolLeaderboardParams, KolLeaderboardResponse, DeployerAlertsParams, DeployerAlertsResponse, DiscoveryResponse } from "./types.js";
export type { KolTrade, KolFeedParams, KolFeedResponse, KolCoordinationToken, KolCoordinationParams, KolCoordinationResponse, KolLeaderboardEntry, KolLeaderboardParams, KolLeaderboardResponse, DeployerAlert, DeployerAlertsParams, DeployerAlertsResponse, DiscoveryEndpoint, DiscoveryResponse, } from "./types.js";
interface MadeOnSolX402Options {
    /** Base58-encoded Solana private key */
    privateKey: string;
    /** API base URL (default: https://madeonsol.com) */
    baseUrl?: string;
}
export declare class MadeOnSolX402 {
    private paidFetch;
    private baseUrl;
    private ready;
    constructor(opts: MadeOnSolX402Options);
    private init;
    private request;
    /** Real-time KOL trade feed from 946+ tracked wallets. ($0.005/req) */
    kolFeed(params?: KolFeedParams): Promise<KolFeedResponse>;
    /** KOL convergence signals — tokens being accumulated by multiple KOLs. ($0.02/req) */
    kolCoordination(params?: KolCoordinationParams): Promise<KolCoordinationResponse>;
    /** KOL performance rankings by PnL and win rate. ($0.005/req) */
    kolLeaderboard(params?: KolLeaderboardParams): Promise<KolLeaderboardResponse>;
    /** Real-time alerts from elite Pump.fun deployers. ($0.01/req) */
    deployerAlerts(params?: DeployerAlertsParams): Promise<DeployerAlertsResponse>;
    /** Free discovery endpoint — lists all available endpoints and prices. */
    discovery(): Promise<DiscoveryResponse>;
}
/** Convenience factory — creates a ready-to-use client. */
export declare function createClient(privateKey: string, baseUrl?: string): MadeOnSolX402;
//# sourceMappingURL=index.d.ts.map