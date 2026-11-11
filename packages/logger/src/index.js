import pino from 'pino';
import pinoHttp from 'pino-http';
import { defaultIdGenerator, resolveCorrelationId, resolveLogLevel } from './levels.js';
import { buildRedactConfig, parseCsvEnv } from './redact.js';

export { defaultIdGenerator, resolveCorrelationId, resolveLogLevel } from './levels.js';
export { buildRedactConfig, DEFAULT_REDACT_PATHS, parseCsvEnv } from './redact.js';

/**
 * Resolves the effective configuration from explicit options, falling back to
 * environment variables, then to safe defaults. Explicit options always win.
 *
 * @param {object} options See {@link createLogger}.
 * @param {NodeJS.ProcessEnv} env Environment to read fallbacks from.
 * @returns {{level: string, pretty: boolean, prettyJson: boolean, redact: object}}
 */
function resolveConfig(options, env) {
    const isProd = (options.nodeEnv ?? env.NODE_ENV) === 'production';

    const level = options.level ?? env.APP_LOG_LEVEL ?? (isProd ? 'info' : 'debug');

    // Pretty transport only off-prod and only when not writing to a custom stream.
    const pretty = options.pretty ?? (!isProd && !options.stream);
    const prettyJson = options.prettyJson ?? env.APP_LOG_PRETTY_JSON === 'true';

    const redact = buildRedactConfig({
        disabled: options.redactDisabled ?? env.APP_LOG_REDACT_DISABLE === 'true',
        extraPaths: options.redactExtraPaths ?? parseCsvEnv(env.APP_LOG_REDACT_EXTRA),
        basePaths: options.redactBasePaths,
        censor: options.redactCensor
    });

    return { isProd, level, pretty, prettyJson, redact };
}

/**
 * Creates a configured pino-http request-logger middleware.
 *
 * Generalised from the CICA reference implementation: all previously-hardcoded
 * `APP_LOG_*` env vars are now options with those env vars as defaults, so any
 * repo can consume this without being tied to specific variable names.
 *
 * @param {object} [options={}]
 * @param {string} [options.level] Explicit pino level (else APP_LOG_LEVEL, else info/debug by env).
 * @param {string} [options.nodeEnv] Override NODE_ENV detection.
 * @param {boolean} [options.pretty] Force pretty transport on/off (default: on off-prod).
 * @param {boolean} [options.prettyJson] Multiline pretty JSON (else APP_LOG_PRETTY_JSON).
 * @param {boolean} [options.redactDisabled] Disable redaction (else APP_LOG_REDACT_DISABLE).
 * @param {string[]} [options.redactExtraPaths] Extra redaction paths (else APP_LOG_REDACT_EXTRA csv).
 * @param {string[]} [options.redactBasePaths] Replace the default redaction base paths.
 * @param {string} [options.redactCensor] Redaction replacement value.
 * @param {() => string} [options.genId] Correlation-id fallback generator.
 * @param {import('stream').Writable} [options.stream] Destination stream (e.g. for tests).
 * @param {object} [options.pinoOptions] Extra pino options, spread last.
 * @param {NodeJS.ProcessEnv} [options.env=process.env] Environment for fallbacks (injectable for tests).
 * @returns {import('pino-http').HttpLogger} pino-http middleware (`app.use(logger)`).
 */
export function createLogger(options = {}) {
    const env = options.env ?? process.env;
    const { stream, genId = defaultIdGenerator, pinoOptions = {} } = options;
    const { level, pretty, prettyJson, redact } = resolveConfig(options, env);

    const transport =
        pretty && !stream
            ? {
                  transport: {
                      target: 'pino-pretty',
                      options: {
                          colorize: true,
                          levelFirst: true,
                          translateTime: 'SYS:standard',
                          ignore: 'pid,hostname',
                          singleLine: !prettyJson
                      }
                  }
              }
            : {};

    return pinoHttp({
        logger: pino({ level, ...transport, ...pinoOptions }, stream),
        redact,
        customLogLevel: resolveLogLevel,
        genReqId: (req) => resolveCorrelationId(req, genId),
        customProps: (req) => ({ correlationId: resolveCorrelationId(req, genId) })
    });
}

export default createLogger;
