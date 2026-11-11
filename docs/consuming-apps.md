# Consuming `@cica/*` packages (public npm registry)

How a service app depends on packages from `cica-platform`, and how Dependabot opens update PRs
automatically when a new package version is released.

The `@cica/*` packages are published to the **public npm registry** (`https://registry.npmjs.org`),
one package per release, under the `@cica` scope. They are **not** consumable via a plain `github:`
git ref — a git dependency installs the whole monorepo root, not a single workspace package.

> Prerequisite: the `@cica` scope on npmjs.com must be owned by CICA, and the Release workflow needs
> an npm automation token stored as the repo secret `NPM_TOKEN`.

## 1. Add the dependency

Reference the package by name with a normal semver range — no `.npmrc`, no token needed for public
packages:

```jsonc
{
  "dependencies": {
    "@cica/logger": "^0.1.0"
  }
}
```

```js
import { createLogger } from '@cica/logger';
```

### Optional peer dependencies

Some packages declare optional peers that enable extra behaviour:

- `@cica/logger` uses `pino-pretty` for dev pretty-printing. It is an **optional** peer; if it is
  not installed, run with `NODE_ENV=production` (or otherwise disable pretty) so the logger does not
  try to load the missing transport.

## 2. Add Dependabot to the consuming app

Create `.github/dependabot.yml`. These are registry packages with real semver, so Dependabot's
`npm` ecosystem handles them directly:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    commit-message:
      prefix: ":dependabot: npm"
      include: "scope"
    groups:
      # @cica/* bumps arrive as their own PR, separate from other dependency noise.
      cica-platform:
        patterns:
          - "@cica/*"
      all-npm:
        patterns:
          - "*"
        exclude-patterns:
          - "@cica/*"
```

## The end-to-end workflow

1. Change a package (e.g. `@cica/logger`) and bump `packages/logger/package.json` `version`.
2. Merge to the default branch.
3. Run the **Release** workflow (Actions → Release → Run workflow) → pick the package + version.
   It runs the quality gate, publishes the package to npm, creates the `logger-v0.2.0` tag, and cuts
   a GitHub Release.
4. Dependabot in each consuming app sees the new published version and opens a PR bumping the
   `^0.1.0` range.
5. The app's CI runs on that PR; review and merge.

## Node version

The packages declare `engines.node >= 24.15.0` and the repo sets `engine-strict=true`. Consuming
apps/CI must run Node 24.15.0 or newer, or installs will fail the engine check.

## Verified

The publish → install-by-semver → import → version-bump flow has been validated end to end against a
local npm-protocol registry (Verdaccio) using the real `@cica` scope. The only remaining real-world
step is pointing publishing at npmjs.com (`publishConfig` + the Release workflow already do this) and
having the `@cica` npm org + `NPM_TOKEN` in place.
