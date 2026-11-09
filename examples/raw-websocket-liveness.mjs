// Raw WebSocket client for the MadeOnSol stream WITHOUT the SDK: the liveness
// and recovery rules a hand-written client must follow (the SDK's rest.stream()
// does all of this for you).
//
//   npm i ws
//   MADEONSOL_API_KEY=msk_... node raw-websocket-liveness.mjs
//
// 1. Ping/pong: the server sends a WebSocket PING every 15 s and closes the
//    socket (you see 1006, no reason) when no PONG arrived by the next ping,
//    so at most 30 s. The `ws` library answers pings by itself, but only while
//    the event loop is free: the "message" handler only parses and enqueues.
// 2. ONE worker handles the queue strictly in order, so the cursor only moves
//    forward.
// 3. A frame id is remembered as handled only AFTER your handler succeeded.
//    When a handler FAILS the worker stops: it drops what is still queued,
//    closes the socket and resumes from the last COMMITTED frame, so the failed
//    frame (and everything after it) is delivered again. Make your handler
//    idempotent on frame.id: delivery is at-least-once.
// 4. Cursor rules for resume (docs: /api-docs, WebSocket "COMMIT RULE"):
//    - live frames commit {instance, seq, ts} once handled;
//    - REPLAYED frames (replayed: true) never move the cursor;
//    - replay_end complete:true commits {instance, seq: last_seq, ts: last_ts}
//      (keeping the previous value where one is null);
//    - replay_end complete:false + retryable:true keeps the cursor and resumes
//      again after retry_after_ms (from resume_ts_hint only when the reply has one);
//    - complete:false + retryable:false = FINAL gaps (never recovered by the
//      server): onFinalGap is called with the channels, reasons and bounds
//      BEFORE the cursor moves; backfill from REST there (or decide to skip).
//      Only after it succeeds is the cursor committed.
// 5. Reconnect on ANY close with exponential backoff + jitter; the backoff
//    resets only after a "subscribed" ack.
import { pathToFileURL } from "node:url";

/**
 * The client's decision logic, transport-free (so it can be tested):
 *   onFrame(frame)  — call from the socket's message handler (synchronous, O(1))
 *   cursor()        — the COMMITTED cursor; persist it to resume after a restart
 * io = { handle(frame) → Promise, subscribe(resume|null), reconnect(), later(fn, ms) }
 */
export function createStreamClient(io, { resumeFrom = null, seenCap = 10_000 } = {}) {
  let committed = resumeFrom;
  let instance = null;
  const seen = new Set();
  const queue = [];
  let working = false;
  let stopped = false; // a handler failed: ignore the rest of this connection

  async function step(frame) {
    switch (frame.type) {
      case "connected":
        instance = frame.instance;
        stopped = false;
        io.subscribe(committed);
        return true;
      case "subscribed":
        io.onSubscribed?.();
        return true;
      case "replay_end": {
        const next = {
          instance: instance ?? committed?.instance,
          seq: frame.last_seq ?? committed?.seq,
          ts: frame.last_ts ?? committed?.ts,
        };
        if (frame.complete) {
          committed = next;
        } else if (frame.retryable === false) {
          // FINAL gaps: the server could not recover part of the range and never
          // will. Report them (channels, reasons, bounds) BEFORE moving the
          // cursor past them. Nothing here repairs a gap: backfill the range from
          // REST, or decide to skip it, inside onFinalGap. If reporting fails (or
          // no handler exists), nothing is committed and the client resumes.
          const gaps = Object.entries(frame.channels ?? {})
            .filter(([, c]) => c && c.complete === false)
            .map(([channel, c]) => ({
              channel,
              reason: c.reason ?? null,
              gap: c.gap ?? null,
              since_ts: c.since_ts ?? null,
              truncated_at_ts: c.truncated_at_ts ?? null,
              gap_before_ts: c.gap_before_ts ?? null,
            }));
          if (!io.onFinalGap) return false;
          try {
            await io.onFinalGap({ reason: frame.reason ?? null, channels: gaps, cursor_before: committed, cursor_after: next, recovered: false });
          } catch (err) {
            io.onHandlerError?.(frame, err);
            return false; // not committed: resume and report again
          }
          committed = next;
        } else {
          const from = frame.resume_ts_hint != null ? { ...committed, ts: frame.resume_ts_hint } : committed;
          io.later(() => io.subscribe(from), frame.retry_after_ms ?? 5_000);
        }
        return true;
      }
      case "heartbeat": case "hint": case "warning": case "replay_start": case "subscriptions":
        return true;
    }
    if (frame.id && seen.has(frame.id)) return true;
    try {
      await io.handle(frame);
    } catch (err) {
      io.onHandlerError?.(frame, err);
      return false; // NOT seen, NOT committed
    }
    if (frame.id) {
      seen.add(frame.id);
      if (seen.size > seenCap) seen.delete(seen.values().next().value);
    }
    if (!frame.replayed && frame.seq != null) committed = { instance, seq: frame.seq, ts: frame.ts ?? Date.now() };
    return true;
  }

  async function drain() {
    if (working) return; // the ONE worker
    working = true;
    try {
      while (queue.length && !stopped) {
        const ok = await step(queue.shift());
        if (!ok) {
          stopped = true;
          queue.length = 0;  // everything after the failure comes again via resume
          io.reconnect();    // resume from `committed`
        }
      }
    } finally {
      working = false;
    }
  }

  return {
    onFrame(frame) {
      if (frame.type === "connected") stopped = false; // a new socket: resume from the committed cursor
      else if (stopped) return;                         // still the old socket after a failure: ignore
      queue.push(frame);
      void drain();
    },
    cursor: () => committed,
    idle: async () => { while (working || queue.length) await new Promise((r) => setTimeout(r, 1)); },
  };
}

