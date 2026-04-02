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
export interface KolFeedParams {
    limit?: number;
    action?: "buy" | "sell";
    kol?: string;
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
    kols: {
        name: string;
        wallet: string;
    }[];
}
export interface KolCoordinationResponse {
    coordination: KolCoordinationToken[];
    period: string;
    min_kols: number;
}
export interface KolCoordinationParams {
    period?: "1h" | "6h" | "24h" | "7d";
    min_kols?: number;
    limit?: number;
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
}
export interface KolLeaderboardResponse {
    leaderboard: KolLeaderboardEntry[];
    period: string;
}
export interface KolLeaderboardParams {
    period?: "today" | "7d" | "30d";
    limit?: number;
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
}
export interface DeployerAlertsParams {
    since?: string;
    limit?: number;
    offset?: number;
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
//# sourceMappingURL=types.d.ts.map