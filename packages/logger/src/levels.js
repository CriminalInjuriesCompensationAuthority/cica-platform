/**
 * Maps an HTTP response (and any error) to a pino log level.
 * 5xx or a thrown error -> error; 4xx -> warn; otherwise info.
 *
 * Shape matches pino-http's `customLogLevel(req, res, err)` signature.
 *
 * @param {import('http').IncomingMessage} _req Request (unused; kept for signature parity).
 * @param {import('http').ServerResponse} res Response carrying the status code.
 * @param {Error} [err] Error thrown while handling the request, if any.
 * @returns {'error' | 'warn' | 'info'} The resolved log level.
 */
export function resolveLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) {
        return 'error';
    }
    if (res.statusCode >= 400) {
        return 'warn';
    }
    return 'info';
}

/**
 * Derives a correlation id for a request, preferring upstream headers and
 * falling back to a generated id.
 *
 * @param {import('http').IncomingMessage} req Incoming request.
 * @param {() => string} [generate] Fallback id generator (defaults to time+random).
 * @returns {string} Correlation id.
 */
export function resolveCorrelationId(req, generate = defaultIdGenerator) {
    const headers = req.headers ?? {};
    return headers['x-correlation-id'] || headers['x-request-id'] || req.id || generate();
}

/**
 * Default request-id generator. Not cryptographically strong — correlation only.
 *
 * @returns {string} A reasonably unique id.
 */
export function defaultIdGenerator() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
