/**
 * Error thrown when required configuration is missing or invalid.
 */
export class ConfigurationError extends Error {
    /**
     * @param {string} message
     * @param {object} [details]
     */
    constructor(message, details = {}) {
        super(message);
        this.name = 'ConfigurationError';
        this.details = details;
    }
}

/**
 * Fail-fast environment-variable validation, run at app boot.
 * Throws {@link ConfigurationError} listing all missing mandatory vars at once.
 * Optional vars are returned for convenience but never cause failure.
 *
 * @param {object} spec
 * @param {string[]} [spec.mandatory=[]] Names that must be present and non-empty.
 * @param {string[]} [spec.optional=[]] Names that are read if present.
 * @param {NodeJS.ProcessEnv} [spec.env=process.env] Environment (injectable for tests).
 * @returns {{ values: Record<string,string|undefined>, missing: string[] }}
 * @throws {ConfigurationError} If any mandatory var is missing/empty.
 */
export function validateEnv({ mandatory = [], optional = [], env = process.env } = {}) {
    const missing = mandatory.filter((name) => {
        const value = env[name];
        return value === undefined || value === '';
    });

    if (missing.length > 0) {
        throw new ConfigurationError(
            `Missing required environment variable(s): ${missing.join(', ')}`,
            { missing }
        );
    }

    const values = {};
    for (const name of [...mandatory, ...optional]) {
        values[name] = env[name];
    }
    return { values, missing };
}
