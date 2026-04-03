/* ── KOL Feed ── */

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

/* ── KOL Coordination ── */

export interface KolCoordinationToken {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  kol_count: number;
  total_buys: number;
  total_sells: number;
  net_sol_flow: number;
  signal: "accumulating" | "distributing";
  kols: { name: string; wallet: string }[];
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

/* ── KOL Leaderboard ── */

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

/* ── Deployer Alerts ── */

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

/* ── Webhooks (REST API — Pro/Ultra) ── */

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
}

/* ── Discovery ── */

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
