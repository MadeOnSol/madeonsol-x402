/**
 * Real-time WebSocket streaming client.
 *
 * Wraps the connect → token → subscribe → event loop with auto-reconnect,
 * heartbeat liveness, and typed events, so consumers never hand-roll
 * connection management. Obtain one via `client.stream()`. Stream tokens do
 * not expire: `getToken()` is called on every (re)connect and returns the
 * same value until the subscription lapses or you explicitly rotate it.
 *
 * Recovery (v1 resume): the client remembers a cursor `{instance, seq, ts}` —
 * the last frame whose handlers finished — and on every reconnect asks the
 * server to resume after it (`subscribe {…, resume}`); against an older server
 * it falls back to `replay_since_seq` (same process) / `replay_since_ts`
 * (restarted). Delivery is at-least-once, de-duplicated by event `id`; a
 * `"gap"` event says what could NOT be recovered. `seq` gaps are normal and
 * never mean loss. Close codes: 4001 re-fetches the token (bounded, then
 * `"fatal"`), 4002 (connection limit) waits ≥ 60 s, 4003 stops with
 * `"fatal"`, 4008 (slow consumer) reconnects and resumes.
 *
 * Works in Node (uses the global `WebSocket` on Node 22+, else lazily imports
 * the optional `ws` package) and the browser (native WebSocket). Zero required
 * dependencies.
 */
import type { StreamToken } from "./types.js";
/** Channels you can subscribe to (mirrors the server registry, services/shared/stream-channels.mjs). */
export type StreamChannel = "kol:trades" | "kol:coordination" | "kol:first_touches" | "deployer:alerts" | "wallet_tracker:events" | "copytrade:signals" | "price_alert:events" | "sniper:deploys" | "token:graduations" | "token:prices" | "token:locks" | "token:fee_claims" | "token:surges";
/** Every Solana channel, in the server's order. */
export declare const STREAM_CHANNELS: readonly StreamChannel[];
/** Event names delivered on those channels (subscribe to a channel, receive these). */
export type StreamEventName = "kol:trade" | "kol:coordination" | "kol:first_touch" | "deployer:alert" | "deployer:bond" | "wallet_tracker:event" | "copytrade:signal" | "price_alert:dip" | "price_alert:recovery" | "sniper:deploy" | "token:graduation" | "token:price" | "token:lock" | "token:lock_claimed" | "token:lock_cancelled" | "token:lock_closed" | "token:lock_updated" | "token:unlock_upcoming" | "token:unlock_available" | "token:fee_claim" | "token:surge" | "token:revival";
/** Lifecycle events you can also listen for. */
export type StreamLifecycleEvent = "open" | "close" | "reconnect" | "subscribed" | "updated" | "unsubscribed" | "heartbeat" | "warning" | "cursor" | "replay" | "gap" | "fatal" | "error";
/**
 * A server `type: "warning"` frame, surfaced as the `"warning"` lifecycle
 * event. Known codes: `channels_rejected` (a subscribe named a channel that
 * does not exist or that your tier cannot hold — each with a reason, plus the
 * full list of channels it accepts) and `channels_revoked` (the server dropped
 * channels you held, e.g. after a plan downgrade). A rejected or revoked
 * channel is silent, so never ignore these.
 */
export interface StreamWarning {
    /**
     * Machine-readable code: `channels_rejected`, `channels_revoked`,
     * `replay_in_progress`, and for named subscriptions `invalid_sub_id`,
     * `too_many_subscriptions`, `unknown_sub_id`, `invalid_filters`; the client
     * itself emits `named_subscriptions_unsupported` once when the server
     * ignores `sub_id` (older deployment).
     */
    code?: string;
    /** The named subscription the warning is about (absent for the default one). */
    sub_id?: string;
    /** Channels the server refused, each with a human-readable reason. */
    rejected?: Array<{
        channel: string;
        reason: string;
    }>;
    /** Channels the server removed from this connection (channels_revoked). */
    revoked?: Array<{
        channel: string;
        reason: string;
    }> | string[];
    /** Every channel the server accepts. */
    valid_channels?: string[];
    /** Optional human-readable message (not sent on every warning). */
    message?: string;
    /** Server timestamp (ms). */
    ts?: number;
    [key: string]: unknown;
}
/**
 * Resume cursor = the last SAFE point: every event up to it has been
 * processed ("processed" = every handler for that frame returned, or the
 * promise it returned settled). Two positions are kept:
 *  - `getProgress()` — what has been received and handled, including replayed frames;
 *  - `getCursor()` — the COMMITTED cursor, the only one to persist and resume from.
 * Live frames commit as they are processed. During a resume, replayed frames
 * are delivered but do NOT commit (the server replays channel by channel): the
 * cursor moves to the server's `last_seq` / `last_ts` only when
 * `replay_end` says `complete: true` with no incomplete / best-effort
 * channel. After an INCOMPLETE recovery (or a close mid-replay) it stays at
 * the pre-resume point, and later live frames are delivered but not committed
 * until a recovery completes — so the next reconnect re-requests the
 * unrecovered range (duplicates are dropped by id). Call `acceptGap()` once
 * you have backfilled (or decided to skip) the range. `instance` identifies the server process
 * (seq restarts when it changes), `seq` is the server's global ordinal and
 * `ts` the frame time in ms. Delivery is at-least-once: after a resume you may
 * see a frame again — dedupe by `evt.id` (the client already drops ids it saw
 * recently). Persist it (on the `"cursor"` event or via `getCursor()`) and pass
 * it back as the `resume` option to continue after a process restart.
 */
