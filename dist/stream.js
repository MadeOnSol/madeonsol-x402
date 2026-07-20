async function resolveWebSocket(override) {
    if (override)
        return override;
    // Prefer the `ws` package in Node: it exposes terminate() for an immediate
    // socket teardown, so close() lets short-lived processes exit. The global
    // (undici) WebSocket on Node 22+ keeps its TLS socket open after close() —
    // it has no terminate() and no reachable socket handle — which hangs the
    // event loop. In the browser this import rejects and we fall back to the
    // platform's native WebSocket. Cast the specifier to string so TS doesn't
    // require the module to be installed at build time.
    try {
        const mod = (await import("ws"));
        const impl = mod.default ?? mod.WebSocket;
        if (impl)
            return impl;
    }
    catch {
        /* not Node, or `ws` not installed — fall back to the platform WebSocket */
    }
    const g = globalThis.WebSocket;
    if (g)
        return g;
    throw new Error("No WebSocket implementation available. On Node < 22, install `ws` (npm i ws) or pass { WebSocketImpl }.");
}
const OPEN = 1;
export class MadeOnSolStream {
    opts;
    ws = null;
    listeners = new Map();
    desired = { channels: new Set(), filters: {} };
    closedByUser = false;
    attempt = 0;
    hbTimer = null;
    reconnectTimer = null;
    connecting = false;
    constructor(opts) {
        this.opts = {
            getToken: opts.getToken,
            autoReconnect: opts.autoReconnect ?? true,
            maxBackoffMs: opts.maxBackoffMs ?? 30_000,
            heartbeatTimeoutMs: opts.heartbeatTimeoutMs ?? 90_000,
            WebSocketImpl: opts.WebSocketImpl,
        };
    }
    /** Register a handler. Use an event name, `"*"` for every event, or a lifecycle event. */
    on(event, fn) {
        if (!this.listeners.has(event))
            this.listeners.set(event, new Set());
        this.listeners.get(event).add(fn);
        return this;
    }
    /** Remove a handler (or all handlers for an event when `fn` is omitted). */
    off(event, fn) {
        if (!fn)
            this.listeners.delete(event);
        else
            this.listeners.get(event)?.delete(fn);
        return this;
    }
    emit(event, data, evt) {
        const set = this.listeners.get(event);
        if (set)
            for (const fn of set) {
                try {
                    fn(data, evt);
                }
                catch { /* user handler */ }
            }
    }
    /** Subscribe to one or more channels (connects on first call). Optional server-side filters. */
    subscribe(channels, filters) {
        for (const c of channels)
            this.desired.channels.add(c);
        if (filters)
            this.desired.filters = { ...this.desired.filters, ...filters };
        if (this.ws && this.ws.readyState === OPEN)
            this.sendSubscribe();
        else
            void this.connect();
        return this;
    }
    /** Stop receiving the given channels. */
    unsubscribe(channels) {
        for (const c of channels)
            this.desired.channels.delete(c);
        if (this.ws && this.ws.readyState === OPEN) {
            this.ws.send(JSON.stringify({ type: "unsubscribe", channels }));
        }
        return this;
    }
    /** Open the connection (also called implicitly by subscribe). */
    async connect() {
        if (this.connecting || (this.ws && this.ws.readyState === OPEN))
            return;
        this.closedByUser = false;
        this.connecting = true;
        try {
            const [WS, token] = await Promise.all([
                resolveWebSocket(this.opts.WebSocketImpl),
                this.opts.getToken(),
            ]);
            const url = `${token.ws_url}?token=${encodeURIComponent(token.token)}`;
            const ws = new WS(url);
            this.ws = ws;
            ws.onopen = () => {
                this.attempt = 0;
                this.resetHeartbeat();
                if (this.desired.channels.size > 0)
                    this.sendSubscribe();
                this.emit("open", undefined);
            };
            ws.onmessage = (ev) => this.handleMessage(ev.data);
            ws.onerror = (err) => this.emit("error", err instanceof Error ? err : new Error("WebSocket error"));
            ws.onclose = (ev) => {
                this.clearHeartbeat();
                this.ws = null;
                this.emit("close", { code: ev?.code, reason: ev?.reason });
                if (!this.closedByUser && this.opts.autoReconnect)
                    this.scheduleReconnect();
            };
        }
        catch (err) {
            this.emit("error", err);
            if (!this.closedByUser && this.opts.autoReconnect)
                this.scheduleReconnect();
        }
        finally {
            this.connecting = false;
        }
    }
    /** Close the connection and stop reconnecting. */
    close() {
        this.closedByUser = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.clearHeartbeat();
        const sock = this.ws;
        this.ws = null;
        try {
            // `ws` package: terminate() destroys the underlying socket immediately so
            // the process can exit. Native/undici WebSocket has no terminate() — fall
            // back to a graceful close().
            if (typeof sock?.terminate === "function")
                sock.terminate();
            else
                sock?.close(1000, "client closed");
        }
        catch { /* ignore */ }
    }
    sendSubscribe() {
        const channels = Array.from(this.desired.channels);
        if (channels.length === 0)
            return;
        const msg = { type: "subscribe", channels };
        if (Object.keys(this.desired.filters).length > 0)
            msg.filters = this.desired.filters;
        this.ws?.send(JSON.stringify(msg));
    }
    handleMessage(raw) {
        let msg;
        try {
            const text = typeof raw === "string" ? raw : String(raw);
            msg = JSON.parse(text);
        }
        catch {
            this.emit("error", new Error("Failed to parse stream message"));
            return;
        }
        if (msg.type === "heartbeat") {
            this.resetHeartbeat();
            this.emit("heartbeat", msg.ts);
            return;
        }
        if (msg.type === "connected") {
            return;
        } // 'open' already emitted on socket open
        if (msg.type === "subscribed") {
            this.emit("subscribed", msg.channels);
            return;
        }
        if (msg.channel && msg.event) {
            const evt = msg;
            this.emit(evt.event, evt.data, evt);
            this.emit("*", evt.data, evt);
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        const base = Math.min(1000 * 2 ** this.attempt, this.opts.maxBackoffMs);
        const delay = base / 2 + Math.floor((base / 2) * Math.random()); // jitter
        this.attempt++;
        this.emit("reconnect", { attempt: this.attempt, delayMs: delay });
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
        }, delay);
    }
    resetHeartbeat() {
        this.clearHeartbeat();
        this.hbTimer = setTimeout(() => {
            // Server went quiet — force a reconnect.
            try {
                this.ws?.close(4000, "heartbeat timeout");
            }
            catch { /* ignore */ }
        }, this.opts.heartbeatTimeoutMs);
    }
    clearHeartbeat() {
        if (this.hbTimer) {
            clearTimeout(this.hbTimer);
            this.hbTimer = null;
        }
    }
}
//# sourceMappingURL=stream.js.map