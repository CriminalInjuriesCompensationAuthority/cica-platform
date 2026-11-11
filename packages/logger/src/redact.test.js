import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRedactConfig, DEFAULT_REDACT_PATHS, parseCsvEnv } from './redact.js';

describe('buildRedactConfig', () => {
    it('returns the default paths and censor by default', () => {
        const config = buildRedactConfig();
        assert.deepEqual(config.paths, [...DEFAULT_REDACT_PATHS]);
        assert.equal(config.censor, '[REDACTED]');
    });

    it('returns undefined when disabled', () => {
        assert.equal(buildRedactConfig({ disabled: true }), undefined);
    });

    it('appends trimmed, non-empty extra paths', () => {
        const config = buildRedactConfig({ extraPaths: [' req.body.secret ', '', '  '] });
        assert.ok(config.paths.includes('req.body.secret'));
        assert.equal(config.paths.length, DEFAULT_REDACT_PATHS.length + 1);
    });

    it('replaces the base path set when basePaths is given', () => {
        const config = buildRedactConfig({ basePaths: ['a', 'b'], extraPaths: ['c'] });
        assert.deepEqual(config.paths, ['a', 'b', 'c']);
    });

    it('honours a custom censor', () => {
        assert.equal(buildRedactConfig({ censor: '***' }).censor, '***');
    });

    it('does not mutate the frozen default paths', () => {
        buildRedactConfig({ extraPaths: ['x'] });
        assert.equal(DEFAULT_REDACT_PATHS.includes('x'), false);
    });
});

describe('parseCsvEnv', () => {
    it('returns an empty array for undefined/empty', () => {
        assert.deepEqual(parseCsvEnv(undefined), []);
        assert.deepEqual(parseCsvEnv(''), []);
    });

    it('splits, trims, and drops empties', () => {
        assert.deepEqual(parseCsvEnv('a, b ,,c'), ['a', 'b', 'c']);
    });
});
