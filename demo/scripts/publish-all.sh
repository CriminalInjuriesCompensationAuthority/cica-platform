#!/usr/bin/env bash
# Publish all three @cica/* packages to the LOCAL demo registry (Verdaccio).
#
# Each package.json has publishConfig.registry = npmjs.org (the real target),
# and publishConfig always wins over --registry. To publish to the local demo
# registry WITHOUT editing the committed manifests, we temporarily override
# publishConfig for the duration of the publish and always restore it, even on
# failure, via a trap.
set -euo pipefail

REG="${DEMO_REGISTRY:-http://localhost:4873/}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PACKAGES=(logger express-baseline nunjucks-govuk)

# npm requires a valid token to publish. Ensure we have one cached (login.sh
# creates a demo user on the local registry and writes demo/.token).
TOKEN_FILE="$ROOT/demo/.token"
if [ ! -s "$TOKEN_FILE" ]; then
  bash "$ROOT/demo/scripts/login.sh"
fi
TOKEN="$(cat "$TOKEN_FILE")"

# Supply the token via a scratch userconfig so we don't touch ~/.npmrc.
HOSTPORT="$(echo "$REG" | sed -E 's#^https?://##; s#/$##')"
NPMRC="$(mktemp)"
printf '//%s/:_authToken=%s\n' "$HOSTPORT" "$TOKEN" > "$NPMRC"
export npm_config_userconfig="$NPMRC"

restore() {
  for pkg in "${PACKAGES[@]}"; do
    local dir="packages/$pkg"
    # Restore the real publishConfig (npmjs.org / public).
    npm pkg set "publishConfig.registry=https://registry.npmjs.org" --workspace "@cica/$pkg" >/dev/null 2>&1 || true
    npm pkg set "publishConfig.access=public" --workspace "@cica/$pkg" >/dev/null 2>&1 || true
  done
}
cleanup() { restore; rm -f "$NPMRC"; }
trap cleanup EXIT

for pkg in "${PACKAGES[@]}"; do
  echo "== publishing @cica/$pkg to $REG =="
  # Point publishConfig at the local demo registry just for this publish.
  npm pkg set "publishConfig.registry=$REG" --workspace "@cica/$pkg" >/dev/null
  npm pkg set "publishConfig.access=public" --workspace "@cica/$pkg" >/dev/null
  npm publish --workspace "@cica/$pkg" --registry "$REG" || {
    echo "If this says the version already exists, bump the version or run demo:reset."
    exit 1
  }
done

echo "== done: all three @cica/* packages published to the local demo registry =="
