/**
 * Framework-agnostic terminal snapshot/stream bridge (#534).
 *
 * A shared SDK socket supplies push frames. Snapshot reads happen once after
 * the named subscription is ACKED, then only on coalesced, named invalidations.
 * This deliberately NEVER patches REST module data from unrelated clocks.
 *
 * Instantiate once per selected token, reusing one existing stream connection.
 * The controller never closes that shared stream on dispose().
 */
import { type TerminalWatchPlan, type TerminalModule, type TerminalChain, type TerminalTier } from "./terminal-policy.js";
export interface TerminalStreamFrame {
    channel?: string;
    event?: string;
    sub_id?: string;
    id?: string;
    data?: unknown;
    ts?: number;
    replayed?: boolean;
    snapshot?: boolean;
}
/** Adaptable to the existing MadeOnSolStream / RobinhoodChainStream overloads. */
export interface TerminalStreamPort {
    subscribe(opts: {
        subId: string;
        channels: string[];
        filters: Record<string, unknown>;
    }): unknown;
    unsubscribe(subId: string): unknown;
    on(event: string, listener: (...args: unknown[]) => unknown): unknown;
    off(event: string, listener: (...args: unknown[]) => unknown): unknown;
}
export interface TerminalModuleResponse {
    status: "ready" | "partial_history" | "unverified" | "unavailable" | "timeout";
    reason: string | null;
    as_of: string | null;
    data?: Record<string, unknown>;
}
export interface TerminalSnapshotResponse {
    chain: TerminalChain;
    address: string;
    generated_at: string;
    modules: Partial<Record<TerminalModule, TerminalModuleResponse>>;
}
export type TerminalPhase = "idle" | "awaiting_subscribe" | "bootstrapping" | "live" | "degraded" | "stopped";
export interface TerminalView {
    phase: TerminalPhase;
    address: string;
    chain: TerminalChain;
    /** Untouched REST modules; use the latest live frame as a separate overlay. */
    snapshot: TerminalSnapshotResponse | null;
    live: Partial<Record<TerminalModule, TerminalStreamFrame>>;
    /** A known event or gap may have made a cached module stale. */
    stale: TerminalModule[];
    /** A module without an adequate existing WS source is snapshot-only. */
    no_push: TerminalModule[];
    /** A stream interruption or refusal must be visible to the terminal. */
    incomplete: boolean;
    last_error: string | null;
}
export interface TerminalViewOptions {
    chain: TerminalChain;
    address: string;
    tier: TerminalTier;
    include: readonly TerminalModule[];
    /** Full RHC DEX firehose (all tokens) is high-bandwidth; opt in explicitly. */
    includeRhcFirehose?: boolean;
    /** KOL channels are unscoped broadcasts; opt in only with bandwidth budget. */
    includeKolBroadcast?: boolean;
    subId: string;
    stream: TerminalStreamPort;
    /** The existing keyed REST .tokenIntelligence(address, {include}) call. */
    read: (include: readonly TerminalModule[]) => Promise<TerminalSnapshotResponse>;
    onChange?: (view: TerminalView) => void;
    onLive?: (frame: TerminalStreamFrame, module: TerminalModule) => void;
    /** Min seconds per module before another HTTP refresh (default 15s). */
    minModuleRefreshMs?: number;
    /** Debounce and coalesce changed modules (default 750ms). */
    debounceMs?: number;
    now?: () => number;
}
/** Bounded by nine modules and one frame per live overlay; never a trade queue. */
export declare class TerminalTokenView {
    readonly plan: TerminalWatchPlan;
    private readonly opts;
    private readonly listeners;
    private readonly dirty;
    private readonly stale;
    private readonly seen;
    private readonly live;
    private readonly gen;
    private readonly lastRead;
    private readonly now;
    private timer;
    private timerAt;
    private busy;
    /** If the socket ACK arrives while a prior REST read is still unresolved,
     * the latest post-ACK snapshot must run after that read settles. */
    private pendingBootstrap;
    private subscribed;
    private epoch;
    private phase;
    private incomplete;
    /** An observed historical gap survives a new REST snapshot and reconnect. */
    private gapUnresolved;
    private lastError;
    private snapshot;
    constructor(options: TerminalViewOptions);
    getView(): TerminalView;
    /** Registers handlers BEFORE opening the stream; first REST read waits for ACK. */
    start(): void;
    /** Consumer-initiated refresh, useful after a known unrecoverable gap. */
    refresh(): void;
    /**
     * The caller must independently reconcile an unrecoverable event interval
     * BEFORE clearing the visible gap. A fresh snapshot is not that evidence.
     */
    acknowledgeHistoricalRecovery(): void;
    dispose(): void;
    private isStopped;
    private emit;
    private listen;
    private onSubscribed;
    private onWarning;
    private onGap;
    private onFrame;
    private markStale;
    private clearTimer;
    private schedule;
    private flush;
    private fetchModules;
}
/** A named subscription prevents overwriting an integrator's other filters. */
export declare function createTerminalTokenView(options: TerminalViewOptions): TerminalTokenView;
//# sourceMappingURL=terminal-watch.d.ts.map