// Repository example: build the SDK, then run this file with Node 22+.
// Set MADEONSOL_API_KEY and exactly one of EARLY_WALLETS / EARLY_MINTS.
import { MadeOnSolREST, followTokens, walletTrades } from '../dist/index.js';
if (!process.env.MADEONSOL_API_KEY) throw new Error('MADEONSOL_API_KEY required');
if (Boolean(process.env.EARLY_WALLETS) === Boolean(process.env.EARLY_MINTS)) throw new Error('Set exactly one of EARLY_WALLETS or EARLY_MINTS');
const values = (process.env.EARLY_WALLETS || process.env.EARLY_MINTS).split(',').map(s => s.trim());
const subscription = (process.env.EARLY_WALLETS ? walletTrades : followTokens)(values, { sub_id: 'watch' });
const api = new MadeOnSolREST({ apiKey: process.env.MADEONSOL_API_KEY });
const stream = api.earlyStream({
  subscriptions: [subscription],
  onFrame(frame) {
    // Observe provisional intent, then correlate outcomes by data.observed_event_id.
    // Printing is for this demo; keep real handlers short to avoid client backlog.
    console.log(JSON.stringify(frame));
  },
  onStatus(status) {
    if (['gap', 'fatal', 'reconnect'].includes(status.type)) console.error(JSON.stringify(status));
    if (status.type === 'fatal') process.exitCode = 1;
  },
});
stream.connect();
process.once('SIGINT', () => stream.close());
