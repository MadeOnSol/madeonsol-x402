const SOLANA_RULES = [
    { channel: "token:prices", events: ["token:price"], module: "snapshot", delivery: "overlay" },
    { channel: "token:risk", events: ["risk:inputs", "risk:authority_changed", "risk:supply_inflated"], module: "risk", delivery: "invalidate",
        limitation: "Risk channel reports input changes, not continuously recomputed risk scores" },
    { channel: "kol:trades", events: ["kol:trade"], module: "kol", delivery: "invalidate",
        limitation: "Tracked KOL roster only; cannot prove that every wallet was observed" },
    { channel: "token:locks", events: ["token:lock", "token:lock_claimed", "token:lock_cancelled", "token:lock_closed", "token:lock_updated", "token:unlock_upcoming", "token:unlock_available"], module: "locks", delivery: "invalidate",
        limitation: "Streamflow keeper automatic claims are not requested (include_automatic_claims is off), so they do not invalidate this module" },
    { channel: "token:candles", events: ["candle:closed"], module: "flow", delivery: "invalidate",
        limitation: "One-minute candle close is a coarse invalidation, not a complete swap or wallet tape" },
    { channel: "token:candles", events: ["candle:closed"], module: "buyer_quality", delivery: "invalidate",
        limitation: "Buyer quality may change without a candle close; this is best effort" },
    { channel: "token:candles", events: ["candle:closed"], module: "top_traders", delivery: "invalidate",
        limitation: "No per-trader trade push on PRO; this is best effort" },
];
const RHC_RULES = [
    { channel: "rhc:token_prices", events: ["rhc:token_price"], module: "snapshot", delivery: "overlay" },
    { channel: "rhc:token_risk", events: ["rhc:risk_verdict_changed", "rhc:risk_verdict"], module: "risk", delivery: "invalidate",
        limitation: "A risk verdict changes on a recheck; this is not a continuous score feed" },
    { channel: "rhc:kol_trades", events: ["rhc:kol_trade"], module: "kol", delivery: "invalidate",
        limitation: "Tracked RHC KOL roster only, not every wallet" },
    { channel: "rhc:token_locks", events: ["rhc:token_lock", "rhc:token_unlock_upcoming", "rhc:token_unlock_available"], module: "locks", delivery: "invalidate",
        limitation: "RHC lock withdrawals are not comprehensively tracked" },
    { channel: "rhc:token_candles", events: ["rhc:candle_closed", "rhc:candle_revised"], module: "flow", delivery: "invalidate",
        limitation: "One-minute candle events do not establish full trade recall" },
    { channel: "rhc:token_candles", events: ["rhc:candle_closed", "rhc:candle_revised"], module: "buyer_quality", delivery: "invalidate",
        limitation: "Coarse best-effort trigger; individual buyers are not implied" },
    { channel: "rhc:token_candles", events: ["rhc:candle_closed", "rhc:candle_revised"], module: "top_traders", delivery: "invalidate",
        limitation: "Coarse best-effort trigger; individual trader activity is not implied" },
    { channel: "rhc:dex_trades", events: ["rhc:dex_trade"], module: "flow", delivery: "invalidate",
        limitation: "ULTRA+ attributed RHC trade tape; unattributed pairs require a separate channel" },
    { channel: "rhc:dex_trades", events: ["rhc:dex_trade"], module: "buyer_quality", delivery: "invalidate" },
    { channel: "rhc:dex_trades", events: ["rhc:dex_trade"], module: "top_traders", delivery: "invalidate" },
];
export const TERMINAL_MODULE_COSTS = Object.freeze({
    snapshot: 2, risk: 2, buyer_quality: 2, holders: 3, holder_count: 1,
    flow: 3, kol: 1, locks: 1, top_traders: 2,
});
const MODULE_NAMES = new Set(Object.keys(TERMINAL_MODULE_COSTS));
/** Validate the same cost/count contract as the keyed intelligence GET. */
export function planTerminalWatch(input) {
    const { chain, tier } = input;
    if (chain !== "solana" && chain !== "robinhood-chain")
        throw new Error("unsupported_chain");
    if (!input.address || (chain === "robinhood-chain" && !/^0x[0-9a-fA-F]{40}$/.test(input.address))) {
        throw new Error("invalid_address");
    }
    if (!Array.isArray(input.include) || input.include.length === 0)
        throw new Error("include_required");
    if (input.include.some(m => !MODULE_NAMES.has(m)))
        throw new Error("invalid_include");
    if (new Set(input.include).size !== input.include.length)
        throw new Error("duplicate_include");
    const cost = input.include.reduce((n, m) => n + TERMINAL_MODULE_COSTS[m], 0);
    if (input.include.length > 5 || cost > 8)
        throw new Error("include_budget_exceeded");
    const rules = (chain === "solana" ? SOLANA_RULES : RHC_RULES)
        .filter(r => input.include.includes(r.module))
        .filter(r => r.channel !== "rhc:dex_trades" || (tier !== "PRO" && input.includeRhcFirehose === true))
        // Generic kol:trades / rhc:kol_trades ignore filters.mints/addresses at
        // the server. Never multiply whole-roster traffic across token widgets
        // without a conscious subscription/bandwidth decision.
        .filter(r => (r.channel !== "kol:trades" && r.channel !== "rhc:kol_trades") || input.includeKolBroadcast === true);
    const channels = [...new Set(rules.map(r => r.channel))];
    return {
        chain,
        address: chain === "solana" ? input.address : input.address.toLowerCase(),
        include: [...input.include],
        channels,
        // Lock claim/cancel/availability events are opt-in on both chains.
        filters: chain === "solana"
            ? { mints: [input.address], ...(input.include.includes("locks") ? { lifecycle: true } : {}) }
            : { addresses: [input.address.toLowerCase()], ...(input.include.includes("locks") ? { lifecycle: true } : {}) },
        rules,
        modules_without_push: input.include.filter(m => !rules.some(r => r.module === m)),
        cost,
    };
}
/** Never act on an event for another token or on an event with no source token. */
export function eventMatchesToken(frame, plan) {
    if (!frame || typeof frame !== "object")
        return false;
    const msg = frame;
    const data = msg.data;
    if (!data || typeof data !== "object")
        return false;
    const d = data;
    const token = d.token && typeof d.token === "object" ? d.token : {};
    const keys = [d.mint, d.token_mint, d.token_address, d.address, token.mint, token.address];
    const match = plan.chain === "solana" ? plan.address : plan.address.toLowerCase();
    return keys.some(x => typeof x === "string" && (plan.chain === "solana" ? x === match : x.toLowerCase() === match));
}
/** Only use known events on a server-acknowledged, correctly scoped channel. */
export function rulesForEvent(frame, plan) {
    if (!frame || typeof frame !== "object")
        return [];
    const msg = frame;
    if (!eventMatchesToken(frame, plan))
        return [];
    return plan.rules.filter(r => r.channel === msg.channel && r.events.includes(String(msg.event)));
}
//# sourceMappingURL=terminal-policy.js.map