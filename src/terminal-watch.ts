/* Mirrored from src/lib/terminal-realtime/watch.ts; see SDK parity tests. */
/**
 * Framework-agnostic terminal snapshot/stream bridge (#534).
 *
 * A shared SDK socket supplies push frames. Snapshot reads happen once after
 * the named subscription is ACKED, then only on coalesced, named invalidations.
 * This deliberately NEVER patches REST module data from unrelated clocks.
 *
 * Instantiate once per selected token, reusing one existing stream connection.
 * The controller never closes that shared stream on dispose().
 */
import {
  planTerminalWatch, rulesForEvent, TERMINAL_MODULE_COSTS,
  type TerminalWatchPlan, type TerminalModule, type TerminalChain, type TerminalTier,
} from "./terminal-policy.js";

export interface TerminalStreamFrame {
  channel?: string;
  event?: string;
  sub_id?: string;
  id?: string;
  data?: unknown;
  ts?: number;
  replayed?: boolean;
  snapshot?: boolean;
}

/** Adaptable to the existing MadeOnSolStream / RobinhoodChainStream overloads. */
export interface TerminalStreamPort {
  subscribe(opts: { subId: string; channels: string[]; filters: Record<string, unknown> }): unknown;
  unsubscribe(subId: string): unknown;
  on(event: string, listener: (...args: unknown[]) => unknown): unknown;
  off(event: string, listener: (...args: unknown[]) => unknown): unknown;
}

export interface TerminalModuleResponse {
  status: "ready" | "partial_history" | "unverified" | "unavailable" | "timeout";
  reason: string | null;
  as_of: string | null;
  data?: Record<string, unknown>;
}
export interface TerminalSnapshotResponse {
  chain: TerminalChain;
  address: string;
  generated_at: string;
  modules: Partial<Record<TerminalModule, TerminalModuleResponse>>;
}
export type TerminalPhase = "idle" | "awaiting_subscribe" | "bootstrapping" | "live" | "degraded" | "stopped";
export interface TerminalView {
  phase: TerminalPhase;
  address: string;
  chain: TerminalChain;
  /** Untouched REST modules; use the latest live frame as a separate overlay. */
  snapshot: TerminalSnapshotResponse | null;
  live: Partial<Record<TerminalModule, TerminalStreamFrame>>;
  /** A known event or gap may have made a cached module stale. */
  stale: TerminalModule[];
  /** A module without an adequate existing WS source is snapshot-only. */
  no_push: TerminalModule[];
  /** A stream interruption or refusal must be visible to the terminal. */
  incomplete: boolean;
  last_error: string | null;
}

export interface TerminalViewOptions {
  chain: TerminalChain;
  address: string;
  tier: TerminalTier;
  include: readonly TerminalModule[];
  /** Full RHC DEX firehose (all tokens) is high-bandwidth; opt in explicitly. */
  includeRhcFirehose?: boolean;
  /** KOL channels are unscoped broadcasts; opt in only with bandwidth budget. */
  includeKolBroadcast?: boolean;
  subId: string;
  stream: TerminalStreamPort;
  /** The existing keyed REST .tokenIntelligence(address, {include}) call. */
  read: (include: readonly TerminalModule[]) => Promise<TerminalSnapshotResponse>;
  onChange?: (view: TerminalView) => void;
  onLive?: (frame: TerminalStreamFrame, module: TerminalModule) => void;
  /** Min seconds per module before another HTTP refresh (default 15s). */
  minModuleRefreshMs?: number;
  /** Debounce and coalesce changed modules (default 750ms). */
  debounceMs?: number;
  now?: () => number;
}

const ACK_SUBSCRIBE = "subscribed";
const MAX_DEDUPE_IDS = 512;
type EventFn = (...args: unknown[]) => unknown;

/** Bounded by nine modules and one frame per live overlay; never a trade queue. */
export class TerminalTokenView {
  readonly plan: TerminalWatchPlan;
  private readonly opts: TerminalViewOptions;
  private readonly listeners = new Map<string, EventFn>();
  private readonly dirty = new Set<TerminalModule>();
  private readonly stale = new Set<TerminalModule>();
  private readonly seen = new Map<string, number>();
  private readonly live: Partial<Record<TerminalModule, TerminalStreamFrame>> = {};
  private readonly gen = new Map<TerminalModule, number>();
  private readonly lastRead = new Map<TerminalModule, number>();
  private readonly now: () => number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timerAt = 0;
  private busy = false;
  /** If the socket ACK arrives while a prior REST read is still unresolved,
   * the latest post-ACK snapshot must run after that read settles. */
  private pendingBootstrap = false;
  private subscribed = false;
  private epoch = 0;
  private phase: TerminalPhase = "idle";
  private incomplete = false;
  /** An observed historical gap survives a new REST snapshot and reconnect. */
  private gapUnresolved = false;
  private lastError: string | null = null;
  private snapshot: TerminalSnapshotResponse | null = null;

