/** Every Solana channel, in the server's order. */
export const STREAM_CHANNELS = [
    "kol:trades",
    "kol:coordination",
    "kol:first_touches",
    "deployer:alerts",
    "wallet_tracker:events",
    "copytrade:signals",
    "price_alert:events",
    "sniper:deploys",
    "token:graduations",
    "token:prices",
    "token:locks",
    "token:fee_claims",
    "token:surges",
    "token:candles",
    "token:risk",
    "wallet:scores",
];
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
const HELD_LIVE_CAP = 10_000;
const DEFAULT_SUB_ID = "default";
const SUB_ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const subIdOf = (f) => (typeof f.sub_id === "string" && f.sub_id ? f.sub_id : DEFAULT_SUB_ID);
function isThenable(v) {
    return !!v && (typeof v === "object" || typeof v === "function") && typeof v.then === "function";
}
/**
 * Fallback classification for servers that send no `retryable` flag: reasons
 * asking again can never fill.
 */
const PERMANENT_GAPS = new Set(["not_reconstructable", "state_stream", "window_exceeded", "ring_truncated", "instance_changed"]);
/** The server's transient list — a channel with one of these is worth asking again. */
const TRANSIENT_GAPS = new Set(["backpressure", "closed", "source_busy", "source_error", "late_ingest_possible", "row_cap"]);
function isPermanentGap(reason) {
    return PERMANENT_GAPS.has(reason);
}
/** Move a cursor to `pos`: never back within one instance; seq:null frames only advance time. */
function stepCursor(c, pos) {
    if (pos.seq !== null && pos.instance) {
        if (c && c.instance === pos.instance)
            return { instance: c.instance, seq: Math.max(c.seq, pos.seq), ts: Math.max(c.ts, pos.ts) };
        return { instance: pos.instance, seq: pos.seq, ts: pos.ts };
    }
    // Unsequenced frame (durable backfill, seq:null): keep the last real seq, advance time.
    return c ? { ...c, ts: Math.max(c.ts, pos.ts) } : null;
}
function validCursor(c) {
    if (!c || typeof c !== "object")
        return null;
    const { instance, seq, ts } = c;
    if (typeof instance !== "string" || !instance)
        return null;
    if (typeof seq !== "number" || !Number.isFinite(seq) || seq < 0)
        return null;
    if (typeof ts !== "number" || !Number.isFinite(ts) || ts < 0)
        return null;
    return { instance, seq, ts };
}
export class MadeOnSolStream {
    opts;
    ws = null;
    listeners = new Map();
    desired = { channels: new Set(), filters: {} };
    /** Named subscriptions (Phase 2), in creation order; the default one is `desired`. */
    named = new Map();
    /** sub_ids of the subscribes sent on this connection whose `subscribed` ack is still due (acks arrive in order). */
    ackExpect = [];
    namedUnsupportedWarned = false;
    listWaiters = [];
    closedByUser = false;
    stopped = false;
    attempt = 0;
    authFailures = 0;
    hbTimer = null;
    reconnectTimer = null;
    connecting = false;
    /** Server process id of the CURRENT connection (from connected/subscribed). */
    serverInstance = null;
    /** Whether this connection already sent its first subscribe (the only one that resumes). */
    firstSubscribeSent = false;
    /** COMMITTED (safe) cursor — the one to persist and resume from. */
    cursor;
    /** Received progress — every handled frame, including replayed ones. */
    progress;
    /** true after an incomplete recovery: live frames are not committed until one completes. */
    unsafe = false;
    seen = new Map();
    inflight = [];
    recovery = null;
    /** Automatic re-resume after a retryable gap. */
    retryTimer = null;
    resumeRetries = 0;
    /** The last gap reported (for acceptGap()'s report). */
    lastGap = null;
    constructor(opts) {
        this.opts = {
            getToken: opts.getToken,
            autoReconnect: opts.autoReconnect ?? true,
            maxBackoffMs: opts.maxBackoffMs ?? 30_000,
            heartbeatTimeoutMs: opts.heartbeatTimeoutMs ?? 90_000,
            WebSocketImpl: opts.WebSocketImpl,
            dedupeSize: Math.max(0, opts.dedupeSize ?? 10_000),
            maxAuthRetries: Math.max(0, opts.maxAuthRetries ?? 3),
            connectionLimitBackoffMs: Math.max(0, opts.connectionLimitBackoffMs ?? 60_000),
            resumeDetectMs: Math.max(0, opts.resumeDetectMs ?? 3_000),
            legacyReplayTimeoutMs: Math.max(0, opts.legacyReplayTimeoutMs ?? 15_000),
            maxResumeRetries: Math.max(0, opts.maxResumeRetries ?? 5),
            resumeRetryDelayMs: Math.max(0, opts.resumeRetryDelayMs ?? 30_000),
            onUnrecoverableGap: opts.onUnrecoverableGap === "stop" ? "stop" : "advance",
        };
        this.cursor = validCursor(opts.resume);
        this.progress = this.cursor ? { ...this.cursor } : null;
    }
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
    /** The COMMITTED resume cursor (last safe point) — persist this one. Null before the first. */
    getCursor() {
        return this.cursor ? { ...this.cursor } : null;
    }
    /** Received progress: the last handled frame, replayed ones included (NOT safe to resume from). */
    getProgress() {
        return this.progress ? { ...this.progress } : null;
    }
    /** true while an incomplete recovery holds the committed cursor back. */
    isRecoveryIncomplete() {
        return this.unsafe;
    }
    /**
     * Accept the last reported gap: commit the received progress as the cursor
     * and let live frames commit again. Call it after you backfilled the range
     * the `"gap"` event named (or decided you do not need it). It re-reports the
     * gap first, with `source: "manual"` and the range being skipped.
     */
    acceptGap() {
        this.unsafe = false;
        const p = this.progress;
        const c = this.cursor;
        const moves = !!p && !(c && c.instance === p.instance && c.seq === p.seq && c.ts === p.ts);
        if (this.lastGap) {
            const g = {
                ...this.lastGap,
                advancedPastGap: moves,
                source: "manual",
                skipped: { channels: this.lastGap.skipped.channels, from: c ? { ...c } : null, to: moves ? { ...p } : null },
            };
            this.lastGap = null;
            this.emit("gap", g);
        }
        if (!moves)
            return;
        this.cursor = { ...p };
        this.emit("cursor", { ...p });
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
    /** Call every handler for a data frame; collect what they returned (for completion tracking). */
    callHandlers(event, data, evt, out) {
        const set = this.listeners.get(event);
        if (!set)
            return;
        for (const fn of set) {
            try {
                out.push(fn(data, evt));
            }
            catch (err) {
                this.emit("error", err);
            }
        }
    }
    subscribe(arg, filters) {
        if (Array.isArray(arg)) {
            for (const c of arg)
                this.desired.channels.add(c);
            if (filters)
                this.desired.filters = { ...this.desired.filters, ...filters };
            if (this.ws && this.ws.readyState === OPEN)
                this.sendSubscribe({ only: [DEFAULT_SUB_ID] });
            else
                void this.connect();
            return this;
        }
        const subId = arg.subId;
        if (typeof subId !== "string" || !SUB_ID_RE.test(subId))
            throw new Error("subId must be 1-64 characters of A-Z a-z 0-9 _ . -");
        if (subId === DEFAULT_SUB_ID)
            return this.subscribe(arg.channels, arg.filters);
        const entry = this.named.get(subId) ?? { channels: new Set(), filters: {} };
        for (const c of arg.channels)
            entry.channels.add(c);
        // A named subscription's filters are REPLACED when given (the server does the same).
        if (arg.filters)
            entry.filters = { ...arg.filters };
        this.named.set(subId, entry);
        if (this.ws && this.ws.readyState === OPEN)
            this.sendSubscribe({ only: [subId] });
        else
            void this.connect();
        return this;
    }
    /**
     * Replace the filters of a subscription (`"default"` for the plain one).
     * The server acks with an `updated` frame; a refused update (for example a
     * `token:prices` subscription without valid `mints`) arrives as a `warning`
     * with code `invalid_filters` and the previous filters stay.
     */
    updateSubscription(subId, filters) {
        if (subId === DEFAULT_SUB_ID)
            this.desired.filters = { ...filters };
        else {
            const entry = this.named.get(subId);
            if (!entry)
                throw new Error(`unknown subscription ${subId}`);
            entry.filters = { ...filters };
        }
        if (this.ws && this.ws.readyState === OPEN) {
            this.ws.send(JSON.stringify({ type: "update", ...(subId === DEFAULT_SUB_ID ? {} : { sub_id: subId }), filters }));
        }
        return this;
    }
    unsubscribe(arg) {
        if (typeof arg === "string") {
            if (arg === DEFAULT_SUB_ID)
                return this.unsubscribe(Array.from(this.desired.channels));
            this.named.delete(arg);
            this.forgetPending(arg);
            if (this.ws && this.ws.readyState === OPEN)
                this.ws.send(JSON.stringify({ type: "unsubscribe", sub_id: arg }));
            return this;
        }
        for (const c of arg)
            this.desired.channels.delete(c);
        if (this.ws && this.ws.readyState === OPEN) {
            this.ws.send(JSON.stringify({ type: "unsubscribe", channels: arg }));
        }
        return this;
    }
    /** Every subscription this client asks for (local view, no round trip). */
    getSubscriptions() {
        const out = [];
        if (this.desired.channels.size > 0)
            out.push({ subId: DEFAULT_SUB_ID, channels: Array.from(this.desired.channels), filters: { ...this.desired.filters } });
        for (const [subId, e] of this.named)
            out.push({ subId, channels: Array.from(e.channels), filters: { ...e.filters } });
        return out;
    }
    /**
     * Ask the server what this connection holds (`list` → `subscriptions`).
     * Resolves with the local view when not connected or when the server does
     * not answer within `timeoutMs`.
     */
    listSubscriptions(timeoutMs = 5_000) {
        if (!this.ws || this.ws.readyState !== OPEN)
            return Promise.resolve(this.getSubscriptions());
        return new Promise((resolve) => {
            const w = { resolve, timer: setTimeout(() => { this.listWaiters = this.listWaiters.filter((x) => x !== w); resolve(this.getSubscriptions()); }, timeoutMs) };
            this.listWaiters.push(w);
            try {
                this.ws.send(JSON.stringify({ type: "list" }));
            }
            catch { /* closing: the timer answers */ }
        });
    }
    /**
     * A pre-Phase-2 server (ignores sub_id) answers every resume with ONE
     * replay for the whole connection, reported without sub_id: only "default"
     * can still be awaited. Finishes the recovery at once when that one has
     * already ended.
     */
    collapsePending(r) {
        if (r.pending.size === 1 && r.pending.has(DEFAULT_SUB_ID))
            return;
        r.pending.clear();
        if (!r.ends.has(DEFAULT_SUB_ID))
            r.pending.add(DEFAULT_SUB_ID);
        if (r.pending.size === 0 && r.protocol !== "detect")
            this.finishRecovery(r.ends.get(DEFAULT_SUB_ID) ?? null);
    }
    /** A subscription removed while its replay was still awaited: stop waiting for it. */
    forgetPending(subId) {
        const r = this.recovery;
        if (!r || !r.pending.has(subId))
            return;
        r.pending.delete(subId);
        if (r.pending.size === 0 && r.protocol !== "detect")
            this.finishRecovery(r.ends.size ? [...r.ends.values()].pop() : null);
    }
    /** Open the connection (also called implicitly by subscribe). Restarts a stream that went `"fatal"`. */
    async connect() {
        if (this.connecting || (this.ws && this.ws.readyState === OPEN))
            return;
        if (this.stopped) {
            this.stopped = false;
            this.authFailures = 0;
            this.attempt = 0;
        }
        this.closedByUser = false;
        this.connecting = true;
        try {
            const [WS, token] = await Promise.all([
                resolveWebSocket(this.opts.WebSocketImpl),
                this.opts.getToken(),
            ]);
            if (this.closedByUser || this.stopped)
                return;
            const url = `${token.ws_url}?token=${encodeURIComponent(token.token)}`;
            const ws = new WS(url);
            this.ws = ws;
            this.serverInstance = null;
            this.firstSubscribeSent = false;
            // The automatic re-resume budget is per CONNECTION (the docs say so).
            this.resumeRetries = 0;
            ws.onopen = () => {
                if (this.ws !== ws)
                    return;
                // The backoff attempt is NOT reset here — only a `subscribed` ack proves
                // the connection is usable (an auth/limit close follows a successful open).
                this.resetHeartbeat();
                this.ackExpect = [];
                if (this.desired.channels.size > 0 || this.named.size > 0)
                    this.sendSubscribe();
                this.emit("open", undefined);
            };
            ws.onmessage = (ev) => { if (this.ws === ws)
                this.handleMessage(ev.data); };
            ws.onerror = (err) => { if (this.ws === ws)
                this.emit("error", err instanceof Error ? err : new Error("WebSocket error")); };
            ws.onclose = (ev) => {
                if (this.ws !== null && this.ws !== ws)
                    return; // superseded socket
                this.handleClose(typeof ev?.code === "number" ? ev.code : null, typeof ev?.reason === "string" ? ev.reason : "");
            };
        }
        catch (err) {
            this.emit("error", err);
            if (this.authFailures > 0) {
                // Token re-fetch after a 4001 failed — counts toward the bounded retries.
                this.authFailures++;
                if (this.authFailures > this.opts.maxAuthRetries) {
                    this.fatal(4001, "stream token refresh failed");
                    return;
                }
            }
            if (!this.closedByUser && !this.stopped && this.opts.autoReconnect)
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
        this.dropRecovery();
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
    handleClose(code, reason) {
        this.clearHeartbeat();
        this.ws = null;
        this.serverInstance = null;
        // An unfinished recovery is abandoned: its held live frames are dropped
        // undelivered, and replayed frames never moved the cursor, so the next
        // resume starts from the same pre-resume position.
        this.dropRecovery();
        this.emit("close", { code, reason });
        if (this.closedByUser || this.stopped)
            return;
        if (code === 4003) {
            this.fatal(code, reason || "authentication error");
            return;
        }
        if (code === 4001) {
            // Token rejected (rotated / lapsed): the reconnect re-fetches it via getToken().
            this.authFailures++;
            if (this.authFailures > this.opts.maxAuthRetries) {
                this.fatal(code, reason || "stream token rejected");
                return;
            }
        }
        if (!this.opts.autoReconnect)
            return;
        if (code === 4002) {
            // Connection limit: another socket holds the slot. Never retry tightly.
            const err = new Error(`stream connection limit reached${reason ? `: ${reason}` : ""}`);
            err.code = 4002;
            err.reason = reason;
            this.emit("error", err);
            this.scheduleReconnect(code, this.opts.connectionLimitBackoffMs);
            return;
        }
        // 4008 (slow consumer) and everything else: reconnect and resume from the cursor.
        this.scheduleReconnect(code);
    }
    /** `onUnrecoverableGap: "stop"`: stop the stream and hand the decision to the caller. */
    haltForGap(gap) {
        this.closedByUser = true; // no reconnect; connect() restarts if the caller wants
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.clearHeartbeat();
        const sock = this.ws;
        this.ws = null;
        try {
            if (typeof sock?.terminate === "function")
                sock.terminate();
            else
                sock?.close(1000, "unrecoverable gap");
        }
        catch { /* ignore */ }
        this.stopped = true;
        this.emit("fatal", { code: null, reason: `unrecoverable gap: ${gap.reason}`, gap });
    }
    fatal(code, reason) {
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.emit("fatal", { code, reason });
    }
    /** The subscribe frames for the given subscriptions (default first, then named in creation order). */
    subscribeFrames(only) {
        const out = [];
        const want = (id) => !only || only.includes(id);
        if (want(DEFAULT_SUB_ID) && this.desired.channels.size > 0) {
            const msg = { type: "subscribe", channels: Array.from(this.desired.channels) };
            if (Object.keys(this.desired.filters).length > 0)
                msg.filters = this.desired.filters;
            out.push({ subId: DEFAULT_SUB_ID, msg });
        }
        for (const [subId, e] of this.named) {
            if (!want(subId) || e.channels.size === 0)
                continue;
            out.push({ subId, msg: { type: "subscribe", sub_id: subId, channels: Array.from(e.channels), filters: e.filters } });
        }
        return out;
    }
    /**
     * Send the subscribe(s). On a connection's FIRST subscribe (or an explicit
     * retry after a retryable gap) every subscription is sent with the SAME
     * resume cursor: the server serves one replay per subscription, one after
     * another, and holds live frames until the last replay_end. A later
     * subscribe adds channels live (no resume).
     */
    sendSubscribe({ resumeOverride, only } = {}) {
        if (!this.ws)
            return;
        const frames = this.subscribeFrames(only);
        if (frames.length === 0)
            return;
        if ((!this.firstSubscribeSent || resumeOverride) && this.cursor && !this.recovery) {
            const from = resumeOverride ?? { ...this.cursor };
            const pending = new Set();
            const channels = new Set();
            for (const f of frames) {
                f.msg.resume = from;
                pending.add(f.subId);
                for (const c of f.msg.channels)
                    channels.add(c);
            }
            this.recovery = {
                protocol: "detect", from, channels: Array.from(channels), request: { resume: from }, acked: false, suppressAck: false,
                instanceChanged: false, start: null, received: 0, delivered: 0, duplicates: 0, held: [], timer: null,
                maxSeq: null, maxTs: null, pending, starts: new Map(), ends: new Map(),
            };
        }
        this.firstSubscribeSent = true;
        for (const f of frames) {
            this.ackExpect.push(f.subId);
            this.ws.send(JSON.stringify(f.msg));
        }
    }
    /**
     * The server did not answer `resume` (older deployment): retry with the
     * legacy fields. Such a server has no named subscriptions either, so the
     * one legacy replay covers the union of channels and resolves every pending
     * subscription at once.
     */
    fallbackToLegacy() {
        const r = this.recovery;
        if (!r || r.protocol !== "detect" || !r.from || !this.ws)
            return;
        if (r.timer) {
            clearTimeout(r.timer);
            r.timer = null;
        }
        r.protocol = "legacy";
        r.pending = new Set([DEFAULT_SUB_ID]);
        r.instanceChanged = !this.serverInstance || this.serverInstance !== r.from.instance;
        // Same process → its ring still indexes our seq. Restarted → seq restarted, use time.
        const legacy = r.instanceChanged ? { replay_since_ts: r.from.ts } : { replay_since_seq: r.from.seq };
        r.request = legacy;
        r.suppressAck = true;
        const msg = { type: "subscribe", channels: r.channels, ...legacy };
        if (Object.keys(this.desired.filters).length > 0)
            msg.filters = this.desired.filters;
        try {
            this.ws.send(JSON.stringify(msg));
        }
        catch { /* closing */ }
        r.timer = setTimeout(() => this.finishRecovery(null), this.opts.legacyReplayTimeoutMs);
    }
    dropRecovery() {
        if (this.recovery?.timer)
            clearTimeout(this.recovery.timer);
        this.recovery = null;
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        // A `list` still awaiting its answer resolves with the local view; the
        // ack order of the dead connection means nothing on the next one.
        this.ackExpect = [];
        const waiters = this.listWaiters;
        this.listWaiters = [];
        for (const w of waiters) {
            clearTimeout(w.timer);
            w.resolve(this.getSubscriptions());
        }
    }
    /**
     * A retryable gap: ask the server again on this connection after its
     * retry_after_ms (row_cap resumes from resume_ts_hint). Bounded — the next
     * reconnect resumes anyway.
     */
    scheduleResumeRetry(retryAfterMs, hintTs, only) {
        if (this.retryTimer || !this.cursor)
            return;
        if (this.resumeRetries >= this.opts.maxResumeRetries)
            return;
        this.resumeRetries++;
        const delay = retryAfterMs !== null && retryAfterMs >= 0 ? retryAfterMs : this.opts.resumeRetryDelayMs;
        const from = hintTs !== null && hintTs > this.cursor.ts ? { ...this.cursor, ts: hintTs } : { ...this.cursor };
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            // Only the subscriptions whose replay was incomplete are asked again.
            if (this.ws && this.ws.readyState === OPEN && !this.recovery)
                this.sendSubscribe({ resumeOverride: from, only });
        }, delay);
    }
    /**
     * One `replay_end` per subscription → one aggregate the single-replay logic
     * can run on unchanged: complete only when every subscription is; the
     * commit position is the SMALLEST last_seq / last_ts across them (a later
     * subscription's replay covered more, but the earlier one's live frames
     * from that point on are still only in the live flush); channel entries
     * keyed `"<sub_id>/<channel>"` for named subscriptions; `retryable` when
     * any subscription says so.
     */
    aggregateEnds(r, lastEnd) {
        const ends = [...r.ends.entries()];
        if (ends.length === 0)
            return lastEnd;
        if (ends.length === 1 && ends[0][0] === DEFAULT_SUB_ID)
            return ends[0][1];
        const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
        const agg = { ...(lastEnd ?? ends[ends.length - 1][1]) };
        const channels = {};
        let complete = true, retryableKnown = true, retryable = false, truncated = false;
        let lastSeq = null, lastTs = null, liveFrom = null, retryAfter = null, hint = null;
        let count = 0, sent = 0, matched = 0, reason = null, limits = null;
        const min = (a, b) => (a === null ? b : b === null ? a : Math.min(a, b));
        for (const [subId, e] of ends) {
            if (e.complete === false) {
                complete = false;
                if (!reason && typeof e.reason === "string")
                    reason = e.reason;
            }
            if (typeof e.retryable !== "boolean")
                retryableKnown = false;
            else if (e.retryable)
                retryable = true;
            if (e.replay_truncated === true)
                truncated = true;
            const chs = e.channels;
            if (chs && typeof chs === "object")
                for (const [ch, raw] of Object.entries(chs))
                    channels[subId === DEFAULT_SUB_ID ? ch : `${subId}/${ch}`] = raw;
            lastSeq = min(lastSeq, num(e.last_seq));
            lastTs = min(lastTs, num(e.last_ts));
            liveFrom = min(liveFrom, num(e.live_from_seq));
            const ra = num(e.retry_after_ms);
            if (ra !== null)
                retryAfter = retryAfter === null ? ra : Math.max(retryAfter, ra);
            hint = min(hint, num(e.resume_ts_hint));
            count += num(e.count) ?? 0;
            sent += num(e.sent) ?? 0;
            matched += num(e.matched) ?? 0;
            if (!limits && e.limits && typeof e.limits === "object")
                limits = e.limits;
        }
        agg.complete = complete;
        agg.reason = complete ? null : reason ?? "incomplete";
        agg.channels = channels;
        if (retryableKnown)
            agg.retryable = retryable;
        else
            delete agg.retryable;
        if (truncated)
            agg.replay_truncated = true;
        agg.last_seq = lastSeq;
        agg.last_ts = lastTs;
        agg.live_from_seq = liveFrom;
        if (retryAfter !== null)
            agg.retry_after_ms = retryAfter;
        else
            delete agg.retry_after_ms;
        if (hint !== null)
            agg.resume_ts_hint = hint;
        else
            delete agg.resume_ts_hint;
        agg.count = count;
        agg.sent = sent;
        agg.matched = matched;
        if (limits)
            agg.limits = limits;
        return agg;
    }
    finishRecovery(lastEnd) {
        const r = this.recovery;
        if (!r)
            return;
        if (r.timer) {
            clearTimeout(r.timer);
            r.timer = null;
        }
        this.recovery = null;
        const end = this.aggregateEnds(r, lastEnd);
        // Subscriptions whose own replay_end was incomplete and retryable (or, on a
        // server that does not say, incomplete): the automatic retry asks only for them.
        const retrySubs = [...r.ends.entries()].filter(([, e]) => e.complete === false && e.retryable !== false).map(([id]) => id);
        const reasons = [];
        /** Reasons of the channels the server reported incomplete, with their retryability. */
        const channelReasons = [];
        const retryableChannelReasons = [];
        const gapChannels = {};
        const str = (v) => (typeof v === "string" && v ? v : null);
        const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
        // A v1 server answers with complete/sent/matched; an older one with count only.
        const v1 = !!end && ("complete" in end || "sent" in end || "matched" in end);
        if ([...r.starts.values()].some((s) => s.replay_truncated === true) || r.start?.replay_truncated === true || end?.replay_truncated === true)
            reasons.push("ring_truncated");
        if (!end)
            reasons.push("replay_timeout");
        else if (v1) {
            if (end.complete === false)
                reasons.push(str(end.reason) ?? "incomplete");
            const chs = end.channels;
            if (chs && typeof chs === "object") {
                for (const [ch, raw] of Object.entries(chs)) {
                    // token:prices is a state stream: the server re-sends a snapshot, never a log.
                    if (ch === "token:prices")
                        continue;
                    const info = (raw && typeof raw === "object" ? raw : {});
                    const gap = info.gap;
                    const late = info.late_ingest_possible === true;
                    if (info.complete === false || gap || info.mode === "none" || late) {
                        gapChannels[ch] = raw; // raw entry: mode, reason, gap, time_basis, retry_after_ms, …
                        const gr = gap && typeof gap === "object" ? gap.reason : gap;
                        const chReason = str(info.reason) ?? str(gr) ?? (info.mode === "none" ? "not_reconstructable" : late ? "late_ingest_possible" : "incomplete");
                        reasons.push(chReason);
                        channelReasons.push(chReason);
                        if (info.retryable === true || (info.retryable !== false && TRANSIENT_GAPS.has(chReason)))
                            retryableChannelReasons.push(chReason);
                    }
                }
            }
        }
        else {
            // Legacy server: `count` is what it meant to send; fewer arrived → it stopped on backpressure.
            if (typeof end.count === "number" && r.received < end.count)
                reasons.push("backpressure");
            // Legacy server + restart: the old process's buffer is gone and there is no durable backfill.
            if (r.protocol === "legacy" && r.instanceChanged)
                reasons.push("instance_changed");
        }
        const uniq = Array.from(new Set(reasons));
        const result = {
            protocol: v1 || r.protocol === "resume" ? "resume" : "legacy",
            from: r.from,
            request: r.request,
            received: r.received,
            delivered: r.delivered,
            duplicates: r.duplicates,
            complete: uniq.length === 0,
            mode: typeof end?.mode === "string" ? end.mode : null,
            resumeReason: typeof end?.resume_reason === "string" ? end.resume_reason : null,
            start: r.start,
            end,
            subscriptions: r.ends.size ? [...r.ends.keys()] : r.pending.size ? [...r.pending] : [DEFAULT_SUB_ID],
            ends: Object.fromEntries(r.ends),
        };
        // Final vs retryable. The server says which (`retryable`): true only when an
        // incomplete channel's reason is transient (backpressure, closed,
        // source_busy, source_error, late_ingest_possible, row_cap). Older servers
        // send no `retryable`; then the reason list decides (isPermanentGap).
        const serverSays = !!end && typeof end.retryable === "boolean";
        const retryable = uniq.length > 0 && (serverSays ? end.retryable === true : !uniq.every(isPermanentGap));
        const permanent = uniq.length > 0 && !retryable;
        // Commit point: complete, or only FINAL gaps (reported once, then treated as
        // complete so the stream never stays stuck on something asking again cannot
        // fill). Retryable: keep the pre-resume cursor, do not commit live frames,
        // and resume again after retry_after_ms (row_cap: from resume_ts_hint).
        // The position the server says is safe to continue from.
        let pos = null;
        if (!retryable) {
            let seq;
            let cts;
            if (v1) {
                // {seq: last_seq ?? previous, ts: last_ts ?? previous}
                seq = num(end?.last_seq);
                cts = num(end?.last_ts) ?? (seq !== null ? this.cursor?.ts ?? null : null);
            }
            else {
                // Older servers: held live frames (not yet handled) may sit below live_from_seq.
                const liveFrom = num(end?.live_from_seq);
                const heldMin = r.held.reduce((m, f) => (typeof f.seq === "number" ? (m === null ? f.seq : Math.min(m, f.seq)) : m), null);
                seq = r.maxSeq ?? (heldMin !== null ? heldMin - 1 : liveFrom !== null ? liveFrom - 1 : null);
                cts = r.maxTs ?? this.cursor?.ts ?? null;
            }
            if (cts !== null)
                pos = { instance: this.serverInstance, seq: seq !== null && seq >= 0 ? seq : null, ts: cts };
        }
        // Continuing past a FINAL gap is the SDK's own decision, never the user's
        // approval: it is reported on the gap event (advancedPastGap / skipped) and
        // `onUnrecoverableGap: "stop"` turns it off.
        // resume_ts_hint is a row_cap device: it says "everything up to here was
        // sent for the capped channel". If another channel is incomplete for a
        // RETRYABLE reason (source_error, source_busy, …), resuming from the hint
        // would step past its unread range and the next reply would claim complete.
        // Channels with a FINAL gap are ignored here: asking again never recovers
        // them anyway, and the gap event reports them. Same predicate as the
        // server, checked here so the client never depends on it.
        const capCandidates = retryableChannelReasons.length > 0
            ? retryableChannelReasons
            : channelReasons.length > 0 ? [] : uniq.filter((x) => TRANSIENT_GAPS.has(x));
        const capOnly = capCandidates.length > 0 && capCandidates.every((x) => x === "row_cap");
        const exhausted = retryable && this.resumeRetries >= this.opts.maxResumeRetries;
        const strict = uniq.length > 0 && !retryable && this.opts.onUnrecoverableGap === "stop";
        const willAdvance = !retryable && !strict;
        this.emit("replay", result);
        let gap = null;
        if (uniq.length > 0) {
            gap = {
                reason: uniq[0], reasons: uniq, permanent, retryable,
                retryAfterMs: num(end?.retry_after_ms), resumeTsHint: num(end?.resume_ts_hint),
                channels: gapChannels, from: r.from, replay: result, exhausted,
                limits: (end?.limits && typeof end.limits === "object" ? end.limits : r.start?.limits && typeof r.start.limits === "object" ? r.start.limits : null),
                // What the client does about it — always reported BEFORE it happens.
                advancedPastGap: willAdvance,
                source: "auto",
                skipped: {
                    channels: Object.keys(gapChannels),
                    from: this.cursor ? { ...this.cursor } : null,
                    to: willAdvance && pos ? stepCursor(this.cursor, pos) : null,
                },
            };
            this.lastGap = gap;
            this.emit("gap", gap);
        }
        if (willAdvance) {
            this.unsafe = false;
            this.resumeRetries = 0;
            if (pos)
                this.enqueue(pos, true);
        }
        else if (retryable) {
            this.unsafe = true;
            if (serverSays)
                this.scheduleResumeRetry(num(end?.retry_after_ms), capOnly ? num(end?.resume_ts_hint) : null, retrySubs.length ? retrySubs : undefined);
        }
        else {
            // strict: stop instead of skipping what cannot be recovered.
            this.unsafe = true;
            this.haltForGap(gap);
        }
        // Live frames that arrived during a client-side replay go out now, after it.
        for (const f of r.held)
            this.deliver(f);
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
        switch (msg.type) {
            case "heartbeat":
                this.resetHeartbeat();
                this.emit("heartbeat", msg.ts);
                return;
            case "connected":
                if (typeof msg.instance === "string")
                    this.serverInstance = msg.instance;
                // Nothing to subscribe to → this frame is as far as a healthy connection gets.
                if (this.desired.channels.size === 0 && this.named.size === 0) {
                    this.attempt = 0;
                    this.authFailures = 0;
                }
                return;
            case "subscribed": {
                if (typeof msg.instance === "string")
                    this.serverInstance = msg.instance;
                this.attempt = 0;
                this.authFailures = 0;
                const r = this.recovery;
                if (r && r.suppressAck) {
                    r.suppressAck = false;
                    return;
                } // ack of our own fallback subscribe
                // Acks arrive in the order the subscribes were sent: a named subscribe
                // answered WITHOUT sub_id means the server ignores sub_id (older
                // deployment) — every subscription then collapsed into one on the
                // server. Said once, never silently.
                const expected = this.ackExpect.shift() ?? DEFAULT_SUB_ID;
                // The subscription this ack is about: the server's sub_id, else the
                // one we sent in this position (an older server echoes none).
                const ackedId = typeof msg.sub_id === "string" && msg.sub_id ? msg.sub_id : expected;
                if (expected !== DEFAULT_SUB_ID && typeof msg.sub_id !== "string") {
                    if (!this.namedUnsupportedWarned) {
                        this.namedUnsupportedWarned = true;
                        this.emit("warning", { code: "named_subscriptions_unsupported", sub_id: expected, message: "The server ignored sub_id: it predates named subscriptions, so every subscription on this connection shares one channel set and one filter object." });
                    }
                    // Such a server runs ONE replay for the whole connection and reports
                    // it without sub_id ("default"): every named id must leave `pending`
                    // or the recovery would never finish and the cursor would freeze.
                    if (r)
                        this.collapsePending(r);
                }
                this.emit("subscribed", msg.channels, msg);
                if (r && r.protocol === "detect" && !r.acked) {
                    r.acked = true;
                    if ("resume" in msg)
                        r.protocol = "resume"; // server echoed resume: it understood
                    else
                        r.timer = setTimeout(() => this.fallbackToLegacy(), this.opts.resumeDetectMs);
                }
                const echo = msg.resume;
                if (r && echo && typeof echo === "object" && echo.accepted === false) {
                    // Refused for THIS subscription (replay_in_progress: it already has a
                    // replay running or queued): no replay_end will come for it. When
                    // nothing at all was accepted, nothing was recovered, so the
                    // committed cursor must not move until a later recovery completes.
                    r.pending.delete(ackedId);
                    if (r.pending.size === 0 && r.ends.size === 0) {
                        this.dropRecovery();
                        this.unsafe = true;
                    }
                    else if (r.pending.size === 0 && r.protocol !== "detect")
                        this.finishRecovery([...r.ends.values()].pop() ?? null);
                }
                return;
            }
            case "replay_start": {
                let r = this.recovery;
                if (!r) {
                    // A replay we did not ask for in this state (e.g. a late answer) — track it anyway.
                    r = this.recovery = {
                        protocol: "resume", from: null, channels: [], request: {}, acked: true, suppressAck: false,
                        instanceChanged: false, start: null, received: 0, delivered: 0, duplicates: 0, held: [], timer: null,
                        maxSeq: null, maxTs: null, pending: new Set([subIdOf(msg)]), starts: new Map(), ends: new Map(),
                    };
                }
                if (r.protocol === "detect") {
                    r.protocol = "resume";
                    if (r.timer) {
                        clearTimeout(r.timer);
                        r.timer = null;
                    }
                }
                r.starts.set(subIdOf(msg), msg);
                if (!r.start)
                    r.start = msg;
                return;
            }
            case "replay_end": {
                const r = this.recovery;
                if (!r)
                    return;
                const sid = subIdOf(msg);
                r.ends.set(sid, msg);
                r.pending.delete(sid);
                // Every subscription's replay has ended (a legacy server answers once,
                // for the whole connection) → aggregate and commit.
                if (r.pending.size === 0 || r.protocol === "legacy")
                    this.finishRecovery(msg);
                return;
            }
            case "updated":
                this.emit("updated", msg);
                return;
            case "unsubscribed":
                this.emit("unsubscribed", msg);
                return;
            case "subscriptions": {
                const list = Array.isArray(msg.list)
                    ? msg.list.map((s) => ({
                        subId: typeof s.sub_id === "string" ? s.sub_id : DEFAULT_SUB_ID,
                        channels: (Array.isArray(s.channels) ? s.channels : []),
                        filters: (s.filters && typeof s.filters === "object" ? s.filters : {}),
                    }))
                    : [];
                const waiters = this.listWaiters;
                this.listWaiters = [];
                for (const w of waiters) {
                    clearTimeout(w.timer);
                    w.resolve(list);
                }
                return;
            }
            case "warning": {
                const sid = typeof msg.sub_id === "string" ? msg.sub_id : null;
                if (msg.code === "channels_revoked") {
                    // The server dropped these (e.g. plan downgrade): stop re-subscribing them.
                    const names = new Set();
                    if (Array.isArray(msg.channels))
                        for (const c of msg.channels)
                            if (typeof c === "string")
                                names.add(c);
                    if (Array.isArray(msg.revoked)) {
                        for (const x of msg.revoked) {
                            if (typeof x === "string")
                                names.add(x);
                            else if (x && typeof x === "object" && typeof x.channel === "string")
                                names.add(x.channel);
                        }
                    }
                    const target = sid && sid !== DEFAULT_SUB_ID ? this.named.get(sid)?.channels : this.desired.channels;
                    if (target)
                        for (const c of names)
                            target.delete(c);
                    if (sid && sid !== DEFAULT_SUB_ID && this.named.get(sid)?.channels.size === 0)
                        this.named.delete(sid);
                }
                else if ((msg.code === "too_many_subscriptions" || msg.code === "invalid_sub_id") && sid && sid !== DEFAULT_SUB_ID) {
                    // The server will refuse it on every reconnect too: forget it, and do not wait for its replay.
                    this.named.delete(sid);
                    this.forgetPending(sid);
                }
                // Never swallow a server warning: a rejected/revoked channel is silent.
                this.emit("warning", msg);
                return;
            }
            default:
                break;
        }
        if (!msg.channel || !msg.event)
            return;
        // Bus-recovered frames (recovered:"bus") are re-sent live, not part of a replay.
        const inReplay = msg.replayed === true && msg.recovered !== "bus";
        const r = this.recovery;
        if (r) {
            if (!inReplay && r.protocol === "detect" && r.acked)
                this.fallbackToLegacy(); // live before replay_start → old server
            if (!inReplay && r.protocol === "legacy") {
                if (r.held.length < HELD_LIVE_CAP) {
                    r.held.push(msg);
                    return;
                }
                // Too much live traffic to hold: stop holding, deliver in arrival order.
                const held = r.held;
                r.held = [];
                for (const f of held)
                    this.deliver(f);
            }
            if (inReplay)
                r.received++;
        }
        this.deliver(msg);
    }
    /** Dedupe by id, hand the frame to the handlers, track completion for the cursor. */
    deliver(msg) {
        const inReplay = msg.replayed === true && msg.recovered !== "bus";
        if (inReplay && this.recovery) {
            const r = this.recovery;
            if (typeof msg.seq === "number" && Number.isFinite(msg.seq))
                r.maxSeq = Math.max(r.maxSeq ?? msg.seq, msg.seq);
            if (typeof msg.ts === "number" && Number.isFinite(msg.ts))
                r.maxTs = Math.max(r.maxTs ?? msg.ts, msg.ts);
        }
        const id = typeof msg.id === "string" || typeof msg.id === "number" ? String(msg.id) : null;
        if (id !== null && this.opts.dedupeSize > 0) {
            // Dedupe is per (sub_id, channel, id): the same event delivered under two
            // named subscriptions is two legitimate deliveries.
            const key = `${subIdOf(msg)}\u0000${String(msg.channel)}\u0000${id}`;
            if (this.seen.has(key)) {
                this.seen.delete(key);
                this.seen.set(key, true);
                if (inReplay && this.recovery)
                    this.recovery.duplicates++;
                return;
            }
            this.seen.set(key, true);
            if (this.seen.size > this.opts.dedupeSize) {
                const oldest = this.seen.keys().next().value;
                if (oldest !== undefined)
                    this.seen.delete(oldest);
            }
        }
        if (inReplay && this.recovery)
            this.recovery.delivered++;
        const data = msg.data;
        const evt = { ...msg, replayed: msg.replayed === true || (!!data && typeof data === "object" && data.replayed === true) };
        const seq = typeof msg.seq === "number" && Number.isFinite(msg.seq) ? msg.seq : null;
        const ts = typeof msg.ts === "number" && Number.isFinite(msg.ts) ? msg.ts : null;
        // Only sequenced/identified frames move the cursor (token:price ticks are
        // state, not a log) — and none while a recovery runs: finishRecovery()
        // commits the server's replay_end position if, and only if, it is complete.
        const pos = (seq !== null || id !== null) && ts !== null ? { instance: this.serverInstance, seq, ts } : null;
        // Progress always moves; the COMMITTED cursor only for live frames outside
        // a recovery and not after an incomplete one (see finishRecovery).
        const commit = !this.recovery && !this.unsafe;
        const results = [];
        this.callHandlers(evt.event, evt.data, evt, results);
        this.callHandlers("*", evt.data, evt, results);
        const pending = results.filter(isThenable);
        if (pending.length === 0 && this.inflight.length === 0) {
            if (pos)
                this.apply(pos, commit);
            return;
        }
        const entry = { pos, commit, done: pending.length === 0 };
        this.inflight.push(entry);
        if (entry.done) {
            this.drainInflight();
            return;
        }
        void Promise.allSettled(pending).then((settled) => {
            for (const s of settled)
                if (s.status === "rejected")
                    this.emit("error", s.reason);
            entry.done = true;
            this.drainInflight();
        });
    }
    drainInflight() {
        while (this.inflight.length > 0 && this.inflight[0].done) {
            const e = this.inflight.shift();
            if (e.pos)
                this.apply(e.pos, e.commit);
        }
    }
    /** Queue a position behind every frame still being handled (or apply it now). */
    enqueue(pos, commit) {
        if (this.inflight.length === 0)
            this.apply(pos, commit);
        else
            this.inflight.push({ pos, commit, done: true });
    }
    /** Move `progress` (always) and the committed cursor (when `commit`) to `pos`. */
    apply(pos, commit) {
        const p = stepCursor(this.progress, pos);
        if (p)
            this.progress = p;
        if (!commit)
            return;
        const c = this.cursor;
        const next = stepCursor(c, pos);
        if (!next || (c && c.instance === next.instance && c.seq === next.seq && c.ts === next.ts))
            return;
        this.cursor = next;
        this.emit("cursor", { ...next });
    }
    scheduleReconnect(code = null, minDelayMs = 0) {
        if (this.reconnectTimer || this.stopped)
            return;
        const base = Math.min(1000 * 2 ** this.attempt, this.opts.maxBackoffMs);
        let delay = base / 2 + Math.floor((base / 2) * Math.random()); // jitter
        if (minDelayMs > 0)
            delay = Math.max(delay, minDelayMs + Math.floor((minDelayMs / 2) * Math.random()));
        this.attempt++;
        this.emit("reconnect", { attempt: this.attempt, delayMs: delay, code });
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