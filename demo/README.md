# Local demo: publish & consume `@cica/*` via a local registry

This demo lets you show the full package workflow on your own machine, without the public npm
registry: a local [Verdaccio](https://verdaccio.org/) registry, publishing the `@cica/*` packages to
it, consuming `@cica/logger` from an example app, and watching the app pick up a new version — which
is exactly what Dependabot automates against a real registry.

Everything here is **local and disposable**. It does not touch, and is not used by, the real release
pipeline (which publishes to npmjs.org).

## Prerequisites

- Node `>=24.15.0` (`.nvmrc` pins the version; run `nvm use`).
- Run `npm install` once at the repo root (installs Verdaccio and links the workspaces).

## Run the demo

Open **two terminals** at the repo root.

### Terminal 1 — start the local registry

```bash
npm run demo:registry
```

Verdaccio starts on <http://localhost:4873> using `demo/verdaccio/config.yaml`. The config allows
anonymous publish/read for the `@cica/*` scope, so there is no login or token to deal with. Leave
this running. You can open the URL in a browser to see published packages.

### Terminal 2 — publish and consume

1. Publish all three packages to the local registry:

   ```bash
   npm run demo:publish
   ```

   This publishes `@cica/logger`, `@cica/express-baseline`, and `@cica/nunjucks-govuk` at their
   current versions. (Each package is published from an isolated temp copy with its
   `publishConfig.registry` stripped, so your committed manifests are never touched — see
   `demo/scripts/lib.sh`.)

2. Install and run the example consumer:

   ```bash
   cd demo/consumer
   npm install
   npm start
   ```

   You should see a structured log line and `OK: @cica/logger resolved, imported, and logged.` The
   consumer depends on `@cica/logger: ^0.1.0` and resolves it from the local registry (see
   `demo/consumer/.npmrc`).

## Demo the "new version propagates" part

Back at the repo root (Terminal 2):

```bash
npm run demo:bump
```

This publishes a **patched** `@cica/logger` (e.g. `0.1.1`) to the local registry. Then, in the
consumer, show it being picked up:

```bash
cd demo/consumer
npm outdated          # shows Current 0.1.0 -> Wanted/Latest 0.1.1
npm update @cica/logger
npm ls @cica/logger   # now resolves to 0.1.1
```

That `outdated -> update` is the signal Dependabot keys off on a real registry to open a bump PR
automatically.

> `demo:bump` does **not** modify any tracked file. The patched version is applied only in a
> throwaway copy that gets published, so there is nothing to revert. Run it repeatedly to publish
> `0.1.1`, `0.1.2`, ... (it increments from the latest version already in the registry).

## Reset / clean up

- Stop the registry: `Ctrl-C` in Terminal 1.
- Remove local registry data and the consumer install:

  ```bash
  rm -rf demo/verdaccio/storage demo/verdaccio/htpasswd demo/consumer/node_modules demo/consumer/package-lock.json
  ```

  (These paths are git-ignored, so they never get committed.)

## How this maps to production

| Demo (local)                     | Production                                  |
| -------------------------------- | ------------------------------------------- |
| Verdaccio on `localhost:4873`    | public npm registry (`registry.npmjs.org`)  |
| `npm run demo:publish`           | the **Release** workflow's `npm publish`    |
| `npm outdated` / `npm update`    | Dependabot opening a version-bump PR        |
| anonymous access                 | `@cica` npm org + `NPM_TOKEN` secret        |

When the real `@cica` npm org and `NPM_TOKEN` exist, nothing in the packages changes — publishing
switches from this local registry to npmjs.org via the existing `publishConfig` and release workflow.