export interface StreamCursor {
    instance: string;
    seq: number;
    ts: number;
}
/**
 * A named subscription (Phase 2): one socket can hold several, each with its
 * own channels and filters. `subId` is client-chosen, 1-64 characters of
 * `A-Z a-z 0-9 _ . -`. The plain `subscribe(channels, filters)` call is the
 * connection's implicit `"default"` subscription; its frames carry no
 * `sub_id`. An event that matches several subscriptions is delivered once
 * per matching subscription, each frame stamped with its `sub_id`, and the
 * client dedupes by (sub_id, id) — so the same event CAN reach two handlers
 * legitimately. Tier caps (total per connection, the default one included):
 * PRO 5, ULTRA 10, BUSINESS 20.
 */
export interface StreamSubscription {
    subId: string;
    channels: StreamChannel[];
    filters: Record<string, unknown>;
}
/** Argument of `subscribe({ subId, channels, filters })`. */
export interface StreamSubscribeOptions {
    subId: string;
    channels: StreamChannel[];
    /** Filters scoped to THIS subscription only. Omitted = keep the ones it has. */
    filters?: Record<string, unknown>;
}
export interface StreamEvent<T = unknown> {
    channel: StreamChannel;
    event: StreamEventName;
    data: T;
    ts: number;
    /** The named subscription this frame was delivered under; absent for the default subscription. */
    sub_id?: string;
    /** Stable event id — the same event carries the same id live and in replay. Dedupe on it. */
    id?: string;
    /**
     * Server-global ordinal. Gaps are NORMAL (it counts every channel and every
     * user) and are never evidence of loss — only a `"gap"` event is.
     */
    seq?: number | null;
    /** true when the frame was re-sent by a replay/backfill rather than live. */
    replayed?: boolean;
    /**
     * Where a replayed frame came from: "ring" (the server's in-memory buffer) or
     * "durable" (rebuilt from storage — `seq` is then null).
     */
    mode?: "ring" | "durable";
    /** true when a durable frame could not reproduce every live field — see `missing`. */
    partial?: boolean;
    /** Live payload keys a durable frame could not reproduce (they are absent, never guessed). */
    missing?: string[];
    /** "bus" for a live-path frame the server re-sent after its own event-bus reconnect. */
    recovered?: string;
    /** true on a token:price state snapshot sent at resume time. */
    snapshot?: boolean;
}
/** Outcome of a resume, emitted as `"replay"` after the server's `replay_end`. */
export interface StreamReplayResult {
    /** "resume" = the server answered the v1 `resume` request; "legacy" = the
     *  client fell back to `replay_since_seq` / `replay_since_ts` (older server). */
    protocol: "resume" | "legacy";
    /** The cursor the client resumed from. */
    from: StreamCursor | null;
    /** The resume fields the client sent. */
    request: Record<string, unknown>;
    /** Replayed frames received. */
    received: number;
    /** Replayed frames handed to your handlers (received minus duplicates). */
    delivered: number;
    /** Replayed frames dropped because their id was already delivered. */
    duplicates: number;
    /** false when anything could not be recovered — a `"gap"` event follows. */
    complete: boolean;
    /** Server's replay mode ("ring" | "durable"), null on an older server. */
    mode: string | null;
    /** Why the server could not use its ring (e.g. "instance_changed", "ring_truncated"), or null. */
    resumeReason: string | null;
    /** Raw `replay_start` frame (null if none arrived). */
    start: Record<string, unknown> | null;
    /**
     * Raw `replay_end` frame (null on a client-side timeout). With several
     * named subscriptions this is the LAST one received; `ends` has them all.
     */
    end: Record<string, unknown> | null;
    /**
     * The subscriptions this recovery covered (`"default"` for the plain one).
     * A client holding N named subscriptions resumes each of them: every
     * subscribe of the reconnect carries the same cursor, the server serves the
     * replays one after another and the cursor commits once ALL have ended,
     * at the smallest `last_seq` / `last_ts` across them.
     */
    subscriptions: string[];
    /** Raw `replay_end` frame per subscription. */
    ends: Record<string, Record<string, unknown>>;
}
/**
 * Part of a resume could not be recovered. It says what is KNOWN: which
 * channels the server could not fully rebuild, the RANGE that may be
 * incomplete (`skipped.from` → `skipped.to`, or from `from` onwards while the
 * cursor stays), the server's reason and whether it is final, and the bounds
 * the server reported (`limits`, and per-channel entries in `channels`:
 * `time_basis`, `truncated_at_ts`, `retry_after_ms`, …). Events in that range
 * MAY be missing — how many, nobody can say, so this never claims a count.
 * Backfill the range from REST if you need certainty. `reasons` uses the
 * server's vocabulary (`backpressure`, `closed`, `source_busy`,
 * `source_error`, `late_ingest_possible`, `row_cap`, `ring_truncated`,
 * `instance_changed`, `window_exceeded`, `not_reconstructable`) plus the
 * client-side `replay_timeout`.
 */
