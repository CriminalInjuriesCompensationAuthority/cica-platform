# Consuming `@cica/*` packages (GitHub Packages registry)

How a service app depends on packages from `cica-platform`, and how Dependabot opens update PRs
automatically when a new package version is released.

The `@cica/*` packages are published to the **GitHub Packages** npm registry
(`https://npm.pkg.github.com`), one package per release. They are **not** consumable via a plain
`github:` git ref — a git dependency installs the whole monorepo root, not a single workspace
package, so a registry is required to pull one package by name and version.

> Note: GitHub Packages (npm) requires authentication to **install**, even for packages whose
> source repo is public. Every consuming app/CI needs a token with `read:packages`. A move to the
> public npm registry later would remove that requirement; the consuming config below barely changes.

## 1. Tell the app where `@cica` comes from

Add an `.npmrc` to the **consuming app** mapping the scope to GitHub Packages. Keep the token out
of this committed file — inject it from the environment:

```ini
@cica:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Locally and in CI, set `NODE_AUTH_TOKEN` to a token (PAT or `GITHUB_TOKEN` in Actions) that has
`read:packages`.

## 2. Add the dependency

Reference the package normally — a real semver range, by name:

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

## 3. Add Dependabot to the consuming app

Create `.github/dependabot.yml`. Because these are now registry packages with real semver,
Dependabot's `npm` ecosystem handles them directly — no tag-prefix hacks:

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

Dependabot needs read access to the GitHub Packages registry. In the consuming repo, add a
Dependabot secret (Settings → Secrets → Dependabot) and reference the registry in
`.github/dependabot.yml` if a token is required for your org's package visibility.

## The end-to-end workflow

1. Change a package (e.g. `@cica/logger`) and bump `packages/logger/package.json` `version`.
2. Merge to the default branch.
3. Run the **Release** workflow (Actions → Release → Run workflow) → pick the package + version.
   It runs the quality gate, publishes the package to GitHub Packages, creates the
   `logger-v0.2.0` tag, and cuts a GitHub Release.
4. Dependabot in each consuming app sees the new published version and opens a PR bumping the
   `^0.1.0` range.
5. The app's CI runs on that PR; review and merge.

## Node version

The packages declare `engines.node >= 24.15.0` and the repo sets `engine-strict=true`. Consuming
apps/CI must run Node 24.15.0 or newer, or installs will fail the engine check.
