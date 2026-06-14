/**
 * Real-time WebSocket streaming client.
 *
 * Wraps the connect → token → subscribe → event loop with auto-reconnect,
 * 24h-token auto-refresh, heartbeat liveness, and typed events, so consumers
 * never hand-roll connection management. Obtain one via `client.stream()`.
 *
 * Works in Node (uses the global `WebSocket` on Node 22+, else lazily imports
 * the optional `ws` package) and the browser (native WebSocket). Zero required
 * dependencies.
 */
import type { StreamToken } from "./types";
/** Channels you can subscribe to. */
export type StreamChannel = "kol:trades" | "kol:coordination" | "kol:first_touches" | "deployer:alerts" | "wallet_tracker:events" | "copytrade:signals" | "price_alert:events" | "sniper:deploys" | "token:graduations";
/** Event names delivered on those channels (subscribe to a channel, receive these). */
export type StreamEventName = "kol:trade" | "kol:coordination" | "kol:first_touch" | "deployer:alert" | "deployer:bond" | "wallet_tracker:event" | "copytrade:signal" | "price_alert:dip" | "price_alert:recovery" | "sniper:deploy" | "token:graduation";
/** Lifecycle events you can also listen for. */
export type StreamLifecycleEvent = "open" | "close" | "reconnect" | "subscribed" | "heartbeat" | "error";
export interface StreamEvent<T = unknown> {
    channel: StreamChannel;
    event: StreamEventName;
    data: T;
    ts: number;
}
export interface StreamClientOptions {
    /** Returns a fresh 24h stream token (the SDK wires this to getStreamToken()). */
    getToken: () => Promise<StreamToken>;
    /** Reconnect automatically on drop (default: true). */
    autoReconnect?: boolean;
    /** Max reconnect backoff in ms (default: 30000). */
    maxBackoffMs?: number;
    /** Reconnect if no server heartbeat arrives within this window (default: 90000). */
    heartbeatTimeoutMs?: number;
    /** Override the WebSocket implementation (e.g. inject `ws` explicitly). */
    WebSocketImpl?: unknown;
}
type Listener = (data: unknown, evt?: StreamEvent) => void;
export declare class MadeOnSolStream {
    private opts;
    private ws;
    private listeners;
    private desired;
    private closedByUser;
    private attempt;
    private hbTimer;
    private reconnectTimer;
    private connecting;
    constructor(opts: StreamClientOptions);
    /** Register a handler. Use an event name, `"*"` for every event, or a lifecycle event. */
    on(event: StreamEventName | StreamLifecycleEvent | "*", fn: Listener): this;
    /** Remove a handler (or all handlers for an event when `fn` is omitted). */
    off(event: string, fn?: Listener): this;
    private emit;
    /** Subscribe to one or more channels (connects on first call). Optional server-side filters. */
    subscribe(channels: StreamChannel[], filters?: Record<string, unknown>): this;
    /** Stop receiving the given channels. */
    unsubscribe(channels: StreamChannel[]): this;
    /** Open the connection (also called implicitly by subscribe). */
    connect(): Promise<void>;
    /** Close the connection and stop reconnecting. */
    close(): void;
    private sendSubscribe;
    private handleMessage;
    private scheduleReconnect;
    private resetHeartbeat;
    private clearHeartbeat;
}
export {};
//# sourceMappingURL=stream.d.ts.map