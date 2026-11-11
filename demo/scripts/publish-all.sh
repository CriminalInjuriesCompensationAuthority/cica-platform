#!/usr/bin/env bash
# Publish all three @cica/* packages to the LOCAL demo registry (Verdaccio).
#
# The tracked packages/*/package.json files are NEVER modified: we publish from
# isolated temp copies with publishConfig.registry stripped (see lib.sh). The
# committed manifests keep publishConfig.registry pinned to npmjs.org.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=lib.sh
source "$ROOT/demo/scripts/lib.sh"

REG="$(demo_registry)"
NPMRC="$(demo_token_npmrc "$ROOT" "$REG")"
trap 'rm -f "$NPMRC"' EXIT

for pkg in logger express-baseline nunjucks-govuk; do
  echo "== publishing @cica/$pkg to $REG =="
  version="$(publish_pkg_copy "$ROOT" "$pkg" "$REG" "$NPMRC")"
  echo "   + @cica/$pkg@$version"
done

echo "== done: all three @cica/* packages published to the local demo registry =="
