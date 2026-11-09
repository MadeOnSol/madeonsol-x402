import type { StreamToken } from './types.js';
/**
 * Managed client for the Solana DEX firehose `wss://madeonsol.com/ws/v1/dex-stream`
 * (ULTRA / BUSINESS / ENTERPRISE). 4.7.0+.
 *
 * The socket has no seq cursor: recovery after a reconnect is the server's
 * in-memory ring (`replay: N`, at most 500 trades per subscription), so this
 * client re-subscribes with an ascending replay and drops frames it already
 * delivered. When the ring cannot reach back to the last delivered trade the
 * client reports a `gap` status instead of pretending the tape is complete.
 *
 * Dedupe keys: `dex:trades` = tx_signature + wallet + action + mint (one row
 * per trader per transaction, as served); `dex:route` / `dex:leg` /
 * `dex:liquidity` = their stable `id`.
 */
export interface DexStreamFilters {
    token_mint?: string;
    token_mints?: string[];
    wallet?: string;
    wallets?: string[];
    dex?: string | string[];
    program?: string;
    action?: 'buy' | 'sell';
    deployer_tier?: string | string[];
    token_age_max_seconds?: number;
    market_cap_min_sol?: number;
    market_cap_max_sol?: number;
    /** Default on the server is 0.05 SOL; pass 0 to receive every trade (dust trades carry `dust: true`). */
    min_sol?: number;
    [key: string]: unknown;
}
export interface DexStreamSubscription {
    sub_id: string;
    filters: DexStreamFilters;
    legs?: boolean | 'only';
    liquidity?: boolean | 'only';
}
export interface DexTradeData {
    wallet: string;
    mint: string;
    action: 'buy' | 'sell';
    sol_amount: number;
    token_amount: number;
    tx_signature: string;
    block_time: number;
    slot: number | null;
    program: string | null;
    dex: string | null;
    executed_price_sol: number | null;
    pool_address: string | null;
    dust: boolean;
    [key: string]: unknown;
}
export interface DexStreamFrame {
    channel: 'dex:trades' | 'dex:route' | 'dex:leg' | 'dex:liquidity' | string;
    sub_id: string;
    id?: string;
    data: DexTradeData | Record<string, unknown>;
    replay?: boolean;
    ts?: number;
}
export interface DexStreamOptions {
    /** Existing non-expiring stream token (POST /api/v1/stream/token); fetched on every connect. */
    getToken: () => Promise<Pick<StreamToken, 'token' | 'dex_ws_url'>>;
    subscriptions: DexStreamSubscription[];
    onFrame: (frame: DexStreamFrame) => void;
    /** Lifecycle: connecting, connected, subscribed, replay_done, gap, close, reconnect, fatal, server_error. Never carries credentials. */
    onStatus?: (status: Record<string, unknown>) => void;
    WebSocketImpl?: unknown;
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
    backoffMs?: number;
    maxBackoffMs?: number;
    /** Trades replayed on a RECONNECT (1–500, default 500). */
    replayOnReconnect?: number;
    /** Trades replayed on the FIRST connect (0–500, default 0). */
    initialReplay?: number;
    /** Per-subscription dedupe memory (default 20,000 keys). */
    dedupeSize?: number;
}
/** Dedupe key of one frame; null when the frame carries nothing stable to key on. */
export declare function dexFrameKey(frame: DexStreamFrame): string | null;
export declare class MadeOnSolDexStream {
    private readonly options;
    private readonly subs;
    private readonly limits;
    private socket;
    private timer;
    private generation;
    private stopped;
    private attempts;
    private connects;
    constructor(options: DexStreamOptions);
    private status;
    connect(): void;
    close(): void;
    /** Last delivered trade's block_time per subscription (ingest-clock seconds), for display. */
    getProgress(): Record<string, number | null>;
    private fatal;
    private retry;
    private open;
    private disconnect;
    private subscribeAll;
    private remember;
    private onMessage;
}
//# sourceMappingURL=dex-stream.d.ts.map