import nunjucks from 'nunjucks';
import { resolveFrontendAssetPaths } from './assets.js';

export { resolveFrontendAssetPaths, resolvePackageDir } from './assets.js';

/**
 * Error thrown when the service is initialised without an Express app.
 */
export class MissingExpressAppError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MissingExpressAppError';
    }
}

/**
 * Creates a nunjucks template-engine service wired for GOV.UK + MoJ frontend.
 * Generalised from the CICA reference implementation: frontend loader paths are
 * resolved via `require.resolve` (no hardcoded node_modules paths), and globals
 * and filters are supplied by the consuming app rather than baked in.
 *
 * @param {import('express').Express} app Express app (required at init).
 * @param {object} [options]
 * @param {string[]} [options.loaderPaths=[]] App-specific template dirs (e.g. 'page/', 'partial/'),
 *   prepended before the resolved frontend paths.
 * @param {Record<string, any>} [options.globals={}] Nunjucks globals to add.
 * @param {Record<string, Function>} [options.filters={}] Nunjucks filters to add.
 * @param {boolean} [options.autoescape=true] Nunjucks autoescape (keep true for security).
 * @param {NodeRequire} [options.require] Injectable resolver (tests).
 * @returns {Readonly<{ init: Function, render: Function, getEnvironment: Function, assetPaths: object }>}
 */
export function createTemplateEngineService(app, options = {}) {
    const { loaderPaths = [], globals = {}, filters = {}, autoescape = true } = options;

    const assetPaths = resolveFrontendAssetPaths({ require: options.require });
    let environment;

    function init() {
        if (!app) {
            throw new MissingExpressAppError(
                'createTemplateEngineService(app) requires an Express app instance.'
            );
        }
        if (environment) {
            return environment;
        }

        const paths = [...loaderPaths, ...assetPaths.templateLoaderPaths];
        const loader = new nunjucks.FileSystemLoader(paths);
        environment = new nunjucks.Environment(loader, { autoescape, throwOnUndefined: false });

        for (const [name, value] of Object.entries(globals)) {
            environment.addGlobal(name, value);
        }
        for (const [name, fn] of Object.entries(filters)) {
            environment.addFilter(name, fn);
        }

        environment.express(app);
        app.engine('njk', environment.render.bind(environment));
        app.set('view engine', 'njk');
        return environment;
    }

    function render(template, params = {}) {
        if (!environment) {
            init();
        }
        return environment.render(template, params);
    }

    function getEnvironment() {
        return environment;
    }

    return Object.freeze({ init, render, getEnvironment, assetPaths });
}

export default createTemplateEngineService;
