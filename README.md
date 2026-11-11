# cica-platform

Shared runtime libraries for CICA Node.js services, developed in one repository and published and
imported **independently** under the `@cica/*` scope. This is an
[npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo — one install, one test
run, one CI pipeline — with no cross-package coupling forced on consumers.

Managed by [`project-baseline`](https://github.com/CriminalInjuriesCompensationAuthority/project-baseline)
(each package follows the `node-library` profile).

## Packages

| Package | Description |
| --- | --- |
| [`@cica/logger`](packages/logger) | pino/pino-http logger factory: env-driven redaction, correlation id, dev pretty-print. |
| [`@cica/express-baseline`](packages/express-baseline) | Hardened Express runtime: helmet/CSP/HSTS, security headers, env validation, error handlers, health. |
| [`@cica/nunjucks-govuk`](packages/nunjucks-govuk) | Nunjucks template-engine factory for web apps with GOV.UK + MoJ frontend asset resolution. |

Each package is versioned and released on its own (see **Versioning** below) and consumed
individually — nothing here requires taking all three.

## Using a package

Packages are published to the npm registry under the `@cica` scope. Depend on one by name and a
semver range:

```jsonc
"@cica/logger": "^0.1.0"
```

```js
import { createLogger } from '@cica/logger';
```

Take only the package(s) you need — nothing here requires all three. For the full consumer setup
(Dependabot, Node version, optional peers) see [`docs/consuming-apps.md`](docs/consuming-apps.md).
For how publishing and releases work, and the reasoning behind the registry choice, see
[`docs/packaging.md`](docs/packaging.md). To try the whole publish → consume → update loop locally
without the registry, see [`demo/README.md`](demo/README.md).

## Development

Requires Node `>=24.15.0` and npm `>=11.12.1` (enforced via `engine-strict`).

```bash
npm install            # installs all workspaces, links @cica/* locally
npm test               # runs every package's test suite (c8 node --test)
npm run lint           # biome check across the whole repo
npm run lint:fix       # biome check --write
```

Work on a single package:

```bash
npm test  --workspace @cica/logger
npm run lint --workspace @cica/logger
```

## Layout

```
cica-platform/
├── package.json            # private root: workspaces + shared dev toolchain (biome, c8, husky)
├── biome.json .c8rc.json   # shared lint + coverage config
├── .editorconfig .npmrc .gitattributes .gitignore
├── .husky/                 # pre-push: test + lint + audit
├── .github/workflows/      # CI matrix across packages
└── packages/
    ├── logger/             # @cica/logger
    ├── express-baseline/   # @cica/express-baseline
    └── nunjucks-govuk/     # @cica/nunjucks-govuk
```

The dev toolchain (Biome, c8, Husky) is hoisted to the root so there is one version of each across
all packages. Each package keeps its own `package.json` with its runtime/peer dependencies and its
own `test`/`lint` scripts, so it stays independently buildable and publishable.

## Versioning & releases

Packages are versioned **independently**. A release is cut from the **Release** workflow (Actions →
Release → Run workflow): pick a package and version, and it runs the quality gate, publishes that
package to npm, and creates a `<name>-vX.Y.Z` tag (e.g. `logger-v0.2.0`) plus a GitHub Release. A
change to one package does not force a version bump on the others, so a consumer that only uses
`@cica/logger` never sees churn from the other packages. Step-by-step: [`docs/runbooks/release-a-package.md`](docs/runbooks/release-a-package.md).

## License

MIT
