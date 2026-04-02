const DEFAULT_BASE_URL = "https://madeonsol.com";
export class MadeOnSolX402 {
    paidFetch;
    baseUrl;
    ready;
    constructor(opts) {
        this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
        this.ready = this.init(opts.privateKey);
    }
    async init(privateKey) {
        const { wrapFetchWithPayment } = await import("@x402/fetch");
        const { x402Client } = await import("@x402/core/client");
        const { ExactSvmScheme } = await import("@x402/svm/exact/client");
        const { createKeyPairSignerFromBytes } = await import("@solana/kit");
        const { base58 } = await import("@scure/base");
        const signer = await createKeyPairSignerFromBytes(base58.decode(privateKey));
        const client = new x402Client();
        client.register("solana:*", new ExactSvmScheme(signer));
        this.paidFetch = wrapFetchWithPayment(fetch, client);
    }
    async request(path, params) {
        await this.ready;
        const url = new URL(path, this.baseUrl);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v !== undefined)
                    url.searchParams.set(k, String(v));
            }
        }
        const res = await this.paidFetch(url.toString());
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`MadeOnSol API error ${res.status}: ${body}`);
        }
        return res.json();
    }
    /** Real-time KOL trade feed from 946+ tracked wallets. ($0.005/req) */
    async kolFeed(params) {
        return this.request("/api/x402/kol/feed", params);
    }
    /** KOL convergence signals — tokens being accumulated by multiple KOLs. ($0.02/req) */
    async kolCoordination(params) {
        return this.request("/api/x402/kol/coordination", params);
    }
    /** KOL performance rankings by PnL and win rate. ($0.005/req) */
    async kolLeaderboard(params) {
        return this.request("/api/x402/kol/leaderboard", params);
    }
    /** Real-time alerts from elite Pump.fun deployers. ($0.01/req) */
    async deployerAlerts(params) {
        return this.request("/api/x402/deployer-hunter/alerts", params);
    }
    /** Free discovery endpoint — lists all available endpoints and prices. */
    async discovery() {
        const res = await fetch(new URL("/api/x402", this.baseUrl).toString());
        if (!res.ok)
            throw new Error(`Discovery failed: ${res.status}`);
        return res.json();
    }
}
/** Convenience factory — creates a ready-to-use client. */
export function createClient(privateKey, baseUrl) {
    return new MadeOnSolX402({ privateKey, baseUrl });
}
//# sourceMappingURL=index.js.map