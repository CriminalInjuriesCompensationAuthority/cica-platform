import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Resolves the install directory of a package via its package.json, using Node's
 * resolution (so it works regardless of hoisting). This is the fix for the
 * anti-pattern of hardcoding `node_modules/<pkg>/...` literal paths.
 *
 * @param {string} pkg Package name (e.g. 'govuk-frontend').
 * @param {NodeRequire} [req=require] Resolver (injectable for tests).
 * @returns {string} Absolute path to the package's root directory.
 * @throws {Error} If the package cannot be resolved (not installed).
 */
export function resolvePackageDir(pkg, req = require) {
    // Resolve the package.json rather than the main entry — works even when the
    // package has no "main" or uses "exports" that hide internal paths.
    const pkgJson = req.resolve(`${pkg}/package.json`);
    return dirname(pkgJson);
}

/**
 * Resolves the GOV.UK + MoJ frontend directories needed for nunjucks template
 * loading and static asset serving. No literal node_modules paths.
 *
 * @param {object} [options]
 * @param {NodeRequire} [options.require=require] Injectable resolver for tests.
 * @returns {{
 *   govukRoot: string,
 *   govukDist: string,
 *   govukAssets: string,
 *   mojRoot: string,
 *   templateLoaderPaths: string[],
 *   staticAssetDirs: Array<{ mount: string, dir: string }>
 * }}
 */
export function resolveFrontendAssetPaths(options = {}) {
    const req = options.require ?? require;

    const govukRoot = resolvePackageDir('govuk-frontend', req);
    const mojRoot = resolvePackageDir('@ministryofjustice/frontend', req);

    const govukDist = join(govukRoot, 'dist');
    const govukAssets = join(govukDist, 'govuk', 'assets');

    return {
        govukRoot,
        govukDist,
        govukAssets,
        mojRoot,
        // Loader paths for nunjucks template resolution (replaces the hardcoded
        // node_modules/govuk-frontend/dist/... entries in the old templateEngine).
        templateLoaderPaths: [
            mojRoot,
            govukDist,
            join(govukDist, 'govuk'),
            join(govukDist, 'govuk', 'components')
        ],
        // Static asset dirs to serve (mount point -> directory).
        staticAssetDirs: [{ mount: '/assets', dir: govukAssets }]
    };
}
