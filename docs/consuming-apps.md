# Consuming `@cica/*` packages (GitHub-hosted, no registry)

How a service app depends on packages from `cica-platform` while they are hosted on GitHub
(not an npm registry), and how to get Dependabot to open update PRs automatically when a new
package version is released.

> This is the interim setup. When `@cica/*` moves to an npm registry, the only change in a
> consuming app is swapping the git ref for a normal version range (e.g. `^0.2.0`); the
> Dependabot config stays the same.

## 1. Add the dependency

In the **consuming app's** `package.json`, reference the package by a GitHub `#semver:` range.
Use the tag prefix of the package you want (`logger-v`, `express-baseline-v`, `nunjucks-govuk-v`):

```jsonc
{
  "dependencies": {
    "@cica/logger": "github:CriminalInjuriesCompensationAuthority/cica-platform#semver:^logger-v0.1.0"
  }
}
```

Use it in code by its package name — unaffected by the fact it lives in a monorepo:

```js
import { createLogger } from '@cica/logger';
```

Why a range (`^logger-v0.1.0`) and not a pinned tag: the `#semver:` range is what Dependabot
reads to decide an update is available. Dependabot parses a semver version from the tag and only
moves to tags sharing the same prefix (`logger-v`), which keeps each package's versions in their
own series.

## 2. Add Dependabot to the consuming app

Create `.github/dependabot.yml` in the **consuming app**:

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

## 3. Private-repo access (only if `cica-platform` is private)

If this repo is private, both CI and Dependabot need read access to clone it:

- **Dependabot**: grant access to the private git dependency (Dependabot secret / org-level
  config with a token). Dependabot cannot clone a private GitHub dependency without one.
- **Local & CI `npm install`**: developers/CI need git access (SSH key or PAT), because
  `github:` refs are cloned over git.

If the repo is public, no auth setup is needed.

## The end-to-end workflow

1. Change a package (e.g. `@cica/logger`) and bump `packages/logger/package.json` `version`.
2. Merge to the default branch.
3. Run the **Release** workflow (Actions → Release → Run workflow) → pick the package + version.
   It creates the `logger-v0.2.0` tag and GitHub Release.
4. Dependabot in each consuming app sees the new prefixed tag and opens a PR bumping the
   `#semver:^logger-v...` ref.
5. The app's CI runs on that PR; review and merge.

## Verifying it actually fires

The prefixed-tag handling is the load-bearing assumption and is worth confirming once there is a
real consuming app and at least two tags in a series (e.g. `logger-v0.1.0` and `logger-v0.1.1`):
point the app at `#semver:^logger-v0.1.0`, enable Dependabot, and confirm it opens the bump PR.
If the prefix is not picked up cleanly, the fallback is a platform-side fan-out (a release job
that opens PRs in consumers via `gh pr create`), which does not rely on Dependabot's tag parsing.
