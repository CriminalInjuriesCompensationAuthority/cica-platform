/**
 * Resolves the HTTP status from an error, defaulting to 500.
 *
 * @param {any} err
 * @returns {number}
 */
export function statusFromError(err) {
    return err?.status || err?.statusCode || 500;
}

/**
 * Builds a JSON:API-shaped error body ({ errors: [{ status, title, detail }] }),
 * matching the existing data-capture-service convention.
 *
 * @param {any} err
 * @param {number} status
 * @returns {{ errors: Array<object> }}
 */
export function jsonApiErrorBody(err, status) {
    return {
        errors: [
            {
                status: String(status),
                title: err?.name || 'Error',
                detail: err?.message || 'An unexpected error occurred'
            }
        ]
    };
}

/**
 * Registers the baseline notFound + central error handlers. MUST be called LAST,
 * after all routes. The handler *pattern* is centralised; the response *shape* is
 * app-chosen via `flavour`:
 *
 *  - flavour 'jsonapi': emits a JSON:API error body (for headless APIs).
 *  - flavour 'html': calls `options.render(view, locals)` so the app owns its pages.
 *
 * @param {import('express').Express} app
 * @param {object} [options]
 * @param {'jsonapi' | 'html'} [options.flavour='jsonapi']
 * @param {(view: string, locals: object) => string} [options.render]
 *   Required for flavour 'html'; renders the error/404 page.
 * @param {string} [options.notFoundView='page/404.njk']
 * @param {string} [options.errorView='page/error.njk']
 * @param {{ error: Function }} [options.logger]
 *   Logger for errors; defaults to `req.log` then `console`.
 * @returns {void}
 */
export function baselineErrorHandlers(app, options = {}) {
    const flavour = options.flavour ?? 'jsonapi';
    const notFoundView = options.notFoundView ?? 'page/404.njk';
    const errorView = options.errorView ?? 'page/error.njk';

    if (flavour === 'html' && typeof options.render !== 'function') {
        throw new Error(
            "baselineErrorHandlers: flavour 'html' requires an options.render function"
        );
    }

    // notFound: nothing matched — synthesise a 404 and forward to the error handler.
    app.use((req, res, next) => {
        const err = new Error(`Not found: ${req.method} ${req.originalUrl ?? req.url}`);
        err.name = 'NotFoundError';
        err.statusCode = 404;
        next(err);
    });

    // central error handler (4-arg signature so Express treats it as an error handler).
    app.use((err, req, res, next) => {
        const log = options.logger ?? req.log ?? console;
        const status = statusFromError(err);
        log.error({ err: { name: err?.name, message: err?.message }, status }, 'Application error');

        if (res.headersSent) {
            return next(err);
        }

        if (flavour === 'jsonapi') {
            res.status(status).json(jsonApiErrorBody(err, status));
            return;
        }

        const view = status === 404 ? notFoundView : errorView;
        res.status(status).send(options.render(view, { status, error: err?.message }));
    });
}
