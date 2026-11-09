import type { StreamToken } from './types.js';

/**
 * Managed client for the Solana DEX firehose `wss://madeonsol.com/ws/v1/dex-stream`
 * (ULTRA / BUSINESS / ENTERPRISE). 4.7.0+.
 *
 * The socket has no seq cursor: recovery after a reconnect is the server's
 * in-memory ring (`replay: N`, at most 500 trades per subscription), so this
 * client re-subscribes with an ascending replay and drops frames it already
 * delivered. When the ring cannot reach back to the last delivered trade the
 * client reports a `gap` status instead of pretending the tape is complete.
 *
 * Dedupe keys: `dex:trades` = tx_signature + wallet + action + mint (one row
 * per trader per transaction, as served); `dex:route` / `dex:leg` /
 * `dex:liquidity` = their stable `id`.
 */
export interface DexStreamFilters {
  token_mint?: string; token_mints?: string[]; wallet?: string; wallets?: string[];
  dex?: string | string[]; program?: string; action?: 'buy' | 'sell';
  deployer_tier?: string | string[]; token_age_max_seconds?: number;
  market_cap_min_sol?: number; market_cap_max_sol?: number;
  /** Default on the server is 0.05 SOL; pass 0 to receive every trade (dust trades carry `dust: true`). */
  min_sol?: number;
  [key: string]: unknown;
}
export interface DexStreamSubscription {
  sub_id: string;
  filters: DexStreamFilters;
  legs?: boolean | 'only';
  liquidity?: boolean | 'only';
}
export interface DexTradeData {
  wallet: string; mint: string; action: 'buy' | 'sell'; sol_amount: number; token_amount: number;
  tx_signature: string; block_time: number; slot: number | null; program: string | null; dex: string | null;
  executed_price_sol: number | null; pool_address: string | null; dust: boolean; [key: string]: unknown;
}
export interface DexStreamFrame {
  channel: 'dex:trades' | 'dex:route' | 'dex:leg' | 'dex:liquidity' | string;
  sub_id: string; id?: string; data: DexTradeData | Record<string, unknown>; replay?: boolean; ts?: number;
}
export interface DexStreamOptions {
  /** Existing non-expiring stream token (POST /api/v1/stream/token); fetched on every connect. */
  getToken: () => Promise<Pick<StreamToken, 'token' | 'dex_ws_url'>>;
  subscriptions: DexStreamSubscription[];
  onFrame: (frame: DexStreamFrame) => void;
  /** Lifecycle: connecting, connected, subscribed, replay_done, gap, close, reconnect, fatal, server_error. Never carries credentials. */
  onStatus?: (status: Record<string, unknown>) => void;
  WebSocketImpl?: unknown;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  /** Trades replayed on a RECONNECT (1–500, default 500). */
  replayOnReconnect?: number;
  /** Trades replayed on the FIRST connect (0–500, default 0). */
  initialReplay?: number;
  /** Per-subscription dedupe memory (default 20,000 keys). */
  dedupeSize?: number;
}
type Socket = Pick<WebSocket, 'send' | 'close' | 'readyState' | 'onopen' | 'onclose' | 'onerror' | 'onmessage'>;
type SubState = { sub: DexStreamSubscription; seen: Set<string>; order: string[]; lastBlockTime: number | null; replaying: boolean; replayOldest: number | null; anchor: number | null };

const SUB_ID = /^[A-Za-z0-9_.-]{1,64}$/;
function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  const n = value ?? fallback;
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error('invalid_client_limit');
  return n;
}
/** Dedupe key of one frame; null when the frame carries nothing stable to key on. */
export function dexFrameKey(frame: DexStreamFrame): string | null {
  if (frame.channel === 'dex:trades') {
    const d = frame.data as Partial<DexTradeData>;
    if (typeof d?.tx_signature !== 'string' || !d.tx_signature) return null;
    return `t|${d.tx_signature}|${d.wallet ?? ''}|${d.action ?? ''}|${d.mint ?? ''}`;
  }
  return typeof frame.id === 'string' && frame.id ? `${frame.channel}|${frame.id}` : null;
}

