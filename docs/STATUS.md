# Status & next steps

A snapshot of where the `cica-platform` / `project-baseline` work stands and what is still open, so
the context is not lost between sessions. Written 2026-11-11.

## Where things are

### `cica-platform` (this repo)
- Live on GitHub (`CriminalInjuriesCompensationAuthority/cica-platform`, **public**, default branch
  `master`). CI runs on PRs and pushes to `master`.
- Three packages (`@cica/logger`, `@cica/express-baseline`, `@cica/nunjucks-govuk`) build, test, and
  lint clean. Husky hooks hardened (pre-commit: staged lint/format + staged secret scan; pre-push:
  full gate + secret scan).
- **Configured** to publish to the public npm registry under the `@cica` scope (`publishConfig` in
  each package + the Release workflow). Not yet actually published — see Blocked below.
- Docs: `docs/packaging.md` (overview + rejected approaches), `docs/consuming-apps.md`,
  `docs/runbooks/*`, and the local demo (`demo/`). The demo proves the full publish → consume →
  version-bump loop against a local Verdaccio registry with no npm account needed.

### `project-baseline`
- Now live on GitHub (`CriminalInjuriesCompensationAuthority/project-baseline`, **public**, default
  branch `main`). First push done this session.
- The `baseline` CLI (`tooling/`) works for existing and new repos: `inspect` / `plan` / `audit` /
  `discover` / `deps` / local `apply` (72 tests pass). `apply` stops before pushing (needs GitHub
  auth — not built).
- Distribution docs corrected to the monorepo + npm-registry reality (the old `github:` ref story is
  gone; a plain git ref cannot address one package in a monorepo).
- Provisions the husky hook files and the `precommit-staged.js` helper into adopted repos.

## Blocked on a decision / access (not code)

1. **`@cica` npm org + `NPM_TOKEN`.** Nothing can be published for real until CICA owns the `cica`
   scope on npmjs.com and an npm automation token is added as the `NPM_TOKEN` repo secret in
   `cica-platform`. This is the single prerequisite for the whole publish/consume flow. Until then,
   the Verdaccio demo is the stand-in.
2. **Public vs private** for both repos. Both went out public this session. `project-baseline` is
   internal org tooling (policies, estate audits, CODEOWNERS maps) — worth confirming public is
   intended. (History was secret-scanned; nothing sensitive found.)

## Open code tasks (documented, not yet done — both also need the npm org)

3. **package.json hook-scripts provisioning in `project-baseline`.** The baseline ships the husky
   hook files + helper, but not the `precommit`/`prepush`/`*:secrets` npm scripts the hooks call, so
   a freshly-adopted repo gets hooks that call missing scripts. Needs a JSON-key-merge strategy in
   the CLI. Written up in `project-baseline/docs/migrations/husky-hook-scripts.md`. Reference
   implementation: this repo's root `package.json` + `scripts/hooks/precommit-staged.js`.
4. **npm-publish step in the baseline's library release template.** `project-baseline`'s provisioned
   `node-library` release workflow tags but does not publish; it has diverged from this repo's live
   release workflow. Written up in `project-baseline/docs/migrations/library-release-npm-publish.md`.

## Other backlog (lower priority)

- `project-baseline` `baseline apply` has only been run read-only (`plan`). A real `apply` on one
  repo (safe — operates on a throwaway clone) would prove scaffolding end to end.
- Automating push + PR creation in `baseline apply` — the one manual step in every new/existing-repo
  setup; needs the GitHub-auth decision (token vs GitHub App).
- `shellcheck` is not in the toolchain, so the demo bash scripts and hook scripts are not linted.

## Recommended order when picking back up

1. Resolve the `@cica` npm org + `NPM_TOKEN` (unblocks the real goal).
2. Then cut the first real release of `@cica/logger` and wire up one consuming app end to end.
3. Then close the two documented baseline gaps (#3, #4) so new/adopted repos are fully correct.
