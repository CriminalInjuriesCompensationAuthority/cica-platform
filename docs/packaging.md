# Packaging & distribution: how `@cica/*` is built, released, and consumed

This is the overview of how the three `@cica/*` libraries get from this monorepo into consuming
services. It explains the model, the decisions behind it (including approaches that were tried and
rejected, so they are not re-attempted), and links to the task-by-task runbooks.

## The model

`cica-platform` is a private npm-workspaces monorepo that **produces** three independently published
libraries:

- `@cica/logger`
- `@cica/express-baseline`
- `@cica/nunjucks-govuk`

The repo root (`package.json`) is `"private": true` and is never published. Only the packages under
`packages/*` are published, each on its own version line. Consuming services depend on the
individual package(s) they need — never on the repo as a whole.

```
developer changes a package
      │
      ▼
Release workflow  ──►  npm registry (@cica scope)  ──►  Dependabot PR in each consumer
 (publish + tag)                                            (bump the ^range, CI, merge)
```

## How releasing works

Releases are cut from the **Release** GitHub Actions workflow (`.github/workflows/release.yml`),
triggered manually per package:

1. Bump the package's `version` in its `package.json`, merge to the default branch.
2. Actions → Release → Run workflow → choose the package and version.
3. The workflow runs the quality gate (`npm run prepush`: test + lint + audit + secret scan),
   publishes the package to npm, creates a `<package>-vX.Y.Z` tag, and cuts a GitHub Release.

Publishing order is deliberate: **publish first, then tag**, so a tag can never point at a version
that failed to publish. Full procedure: [`runbooks/release-a-package.md`](runbooks/release-a-package.md).

Requires the repo secret **`NPM_TOKEN`** (an npm automation token with publish rights on the `@cica`
scope).

## How consuming works

A service depends on a package by name and semver range (`"@cica/logger": "^0.1.0"`) and imports it
by name. Dependabot in the consumer opens a PR whenever a new version is published. Full consumer
setup — including the Node version requirement and optional peer dependencies — is in
[`consuming-apps.md`](consuming-apps.md).

## Decisions and rejected approaches

The distribution host went through two dead ends before landing on the npm registry. They are
recorded here so they are not retried.

### Rejected: plain `github:` git references

Referencing a package as `github:CriminalInjuriesCompensationAuthority/cica-platform#...` does **not
work for a monorepo**. A git dependency installs the **whole repository root**, not a single
workspace package, so `@cica/logger` resolves to the private root `package.json` rather than the
package. A git ref cannot address one package inside a workspaces monorepo. (Verified empirically.)

### Rejected: GitHub Packages (npm registry)

GitHub Packages requires the npm **scope to equal the owning GitHub org login**. The org is
`CriminalInjuriesCompensationAuthority`, but the scope is `@cica`, so publishing fails with
`403 ... The requested installation does not exist` — GitHub looks for a `cica` account and finds
none. Keeping the short, intended `@cica` scope rules out GitHub Packages. (The only ways around it
would be renaming the scope to the 40-character org name, or creating a `cica` GitHub org — both
rejected.)

### Chosen: public npm registry under `@cica`

The public npm registry has no scope-to-owner rule, so `@cica/*` works as-is, Dependabot's `npm`
ecosystem handles version bumps natively, and public packages install without a token. This is what
the packages' `publishConfig` and the Release workflow target.

## Current status

- The repo is **configured** for npm-registry publishing (`publishConfig` + Release workflow).
- **Blocked on two non-code prerequisites** before a real release can happen:
  1. The `@cica` scope/org must be owned by CICA on npmjs.com.
  2. An npm automation token must be added as the repo secret `NPM_TOKEN`.
- Until then, the full publish → consume → update loop can be demonstrated locally with no registry
  using the Verdaccio demo: [`../demo/README.md`](../demo/README.md).

## Related docs

- [`consuming-apps.md`](consuming-apps.md) — consumer setup (dependency, Dependabot, Node).
- [`../demo/README.md`](../demo/README.md) — local registry demo.
- Runbooks in [`runbooks/`](runbooks/) — step-by-step for specific tasks.
