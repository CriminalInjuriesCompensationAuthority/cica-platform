#!/usr/bin/env bash
# Publish a bumped @cica/logger PATCH version to the local demo registry, so you
# can show a consumer picking up the update (what Dependabot automates on a real
# registry).
#
# The tracked packages/logger/package.json is NEVER modified: the bump happens
# only in a temp copy that gets published (see lib.sh). Nothing to revert.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=lib.sh
source "$ROOT/demo/scripts/lib.sh"

REG="$(demo_registry)"
NPMRC="$(demo_token_npmrc "$ROOT" "$REG")"
trap 'rm -f "$NPMRC"' EXIT

# Base the next patch on whatever is ALREADY the latest in the demo registry, so
# running this repeatedly keeps incrementing (0.1.1, 0.1.2, ...) instead of
# colliding. Fall back to the tracked version if nothing is published yet.
TRACKED="$(node -p "require('./packages/logger/package.json').version")"
LATEST="$(npm view @cica/logger version --registry "$REG" --userconfig "$NPMRC" 2>/dev/null || true)"
BASE="${LATEST:-$TRACKED}"
NEXT="$(node -e "const [a,b,c]='$BASE'.split('.'); console.log(\`\${a}.\${b}.\${Number(c)+1}\`)")"
CURRENT="$BASE"

echo "== publishing @cica/logger@$NEXT (patch over $CURRENT) to $REG =="
published="$(publish_pkg_copy "$ROOT" "logger" "$REG" "$NPMRC" "$NEXT")"

echo "== published @cica/logger@$published =="
echo "In demo/consumer run:  npm update @cica/logger   (then: npm ls @cica/logger)"
echo "The tracked packages/logger/package.json is unchanged — nothing to revert."
