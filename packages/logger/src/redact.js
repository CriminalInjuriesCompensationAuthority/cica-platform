/**
 * Default redaction paths applied to every logger unless overridden.
 * Covers common places secrets leak into logs: auth headers, cookies, api keys,
 * OAuth query params, credential-bearing body fields, and set-cookie responses.
 *
 * @type {ReadonlyArray<string>}
 */
export const DEFAULT_REDACT_PATHS = Object.freeze([
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'req.query.code',
    'req.query.state',
    'req.query.id_token',
    'req.query.access_token',
    'req.body.password',
    'req.body.username',
    'req.body.token',
    'req.body._csrf',
    'res.headers["set-cookie"]'
]);

/**
 * Builds a pino redaction config from a base path list plus optional extras.
 *
 * @param {object} [options]
 * @param {boolean} [options.disabled=false] Disable redaction entirely (returns undefined).
 * @param {string[]} [options.extraPaths=[]] Additional redaction paths to append.
 * @param {string[]} [options.basePaths=DEFAULT_REDACT_PATHS] Replace the base path set.
 * @param {string} [options.censor='[REDACTED]'] Replacement value for redacted fields.
 * @returns {{paths: string[], censor: string} | undefined} pino redact config, or
 *   undefined when disabled (pino treats undefined as "no redaction").
 */
export function buildRedactConfig(options = {}) {
    const {
        disabled = false,
        extraPaths = [],
        basePaths = DEFAULT_REDACT_PATHS,
        censor = '[REDACTED]'
    } = options;

    if (disabled) {
        return undefined;
    }

    const extra = extraPaths.map((entry) => entry.trim()).filter(Boolean);

    return {
        paths: [...basePaths, ...extra],
        censor
    };
}

/**
 * Parses a comma-separated env var into a trimmed, non-empty string array.
 *
 * @param {string | undefined} value Raw env var value.
 * @returns {string[]} Parsed entries (empty array when unset/empty).
 */
export function parseCsvEnv(value) {
    if (!value) {
        return [];
    }
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}
