import { createTerminalTokenView } from "./terminal-watch.js";
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
export function terminalStreamPort(stream) {
    const listenerPort = stream;
    return {
        subscribe({ subId, channels, filters }) {
            stream.subscribe({ subId, channels: channels, filters });
        },
        unsubscribe(subId) { stream.unsubscribe(subId); },
        on(event, listener) { listenerPort.on(event, listener); },
        off(event, listener) { listenerPort.off(event, listener); },
    };
}
/** Creates an active, terminal-scoped view; returns a handle with dispose(). */
export function createSolanaTerminalWatch(client, mint, options) {
    if (!options || !options.stream)
        throw new Error("shared_stream_required");
    if (!options.subId || !/^[A-Za-z0-9_.-]{1,64}$/.test(options.subId) || options.subId === "default") {
        throw new Error("unique_named_sub_id_required");
    }
    // A named subscribe REPLACES that subId's filters on the server. Never allow
    // a different terminal widget to silently commandeer an existing watch.
    if (options.stream.getSubscriptions().some(sub => sub.subId === options.subId)) {
        throw new Error("named_sub_id_already_in_use");
    }
    const watch = createTerminalTokenView({
        chain: "solana",
        address: mint,
        tier: options.tier,
        include: options.include,
        includeKolBroadcast: options.includeKolBroadcast,
        subId: options.subId,
        stream: terminalStreamPort(options.stream),
        read: modules => client.tokenIntelligence(mint, { include: [...modules] }),
        onChange: options.onChange,
        onLive: options.onLive,
        minModuleRefreshMs: options.minModuleRefreshMs,
        debounceMs: options.debounceMs,
    });
    watch.start();
    return watch;
}
//# sourceMappingURL=terminal.js.map