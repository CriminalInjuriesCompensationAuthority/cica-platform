#!/usr/bin/env bash
# Publish a bumped @cica/logger PATCH version to the local demo registry, so you
# can show a consumer picking up the update (what Dependabot automates on a real
# registry). This bumps the committed packages/logger/package.json version — it
# is a real version change you should either keep or revert with git afterwards.
set -euo pipefail

REG="${DEMO_REGISTRY:-http://localhost:4873/}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Ensure we have a valid demo-registry token (see login.sh).
TOKEN_FILE="$ROOT/demo/.token"
if [ ! -s "$TOKEN_FILE" ]; then
  bash "$ROOT/demo/scripts/login.sh"
fi
TOKEN="$(cat "$TOKEN_FILE")"
HOSTPORT="$(echo "$REG" | sed -E 's#^https?://##; s#/$##')"
NPMRC="$(mktemp)"
printf '//%s/:_authToken=%s\n' "$HOSTPORT" "$TOKEN" > "$NPMRC"
export npm_config_userconfig="$NPMRC"

restore() {
  npm pkg set "publishConfig.registry=https://registry.npmjs.org" --workspace "@cica/logger" >/dev/null 2>&1 || true
  npm pkg set "publishConfig.access=public" --workspace "@cica/logger" >/dev/null 2>&1 || true
  rm -f "$NPMRC"
}
trap restore EXIT

echo "== bumping @cica/logger patch version =="
npm version patch --no-git-tag-version --workspace "@cica/logger"

NEW="$(node -p "require('./packages/logger/package.json').version")"
echo "== publishing @cica/logger@$NEW to $REG =="
npm pkg set "publishConfig.registry=$REG" --workspace "@cica/logger" >/dev/null
npm pkg set "publishConfig.access=public" --workspace "@cica/logger" >/dev/null
npm publish --workspace "@cica/logger" --registry "$REG"

echo "== published @cica/logger@$NEW =="
echo "In demo/consumer run:  npm update @cica/logger   (then: npm ls @cica/logger)"
echo "NOTE: this changed packages/logger/package.json version. Revert with git if you don't want to keep it."
