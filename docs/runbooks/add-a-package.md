# Runbook: add a new `@cica/*` package

Add a fourth (or later) shared library to the monorepo so it builds, tests, lints, and releases like
the existing three.

## 1. Create the package directory

Under `packages/<name>/` create:

```
packages/<name>/
├── package.json
├── README.md
└── src/
    ├── index.js
    └── index.test.js
```

## 2. `package.json` — match the existing convention

Copy an existing package's `package.json` (e.g. `packages/logger/package.json`) and adjust. The
fields that must follow the convention:

```jsonc
{
  "name": "@cica/<name>",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.js",
  "exports": { ".": "./src/index.js" },
  "engines": { "node": ">=24.15.0", "npm": ">=11.12.1" },
  "files": ["src", "!src/**/*.test.js"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/CriminalInjuriesCompensationAuthority/cica-platform.git",
    "directory": "packages/<name>"
  },
  "publishConfig": { "registry": "https://registry.npmjs.org", "access": "public" },
  "scripts": {
    "test": "c8 node --test",
    "coverage:html": "c8 report --reporter=html",
    "lint": "biome check",
    "lint:check": "biome check",
    "lint:fix": "biome check --write"
  },
  "license": "MIT"
}
```

- Declare runtime `dependencies` the package needs, and `peerDependencies` the consumer must provide
  (e.g. `express`). The dev toolchain (biome, c8, husky) stays at the root — do **not** add it here.
- `publishConfig.registry` must stay pinned to npmjs.org (see
  [`../packaging.md`](../packaging.md) for why).

## 3. Wire it into the monorepo

- The root `workspaces: ["packages/*"]` picks it up automatically — no root change needed.
- Run `npm install` **at the repo root** to link it.
- Root `npm test` / `npm run lint` now include the new package.

## 4. Release plumbing

Add the package to the **Release** workflow's `package` choice list so it can be released:

```yaml
# .github/workflows/release.yml -> on.workflow_dispatch.inputs.package.options
options:
  - logger
  - express-baseline
  - nunjucks-govuk
  - <name>
```

## 5. Documentation

- Write `packages/<name>/README.md` following the existing package READMEs (what it does, Install
  with the `^0.1.0` npm range, Usage, API table).
- Add a row to the **Packages** table in the root `README.md`.

## 6. Verify

```bash
npm install
npm test --workspace @cica/<name>
npm run lint
```

Then release it with [`release-a-package.md`](release-a-package.md) (first release: `0.1.0`).
