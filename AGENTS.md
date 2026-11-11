# cica-platform — Agent Guidelines

Baseline agent guidance for CICA Node.js repositories, provisioned by `project-baseline`. Keep this
file limited to stable rules. Use `README.md` (and `ARCHITECTURE.md` / `CONTRIBUTING.md` where
present) for fuller project guidance.

> The section above the "Repo-specific guidance" marker is the shared org baseline and is kept in
> sync by `project-baseline`. Add anything project-specific **below** that marker so sync does not
> overwrite it.

## Code Style

- Use Biome for formatting and linting (`npm run lint` / `npm run lint:fix`). ESLint, if present, is
  only for JSDoc checks.
- Keep `if` and other control-flow statements in braces, even for single-line bodies.
- Use camelCase for functions and variables.
- Use `.js` files by default; do not introduce `.mjs` files (ESM migration is deferred org-wide).
- Keep middleware and utility folders in camelCase.

## Testing

- Use the Node test runner (`node:test`) for all new tests. Do not add new Jest tests.
- Test files live beside the code they cover and end in `*.test.js` (migrated node:test suites may use
  `*.node.test.js` during a dual-runner transition — see the migration guide).
- Coverage is enforced via `c8` (`.c8rc.json`).

## Shared runtime behaviour

- Cross-cutting behaviour (logging, helmet/CSP, env validation, error handling, health) comes from the
  shared libraries (`@cica/logger`, `@cica/express-baseline`, `@cica/nunjucks-govuk`), not local code.
  Change it by bumping the dependency, not by editing app bootstrap files.

## Security

- Never commit real secret values to any `.env` file. Use `.env.example` as the template and
  `.env.test` for test runs.
- Secret scanning (gitleaks) and `npm audit` run in pre-commit/pre-push hooks and CI.

## Common Commands

- `npm install`
- `npm test`
- `npm run lint` / `npm run lint:fix`
- `npm run format`

## Validation

- Run `npm test` and `npm run lint` as the main checks for any change.

<!-- project-baseline:end-shared -->
## Repo-specific guidance

This repo is an **npm-workspaces monorepo**. The three shared libraries live under `packages/*`:

- `packages/logger` → `@cica/logger`
- `packages/express-baseline` → `@cica/express-baseline`
- `packages/nunjucks-govuk` → `@cica/nunjucks-govuk`

Working here:

- Run `npm install` **once at the repo root** — it installs and links every package.
- `npm test` / `npm run lint` at the root run across all packages. To target one package, use
  `npm test --workspace @cica/logger`.
- The dev toolchain (Biome, c8, Husky) is shared at the root; each package keeps only its own runtime
  and peer dependencies in its `package.json`.
- Packages are versioned **independently** and released with a per-package tag `<package>-vX.Y.Z`
  (e.g. `logger-v0.2.0`) via the Release workflow. Bump only the package you are releasing.
- Requires Node `>=24.15.0` (see `.nvmrc`).
