import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildHelmetConfig, defaultCspDirectives } from './security.js';

describe('defaultCspDirectives', () => {
    it('provides a minimal API-safe CSP', () => {
        const d = defaultCspDirectives();
        assert.deepEqual(d.defaultSrc, ["'self'"]);
        assert.deepEqual(d.objectSrc, ["'none'"]);
    });
});

describe('buildHelmetConfig', () => {
    it('uses baseline defaults when no options given', () => {
        const cfg = buildHelmetConfig();
        assert.deepEqual(cfg.contentSecurityPolicy.directives.defaultSrc, ["'self'"]);
        assert.equal(cfg.strictTransportSecurity.maxAge, 60 * 60 * 24 * 365);
        assert.equal(cfg.strictTransportSecurity.includeSubDomains, true);
    });

    it('merges app CSP overrides over the defaults', () => {
        const cfg = buildHelmetConfig({
            csp: {
                directives: { scriptSrc: ["'self'", "'strict-dynamic'"], frameSrc: ['*.example'] }
            }
        });
        // overridden
        assert.deepEqual(cfg.contentSecurityPolicy.directives.scriptSrc, [
            "'self'",
            "'strict-dynamic'"
        ]);
        // added
        assert.deepEqual(cfg.contentSecurityPolicy.directives.frameSrc, ['*.example']);
        // untouched default preserved
        assert.deepEqual(cfg.contentSecurityPolicy.directives.objectSrc, ["'none'"]);
    });

    it('allows overriding HSTS max-age', () => {
        const cfg = buildHelmetConfig({ hstsMaxAge: 100 });
        assert.equal(cfg.strictTransportSecurity.maxAge, 100);
    });
});
