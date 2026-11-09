/**
 * Solana terminal: one intelligent REST first paint, then WS push updates.
 * Staged SDK integration example — requires the next SDK package release.
 * Node 22+ (or npm install ws for managed streams).
 *
 * To run with your own subscription:
 *   MADEONSOL_API_KEY=msk_... SOLANA_MINT=... node examples/terminal-intelligence-watch.mjs
 */
import { MadeOnSolREST } from "madeonsol-x402";

const key = process.env.MADEONSOL_API_KEY;
if (!key) throw new Error("Set MADEONSOL_API_KEY to a PRO+ account API key");
const token = process.env.SOLANA_MINT ?? "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const client = new MadeOnSolREST({ apiKey: key });
const stream = client.stream(); // Reuse ONE socket for all your terminal panels.

const watcher = client.watchTokenIntelligence(token, {
  stream,
  subId: "terminal_panel_one", // Different string for every panel on this socket.
  tier: "PRO", // Your actual plan; server entitlements remain authoritative.
  include: ["snapshot", "risk", "holder_count"],
  onChange(view) {
    const statuses = Object.fromEntries(Object.entries(view.snapshot?.modules ?? {})
      .map(([name, module]) => [name, { status: module?.status, as_of: module?.as_of }]));
    console.log("status", { phase: view.phase, stale: view.stale,
      no_push: view.no_push, incomplete: view.incomplete, modules: statuses });
    // view.incomplete = true: don't imply missed historical fills were recovered.
    // view.snapshot?.modules.holder_count on Solana is the LAST complete census,
    // not a tick-by-tick count; 'unavailable' is not zero holders.
  },
  onLive(frame, module) {
    if (module === "snapshot") {
      // Live price overlay; does NOT rewrite the REST source's as_of/provenance.
      console.log("live price update", frame.event, frame.data);
    }
  },
});

// In a browser: dispose when the token panel unmounts; keep the shared socket
// until the last panel closes. The view's own dispose() does not close stream.
process.once("SIGINT", () => { watcher.dispose(); stream.close(); });
process.once("SIGTERM", () => { watcher.dispose(); stream.close(); });