export interface StreamGap {
    /** The first reason (convenience). */
    reason: string;
    reasons: string[];
    /**
     * true when EVERY reason is permanent — asking again can never fill it
     * (`not_reconstructable`, `state_stream`, `window_exceeded`, or an older
     * server's `ring_truncated` / `instance_changed`). The client reports it
     * once and commits as if complete. false = transient (`backpressure`,
     * `row_cap`, `source_busy`, `source_error`, `late_ingest` / `best_effort`,
     * `incomplete`, `replay_timeout`, …): the committed cursor stays and the
     * range is requested again on the next reconnect.
     */
    permanent: boolean;
    /**
     * Per-channel entries the server reported as incomplete / not
     * reconstructable, keyed by channel for the default subscription and by
     * `"<sub_id>/<channel>"` for a named one.
     */
    channels: Record<string, unknown>;
    /** The cursor the resume started from (the committed cursor stays there). */
    from: StreamCursor | null;
    /** true when the server says the gap is transient and worth asking again (`retryable`). */
    retryable: boolean;
    /** How long the server wants you to wait before resuming again (ms), when it says. */
    retryAfterMs: number | null;
    /** For `row_cap`: the ts to resume from next (the client uses it automatically). */
    resumeTsHint: number | null;
    /**
     * true when the CLIENT decided to continue past this gap and move the
     * committed cursor beyond it — the events in `skipped` are not coming back.
     * This is the SDK's own decision (see `onUnrecoverableGap`), never a user
     * approval. false = the cursor stayed put.
     */
    advancedPastGap: boolean;
    /** "auto" = the client's own decision; "manual" = you called `acceptGap()`. */
    source: "auto" | "manual";
    /**
     * The range that may be incomplete: the channels the server could not fully
     * rebuild and the cursor positions the client jumped between (`to` is null
     * when the cursor did not move). Events in that range may be missing.
     */
    skipped: {
        channels: string[];
        from: StreamCursor | null;
        to: StreamCursor | null;
    };
    /** Bounds the server reported for this resume (max age, row caps, slack), when it sends them. */
    limits: Record<string, unknown> | null;
    /**
     * true when this gap is retryable but the automatic re-resume budget
     * (`maxResumeRetries`) is spent: the client stops asking again on this
     * connection and the committed cursor stays put until the next reconnect
     * resumes (or you call `acceptGap()`).
     */
    exhausted: boolean;
    replay: StreamReplayResult;
}
/** The stream stopped and will not reconnect on its own. */
export interface StreamFatal {
    code: number | null;
    reason: string;
    /** The unrecoverable gap that stopped it (`onUnrecoverableGap: "stop"` only). */
    gap?: StreamGap;
}
export interface StreamClientOptions {
    /**
     * Returns your stream token (the SDK wires this to the stream-token
     * endpoint). Called on every (re)connect — including after a 4001 close,
     * which is how a rotated/lapsed token gets replaced. Tokens never expire, so
     * it is never called on a timer.
     */
    getToken: () => Promise<StreamToken>;
    /** Reconnect automatically on drop (default: true). */
    autoReconnect?: boolean;
    /** Max reconnect backoff in ms (default: 30000). */
    maxBackoffMs?: number;
    /** Reconnect if no server heartbeat arrives within this window (default: 90000). */
    heartbeatTimeoutMs?: number;
    /** Override the WebSocket implementation (e.g. inject `ws` explicitly). */
    WebSocketImpl?: unknown;
    /**
     * A cursor you persisted earlier (from `getCursor()` or the `"cursor"`
     * event). The first subscribe then asks the server to resume after it.
     */
    resume?: StreamCursor | null;
    /** How many recent event ids to remember for de-duplication (default: 10000). */
    dedupeSize?: number;
    /** Consecutive 4001 closes (token rejected) before `"fatal"` (default: 3). */
    maxAuthRetries?: number;
    /** Minimum wait after a 4002 connection-limit close, in ms (default: 60000). */
    connectionLimitBackoffMs?: number;
    /**
     * After a resume subscribe is acked, how long to wait for the server's
     * `replay_start` before assuming an older server that does not understand
     * `resume`, and retrying with `replay_since_seq` / `replay_since_ts`
     * (default: 3000). A live event arriving first triggers the fallback at once.
     */
    resumeDetectMs?: number;
    /** Give up waiting for a fallback replay's `replay_end` after this many ms (default: 15000). */
    legacyReplayTimeoutMs?: number;
    /**
     * How often to resume again after a RETRYABLE gap before giving up on the
     * automatic retry (default: 5). The next reconnect resumes again anyway.
     */
    maxResumeRetries?: number;
    /** Wait before an automatic re-resume when the server names none (default: 30000 ms). */
    resumeRetryDelayMs?: number;
    /**
     * What to do when the server reports a gap that asking again can never fill
     * (`retryable: false`).
     *  - `"advance"` (default): report it on the `"gap"` event with
     *    `advancedPastGap: true` and the skipped range, commit past it and keep
     *    streaming. The skipped events are not delivered — backfill them from
     *    REST if you need them.
     *  - `"stop"`: do not move the cursor, stop the stream and emit `"fatal"`
     *    with the gap, so YOU decide. `acceptGap()` then `connect()` continues.
     */
    onUnrecoverableGap?: "advance" | "stop";
}
type Listener = (data: unknown, evt?: StreamEvent) => unknown;
export declare class MadeOnSolStream {
    private opts;
    private ws;
    private listeners;
    private desired;
    /** Named subscriptions (Phase 2), in creation order; the default one is `desired`. */
    private named;
    /** sub_ids of the subscribes sent on this connection whose `subscribed` ack is still due (acks arrive in order). */
    private ackExpect;
    private namedUnsupportedWarned;
    private listWaiters;
    private closedByUser;
    private stopped;
    private attempt;
    private authFailures;
    private hbTimer;
    private reconnectTimer;
    private connecting;
    /** Server process id of the CURRENT connection (from connected/subscribed). */
    private serverInstance;
    /** Whether this connection already sent its first subscribe (the only one that resumes). */
    private firstSubscribeSent;
    /** COMMITTED (safe) cursor — the one to persist and resume from. */
    private cursor;
    /** Received progress — every handled frame, including replayed ones. */
    private progress;
    /** true after an incomplete recovery: live frames are not committed until one completes. */
    private unsafe;
    private seen;
    private inflight;
    private recovery;
    /** Automatic re-resume after a retryable gap. */
    private retryTimer;
    private resumeRetries;
    /** The last gap reported (for acceptGap()'s report). */
    private lastGap;
    constructor(opts: StreamClientOptions);
    /** Register a handler. Use an event name, `"*"` for every event, or a lifecycle event.
     *  An event handler may return a promise: the cursor only advances past a frame once
     *  every handler for it (and for every earlier frame) has settled. */
    on(event: "warning", fn: (warning: StreamWarning) => unknown): this;
    on(event: "cursor", fn: (cursor: StreamCursor) => unknown): this;
    on(event: "replay", fn: (result: StreamReplayResult) => unknown): this;
    on(event: "gap", fn: (gap: StreamGap) => unknown): this;
    on(event: "fatal", fn: (fatal: StreamFatal) => unknown): this;
    on(event: StreamEventName | StreamLifecycleEvent | "*", fn: Listener): this;
    /** Remove a handler (or all handlers for an event when `fn` is omitted). */
    off(event: string, fn?: (...args: never[]) => unknown): this;
    /** The COMMITTED resume cursor (last safe point) — persist this one. Null before the first. */
    getCursor(): StreamCursor | null;
    /** Received progress: the last handled frame, replayed ones included (NOT safe to resume from). */
    getProgress(): StreamCursor | null;
    /** true while an incomplete recovery holds the committed cursor back. */
    isRecoveryIncomplete(): boolean;
    /**
     * Accept the last reported gap: commit the received progress as the cursor
     * and let live frames commit again. Call it after you backfilled the range
     * the `"gap"` event named (or decided you do not need it). It re-reports the
     * gap first, with `source: "manual"` and the range being skipped.
     */
    acceptGap(): void;
    private emit;
    /** Call every handler for a data frame; collect what they returned (for completion tracking). */
    private callHandlers;
    /**
     * Subscribe to one or more channels (connects on first call). Optional
     * server-side filters. `subscribe(channels, filters)` is the connection's
     * default subscription; `subscribe({ subId, channels, filters })` opens (or
     * extends) a NAMED subscription with its own channels and filters, whose
     * frames carry `evt.sub_id` (see StreamSubscription).
     */
    subscribe(channels: StreamChannel[], filters?: Record<string, unknown>): this;
    subscribe(opts: StreamSubscribeOptions): this;
    /**
     * Replace the filters of a subscription (`"default"` for the plain one).
     * The server acks with an `updated` frame; a refused update (for example a
     * `token:prices` subscription without valid `mints`) arrives as a `warning`
     * with code `invalid_filters` and the previous filters stay.
     */
    updateSubscription(subId: string, filters: Record<string, unknown>): this;
    /**
     * `unsubscribe(channels)` stops those channels on the default subscription;
     * `unsubscribe(subId)` removes a whole named subscription.
     */
    unsubscribe(channels: StreamChannel[]): this;
    unsubscribe(subId: string): this;
    /** Every subscription this client asks for (local view, no round trip). */
    getSubscriptions(): StreamSubscription[];
    /**
     * Ask the server what this connection holds (`list` → `subscriptions`).
     * Resolves with the local view when not connected or when the server does
     * not answer within `timeoutMs`.
     */
    listSubscriptions(timeoutMs?: number): Promise<StreamSubscription[]>;
    /**
     * A pre-Phase-2 server (ignores sub_id) answers every resume with ONE
     * replay for the whole connection, reported without sub_id: only "default"
     * can still be awaited. Finishes the recovery at once when that one has
     * already ended.
     */
    private collapsePending;
    /** A subscription removed while its replay was still awaited: stop waiting for it. */
    private forgetPending;
    /** Open the connection (also called implicitly by subscribe). Restarts a stream that went `"fatal"`. */
    connect(): Promise<void>;
    /** Close the connection and stop reconnecting. */
    close(): void;
    private handleClose;
    /** `onUnrecoverableGap: "stop"`: stop the stream and hand the decision to the caller. */
    private haltForGap;
    private fatal;
    /** The subscribe frames for the given subscriptions (default first, then named in creation order). */
    private subscribeFrames;
    /**
     * Send the subscribe(s). On a connection's FIRST subscribe (or an explicit
     * retry after a retryable gap) every subscription is sent with the SAME
     * resume cursor: the server serves one replay per subscription, one after
     * another, and holds live frames until the last replay_end. A later
     * subscribe adds channels live (no resume).
     */
    private sendSubscribe;
    /**
     * The server did not answer `resume` (older deployment): retry with the
     * legacy fields. Such a server has no named subscriptions either, so the
     * one legacy replay covers the union of channels and resolves every pending
     * subscription at once.
     */
    private fallbackToLegacy;
    private dropRecovery;
    /**
     * A retryable gap: ask the server again on this connection after its
     * retry_after_ms (row_cap resumes from resume_ts_hint). Bounded — the next
     * reconnect resumes anyway.
     */
    private scheduleResumeRetry;
    /**
     * One `replay_end` per subscription → one aggregate the single-replay logic
     * can run on unchanged: complete only when every subscription is; the
     * commit position is the SMALLEST last_seq / last_ts across them (a later
     * subscription's replay covered more, but the earlier one's live frames
     * from that point on are still only in the live flush); channel entries
     * keyed `"<sub_id>/<channel>"` for named subscriptions; `retryable` when
     * any subscription says so.
     */
    private aggregateEnds;
    private finishRecovery;
    private handleMessage;
    /** Dedupe by id, hand the frame to the handlers, track completion for the cursor. */
    private deliver;
    private drainInflight;
    /** Queue a position behind every frame still being handled (or apply it now). */
    private enqueue;
    /** Move `progress` (always) and the committed cursor (when `commit`) to `pos`. */
    private apply;
    private scheduleReconnect;
    private resetHeartbeat;
    private clearHeartbeat;
}
export {};
//# sourceMappingURL=stream.d.ts.map