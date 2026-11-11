# @cica/nunjucks-govuk

Nunjucks template-engine factory for CICA **web apps**, wired for GOV.UK + MoJ frontend. Part of
[`project-baseline`](https://github.com/CriminalInjuriesCompensationAuthority/project-baseline)
(profile: `node-library`).

Web apps only — the headless API must not pull in nunjucks.

## What it fixes

The old per-app `templateEngine` hardcoded frontend paths like
`node_modules/govuk-frontend/dist/govuk/components/`. That reaches into a transitive dependency npm
only happens to hoist, and breaks on hoisting/version changes. This library resolves those paths via
`require.resolve` instead, so **no app references `node_modules/...` literally** and the GOV.UK
version is governed by `@ministryofjustice/frontend` (the declared dependency).

## Install

```jsonc
"@cica/nunjucks-govuk": "github:CriminalInjuriesCompensationAuthority/cica-platform#semver:nunjucks-govuk-v0.1.0"
```

Peer dependencies (provided by the app): `express`, `nunjucks`, `@ministryofjustice/frontend`.
`govuk-frontend` is pulled in transitively by `@ministryofjustice/frontend` — do not declare it
directly.

## Usage

```js
import express from 'express';
import { createTemplateEngineService } from '@cica/nunjucks-govuk';

const app = express();
const templates = createTemplateEngineService(app, {
    loaderPaths: ['page/', 'partial/', 'components/'],  // app-specific dirs
    globals: { APP_VERSION: process.env.npm_package_version, govukRebrand: true },
    filters: {
        formatDate: (d) => new Date(d).toLocaleDateString('en-GB')
    }
});
templates.init();
```

Serve the resolved GOV.UK static assets without hardcoding paths:

```js
import { resolveFrontendAssetPaths } from '@cica/nunjucks-govuk';
for (const { mount, dir } of resolveFrontendAssetPaths().staticAssetDirs) {
    app.use(mount, express.static(dir, { maxAge: '1h' }));
}
```

## API

| Export | Description |
| --- | --- |
| `createTemplateEngineService(app, options)` | Builds the nunjucks environment. `options`: `loaderPaths`, `globals`, `filters`, `autoescape` (default true). Returns `{ init, render, getEnvironment, assetPaths }`. |
| `resolveFrontendAssetPaths(options)` | Resolves `{ govukRoot, govukDist, govukAssets, mojRoot, templateLoaderPaths, staticAssetDirs }` via `require.resolve`. |
| `resolvePackageDir(pkg)` | Resolves any package's install dir via its `package.json`. |
| `MissingExpressAppError` | Thrown if `init()` runs without an Express app. |

## Development

```bash
npm install
npm test     # c8 node --test
npm run lint # biome check
```

## License

MIT
