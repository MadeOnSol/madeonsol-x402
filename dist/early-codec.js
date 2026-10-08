export const COMPACT_FIELDS = Object.freeze([
    'schema_version', 'chain', 'channel', 'event_id', 'signature', 'observed_slot',
    'first_observed_at', 'source', 'source_region', 'observation_stage', 'execution_status',
    'decoding_basis', 'decoder_version', 'transaction_version', 'transaction_config',
    'lifetime_token', 'protocol', 'instruction', 'outer_instruction_index', 'program_id',
    'fee_payer', 'action', 'actor', 'attribution_basis', 'mint', 'quote_mint', 'pool',
    'direction', 'swap_mode', 'input_mint', 'output_mint', 'requested_input_raw',
    'max_input_raw', 'min_output_raw', 'target_output_raw', 'wallet_label',
    'observed_event_id', 'outcome_source', 'commitment', 'landed_slot',
    'execution_error', 'outcome_at', 'missing_fields', 'launchpad',
    'requested_amount_raw', 'lp_mint', 'target_lp_output_raw', 'requested_lp_input_raw',
    'max_base_input_raw', 'max_quote_input_raw', 'min_base_output_raw', 'min_quote_output_raw',
    'requested_base_input_raw', 'requested_quote_input_raw', 'authority', 'authority_type',
    'new_authority', 'authority_revocation_requested', 'target_scope', 'target_account',
    'token_account', 'decimals', 'authority_is_signer', 'lock_account', 'lock_kind',
    'sender', 'recipient', 'sender_token_account', 'destination_token_account', 'schedule',
]);
const names = new Map(COMPACT_FIELDS.map((name, i) => [i.toString(36), name]));
export function expandEarlyFrame(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid_frame');
    const frame = value;
    if (!['early:observed', 'early:outcome'].includes(frame.event ?? ''))
        return frame;
    if (frame.format === undefined || frame.format === 'full')
        return frame;
    if (frame.format !== 'compact-v1' || !frame.data || typeof frame.data !== 'object' || Array.isArray(frame.data))
        throw new Error('invalid_compact_frame');
    const data = {};
    for (const k of Object.keys(frame.data)) {
        const key = k.startsWith('~') ? k.slice(1) : names.get(k);
        if (key === undefined || Object.hasOwn(data, key))
            throw new Error('invalid_compact_frame');
        if (key === '__proto__')
            Object.defineProperty(data, key, { value: frame.data[k], enumerable: true, writable: true, configurable: true });
        else
            data[key] = frame.data[k];
    }
    const result = { ...frame, data };
    delete result.format;
    return result;
}
//# sourceMappingURL=early-codec.js.map