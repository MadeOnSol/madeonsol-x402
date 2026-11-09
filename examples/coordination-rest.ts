/**
 * Multi-KOL convergence via the REST API (msk_ key auth, no x402).
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/coordination-rest.ts
 *
 * For PUSH delivery (sub-second), use coordination alert rules on PRO/ULTRA:
 *   curl -X POST https://madeonsol.com/api/v1/coordination/alerts ...
 */
import { MadeOnSolREST } from "madeonsol-x402";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const rest = new MadeOnSolREST({ apiKey });

const { tokens } = await rest.kolCoordination({
  period: "1h",
  min_kols: 3,
  min_score: 60,
  include_majors: false,
});

if (tokens.length === 0) {
  console.log("No KOL convergence in the last hour with score ≥ 60.");
} else {
  console.log(`${tokens.length} token(s) with convergence:\n`);
  for (const t of tokens) {
    console.log(`  ${t.token_symbol ?? t.token_mint.slice(0, 8)}`);
    console.log(`    score=${t.coordination_score ?? "?"}/100  peak=${t.peak_kols} KOLs  exited=${t.exited_count ?? 0}`);
  }
}

// Show rate-limit headers from the most recent call
console.log("\nRate limit:", rest.lastRateLimit);
