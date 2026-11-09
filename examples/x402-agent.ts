/**
 * Same KOL feed call, but paid PER-REQUEST via x402 micropayments — no signup, no API key.
 *
 * Designed for AI agents with a Solana wallet. Each call autopays from your wallet
 * to MadeOnSol's merchant wallet; pricing is published at /api/v1/discovery (free).
 *
 * Configure SVM_PRIVATE_KEY, X402_PAY_TO, X402_FEE_PAYER, SVM_RPC_URL,
 * X402_MAX_AMOUNT_ATOMIC and X402_MAX_TOTAL_AMOUNT_ATOMIC, then run:
 *   npx tsx examples/x402-agent.ts
 *
 * Or use API key auth if you prefer (no wallet needed):
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/kol-feed.ts
 */
import { createClient } from "madeonsol-x402";

const privateKey = process.env.SVM_PRIVATE_KEY;
if (!privateKey) {
  console.error("Set SVM_PRIVATE_KEY (base58 Solana private key) — or use API-key mode (see kol-feed.ts)");
  process.exit(1);
}

// createClient auto-detects msk_ prefix → API key, otherwise → x402
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running this paid example`);
  return value;
};
const client = createClient(privateKey, undefined, {
  payTo: required("X402_PAY_TO"), feePayer: required("X402_FEE_PAYER"),
  maxAmountAtomic: required("X402_MAX_AMOUNT_ATOMIC"),
  maxTotalAmountAtomic: required("X402_MAX_TOTAL_AMOUNT_ATOMIC"),
  rpcUrl: required("SVM_RPC_URL"),
});

// Free endpoint — see all available endpoints and their per-call prices
const { endpoints } = await client.discovery();
console.log(`x402 endpoints available: ${endpoints.length}`);
console.log(`kolFeed costs: ${endpoints.find((e) => e.path.includes("kol/feed"))?.price ?? "?"} USDC per call\n`);

// Paid call — wallet autopays
const { trades } = await client.kolFeed({ limit: 5 });
console.log(`Got ${trades.length} trades via x402 micropayment.`);
for (const t of trades) {
  console.log(`  ${t.kol_name ?? "?"}  ${t.action}  ${t.token_symbol ?? "?"}  ${(t.sol_amount ?? 0).toFixed(2)} SOL`);
}
