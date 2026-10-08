import type { EarlySubscribeControl, EarlyStreamFilters, EarlyEventFormat, EarlyWalletListControl, EarlyWalletListResult, StreamToken } from './types.js';
export { expandEarlyFrame } from './early-codec.js';
export type { EarlyChannel, EarlyAmountField, EarlyAmountFilter, EarlyStreamFilters, EarlyEventFormat, EarlySubscribeControl, EarlyUpdateControl } from './types.js';
export interface EarlyCursor {
    instance: string;
    seq: number;
}
export interface EarlyFrame {
    event?: string;
    type?: string;
    sub_id?: string;
    id?: string;
    cursor?: EarlyCursor;
    data?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface EarlyStreamOptions {
    /** Existing non-expiring token, fetched on every connect; never rotate here. */
    getToken: () => Promise<Pick<StreamToken, 'token' | 'early_ws_url'>>;
    subscriptions: EarlySubscribeControl[];
    /** Awaited in arrival order. A rejection stops delivery without committing. */
    onFrame: (frame: EarlyFrame) => void | Promise<void>;
    /** Diagnostic callback. Never receives credentials or raw transport errors. */
    onStatus?: (status: Record<string, unknown>) => void;
    /** Native browser/Node WebSocket by default; pass ws explicitly if desired. */
    WebSocketImpl?: unknown;
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
    maxAuthRetries?: number;
    backoffMs?: number;
    maxBackoffMs?: number;
    controlTimeoutMs?: number;
    maxPendingFrames?: number;
    maxPendingBytes?: number;
    dedupeSize?: number;
}
/** Managed ShredPrism early-stream client (4.1.0+). Bounded process-local
 * recovery, per-subscription checkpoints, explicit gaps; never durable history. */
export declare class MadeOnSolEarlyStream {
    private readonly options;
    private readonly states;
    private readonly limits;
    private socket;
    private pending;
    private readonly replayTimers;
    private timer;
    private watchdog;
    private generation;
    private stopped;
    private ready;
    private attempts;
    private authFailures;
    private queue;
    private queuedFrames;
    private queuedBytes;
    constructor(options: EarlyStreamOptions);
    private status;
    getSubscriptions(): EarlySubscribeControl[];
    getCursors(): Record<string, EarlyCursor | null>;
    /** Explicitly skip the reported missing range; never called automatically. */
    acceptGap(id?: string): void;
    connect(): void;
    close(): void;
    private fatal;
    private rejectPending;
    private retry;
    private open;
    private disconnect;
    private enqueue;
    private receive;
    private command;
    private restore;
    /** Await the previous control before issuing another. A rejected update keeps
     * the accepted configuration, including across reconnect. */
    updateSubscription(id: string, change: {
        filters?: EarlyStreamFilters;
        format?: EarlyEventFormat;
        wallet_list?: string | null;
    }): Promise<void>;
    /** Configure with subscriptions: [] to manage lists before adding a stream. */
    manageWalletList(control: EarlyWalletListControl): Promise<EarlyWalletListResult>;
    subscribe(raw: EarlySubscribeControl): Promise<void>;
    unsubscribe(id?: string): Promise<void>;
}
//# sourceMappingURL=early-stream.d.ts.map