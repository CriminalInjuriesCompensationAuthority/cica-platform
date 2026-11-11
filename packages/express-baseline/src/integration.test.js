import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { describe, it } from 'node:test';
import express from 'express';
import { baselineErrorHandlers } from './errors.js';
import { healthRouter } from './health.js';
import { applyBaselineSecurity } from './security.js';

/** Starts an app on an ephemeral port and returns { port, close }. */
async function listen(app) {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    return { port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}

/** Makes a GET request, returning { status, headers, body }. */
function get(port, path) {
    return new Promise((resolve, reject) => {
        const req = httpRequest({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
            let body = '';
            res.on('data', (c) => {
                body += c;
            });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

describe('applyBaselineSecurity', () => {
    it('sets security + Application-Version + no-store headers', async () => {
        const app = express();
        applyBaselineSecurity(app, { version: '9.9.9' });
        app.get('/', (req, res) => res.send('ok'));
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/');
            assert.equal(res.headers['application-version'], '9.9.9');
            assert.match(res.headers['cache-control'], /no-store/);
            // helmet applies a CSP header
            assert.ok(res.headers['content-security-policy']);
        } finally {
            await srv.close();
        }
    });
});

describe('healthRouter', () => {
    it('GET /health returns ok', async () => {
        const app = express();
        app.use(healthRouter({ version: '1.2.3' }));
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/health');
            assert.equal(res.status, 200);
            assert.deepEqual(JSON.parse(res.body), { status: 'ok', version: '1.2.3' });
        } finally {
            await srv.close();
        }
    });

    it('GET /readiness returns 200 when the check passes (async)', async () => {
        const app = express();
        app.use(healthRouter({ readinessCheck: async () => true, version: '2.0.0' }));
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/readiness');
            assert.equal(res.status, 200);
            assert.deepEqual(JSON.parse(res.body), { status: 'ready', version: '2.0.0' });
        } finally {
            await srv.close();
        }
    });

    it('GET /readiness returns 503 when the check fails', async () => {
        const app = express();
        app.use(healthRouter({ readinessCheck: () => false }));
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/readiness');
            assert.equal(res.status, 503);
            assert.equal(JSON.parse(res.body).status, 'not-ready');
        } finally {
            await srv.close();
        }
    });

    it('GET /readiness returns 503 when the check throws', async () => {
        const app = express();
        app.use(
            healthRouter({
                readinessCheck: () => {
                    throw new Error('db down');
                }
            })
        );
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/readiness');
            assert.equal(res.status, 503);
            assert.equal(JSON.parse(res.body).error, 'db down');
        } finally {
            await srv.close();
        }
    });

    it('defaults Application-Version to "unknown" when none provided', async () => {
        const prev = process.env.npm_package_version;
        process.env.npm_package_version = '';
        const app = express();
        applyBaselineSecurity(app);
        app.get('/', (req, res) => res.send('ok'));
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/');
            assert.equal(res.headers['application-version'], 'unknown');
        } finally {
            await srv.close();
            if (prev === undefined) {
                process.env.npm_package_version = undefined;
            } else {
                process.env.npm_package_version = prev;
            }
        }
    });
});

describe('baselineErrorHandlers', () => {
    it('jsonapi flavour returns a 404 JSON:API body for unknown routes', async () => {
        const app = express();
        app.get('/known', (req, res) => res.send('ok'));
        baselineErrorHandlers(app, { flavour: 'jsonapi', logger: { error() {} } });
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/nope');
            assert.equal(res.status, 404);
            const body = JSON.parse(res.body);
            assert.equal(body.errors[0].status, '404');
            assert.equal(body.errors[0].title, 'NotFoundError');
        } finally {
            await srv.close();
        }
    });

    it('jsonapi flavour maps a thrown error to its status', async () => {
        const app = express();
        app.get('/boom', () => {
            const err = new Error('nope');
            err.statusCode = 418;
            throw err;
        });
        baselineErrorHandlers(app, { flavour: 'jsonapi', logger: { error() {} } });
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/boom');
            assert.equal(res.status, 418);
            assert.equal(JSON.parse(res.body).errors[0].detail, 'nope');
        } finally {
            await srv.close();
        }
    });

    it('html flavour calls the app-supplied render for a 404', async () => {
        const app = express();
        baselineErrorHandlers(app, {
            flavour: 'html',
            logger: { error() {} },
            render: (view, locals) => `<h1>${view}:${locals.status}</h1>`
        });
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/missing');
            assert.equal(res.status, 404);
            assert.match(res.body, /page\/404\.njk:404/);
        } finally {
            await srv.close();
        }
    });

    it('throws at setup if html flavour has no render function', () => {
        const app = express();
        assert.throws(
            () => baselineErrorHandlers(app, { flavour: 'html' }),
            /requires an options\.render/
        );
    });

    it('delegates to next when headers are already sent', async () => {
        const app = express();
        app.get('/stream', (req, res, next) => {
            res.write('partial');
            res.end(); // response complete (headersSent + finished)
            // Forward an error AFTER sending — handler must hit the headersSent guard.
            next(new Error('late failure'));
        });
        baselineErrorHandlers(app, { flavour: 'jsonapi', logger: { error() {} } });
        const srv = await listen(app);
        try {
            const res = await get(srv.port, '/stream');
            // Body is exactly 'partial'; the error handler delegated and did not append JSON:API.
            assert.equal(res.body, 'partial');
            assert.equal(res.body.includes('"errors"'), false);
        } finally {
            await srv.close();
        }
    });
});
