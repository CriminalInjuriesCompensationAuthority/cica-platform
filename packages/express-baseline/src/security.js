import helmet from 'helmet';

/**
 * Default Content-Security-Policy directives — a safe, minimal baseline suitable
 * for an API. Web apps override/extend via `options.csp.directives` (e.g. nonce +
 * strict-dynamic for GOV.UK apps).
 *
 * @returns {Record<string, string[]>}
 */
export function defaultCspDirectives() {
    return {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"]
    };
}

/**
 * Builds the helmet configuration from baseline defaults merged with app overrides.
 *
 * @param {object} [options]
 * @param {object} [options.csp] CSP overrides; `directives` are merged over the defaults.
 * @param {number} [options.hstsMaxAge=31536000] HSTS max-age in seconds (default 1 year).
 * @returns {object} helmet options.
 */
export function buildHelmetConfig(options = {}) {
    const directives = { ...defaultCspDirectives(), ...(options.csp?.directives ?? {}) };
    return {
        contentSecurityPolicy: {
            useDefaults: options.csp?.useDefaults ?? true,
            directives
        },
        strictTransportSecurity: {
            maxAge: options.hstsMaxAge ?? 60 * 60 * 24 * 365,
            includeSubDomains: true
        }
    };
}

/**
 * Applies the baseline security posture to an Express app:
 *  - helmet (CSP + HSTS) with app-provided CSP overrides
 *  - an `Application-Version` response header (from npm_package_version)
 *  - no-store cache headers for dynamic responses
 *
 * Static-asset handlers that set their own long-lived cache headers should be
 * registered BEFORE calling this, so the no-store default applies only to dynamic
 * responses after them.
 *
 * @param {import('express').Express} app
 * @param {object} [options] See {@link buildHelmetConfig}.
 * @param {string} [options.version] Override the Application-Version value.
 * @returns {void}
 */
export function applyBaselineSecurity(app, options = {}) {
    app.use(helmet(buildHelmetConfig(options)));

    const version = options.version || process.env.npm_package_version || 'unknown';
    app.use((req, res, next) => {
        res.set('Application-Version', version);
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            'Surrogate-Control': 'no-store'
        });
        next();
    });
}
