/**
 * Solana terminal integration over existing REST + managed WebSocket (#534).
 *
 * A shared SDK socket is REQUIRED. We do not open a socket per token widget,
 * and no REST module is refetched on every price tick. Each terminal must use
 * its own explicit named subscription, and each disconnect/replay gap is visible.
 *
 * This adapter does NOT make the selected token's historical capture complete.
 */
import type { MadeOnSolREST } from "./index.js";
import type { MadeOnSolStream } from "./stream.js";
import type { TokenIntelligenceModuleId } from "./types.js";
import { type TerminalStreamPort, type TerminalTokenView, type TerminalView, type TerminalStreamFrame } from "./terminal-watch.js";
import type { TerminalTier, TerminalModule } from "./terminal-policy.js";
export interface SolanaTerminalWatchOptions {
    /** Caller-selected modules, obeying existing API budget (at most 5, cost <=8). */
    include: readonly TokenIntelligenceModuleId[];
    /** Account's current tier. Server still enforces its authoritative entitlement. */
    tier: TerminalTier;
    /** Reuse ONE existing client.stream() across terminal widgets. */
    stream: MadeOnSolStream;
    /** Unique per shared connection, 1..64 chars, A-Z a-z 0-9 _ . - */
    subId: string;
    /** Subscribe to global, unscoped KOL broadcasts (may be high bandwidth). */
    includeKolBroadcast?: boolean;
    /** Min interval between REST refreshes for any invalidated module. Default 15s. */
    minModuleRefreshMs?: number;
    debounceMs?: number;
    /** Snapshot, stale module names, live overlays and historical gap status. */
    onChange?: (view: TerminalView) => void;
    onLive?: (frame: TerminalStreamFrame, module: TerminalModule) => void;
}
/**
 * The existing stream's public `on` overloads use specific event signatures.
 * Narrowly adapt those overloads to the small event-port used by the shared
 * controller, without changing stream/client behavior.
 *
 * Exported for BROWSER terminals that must not hold an API key: pair it with
 * `createTerminalTokenView({ stream: terminalStreamPort(stream), read })`, where
 * `stream` gets its short-lived token from your backend (`getToken`) and `read`
 * calls your backend, which calls the keyed intelligence endpoint.
 */
export declare function terminalStreamPort(stream: MadeOnSolStream): TerminalStreamPort;
/** Creates an active, terminal-scoped view; returns a handle with dispose(). */
export declare function createSolanaTerminalWatch(client: MadeOnSolREST, mint: string, options: SolanaTerminalWatchOptions): TerminalTokenView;
//# sourceMappingURL=terminal.d.ts.map