export class MadeOnSolDexStream {
  private readonly subs = new Map<string, SubState>();
  private readonly limits;
  private socket: Socket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private stopped = true;
  private attempts = 0;
  private connects = 0;
  constructor(private readonly options: DexStreamOptions) {
    this.limits = {
      attempts: bounded(options.maxReconnectAttempts, 20, 1, 1000),
      backoff: bounded(options.backoffMs, 500, 1, 60_000), maxBackoff: bounded(options.maxBackoffMs, 30_000, 1, 300_000),
      replay: bounded(options.replayOnReconnect, 500, 1, 500), initial: bounded(options.initialReplay, 0, 0, 500),
      dedupe: bounded(options.dedupeSize, 20_000, 100, 200_000),
    };
    if (!Array.isArray(options.subscriptions) || !options.subscriptions.length || options.subscriptions.length > 5) throw new Error('invalid_subscriptions');
    for (const sub of options.subscriptions) {
      if (!sub || !SUB_ID.test(sub.sub_id) || !sub.filters || typeof sub.filters !== 'object') throw new Error('invalid_subscription');
      if (this.subs.has(sub.sub_id)) throw new Error('duplicate_sub_id');
      this.subs.set(sub.sub_id, { sub: JSON.parse(JSON.stringify(sub)), seen: new Set(), order: [], lastBlockTime: null, replaying: false, replayOldest: null, anchor: null });
    }
  }
  private status(type: string, detail: Record<string, unknown> = {}) {
    try { this.options.onStatus?.({ type, ...detail }); } catch { /* diagnostics never disrupt delivery */ }
  }
  connect() {
    if (!this.stopped) return;
    this.stopped = false; this.attempts = 0;
    void this.open();
  }
  close() {
    this.stopped = true; this.generation++;
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    const ws = this.socket; this.socket = null; ws?.close(1000, 'Client stopped');
  }
  /** Last delivered trade's block_time per subscription (ingest-clock seconds), for display. */
  getProgress(): Record<string, number | null> { return Object.fromEntries([...this.subs].map(([id, s]) => [id, s.lastBlockTime])); }
  private fatal(reason: string) { this.close(); this.status('fatal', { reason }); }
  private retry(code: number) {
    if (this.stopped) return;
    if (code === 4001 || code === 4003 || code === 1008) { this.fatal(code === 4001 ? 'authorization_rejected' : 'policy_rejected'); return; }
    if (this.options.autoReconnect === false || ++this.attempts > this.limits.attempts) { this.fatal('reconnect_exhausted'); return; }
    const base = Math.min(this.limits.maxBackoff, this.limits.backoff * 2 ** Math.min(this.attempts - 1, 20));
    const delayMs = Math.max(code === 4002 ? 60_000 : 0, Math.round(base * (0.8 + Math.random() * 0.2)));
    this.status('reconnect', { code, attempt: this.attempts, delayMs });
    this.timer = setTimeout(() => { this.timer = null; void this.open(); }, delayMs);
  }
  private async open() {
    const gen = ++this.generation;
    this.status('connecting', { attempt: this.attempts });
    try {
      const token = await this.options.getToken();
      if (this.stopped || gen !== this.generation) return;
      if (!token.dex_ws_url) { this.fatal('dex_stream_unavailable'); return; }
      if (!/^[A-Za-z0-9_-]{32,128}$/.test(token.token)) { this.fatal('invalid_stream_token'); return; }
      const url = new URL(token.dex_ws_url);
      if ((url.protocol !== 'wss:' && !(url.protocol === 'ws:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) || url.username || url.password || url.hash) { this.fatal('invalid_dex_url'); return; }
      url.searchParams.set('token', token.token); // never surfaced in diagnostics
      const Impl = (this.options.WebSocketImpl ?? globalThis.WebSocket) as new (url: string) => Socket;
      if (!Impl) { this.fatal('websocket_unavailable'); return; }
      const ws = new Impl(url.toString()); this.socket = ws;
      ws.onmessage = ev => this.onMessage(gen, ev.data);
      ws.onerror = () => this.disconnect(gen, 1006, 'transport_error');
      ws.onclose = ev => this.disconnect(gen, ev.code, 'socket_closed');
    } catch { this.disconnect(gen, 1006, 'token_or_connect_failed'); }
  }
  private disconnect(gen: number, code: number, reason: string) {
    if (gen !== this.generation || this.stopped) return;
    this.generation++;
    const ws = this.socket; this.socket = null; ws?.close(1000, 'Reconnect');
    this.status('close', { code, reason }); this.retry(code);
  }
  private subscribeAll() {
    const reconnect = this.connects > 1;
    for (const s of this.subs.values()) {
      const replay = reconnect ? this.limits.replay : this.limits.initial;
      s.replaying = replay > 0; s.replayOldest = null; s.anchor = s.lastBlockTime;
      const msg: Record<string, unknown> = { type: 'subscribe', sub_id: s.sub.sub_id, filters: s.sub.filters };
      if (s.sub.legs !== undefined) msg.legs = s.sub.legs;
      if (s.sub.liquidity !== undefined) msg.liquidity = s.sub.liquidity;
      if (replay > 0) { msg.replay = replay; msg.replay_order = 'asc'; }
      this.socket?.send(JSON.stringify(msg));
    }
  }
  private remember(s: SubState, key: string) {
    s.seen.add(key); s.order.push(key);
    if (s.order.length > this.limits.dedupe) s.seen.delete(s.order.shift()!);
  }
  private onMessage(gen: number, raw: unknown) {
    if (gen !== this.generation || this.stopped) return;
    if (typeof raw !== 'string') return;
    let f: Record<string, unknown>;
    try { f = JSON.parse(raw); } catch { return; }
    if (f.type === 'connected') { this.connects++; this.attempts = 0; this.status('connected', { tier: f.tier, reconnect: this.connects > 1 }); this.subscribeAll(); return; }
    if (f.type === 'subscribed') { this.status('subscribed', { sub_id: f.sub_id, filters: f.filters }); return; }
    if (f.type === 'error') { this.status('server_error', { sub_id: f.sub_id, message: f.message }); return; }
    if (f.type === 'replay_done') {
      const s = this.subs.get(String(f.sub_id));
      if (s) {
        s.replaying = false;
        const full = typeof f.matched === 'number' && typeof f.requested === 'number' && f.matched >= f.requested;
        // A full replay whose oldest trade is newer than the last one we delivered
        // may not reach back far enough: say so instead of claiming continuity.
        const gap = this.connects > 1 && s.anchor != null && (f.complete === false || (full && s.replayOldest != null && s.replayOldest > s.anchor));
        this.status('replay_done', { sub_id: s.sub.sub_id, sent: f.sent, requested: f.requested, matched: f.matched, complete: f.complete });
        if (gap) this.status('gap', { sub_id: s.sub.sub_id, last_delivered_block_time: s.anchor, replay_oldest_block_time: s.replayOldest, complete: f.complete });
      }
      return;
    }
    if (typeof f.channel !== 'string' || typeof f.sub_id !== 'string') return;
    const s = this.subs.get(f.sub_id);
    if (!s) return;
    const frame = f as unknown as DexStreamFrame;
    const bt = frame.channel === 'dex:trades' ? Number((frame.data as DexTradeData)?.block_time) : NaN;
    if (frame.replay && Number.isFinite(bt) && (s.replayOldest == null || bt < s.replayOldest)) s.replayOldest = bt;
    const key = dexFrameKey(frame);
    if (key) { if (s.seen.has(key)) return; this.remember(s, key); }
    if (Number.isFinite(bt) && (s.lastBlockTime == null || bt > s.lastBlockTime)) s.lastBlockTime = bt;
    try { this.options.onFrame(frame); } catch { /* a consumer error never breaks the socket */ }
  }
}
