import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultIdGenerator, resolveCorrelationId, resolveLogLevel } from './levels.js';

describe('resolveLogLevel', () => {
    it('returns error on 5xx', () => {
        assert.equal(resolveLogLevel({}, { statusCode: 500 }), 'error');
        assert.equal(resolveLogLevel({}, { statusCode: 503 }), 'error');
    });

    it('returns error when an error is present regardless of status', () => {
        assert.equal(resolveLogLevel({}, { statusCode: 200 }, new Error('boom')), 'error');
    });

    it('returns warn on 4xx', () => {
        assert.equal(resolveLogLevel({}, { statusCode: 404 }), 'warn');
        assert.equal(resolveLogLevel({}, { statusCode: 400 }), 'warn');
    });

    it('returns info otherwise', () => {
        assert.equal(resolveLogLevel({}, { statusCode: 200 }), 'info');
        assert.equal(resolveLogLevel({}, { statusCode: 302 }), 'info');
    });
});

describe('resolveCorrelationId', () => {
    it('prefers x-correlation-id', () => {
        const req = { headers: { 'x-correlation-id': 'corr', 'x-request-id': 'reqid' } };
        assert.equal(resolveCorrelationId(req), 'corr');
    });

    it('falls back to x-request-id', () => {
        const req = { headers: { 'x-request-id': 'reqid' } };
        assert.equal(resolveCorrelationId(req), 'reqid');
    });

    it('falls back to req.id', () => {
        const req = { headers: {}, id: 'generated' };
        assert.equal(resolveCorrelationId(req), 'generated');
    });

    it('falls back to the generator when nothing is present', () => {
        assert.equal(
            resolveCorrelationId({ headers: {} }, () => 'fallback'),
            'fallback'
        );
    });

    it('tolerates a missing headers object', () => {
        assert.equal(
            resolveCorrelationId({}, () => 'fallback'),
            'fallback'
        );
    });
});

describe('defaultIdGenerator', () => {
    it('produces unique-ish ids', () => {
        assert.notEqual(defaultIdGenerator(), defaultIdGenerator());
    });
});
