import type { EarlySubscribeControl, EarlyEventFormat, EarlyStreamFilters } from './types.js';
type Options = {
    sub_id?: string;
    format?: EarlyEventFormat;
};
export declare function followTokens(mints: string[], input?: Options): EarlySubscribeControl;
export declare function walletTrades(wallets: string[], input?: Options & Pick<EarlyStreamFilters, 'directions' | 'protocols' | 'amounts'>): EarlySubscribeControl;
export {};
//# sourceMappingURL=early-subscriptions.d.ts.map