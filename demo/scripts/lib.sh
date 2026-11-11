#!/usr/bin/env bash
# Shared helpers for the local demo publish scripts.
#
# Design: we NEVER modify the tracked packages/*/package.json. Production keeps
# publishConfig.registry pinned to npmjs.org. To publish to the LOCAL demo
# registry, we copy a package into a temp dir, delete publishConfig.registry in
# the COPY only, and publish from there. The real manifests are read-only.

# demo_registry: echoes the demo registry URL (overridable via $DEMO_REGISTRY).
demo_registry() {
  echo "${DEMO_REGISTRY:-http://localhost:4873/}"
}

# demo_token_npmrc <root> <registry>: ensure a demo-registry token exists
# (see login.sh), write it into a scratch userconfig npmrc, and echo that
# npmrc's path. npm requires a token to publish even though reads are anonymous.
demo_token_npmrc() {
  local root="$1" reg="$2"
  local token_file="$root/demo/.token"
  if [ ! -s "$token_file" ]; then
    bash "$root/demo/scripts/login.sh" 1>&2
  fi
  local token hostport npmrc
  token="$(cat "$token_file")"
  hostport="$(echo "$reg" | sed -E 's#^https?://##; s#/$##')"
  npmrc="$(mktemp)"
  printf '//%s/:_authToken=%s\n' "$hostport" "$token" > "$npmrc"
  echo "$npmrc"
}

# publish_pkg_copy <root> <pkg-dir-name> <registry> <npmrc> [new-version]
# Copy packages/<name> to a temp dir, strip publishConfig.registry in the copy,
# optionally set a new version (copy only), and publish the copy to <registry>.
# The tracked source manifest is never touched.
#
# Returns:
#   0 and prints "<version>"             on a successful publish
#   0 and prints "<version> (exists)"    if that version is already published
#   non-zero                             on any other publish failure
publish_pkg_copy() {
  local root="$1" name="$2" reg="$3" npmrc="$4" new_version="${5:-}"
  local src="$root/packages/$name"
  local work
  work="$(mktemp -d)"
  cp -r "$src/." "$work/"

  # In the COPY only: remove the npmjs.org registry pin so --registry is honoured.
  ( cd "$work" && npm pkg delete publishConfig.registry >/dev/null 2>&1 || true )
  if [ -n "$new_version" ]; then
    ( cd "$work" && npm version "$new_version" --no-git-tag-version >/dev/null )
  fi

  local version out status
  version="$(node -p "require('$work/package.json').version")"
  out="$(cd "$work" && npm publish --registry "$reg" --userconfig "$npmrc" 2>&1)"
  status=$?

  rm -rf "$work"

  if [ "$status" -eq 0 ]; then
    echo "$version"
    return 0
  fi
  # A re-run where this version already exists is fine for a demo — report it,
  # don't fail the whole script. Anything else is a real error.
  if echo "$out" | grep -qi "cannot publish over"; then
    echo "$version (exists)"
    return 0
  fi
  echo "$out" 1>&2
  return 1
}
