# @cica/express-baseline

Hardened Express runtime behaviour for CICA Node.js services — distributed as a dependency, not
copied into each app's `app.js`. Part of [`project-baseline`](https://github.com/CriminalInjuriesCompensationAuthority/project-baseline)
(profile: `node-library`).

## Why a library, not a template

`app.js` legitimately differs between a web app and a headless API (different CSP, session, routes).
What *should* be consistent — helmet/CSP/HSTS, security headers, env validation, error-handling
pattern, health endpoint — lives here and is applied with per-app options. Update behaviour by
bumping this dependency, not by editing app bootstrap files. See `docs/shared-libraries.md` in
project-baseline.

## Install

```jsonc
"@cica/express-baseline": "github:CriminalInjuriesCompensationAuthority/cica-platform#semver:express-baseline-v0.1.0"
```

`express` is a peer dependency (the app provides it).

## Usage

```js
import express from 'express';
import {
    applyBaselineSecurity,
    validateEnv,
    healthRouter,
    baselineErrorHandlers
} from '@cica/express-baseline';

validateEnv({ mandatory: ['APP_PORT'], optional: ['APP_ALLOW_INSECURE_COOKIE'] });

const app = express();
app.use(express.json());

applyBaselineSecurity(app, { csp: { directives: { /* per-app overrides */ } } });
app.use(healthRouter());

// ... app-specific routes ...

baselineErrorHandlers(app, { flavour: 'jsonapi' }); // or 'html' with a render fn, registered LAST
```

## API

| Export | Description |
| --- | --- |
| `applyBaselineSecurity(app, options)` | helmet (CSP + HSTS) + `Application-Version` + no-store cache headers. `options.csp.directives` merge over safe defaults. |
| `validateEnv({ mandatory, optional, env })` | Fail-fast at boot; throws `ConfigurationError` listing all missing vars. |
| `healthRouter({ readinessCheck, version })` | `GET /health` (liveness) + `GET /readiness` (optional probe). |
| `baselineErrorHandlers(app, { flavour, render, logger })` | notFound + central error handler, registered last. `flavour`: `jsonapi` (default) or `html` (requires `render`). |
| `buildHelmetConfig`, `defaultCspDirectives`, `statusFromError`, `jsonApiErrorBody`, `ConfigurationError` | Building blocks, exported for reuse/testing. |

### CSP: API vs web app

The default CSP is minimal/API-safe. A GOV.UK web app passes its own directives (nonce,
`strict-dynamic`, GA, etc.) via `options.csp.directives` — the library merges them over the defaults.

## Development

```bash
npm install
npm test     # c8 node --test
npm run lint # biome check
```

## License

MIT
