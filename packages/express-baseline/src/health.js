import { Router } from 'express';

/**
 * Creates a health/readiness router — the baseline standard (no existing CICA repo
 * had one). Mount before app-specific routes: `app.use(healthRouter())`.
 *
 *  - GET /health     liveness: the process is up.
 *  - GET /readiness  readiness: optionally runs a caller-supplied check.
 *
 * @param {object} [options]
 * @param {() => (boolean | Promise<boolean>)} [options.readinessCheck]
 *   Optional readiness probe; returns truthy when ready. Defaults to always-ready.
 * @param {string} [options.version] Version reported in the body (default npm_package_version).
 * @returns {import('express').Router}
 */
export function healthRouter(options = {}) {
    const router = Router();
    const version = options.version ?? process.env.npm_package_version ?? 'unknown';
    const readinessCheck = options.readinessCheck ?? (() => true);

    router.get('/health', (req, res) => {
        res.json({ status: 'ok', version });
    });

    router.get('/readiness', async (req, res) => {
        try {
            const ready = await readinessCheck();
            if (ready) {
                res.json({ status: 'ready', version });
            } else {
                res.status(503).json({ status: 'not-ready', version });
            }
        } catch (err) {
            res.status(503).json({ status: 'not-ready', version, error: err.message });
        }
    });

    return router;
}
