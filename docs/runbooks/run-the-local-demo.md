# Runbook: run the local demo

Demonstrate the full publish → consume → update loop on your own machine, with no npm registry —
useful before the `@cica` npm org exists, or for showing other devs how the lifecycle works.

The detailed walkthrough lives in [`../../demo/README.md`](../../demo/README.md). Quick version:

## Steps

1. One-time: `npm install` at the repo root (installs Verdaccio, links the workspaces). Requires
   Node `>=24.15.0`.

2. **Terminal 1** — start the local registry:
   ```bash
   npm run demo:registry
   ```
   Verdaccio starts on <http://localhost:4873>. Leave it running.

3. **Terminal 2** — publish all three packages to it:
   ```bash
   npm run demo:publish
   ```

4. Install and run the example consumer:
   ```bash
   cd demo/consumer
   npm install
   npm start
   ```
   Expect a structured log line and `OK: @cica/logger resolved, imported, and logged.`

5. Demo a version update:
   ```bash
   npm run demo:bump          # at repo root: publishes a patched @cica/logger
   cd demo/consumer
   npm outdated               # shows the newer version
   npm update @cica/logger
   npm ls @cica/logger        # now on the bumped version
   ```

## Notes

- The demo never modifies tracked files — packages are published from temp copies with
  `publishConfig.registry` stripped (see `demo/scripts/lib.sh`). `demo:bump` can be run repeatedly;
  it increments from the registry's latest version.
- Reset: `Ctrl-C` Terminal 1, then
  `rm -rf demo/verdaccio/storage demo/verdaccio/htpasswd demo/.token demo/consumer/node_modules demo/consumer/package-lock.json`
  (all git-ignored).
- How this maps to production is in [`../../demo/README.md`](../../demo/README.md).
