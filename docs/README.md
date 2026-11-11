# cica-platform docs

Documentation for how the `@cica/*` libraries are built, released, and consumed.

## Start here

- [`packaging.md`](packaging.md) — the overview: the publish/consume model, the decisions behind it
  (and the approaches that were rejected), and current status. Read this first.

## Reference

- [`consuming-apps.md`](consuming-apps.md) — full setup for a service that depends on `@cica/*`
  (dependency, Dependabot, Node version, optional peers).
- [`../demo/README.md`](../demo/README.md) — run the whole lifecycle locally with no registry.

## Runbooks (task by task)

- [`runbooks/release-a-package.md`](runbooks/release-a-package.md) — cut and publish a new version.
- [`runbooks/add-a-package.md`](runbooks/add-a-package.md) — add a new `@cica/*` library.
- [`runbooks/onboard-a-consumer.md`](runbooks/onboard-a-consumer.md) — wire a service to a package.
- [`runbooks/run-the-local-demo.md`](runbooks/run-the-local-demo.md) — the demo, quick version.
