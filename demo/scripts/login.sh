#!/usr/bin/env bash
# Create (idempotently) a demo user on the local registry and cache a valid
# auth token to demo/.token (git-ignored). Both publish-all.sh and the example
# consumer use this token. This avoids any interactive `npm login`.
set -euo pipefail

REG="${DEMO_REGISTRY:-http://localhost:4873/}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOKEN_FILE="$ROOT/demo/.token"

USER="demo"
PASS="demo1234"

# Verdaccio returns a token when creating a NEW user. If the user already
# exists, we rotate to a uniquely-named user so we always get a fresh token.
make_user() {
  local u="$1"
  curl -s -XPUT \
    -H "Content-type: application/json" \
    -d "{\"name\":\"$u\",\"password\":\"$PASS\"}" \
    "${REG%/}/-/user/org.couchdb.user:$u"
}

RESP="$(make_user "$USER")"
TOKEN="$(printf '%s' "$RESP" | sed -n 's/.*"token"[: ]*"\([^"]*\)".*/\1/p')"

if [ -z "$TOKEN" ]; then
  # User likely exists already; create a unique one to get a token.
  USER="demo-$(date +%s)"
  RESP="$(make_user "$USER")"
  TOKEN="$(printf '%s' "$RESP" | sed -n 's/.*"token"[: ]*"\([^"]*\)".*/\1/p')"
fi

if [ -z "$TOKEN" ]; then
  echo "Failed to obtain a token from $REG. Response was:"
  echo "$RESP"
  exit 1
fi

printf '%s' "$TOKEN" > "$TOKEN_FILE"
echo "Cached demo registry token to demo/.token (user: $USER)"
