import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigurationError, validateEnv } from './env.js';

describe('validateEnv', () => {
    it('passes when all mandatory vars are present', () => {
        const { values } = validateEnv({
            mandatory: ['A', 'B'],
            env: { A: '1', B: '2' }
        });
        assert.equal(values.A, '1');
        assert.equal(values.B, '2');
    });

    it('throws ConfigurationError listing ALL missing vars', () => {
        try {
            validateEnv({ mandatory: ['A', 'B', 'C'], env: { B: 'x' } });
            assert.fail('should have thrown');
        } catch (err) {
            assert.ok(err instanceof ConfigurationError);
            assert.deepEqual(err.details.missing, ['A', 'C']);
            assert.match(err.message, /A, C/);
        }
    });

    it('treats empty string as missing', () => {
        assert.throws(() => validateEnv({ mandatory: ['A'], env: { A: '' } }), ConfigurationError);
    });

    it('includes optional vars in values without failing', () => {
        const { values } = validateEnv({ mandatory: [], optional: ['OPT'], env: {} });
        assert.equal(values.OPT, undefined);
    });
});
