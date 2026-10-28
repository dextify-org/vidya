#!/bin/sh
set -eu

fail() {
  printf 'packaging validation failed: %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  file=$1
  text=$2
  grep -F -- "$text" "$file" >/dev/null ||
    fail "$file does not contain: $text"
}

assert_not_contains() {
  file=$1
  text=$2
  if grep -F -- "$text" "$file" >/dev/null; then
    fail "$file must not contain: $text"
  fi
}

assert_contains Dockerfile 'npm ci --omit=dev --workspace backend --include-workspace-root=false'
assert_not_contains Dockerfile 'npm install --production'

assert_contains docker-compose.yml 'image:'
assert_contains docker-compose.yml './vidya-data:/data'

assert_contains installer.nsi 'RequestExecutionLevel admin'
assert_contains installer.nsi 'InstallDir "$PROGRAMFILES64\${APPNAME}"'
assert_contains installer.nsi 'HKLM'

assert_contains build-windows.ps1 '$NodeVersion = "v22.14.0"'
assert_contains build-windows.ps1 '$NodeZipSha256 = "55b639295920b219bb2acbcfa00f90393a2789095b7323f79475c9f34795f217"'
assert_contains build-windows.ps1 'Get-FileHash -Path $NodeZip -Algorithm SHA256'
assert_contains build-windows.ps1 'npm ci --omit=dev --workspace backend --include-workspace-root=false'
assert_not_contains build-windows.ps1 'dist/index.json'
assert_not_contains build-windows.ps1 'npm install --production'

if command -v docker >/dev/null 2>&1; then
  docker compose config --quiet
fi

printf 'packaging validation passed\n'
