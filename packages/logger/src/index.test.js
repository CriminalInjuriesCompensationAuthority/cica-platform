import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { Writable } from 'node:stream';
import { describe, it } from 'node:test';
import { createLogger } from './index.js';

/** Collects written log lines as parsed JSON objects. */
function captureStream() {
    const lines = [];
    const stream = new Writable({
        write(chunk, _enc, cb) {
            const text = chunk.toString().trim();
            if (text) {
                for (const line of text.split('\n')) {
                    lines.push(JSON.parse(line));
                }
            }
            cb();
        }
    });
    return { stream, lines };
}

describe('createLogger', () => {
    it('returns a pino-http middleware exposing a pino logger', () => {
        const { stream } = captureStream();
        const logger = createLogger({ stream, env: {} });
        assert.equal(typeof logger, 'function');
        assert.ok(logger.logger, 'exposes underlying pino instance');
        assert.equal(typeof logger.logger.info, 'function');
    });

    it('writes structured JSON at the configured level', () => {
        const { stream, lines } = captureStream();
        const logger = createLogger({ stream, level: 'info', env: {} });
        logger.logger.info('hello');
        assert.equal(lines.length, 1);
        assert.equal(lines[0].msg, 'hello');
        assert.equal(lines[0].level, 30); // pino numeric level for info
    });

    it('redacts default sensitive paths', () => {
        const { stream, lines } = captureStream();
        const logger = createLogger({ stream, level: 'info', env: {} });
        logger.logger.info({ req: { headers: { authorization: 'Bearer super-secret' } } }, 'req');
        assert.equal(lines[0].req.headers.authorization, '[REDACTED]');
    });

    it('honours redactDisabled', () => {
        const { stream, lines } = captureStream();
        const logger = createLogger({ stream, level: 'info', redactDisabled: true, env: {} });
        logger.logger.info({ req: { headers: { authorization: 'Bearer x' } } }, 'req');
        assert.equal(lines[0].req.headers.authorization, 'Bearer x');
    });

    it('reads env fallbacks when options are absent', () => {
        const { stream, lines } = captureStream();
        const logger = createLogger({ stream, env: { APP_LOG_LEVEL: 'warn' } });
        logger.logger.info('should-be-suppressed');
        logger.logger.warn('should-appear');
        assert.equal(lines.length, 1);
        assert.equal(lines[0].msg, 'should-appear');
    });

    it('explicit options win over env', () => {
        const { stream, lines } = captureStream();
        const logger = createLogger({ stream, level: 'error', env: { APP_LOG_LEVEL: 'debug' } });
        logger.logger.warn('suppressed');
        logger.logger.error('shown');
        assert.equal(lines.length, 1);
        assert.equal(lines[0].msg, 'shown');
    });

    it('builds a pretty-transport logger when pretty is forced (no stream)', () => {
        // Exercises the pretty-transport branch. We force pretty on and provide no
        // stream; constructing the logger is enough to cover the transport config.
        const logger = createLogger({ pretty: true, prettyJson: true, env: {} });
        assert.equal(typeof logger, 'function');
        assert.ok(logger.logger);
    });

    it('disables pretty transport in production by default', () => {
        const logger = createLogger({ env: { NODE_ENV: 'production' } });
        assert.ok(logger.logger);
        assert.equal(logger.logger.level, 'info'); // prod default level
    });

    it('runs as middleware and attaches a correlationId from headers', async () => {
        // Drive genReqId + customProps through a REAL http request/response so pino-http
        // gets genuine req/res objects (hand-rolled mocks miss methods like removeListener).
        const { stream, lines } = captureStream();
        const logger = createLogger({ stream, level: 'info', env: {} });

        const server = createServer((req, res) => {
            logger(req, res, () => {});
            res.end('ok');
        });

        await new Promise((resolve) => server.listen(0, resolve));
        const { port } = server.address();

        try {
            await new Promise((resolve, reject) => {
                const req = httpRequest(
                    {
                        host: '127.0.0.1',
                        port,
                        path: '/',
                        headers: { 'x-correlation-id': 'abc-123' }
                    },
                    (res) => {
                        res.resume();
                        res.on('end', resolve);
                    }
                );
                req.on('error', reject);
                req.end();
            });
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }

        const requestLog = lines.find((line) => line.correlationId);
        assert.ok(requestLog, 'a log line carries a correlationId');
        assert.equal(requestLog.correlationId, 'abc-123');
    });
});
