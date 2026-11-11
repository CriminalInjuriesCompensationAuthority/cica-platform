# Runbook: release a package

Cut a new version of one `@cica/*` package and publish it to npm. Packages are versioned
independently — release only the one that changed.

## Prerequisites

- The `NPM_TOKEN` repo secret is set (npm automation token with publish rights on `@cica`).
- You can run the Release workflow (repo write / Actions access).

## Steps

1. **Bump the version.** In the package's `package.json` (e.g. `packages/logger/package.json`),
   increase `version` following semver:
   - patch (`0.1.0` → `0.1.1`) — bug fix, no API change
   - minor (`0.1.0` → `0.2.0`) — backwards-compatible addition
   - major (`0.1.0` → `1.0.0`) — breaking change

2. **Open a PR with just that bump** (plus the change itself if not already merged), get CI green,
   and merge to the default branch. The Release workflow releases whatever is on the default branch,
   so the version must be merged first.

3. **Run the Release workflow.** Actions → **Release** → **Run workflow**:
   - `package`: the package name (`logger`, `express-baseline`, or `nunjucks-govuk`)
   - `version`: the exact version you set in step 1 (e.g. `0.1.1`)

4. **What the workflow does** (in order):
   - verifies `package.json` version matches the version you entered;
   - runs the quality gate (`npm run prepush`);
   - fails fast if the `<package>-v<version>` tag already exists;
   - publishes the package to npm;
   - creates the `<package>-v<version>` tag;
   - creates a GitHub Release with generated notes.

5. **Verify.** Check the package version appears on npm and the GitHub Release was created.

## If it fails

- **"version (X) != requested (Y)"** — the `package.json` version on the default branch does not
  match what you typed. Fix the bump / your input and re-run.
- **"Tag ... already exists"** — that version was already released (or a tag is left over). Choose a
  new version, or delete the stale tag if it is genuinely orphaned.
- **npm publish auth/403** — `NPM_TOKEN` is missing, expired, or lacks rights on the `@cica` scope.
- Because publish runs **before** tagging, a failed publish leaves no tag — safe to fix and re-run.

## Notes

- Do not hand-create release tags; let the workflow own them (a pre-existing tag blocks the run).
- Releasing one package never bumps the others.
