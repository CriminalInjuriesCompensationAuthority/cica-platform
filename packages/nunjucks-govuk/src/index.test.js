import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import express from 'express';
import { createTemplateEngineService, MissingExpressAppError } from './index.js';

/** Stub resolver so tests don't depend on real govuk-frontend install paths. */
const stubRequire = {
    resolve(spec) {
        if (spec === 'govuk-frontend/package.json') {
            return '/fake/node_modules/govuk-frontend/package.json';
        }
        if (spec === '@ministryofjustice/frontend/package.json') {
            return '/fake/node_modules/@ministryofjustice/frontend/package.json';
        }
        throw new Error(`Cannot find module '${spec}'`);
    }
};

describe('createTemplateEngineService', () => {
    let tmpl;
    beforeEach(() => {
        tmpl = mkdtempSync(join(tmpdir(), 'njk-'));
        writeFileSync(
            join(tmpl, 'hello.njk'),
            'Hi {{ name }} / {{ APP_VERSION }} / {{ d | formatDate }}'
        );
    });
    afterEach(() => rmSync(tmpl, { recursive: true, force: true }));

    it('throws MissingExpressAppError when init runs without an app', () => {
        const svc = createTemplateEngineService(undefined, { require: stubRequire });
        assert.throws(() => svc.init(), MissingExpressAppError);
    });

    it('initialises against an express app and exposes the environment', () => {
        const app = express();
        const svc = createTemplateEngineService(app, { require: stubRequire });
        const env = svc.init();
        assert.ok(env);
        assert.equal(svc.getEnvironment(), env);
        // registers the njk view engine
        assert.equal(app.get('view engine'), 'njk');
    });

    it('applies globals and filters and renders a template', () => {
        const app = express();
        const svc = createTemplateEngineService(app, {
            require: stubRequire,
            loaderPaths: [tmpl],
            globals: { APP_VERSION: '9.9.9' },
            filters: { formatDate: (d) => `D(${d})` }
        });
        const out = svc.render('hello.njk', { name: 'Ada', d: '2026-01-01' });
        assert.match(out, /Hi Ada/);
        assert.match(out, /9\.9\.9/);
        assert.match(out, /D\(2026-01-01\)/);
    });

    it('render() auto-initialises if not already initialised', () => {
        writeFileSync(join(tmpl, 'simple.njk'), 'Hi {{ name }}');
        const app = express();
        const svc = createTemplateEngineService(app, { require: stubRequire, loaderPaths: [tmpl] });
        // no explicit init() call
        const out = svc.render('simple.njk', { name: 'Bob' });
        assert.match(out, /Hi Bob/);
    });

    it('exposes resolved assetPaths', () => {
        const app = express();
        const svc = createTemplateEngineService(app, { require: stubRequire });
        assert.equal(svc.assetPaths.govukRoot, '/fake/node_modules/govuk-frontend');
    });
});
