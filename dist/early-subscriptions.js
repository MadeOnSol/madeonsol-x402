function addresses(values) {
    if (!Array.isArray(values) || !values.length || values.length > 1000 || values.some(v => typeof v !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)))
        throw new Error('invalid_address_filter');
    return [...new Set(values)];
}
function options(input, allowed = ['sub_id', 'format']) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowed.includes(k)))
        throw new Error('unsupported_option');
    if (input.sub_id !== undefined && !/^[A-Za-z0-9_.-]{1,64}$/.test(input.sub_id))
        throw new Error('invalid_sub_id');
    if (!['full', 'compact-v1'].includes(input.format ?? 'full'))
        throw new Error('unsupported_format');
    return { ...(input.sub_id === undefined ? {} : { sub_id: input.sub_id }), format: input.format ?? 'full' };
}
export function followTokens(mints, input = {}) {
    return { type: 'subscribe', ...options(input), channels: ['early:deploys', 'early:locks', 'early:trades', 'early:liquidity', 'early:migrations', 'early:token_changes'], filters: { mints: addresses(mints) } };
}
export function walletTrades(wallets, input = {}) {
    return { type: 'subscribe', ...options(input, ['sub_id', 'format', 'directions', 'protocols', 'amounts']), channels: ['early:trades'], filters: { wallets: addresses(wallets),
            ...(input.directions === undefined ? {} : { directions: [...input.directions] }),
            ...(input.protocols === undefined ? {} : { protocols: [...input.protocols] }),
            ...(input.amounts === undefined ? {} : { amounts: structuredClone(input.amounts) }),
        } };
}
//# sourceMappingURL=early-subscriptions.js.map