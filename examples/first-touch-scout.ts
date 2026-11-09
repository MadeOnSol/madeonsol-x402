/**
 * First-KOL-touch events from S-tier scouts.
 *
 * Backtest: S-tier scouts attract ≥3 follow-on KOLs within 4h ~50% of the time
 * vs ~14% baseline (38d / 491k buys / 72,549 events).
 *
 * Public scout leaderboard: https://madeonsol.com/kol/scouts
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/first-touch-scout.ts
 */
import { MadeOnSolREST } from "madeonsol-x402";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const rest = new MadeOnSolREST({ apiKey });

const { events } = await rest.firstTouches({
  preset: "scout",
  min_scout_tier: "S",
  limit: 20,
});

console.log(`${events.length} S-tier first-touch events:\n`);
for (const e of events) {
  const fk = e.first_kol;
  const sym = e.token_symbol ?? e.token_mint.slice(0, 8);
  const ageMin = e.token_age_seconds != null
    ? `${Math.round(e.token_age_seconds / 60)}m`
    : "?";
  const score = fk.scout_score != null ? `${fk.scout_score}%` : "?";
  console.log(`  ${fk.name ?? "(unnamed)"}  scouted  ${sym}  (${ageMin} old, scout_score=${score})`);
}
