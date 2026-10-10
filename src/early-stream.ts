import type { EarlySubscribeControl, EarlyStreamFilters, EarlyEventFormat, EarlyWalletListControl, EarlyWalletListResult, EarlyObservationData, EarlyOutcomeData, StreamToken } from './types.js';
import { expandEarlyFrame } from './early-codec.js';
export { expandEarlyFrame } from './early-codec.js';
export type { EarlyChannel, EarlyAmountField, EarlyAmountFilter, EarlyStreamFilters, EarlyEventFormat, EarlySubscribeControl, EarlyUpdateControl, EarlyObservationBase, EarlyWalletLabel, EarlyDeployObservationData, EarlyTradeObservationData, EarlyLiquidityObservationData, EarlyMigrationObservationData, EarlyLockSchedule, EarlyLockObservationData, EarlyTokenChangeObservationData, EarlyObservationData, EarlyOutcomeData } from './types.js';

export interface EarlyCursor { instance: string; seq: number }
export interface EarlyFrame {
  event?: string; type?: string; sub_id?: string; id?: string; cursor?: EarlyCursor;
  data?: EarlyObservationData | EarlyOutcomeData | Record<string, unknown>; [key: string]: unknown;
}
export interface EarlyStreamOptions {
  /** Existing non-expiring token, fetched on every connect; never rotate here. */
  getToken: () => Promise<Pick<StreamToken, 'token' | 'early_ws_url'>>;
  subscriptions: EarlySubscribeControl[];
  /** Awaited in arrival order. A rejection stops delivery without committing. */
  onFrame: (frame: EarlyFrame) => void | Promise<void>;
  /** Diagnostic callback. Never receives credentials or raw transport errors. */
  onStatus?: (status: Record<string, unknown>) => void;
  /** Native browser/Node WebSocket by default; pass ws explicitly if desired. */
  WebSocketImpl?: unknown;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  maxAuthRetries?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  controlTimeoutMs?: number;
  maxPendingFrames?: number;
  maxPendingBytes?: number;
  dedupeSize?: number;
}
type Socket = Pick<WebSocket, 'send' | 'close' | 'readyState' | 'onopen' | 'onclose' | 'onerror' | 'onmessage'>;
type State = { control: EarlySubscribeControl; cursor: EarlyCursor | null; progress: EarlyCursor | null; recovering: boolean; blocked: boolean; seen: Set<string> };
type Pending = { id: string; ack: string; apply: (f: EarlyFrame) => void; resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
const cursor = (v: unknown): v is EarlyCursor => !!v && typeof v === 'object' && typeof (v as EarlyCursor).instance === 'string' && Number.isSafeInteger((v as EarlyCursor).seq) && (v as EarlyCursor).seq >= 0;
const encoder = new TextEncoder();
const idOf = (v: { sub_id?: string }) => v.sub_id ?? 'default';
function bounded(value: number | undefined, fallback: number, max: number) {
  const n = value ?? fallback;
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error('invalid_client_limit');
  return n;
}
function subscription(input: EarlySubscribeControl): EarlySubscribeControl {
  if (!input || input.type !== 'subscribe' || !/^[A-Za-z0-9_.-]{1,64}$/.test(idOf(input)) ||
      !Array.isArray(input.channels) || !input.channels.length || input.channels.length > 6 || input.channels.some(c => !['early:deploys', 'early:locks', 'early:trades', 'early:liquidity', 'early:migrations', 'early:token_changes'].includes(c)) ||
      !['full', 'compact-v1'].includes(input.format ?? 'full') || (input.resume !== undefined && !cursor(input.resume))) throw new Error('invalid_subscription');
  const copy = JSON.parse(JSON.stringify(input)) as EarlySubscribeControl;
  if (JSON.stringify(copy).length > 32_000) throw new Error('control_too_large');
  return copy;
}

/** Managed ShredPrism early-stream client (4.1.0+). Bounded process-local
 * recovery, per-subscription checkpoints, explicit gaps; never durable history. */
export class MadeOnSolEarlyStream {
  private readonly states = new Map<string, State>();
  private readonly limits;
  private socket: Socket | null = null;
  private pending: Pending | null = null;
  private readonly replayTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private stopped = true;
  private ready = false;
  private attempts = 0;
  private authFailures = 0;
  private queue = Promise.resolve();
  private queuedFrames = 0;
  private queuedBytes = 0;
  constructor(private readonly options: EarlyStreamOptions) {
    this.limits = {
      attempts: bounded(options.maxReconnectAttempts, 10, 100), auth: bounded(options.maxAuthRetries, 3, 10),
      backoff: bounded(options.backoffMs, 500, 60_000), maxBackoff: bounded(options.maxBackoffMs, 30_000, 300_000),
      timeout: bounded(options.controlTimeoutMs, 15_000, 120_000), frames: bounded(options.maxPendingFrames, 2048, 100_000),
      bytes: bounded(options.maxPendingBytes, 8 * 1024 * 1024, 64 * 1024 * 1024), dedupe: bounded(options.dedupeSize, 10_000, 100_000),
    };
    if (!Array.isArray(options.subscriptions) || options.subscriptions.length > 10) throw new Error('invalid_subscriptions');
    for (const raw of options.subscriptions) {
      const control = subscription(raw), id = idOf(control);
      if (this.states.has(id)) throw new Error('duplicate_sub_id');
      this.states.set(id, { control, cursor: control.resume ? { ...control.resume } : null, progress: null, recovering: false, blocked: false, seen: new Set() });
      delete control.resume;
    }
  }
  private status(type: string, detail: Record<string, unknown> = {}) {
    try { this.options.onStatus?.({ type, ...detail }); } catch { /* diagnostics cannot advance or disrupt delivery */ }
  }
  getSubscriptions() { return [...this.states.values()].map(s => structuredClone(s.control)); }
  getCursors(): Record<string, EarlyCursor | null> { return Object.fromEntries([...this.states].map(([id, s]) => [id, s.cursor && { ...s.cursor }])); }
  /** Explicitly skip the reported missing range; never called automatically. */
  acceptGap(id = 'default') {
    const s = this.states.get(id);
    if (!s || s.recovering || !this.ready || !s.progress) throw new Error('gap_not_ready');
    const from = s.cursor; s.blocked = false; s.cursor = { ...s.progress };
    this.status('gap_accepted', { sub_id: id, from, to: s.cursor });
  }
  connect() {
    if (!this.stopped) return;
    this.stopped = false; this.attempts = 0; this.authFailures = 0;
    void this.open();
  }
  close() {
    this.stopped = true; this.ready = false; this.generation++;
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null;
    this.rejectPending('client_closed');
    for (const timer of this.replayTimers.values()) clearTimeout(timer); this.replayTimers.clear();
    const ws = this.socket; this.socket = null; ws?.close(1000, 'Client stopped');
  }
  private fatal(reason: string) { this.close(); this.status('fatal', { reason }); }
  private rejectPending(reason: string) {
    const p = this.pending; this.pending = null;
    if (p) { clearTimeout(p.timer); p.reject(new Error(reason)); }
  }
  private retry(code: number) {
    if (this.stopped) return;
    if (code === 4001 && ++this.authFailures >= this.limits.auth) { this.fatal('authorization_rejected'); return; }
    if ([1008, 4003].includes(code)) { this.fatal('policy_rejected'); return; }
    if (this.options.autoReconnect === false || ++this.attempts > this.limits.attempts) { this.fatal('reconnect_exhausted'); return; }
    const delayMs = Math.max(code === 4002 ? 60_000 : 0, Math.min(this.limits.maxBackoff, this.limits.backoff * 2 ** Math.min(this.attempts - 1, 20)) * (0.8 + Math.random() * 0.2));
    this.status('reconnect', { code, attempt: this.attempts, delayMs });
    this.timer = setTimeout(() => { this.timer = null; void this.open(); }, delayMs);
  }
  private async open() {
    const gen = ++this.generation; this.ready = false;
    this.watchdog = setTimeout(() => this.disconnect(gen, 1006, 'connection_timeout'), this.limits.timeout);
    try {
      const token = await this.options.getToken();
      if (this.stopped || gen !== this.generation) return;
      if (!token.early_ws_url) { this.fatal('early_stream_unavailable'); return; }
      if (!/^[A-Za-z0-9_-]{32,128}$/.test(token.token)) { this.fatal('invalid_stream_token'); return; }
      const url = new URL(token.early_ws_url);
      if ((url.protocol !== 'wss:' && !(url.protocol === 'ws:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) || url.username || url.password || url.hash || url.search) { this.fatal('invalid_early_url'); return; }
      url.searchParams.set('token', token.token); // browser-compatible; never surfaced in diagnostics
      const Impl = (this.options.WebSocketImpl ?? globalThis.WebSocket) as new (url: string) => Socket;
      if (!Impl) { this.fatal('websocket_unavailable'); return; }
      const ws = new Impl(url.toString()); this.socket = ws;
      ws.onmessage = ev => this.enqueue(gen, ev.data);
      ws.onerror = () => this.disconnect(gen, 1006, 'transport_error');
      ws.onclose = ev => this.disconnect(gen, ev.code, 'socket_closed');
    } catch { this.disconnect(gen, 1006, 'token_or_connect_failed'); }
  }
  private disconnect(gen: number, code: number, reason: string) {
    if (gen !== this.generation || this.stopped) return;
    this.generation++; this.ready = false;
    if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null;
    this.rejectPending('connection_lost');
    for (const timer of this.replayTimers.values()) clearTimeout(timer); this.replayTimers.clear();
    const ws = this.socket; this.socket = null; ws?.close(1000, 'Reconnect');
    this.status('close', { code, reason }); this.retry(code);
  }
  private enqueue(gen: number, raw: unknown) {
    if (gen !== this.generation || this.stopped) return;
    if (typeof raw !== 'string') { this.fatal('unexpected_binary_frame'); return; }
    if (raw.length > this.limits.bytes) { this.fatal('client_queue_limit'); return; }
    const bytes = encoder.encode(raw).length;
    if (this.queuedFrames + 1 > this.limits.frames || this.queuedBytes + bytes > this.limits.bytes) {
      this.fatal('client_queue_limit'); return;
    }
    this.queuedFrames++; this.queuedBytes += bytes;
    this.queue = this.queue.then(async () => {
      if (gen !== this.generation || this.stopped) return;
      let frame: EarlyFrame;
      try { frame = expandEarlyFrame(JSON.parse(raw)); } catch { this.fatal('invalid_frame'); return; }
      await this.receive(gen, frame);
    }).catch(() => { if (gen === this.generation) this.fatal('handler_failed'); }).finally(() => { this.queuedFrames--; this.queuedBytes -= bytes; });
  }
  private async receive(gen: number, f: EarlyFrame) {
    if (f.type === 'connected') {
      if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null;
      this.ready = true; this.status('connected');
      void this.restore(gen); return;
    }
    const id = idOf(f), s = this.states.get(id);
    if (f.type === 'warning') {
      this.status('warning', { code: f.code });
      this.rejectPending(typeof f.code === 'string' ? f.code : 'control_rejected'); return;
    }
    const p = this.pending;
    if (p && f.type === p.ack && id === p.id) {
      this.pending = null; clearTimeout(p.timer); p.apply(f); p.resolve();
      this.authFailures = 0; this.status(String(f.type), { sub_id: id, wallet_list: f.wallet_list }); return;
    }
    if (f.type === 'gap' || f.event === 'early:gap') {
      for (const [key, state] of this.states) if (!f.sub_id || key === id) state.blocked = true;
      await this.options.onFrame(f); this.status('gap', { sub_id: f.sub_id, reason: f.reason }); return;
    }
    if (f.type === 'wallet_list_updated') { this.status('wallet_list_updated', { sub_id: id, wallet_list: f.wallet_list }); return; }
    if (f.type === 'wallet_list_unavailable') {
      if (s) { s.blocked = true; s.recovering = false; }
      clearTimeout(this.replayTimers.get(id)); this.replayTimers.delete(id);
      await this.options.onFrame({ type: 'gap', sub_id: id, reason: f.reason, wallet_list: f.wallet_list });
      this.status('gap', { sub_id: id, reason: f.reason }); return;
    }
    if (!s) return;
    if (f.type === 'replay_start') { s.recovering = true; return; }
    if (f.type === 'replay_end') {
      clearTimeout(this.replayTimers.get(id)); this.replayTimers.delete(id);
      s.recovering = false;
      if (f.complete === true && cursor(f.cursor) && !s.blocked) {
        s.cursor = { ...f.cursor };
        if (s.progress?.instance === s.cursor.instance && s.progress.seq > s.cursor.seq) s.cursor = { ...s.progress };
      } else {
        s.blocked = true;
        await this.options.onFrame({ type: 'gap', sub_id: id, reason: f.reason ?? 'incomplete_replay', durable: false });
      }
      this.status('replay', { sub_id: id, complete: f.complete === true && !s.blocked, cursor: s.cursor }); return;
    }
    if (!['early:observed', 'early:outcome'].includes(f.event ?? '')) return;
    if (!cursor(f.cursor) || typeof f.id !== 'string' || !f.data || typeof f.data !== 'object' || Array.isArray(f.data)) { this.fatal('invalid_event'); return; }
    const key = `${f.event}:${f.id}`;
    if (!s.seen.has(key)) {
      await this.options.onFrame(f);
      if (gen !== this.generation || this.stopped) return;
      s.seen.add(key);
      if (s.seen.size > this.limits.dedupe) s.seen.delete(s.seen.values().next().value!);
    }
    if (!s.progress || s.progress.instance !== f.cursor.instance || f.cursor.seq > s.progress.seq) s.progress = { ...f.cursor };
    if (!s.recovering && !s.blocked) s.cursor = { ...s.progress };
    this.attempts = 0;
  }
  private command(control: Record<string, unknown>, ack: string, apply: (f: EarlyFrame) => void): Promise<void> {
    if (!this.ready || this.socket?.readyState !== 1) return Promise.reject(new Error('not_connected'));
    if (this.pending) return Promise.reject(new Error('control_in_progress'));
    return new Promise((resolve, reject) => {
      this.pending = { id: idOf(control), ack, apply, resolve, reject, timer: setTimeout(() => this.disconnect(this.generation, 1006, 'control_timeout'), this.limits.timeout) };
      try { this.socket!.send(JSON.stringify(control)); } catch { this.disconnect(this.generation, 1006, 'control_send_failed'); }
    });
  }
  private async restore(gen: number) {
    for (const [id, s] of this.states) {
      if (gen !== this.generation || this.stopped) return;
      s.recovering = !!s.cursor;
      // A new recovery re-evaluates the old range; any remaining gap is reported again.
      if (s.recovering) s.blocked = false;
      if (s.recovering) this.replayTimers.set(id, setTimeout(() => {
        this.status('gap', { sub_id: id, reason: 'replay_timeout' });
        this.disconnect(gen, 1006, 'replay_timeout');
      }, this.limits.timeout));
      try {
        await this.command({ ...s.control, ...(s.cursor ? { resume: s.cursor } : {}) }, 'subscribed', f => {
          if (cursor(f.cursor)) {
            if (!s.cursor) s.cursor = { ...f.cursor };
            if (!s.progress || s.progress.instance !== f.cursor.instance || s.progress.seq < f.cursor.seq) s.progress = { ...f.cursor };
          }
        });
      } catch (error) {
        if (gen === this.generation && !this.stopped) this.fatal(`subscription_rejected:${(error as Error).message}`);
        return;
      }
      this.status('subscription_restored', { sub_id: id });
    }
    if (gen === this.generation) this.status('ready');
  }
  /** Await the previous control before issuing another. A rejected update keeps
   * the accepted configuration, including across reconnect. */
  updateSubscription(id: string, change: { filters?: EarlyStreamFilters; format?: EarlyEventFormat; wallet_list?: string | null }) {
    const s = this.states.get(id);
    if (!s || s.recovering || s.blocked) return Promise.reject(new Error('subscription_not_ready'));
    const patch = { ...(change.wallet_list === undefined ? {} : { wallet_list: change.wallet_list }), ...(change.filters === undefined ? {} : { filters: change.filters }), ...(change.format === undefined ? {} : { format: change.format }) };
    const next = subscription({ ...s.control, ...patch });
    return this.command({ type: 'update', sub_id: id, ...patch }, 'updated', () => { s.control = next; });
  }
  /** Configure with subscriptions: [] to manage lists before adding a stream. */
  async manageWalletList(control: EarlyWalletListControl): Promise<EarlyWalletListResult> {
    let result: EarlyWalletListResult | undefined;
    await this.command({ ...control, type: 'wallet_list' }, 'wallet_list_result', f => { result = f as unknown as EarlyWalletListResult; });
    return result!;
  }
  subscribe(raw: EarlySubscribeControl) {
    const control = subscription(raw), id = idOf(control);
    if (this.states.has(id) || this.states.size >= 10) return Promise.reject(new Error('subscription_limit_or_duplicate'));
    const from = control.resume ? { ...control.resume } : null;
    const saved = { ...control }; delete saved.resume;
    return this.command(control as unknown as Record<string, unknown>, 'subscribed', f => {
      this.states.set(id, { control: saved, cursor: from ?? (cursor(f.cursor) ? { ...f.cursor } : null), progress: cursor(f.cursor) ? { ...f.cursor } : null, recovering: !!from, blocked: false, seen: new Set() });
      if (from) { const gen = this.generation; this.replayTimers.set(id, setTimeout(() => {
        this.status('gap', { sub_id: id, reason: 'replay_timeout' }); this.disconnect(gen, 1006, 'replay_timeout');
      }, this.limits.timeout)); }
    });
  }
  unsubscribe(id = 'default') {
    if (!this.states.has(id)) return Promise.reject(new Error('unknown_sub_id'));
    return this.command({ type: 'unsubscribe', sub_id: id }, 'unsubscribed', () => { this.states.delete(id); });
  }
}
