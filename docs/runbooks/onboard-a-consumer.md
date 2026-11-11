# Runbook: onboard a consuming app

Wire a service repo to depend on one or more `@cica/*` packages and keep it updated automatically.

## 1. Add the dependency

In the consuming app's `package.json`, add the package(s) you need by name and semver range:

```jsonc
{
  "dependencies": {
    "@cica/logger": "^0.1.0"
  }
}
```

Take only what the app uses — not all three. Import by name:

```js
import { createLogger } from '@cica/logger';
```

## 2. Node version

The packages require Node `>=24.15.0` (`engine-strict` is on). Make sure the app's `.nvmrc` / CI
Node version is 24.15.0 or newer, or installs will fail the engine check.

## 3. Optional peer dependencies

Check the package README for optional peers. Notably:

- `@cica/logger` → `pino-pretty` (dev pretty-printing only). If not installed, run with
  `NODE_ENV=production` so the logger does not try to load the missing transport.
- `@cica/express-baseline` → `express` (required peer).
- `@cica/nunjucks-govuk` → `express`, `nunjucks`, `@ministryofjustice/frontend` (required peers).

## 4. Add Dependabot

Create `.github/dependabot.yml` in the consuming app so updates arrive as PRs automatically:

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
      cica-platform:
        patterns:
          - "@cica/*"
      all-npm:
        patterns:
          - "*"
        exclude-patterns:
          - "@cica/*"
```

The `@cica/*` group keeps platform bumps in their own PR, separate from other dependency noise.

## 5. Verify

```bash
npm install
npm test
```

From then on, when a new `@cica/*` version is published, Dependabot opens a PR bumping the range;
the app's CI runs on it; you review and merge. See [`consuming-apps.md`](../consuming-apps.md) for the
full reference.
