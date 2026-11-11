import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveFrontendAssetPaths, resolvePackageDir } from './assets.js';

/** A stub resolver that maps '<pkg>/package.json' to a fake install dir. */
function stubRequire(map) {
    return {
        resolve(spec) {
            if (Object.hasOwn(map, spec)) {
                return map[spec];
            }
            const err = new Error(`Cannot find module '${spec}'`);
            err.code = 'MODULE_NOT_FOUND';
            throw err;
        }
    };
}

describe('resolvePackageDir', () => {
    it('returns the dir containing the package.json', () => {
        const req = stubRequire({
            'govuk-frontend/package.json': '/x/node_modules/govuk-frontend/package.json'
        });
        assert.equal(resolvePackageDir('govuk-frontend', req), '/x/node_modules/govuk-frontend');
    });

    it('throws when the package cannot be resolved', () => {
        assert.throws(() => resolvePackageDir('missing', stubRequire({})), /Cannot find module/);
    });
});

describe('resolveFrontendAssetPaths', () => {
    const req = stubRequire({
        'govuk-frontend/package.json': '/x/node_modules/govuk-frontend/package.json',
        '@ministryofjustice/frontend/package.json':
            '/x/node_modules/@ministryofjustice/frontend/package.json'
    });

    it('resolves govuk + moj dirs via require.resolve (no literal node_modules strings in code)', () => {
        const paths = resolveFrontendAssetPaths({ require: req });
        assert.equal(paths.govukRoot, '/x/node_modules/govuk-frontend');
        assert.equal(paths.mojRoot, '/x/node_modules/@ministryofjustice/frontend');
        assert.equal(paths.govukAssets, '/x/node_modules/govuk-frontend/dist/govuk/assets');
    });

    it('builds template loader paths including the components dir', () => {
        const paths = resolveFrontendAssetPaths({ require: req });
        assert.ok(
            paths.templateLoaderPaths.includes(
                '/x/node_modules/govuk-frontend/dist/govuk/components'
            )
        );
        assert.ok(
            paths.templateLoaderPaths.includes('/x/node_modules/@ministryofjustice/frontend')
        );
    });

    it('exposes a /assets static mount for the govuk assets dir', () => {
        const paths = resolveFrontendAssetPaths({ require: req });
        assert.deepEqual(paths.staticAssetDirs, [
            { mount: '/assets', dir: '/x/node_modules/govuk-frontend/dist/govuk/assets' }
        ]);
    });
});
