/**
 * Print the latest 10 KOL buys (API key auth).
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/kol-feed.ts
 *
 * Free key at https://madeonsol.com/pricing.
 */
import { createClient } from "madeonsol-x402";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const client = createClient(apiKey);
const { trades } = await client.kolFeed({ limit: 10 });

console.log(`Latest ${trades.length} KOL trades:\n`);
for (const t of trades) {
  const who = t.kol_name || `${t.wallet_address.slice(0, 4)}…${t.wallet_address.slice(-4)}`;
  const sym = t.token_symbol || "?";
  const sol = (t.sol_amount ?? 0).toFixed(2);
  const action = t.action?.toUpperCase().padEnd(4) ?? "?";
  const mc = t.market_cap_usd_at_trade != null
    ? `@ MC $${Math.round(t.market_cap_usd_at_trade).toLocaleString()}`
    : "";
  console.log(`  ${who.padEnd(22)}  ${action}  ${sym.padEnd(10)}  ${sol.padStart(6)} SOL ${mc}`);
}
