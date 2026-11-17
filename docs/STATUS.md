# Status & next steps

A snapshot of where the `cica-platform` / `project-baseline` work stands and what is still open, so
the context is not lost between sessions. Last updated 2026-11-11.

## Where things are

### `cica-platform` (this repo)
- Live on GitHub (`CriminalInjuriesCompensationAuthority/cica-platform`, **public**, default branch
  `master`). CI runs on PRs and on pushes to `master`.
- Three packages (`@cica/logger`, `@cica/express-baseline`, `@cica/nunjucks-govuk`) build, test, and
  lint clean. Husky hooks hardened (pre-commit: staged lint/format + staged secret scan; pre-push:
  full gate + secret scan). The hooks, helper and `package.json` scripts are byte-identical to what
  `project-baseline` provisions (`baseline plan` reports them all as `leave`).
- **Configured** to publish to the public npm registry under the `@cica` scope (`publishConfig` in
  each package + the Release workflow). Not yet published: see Blocked below. The Release workflow
  applies registry auth to the publish step only, so install/test never send registry credentials.
- Docs: `docs/packaging.md` (overview + rejected approaches), `docs/consuming-apps.md`,
  `docs/runbooks/*`, and the local demo (`demo/`), which proves the publish → consume → version-bump
  loop against a local Verdaccio registry with no npm account.

### `project-baseline`
- Live on GitHub (`CriminalInjuriesCompensationAuthority/project-baseline`, **public**, default
  branch `main`). CI is green. Tags **`v1`** (moving) and **`v1.0.0`** exist.
- **The `v1` tag matters:** every adopted repo's `ci.yml` calls
  `project-baseline/.github/workflows/node-ci.yml@v1`. Until the tag was created, `cica-platform`'s
  CI failed on every push ("workflow file issue"). Rules for moving it are in that repo's README.
- The `baseline` CLI (`tooling/`, 119 tests) works for new and existing repos: `inspect`, `plan`,
  `audit`, `discover`, `deps`, and local `apply` (never touches the source repo; stops before push).
- Verified end to end on a synthetic brand-new `master`-default repo containing only a
  `package.json`: one `apply` produced the full standard, the CI caller triggered on `master`, no
  unresolved placeholders, nothing left for manual review.
- Husky hooks are fully provisioned: hook files, the staged-file helper, **and** the npm scripts
  they call (a prerequisite-gated `package.json` merge; it refuses rather than break a repo still on
  Husky 4 or without Biome, and reports why). Detail: `project-baseline/docs/migrations/husky-hook-scripts.md`.
- The `node-library` release template: tag + GitHub Release, with **opt-in** npm publish (only when
  the `NPM_TOKEN` secret is set), so existing git-ref libraries are unaffected.
- Housekeeping done: `LICENSE` + `SECURITY.md` added, Biome aligned to the reference's 2.5.12,
  stale `github:`-ref wording corrected, and the spec's `tasks.md` now reflects what is actually
  built (it previously showed every task unticked).

## Blocked on a decision / access (not code)

1. **`@cica` npm org + `NPM_TOKEN`.** Nothing can be published for real until CICA owns the `cica`
   scope on npmjs.com and an npm automation token is added as the `NPM_TOKEN` repo secret in
   `cica-platform`. This is the single prerequisite for the publish/consume flow. Until then, the
   Verdaccio demo is the stand-in.
2. **Public vs private** for both repos. Both are public. `project-baseline` is internal org tooling
   (policies, estate audits, CODEOWNERS maps). History was secret-scanned and nothing sensitive was
   found, but confirm public is intended.

## `project-baseline`: open items that need your call

- **Dependabot PR #1** (`actions/checkout` + `setup-node` v4 → v7 in `node-ci.yml`). Probably fine
  (the profile templates already use v7), but `node-ci.yml` is the reusable workflow every repo
  calls, so it changes fleet CI the moment `v1` is moved. Merge deliberately, then move `v1`.
- **Dependabot PR #2** (Biome 2.5.12 → 2.6.7 in `tooling`). The whole estate is pinned to 2.5.12, so
  merging it alone creates skew against the standard the baseline publishes. Suggest closing it and
  upgrading Biome estate-wide via `policies/versions.json` + `common/biome.json` when wanted.
- **Security alert (`minimatch`, medium, dev-only).** Reached via `c8 → test-exclude → minimatch`;
  the fix is a major bump upstream has not adopted. Low practical risk (dev tooling, trusted
  patterns). Decide whether to dismiss or add an override.
- **`chatgpt.md` at the repo root.** A 546-line raw design-brainstorm transcript from the first
  commit, now public. It was scanned (no emails, URLs, internal names or secrets) but is untidy for a
  public standards repo, and it is superseded by `.kiro/specs/`. Consider moving it under `docs/` or
  removing it (it would remain in git history).
- **`biome.json` is `♻ replace`.** The baseline's `common/biome.json` is much stricter than
  `cica-platform`'s (extra rules, a11y/security presets), so adopting it on an existing repo can
  change lint results and fail CI. This is the baseline's stated design; worth knowing before
  running `apply` on a mature repo.

## `project-baseline`: remaining roadmap

Per-task status is in `project-baseline/.kiro/specs/project-baseline/tasks.md`. Not built yet:

- **`validate`** (push the `baseline/adopt-*` branch and open the PR). This is the one manual step in
  every adoption today. Needs a GitHub-auth decision (GitHub App vs PAT).
- **`sync`** (propagate standard changes to all repos) and GitHub-side fleet enumeration. Depends on
  the above.
- **`create`** (polished generator). Needs the Copier-vs-Projen decision; `apply` already scaffolds
  an empty repo, so this is polish.
- `github-action` and `legacy` profiles; `policies/governance.yaml`; estate rollout.
- Smaller gaps: a metadata (`.project-baseline.yaml`) validator, a `kube_deploy/` scaffold for
  `node-service`, `README.scaffold.md`, and gitleaks + build steps in the reusable CI workflow.
- `shellcheck` is not in either toolchain, so the demo bash scripts are not linted.

## Recommended order when picking back up

1. Settle the `project-baseline` decisions above (Dependabot PRs, `chatgpt.md`, public/private).
2. Resolve the `@cica` npm org + `NPM_TOKEN`, then cut the first real `@cica/logger` release and wire
   up one consuming app end to end.
3. Decide GitHub auth for `validate`, which unlocks `sync` and the estate rollout.
