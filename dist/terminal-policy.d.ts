/**
 * Terminal snapshot -> stream invalidation policy (#534).
 *
 * This is deliberately NOT a new all-purpose WebSocket or a promise that
 * intelligence modules change with every underlying trade. It describes which
 * existing channels give a safe live overlay, which may invalidate a cached
 * REST module, and which cannot be observed reliably as they change.
 * A price tick is not a holder census or a complete source of risk changes.
 */
export type TerminalChain = "solana" | "robinhood-chain";
export type TerminalModule = "snapshot" | "risk" | "buyer_quality" | "holders" | "holder_count" | "flow" | "kol" | "locks" | "top_traders";
export type TerminalTier = "PRO" | "ULTRA" | "BUSINESS" | "ENTERPRISE";
export type TerminalDelivery = "overlay" | "invalidate";
export type TerminalChannel = "token:prices" | "token:candles" | "token:risk" | "kol:trades" | "token:locks" | "rhc:token_prices" | "rhc:token_candles" | "rhc:token_risk" | "rhc:kol_trades" | "rhc:token_locks" | "rhc:dex_trades";
export interface TerminalEventRule {
    channel: TerminalChannel;
    /** Only an event with one of these names is usable for this module. */
    events: readonly string[];
    module: TerminalModule;
    /** overlay = render the event separately, never overwrite REST provenance. */
    delivery: TerminalDelivery;
    /** A venue or tier limitation which must be shown to integrators. */
    limitation?: string;
}
export declare const TERMINAL_MODULE_COSTS: Readonly<Record<TerminalModule, number>>;
export interface TerminalWatchPlan {
    chain: TerminalChain;
    address: string;
    include: TerminalModule[];
    channels: TerminalChannel[];
    filters: {
        mints?: string[];
        addresses?: string[];
        lifecycle?: boolean;
    };
    rules: TerminalEventRule[];
    /** Explicit gaps are not silently converted into complete realtime coverage. */
    modules_without_push: TerminalModule[];
    cost: number;
}
/** Validate the same cost/count contract as the keyed intelligence GET. */
export declare function planTerminalWatch(input: {
    chain: TerminalChain;
    address: string;
    include: readonly TerminalModule[];
    tier: TerminalTier;
    /** RHC DEX firehose is NOT address-scoped at server delivery; explicit opt-in. */
    includeRhcFirehose?: boolean;
    /** Main-stream KOL channels are global broadcasts, NOT mint/address scoped. */
    includeKolBroadcast?: boolean;
}): TerminalWatchPlan;
/** Never act on an event for another token or on an event with no source token. */
export declare function eventMatchesToken(frame: unknown, plan: TerminalWatchPlan): boolean;
/** Only use known events on a server-acknowledged, correctly scoped channel. */
export declare function rulesForEvent(frame: unknown, plan: TerminalWatchPlan): TerminalEventRule[];
//# sourceMappingURL=terminal-policy.d.ts.map