async function main() {
  const { default: WebSocket } = await import("ws");
  const API = "https://madeonsol.com/api/v1";
  const KEY = process.env.MADEONSOL_API_KEY;
  if (!KEY) throw new Error("set MADEONSOL_API_KEY");
  let attempt = 0;
  let ws = null;

  const client = createStreamClient({
    async handle(frame) { console.log(frame.type, frame.id ?? ""); /* your idempotent logic */ },
    subscribe(resume) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "subscribe", channels: ["kol:trades"], ...(resume ? { resume } : {}) }));
    },
    reconnect() { ws?.close(4000, "handler failed, resuming"); },
    later: (fn, ms) => setTimeout(fn, ms),
    onSubscribed() { attempt = 0; },
    onHandlerError(frame, err) { console.error("handler failed; resuming from the last committed frame:", frame.id ?? frame.type, err.message); },
    // REQUIRED: a final gap is reported here before the cursor passes it. Not recovered automatically.
    async onFinalGap(g) {
      console.warn(`FINAL GAP (not recovered, reason ${g.reason}): ${g.channels.map((c) => `${c.channel}=${c.reason ?? c.gap}`).join(", ")}; backfill this range from REST before relying on the stream`);
      // await backfillFromRest(g)  // your code: e.g. GET the channel REST twin for since_ts..truncated_at_ts
    },
  });

  async function connect() {
    const r = await fetch(`${API}/stream/token`, { method: "POST", headers: { Authorization: `Bearer ${KEY}` } });
    if (!r.ok) throw new Error(`stream token: HTTP ${r.status}`);
    const { token, ws_url } = await r.json();
    ws = new WebSocket(ws_url, { headers: { Authorization: `Bearer ${token}` } });
    ws.on("message", (raw) => client.onFrame(JSON.parse(raw.toString()))); // O(1): parse + enqueue
    ws.on("close", (code, reason) => {
      const base = Math.min(30_000, 1_000 * 2 ** attempt++);
      const delay = Math.round(base * (0.7 + Math.random() * 0.6));
      console.log(`closed ${code} ${reason || ""}; reconnecting in ${delay} ms`);
      setTimeout(() => connect().catch(retry), delay);
    });
    ws.on("error", () => { /* "close" follows */ });
  }
  function retry(err) {
    const delay = Math.min(30_000, 1_000 * 2 ** attempt++);
    console.error("connect failed:", err.message, `retry in ${delay} ms`);
    setTimeout(() => connect().catch(retry), delay);
  }
  connect().catch(retry);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