  constructor(options: TerminalViewOptions) {
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(options.subId) || options.subId === "default") {
      throw new Error("named_sub_id_required");
    }
    const n = options.minModuleRefreshMs ?? 15_000;
    const d = options.debounceMs ?? 750;
    if (!Number.isFinite(n) || n < 1_000 || n > 600_000 ||
        !Number.isFinite(d) || d < 0 || d > 30_000) throw new Error("invalid_refresh_budget");
    this.plan = planTerminalWatch(options);
    this.opts = options;
    this.now = options.now ?? Date.now;
    for (const m of this.plan.include) this.gen.set(m, 0);
  }

  getView(): TerminalView {
    return {
      phase: this.phase, address: this.plan.address, chain: this.plan.chain,
      snapshot: this.snapshot,
      live: { ...this.live },
      stale: [...this.stale],
      no_push: [...this.plan.modules_without_push],
      incomplete: this.incomplete,
      last_error: this.lastError,
    };
  }

  /** Registers handlers BEFORE opening the stream; first REST read waits for ACK. */
  start(): void {
    if (this.phase !== "idle") throw new Error("already_started");
    this.phase = this.plan.channels.length ? "awaiting_subscribe" : "bootstrapping";
    this.emit();
    if (!this.plan.channels.length) { void this.fetchModules(this.plan.include, true); return; }

    this.listen("*", (data, frame) => this.onFrame(frame as TerminalStreamFrame | undefined));
    this.listen(ACK_SUBSCRIBE, (_channels, ack) => this.onSubscribed(ack as Record<string, unknown> | undefined));
    this.listen("close", () => {
      if (this.phase === "stopped") return;
      // A fetch launched on the old socket can no longer be trusted.
      this.epoch++;
      this.pendingBootstrap = false;
      this.subscribed = false;
      this.incomplete = true;
      this.phase = "awaiting_subscribe";
      this.markStale(this.plan.include);
      this.clearTimer();
      this.emit();
    });
    this.listen("warning", (warn) => this.onWarning(warn));
    this.listen("gap", (gap) => this.onGap(gap));
    this.listen("fatal", () => {
      this.subscribed = false;
      this.incomplete = true;
      this.phase = "degraded";
      this.markStale(this.plan.include);
      this.clearTimer();
      this.emit();
    });

    this.opts.stream.subscribe({
      subId: this.opts.subId,
      channels: [...this.plan.channels],
      filters: this.plan.filters,
    });
  }

  /** Consumer-initiated refresh, useful after a known unrecoverable gap. */
  refresh(): void {
    if (this.phase === "idle" || this.phase === "stopped") throw new Error("watch_not_active");
    this.markStale(this.plan.include);
    for (const m of this.plan.include) this.dirty.add(m);
    this.schedule(0);
  }

  /**
   * The caller must independently reconcile an unrecoverable event interval
   * BEFORE clearing the visible gap. A fresh snapshot is not that evidence.
   */
  acknowledgeHistoricalRecovery(): void {
    if (!this.gapUnresolved || this.phase === "stopped") return;
    this.gapUnresolved = false;
    this.incomplete = !this.subscribed;
    if (this.lastError === "stream_gap") this.lastError = null;
    if (!this.incomplete && this.snapshot) this.phase = "live";
    this.emit();
  }

  dispose(): void {
    if (this.phase === "stopped") return;
    this.epoch++;
    this.pendingBootstrap = false;
    this.phase = "stopped";
    this.subscribed = false;
    this.clearTimer();
    for (const [event, fn] of this.listeners) this.opts.stream.off(event, fn);
    this.listeners.clear();
    if (this.plan.channels.length) this.opts.stream.unsubscribe(this.opts.subId);
    this.emit();
  }

  private isStopped(): boolean { return this.phase === "stopped"; }

  // A throwing UI callback must never leave the controller half-updated.
  private emit(): void { try { this.opts.onChange?.(this.getView()); } catch { /* consumer */ } }

  private listen(event: string, cb: EventFn): void {
    this.listeners.set(event, cb);
    this.opts.stream.on(event, cb);
  }

  private onSubscribed(ack?: Record<string, unknown>): void {
    if (this.phase === "stopped" || !ack || ack.sub_id !== this.opts.subId) return;
    const channels = Array.isArray(ack.channels) ? ack.channels : [];
    // A partial or silently rejected subscription cannot be treated as live.
    if (!this.plan.channels.every(ch => channels.includes(ch))) {
      this.incomplete = true;
      this.subscribed = false;
      this.lastError = "subscription_incomplete";
      this.phase = "degraded";
      this.markStale(this.plan.include);
      this.emit();
      return;
    }
    // Invalidate any in-flight REST read from before this ACK/reconnect.
    this.epoch++;
    this.subscribed = true;
    // Re-ACK proves a live subscription again, not that old trade events
    // reported missing by the SDK have been reconstructed.
    this.incomplete = this.gapUnresolved;
    this.lastError = this.gapUnresolved ? "stream_gap" : null;
    this.clearTimer();
    // A re-subscribe after reconnect ALWAYS re-reads a bounded snapshot. We
    // cannot compare clocks from REST and WS as one total-order watermark.
    this.phase = "bootstrapping";
    this.pendingBootstrap = true;
    for (const m of this.plan.include) this.dirty.add(m);
    this.emit();
    if (!this.busy) {
      this.pendingBootstrap = false;
      void this.fetchModules(this.plan.include, true);
    }
  }

  private onWarning(value: unknown): void {
    if (!value || typeof value !== "object" || this.phase === "stopped") return;
    const w = value as Record<string, unknown>;
    // Named-subscription warnings always carry sub_id; one without it belongs
    // to the connection default subscription, not this terminal view.
    if (w.sub_id !== this.opts.subId) return;
    if (["channels_rejected", "channels_revoked", "named_subscriptions_unsupported", "invalid_filters",
      // The server refuses the whole subscribe with these and sends NO ack.
      "too_many_subscriptions", "invalid_sub_id", "unknown_sub_id"].includes(String(w.code))) {
      // An already-started read cannot certify a revoked/invalid connection.
      this.epoch++;
      this.pendingBootstrap = false;
      this.subscribed = false;
      this.incomplete = true;
      this.lastError = String(w.code);
      this.phase = "degraded";
      this.clearTimer();
      this.markStale(this.plan.include);
      this.emit();
    }
  }

  private onGap(value: unknown): void {
    if (this.phase === "stopped" || !value || typeof value !== "object") return;
    const gap = value as Record<string, unknown>;
    const entries = gap.channels && typeof gap.channels === "object" ? Object.keys(gap.channels) : [];
    const belongs = entries.length === 0 || entries.some(ch => ch.startsWith(this.opts.subId + "/") || (ch === this.opts.subId));
    if (!belongs) return;
    this.gapUnresolved = true;
    this.incomplete = true;
    this.lastError = "stream_gap";
    this.phase = "degraded";
    this.markStale(this.plan.include);
    // If the gap arrives during a REST fetch it must not let that fetch clear
    // stale just because a frame did not increment the generation.
    for (const m of this.plan.include) this.gen.set(m, (this.gen.get(m) ?? 0) + 1);
    // Snapshot resync is bounded, but not proof that missing historical events
    // (KOL, executed trades) can be reconstructed. Keep incomplete=true.
    if (this.subscribed) {
      for (const m of this.plan.include) this.dirty.add(m);
      this.schedule(0);
    }
    this.emit();
  }

  private onFrame(frame?: TerminalStreamFrame): void {
    if (!frame || this.phase === "stopped" || frame.sub_id !== this.opts.subId) return;
    const matches = rulesForEvent(frame, this.plan);
    if (!matches.length) return;
    if (frame.id) {
      const key = this.opts.subId + ":" + frame.channel + ":" + frame.id;
      if (this.seen.has(key)) return;
      this.seen.set(key, this.now());
      if (this.seen.size > MAX_DEDUPE_IDS) this.seen.delete(this.seen.keys().next().value!);
    }
    for (const rule of matches) {
      if (rule.delivery === "overlay") {
        // State ticks carry no cursor; never let a late/replayed tick replace
        // a newer overlay that is already on screen.
        const prev = this.live[rule.module];
        if (prev && typeof prev.ts === "number" && typeof frame.ts === "number" && frame.ts < prev.ts) continue;
        this.live[rule.module] = frame;
        try { this.opts.onLive?.(frame, rule.module); } catch { /* consumer */ }
      } else {
        this.markStale([rule.module]);
        this.dirty.add(rule.module);
        // Only an INVALIDATION may make an in-flight read stale. An overlay tick
        // supersedes the REST price on screen; counting it would re-read the
        // snapshot module after every read on any actively traded token.
        this.gen.set(rule.module, (this.gen.get(rule.module) ?? 0) + 1);
      }
    }
    this.emit();
    // A degraded view (visible gap, failed read) must keep refreshing its
    // invalidated modules on a subscribed socket; schedule() refuses otherwise.
    if ((this.phase === "live" || this.phase === "degraded") && this.dirty.size > 0) this.schedule();
  }

  private markStale(modules: readonly TerminalModule[]): void {
    for (const m of modules) this.stale.add(m);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delay?: number): void {
    if (this.phase === "stopped" || this.phase === "idle" || this.busy ||
        (this.plan.channels.length > 0 && !this.subscribed)) return;
    const now = this.now();
    const minGap = this.opts.minModuleRefreshMs ?? 15_000;
    // Wake when the FIRST dirty module is eligible; flush() skips the others
    // until their own budget allows, then reschedules.
    let earliest = Infinity;
    for (const m of this.dirty) earliest = Math.min(earliest, (this.lastRead.get(m) ?? -Infinity) + minGap - now);
    if (!Number.isFinite(earliest)) earliest = 0;
    const wait = Math.max(delay ?? (this.opts.debounceMs ?? 750), earliest, 0);
    // A pending flush may only be moved EARLIER, never later. A trailing-edge
    // debounce reset on every event can starve a hot mint forever when trades
    // arrive faster than debounceMs, leaving token intelligence permanently stale.
    if (this.timer !== null) {
      if (now + wait >= this.timerAt) return;
      clearTimeout(this.timer);
    }
    this.timerAt = now + wait;
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, wait);
  }

  private async flush(): Promise<void> {
    if (this.busy || this.phase === "stopped" || this.dirty.size === 0) return;
    if (this.plan.channels.length > 0 && !this.subscribed) return;
    const modules: TerminalModule[] = [];
    const now = this.now();
    const minGap = this.opts.minModuleRefreshMs ?? 15_000;
    let cost = 0;
    for (const m of this.dirty) {
      // Newer invalidations may join a timer that was scheduled for an older
      // module. They must still honour their OWN per-module refresh budget.
      if (now < (this.lastRead.get(m) ?? -Infinity) + minGap) continue;
      const next = TERMINAL_MODULE_COSTS[m];
      if (modules.length >= 5 || cost + next > 8) break;
      modules.push(m);
      cost += next;
    }
    if (!modules.length) {
      this.schedule();
      return;
    }
    for (const m of modules) this.dirty.delete(m);
    await this.fetchModules(modules, false);
  }

  private async fetchModules(modules: readonly TerminalModule[], initial: boolean): Promise<void> {
    if (this.busy || this.phase === "stopped") return;
    this.busy = true;
    // The initial ACK already put all modules in dirty. Consume that batch
    // before the read; a new frame during I/O can add a fresh invalidation.
    for (const m of modules) this.dirty.delete(m);
    const epoch = this.epoch;
    const seen = new Map(modules.map(m => [m, this.gen.get(m) ?? 0]));
    const now = this.now();
    for (const m of modules) this.lastRead.set(m, now);
    try {
      const incoming = await this.opts.read(modules);
      if (this.isStopped() || epoch !== this.epoch) return;
      if (incoming.chain !== this.plan.chain ||
          (this.plan.chain === "solana" ? incoming.address !== this.plan.address :
            incoming.address.toLowerCase() !== this.plan.address)) throw new Error("snapshot_identity_mismatch");
      if (!incoming.modules || typeof incoming.modules !== "object") throw new Error("invalid_snapshot_modules");
      for (const m of modules) if (!incoming.modules[m]) throw new Error("missing_snapshot_module:" + m);

      this.snapshot = this.snapshot && !initial
        ? { ...incoming, modules: { ...this.snapshot.modules, ...incoming.modules } }
        : incoming;
      for (const m of modules) {
        if ((this.gen.get(m) ?? 0) === seen.get(m)) this.stale.delete(m);
        else this.dirty.add(m);
      }
      this.lastError = null;
      this.phase = this.incomplete ? "degraded" : "live";
    } catch (error) {
      if (this.isStopped() || epoch !== this.epoch) return;
      this.lastError = error instanceof Error ? error.message : "snapshot_failed";
      this.markStale(modules);
      this.phase = "degraded";
      // Do not automatically retry a failed DB/RPC call: the next event or an
      // explicit refresh can trigger another, still rate-limited, request.
    } finally {
      this.busy = false;
      if (!this.isStopped()) {
        this.emit();
        if (this.pendingBootstrap && this.subscribed) {
          // A reconnect occurred while the old read was busy. Only the NEW
          // post-ACK full snapshot can establish a fresh baseline; a targeted
          // merge onto the old one is not sufficient.
          this.pendingBootstrap = false;
          void this.fetchModules(this.plan.include, true);
        } else if (this.dirty.size > 0 && this.subscribed) {
          this.schedule();
        }
      }
    }
  }
}

/** A named subscription prevents overwriting an integrator's other filters. */
export function createTerminalTokenView(options: TerminalViewOptions): TerminalTokenView {
  return new TerminalTokenView(options);
}
