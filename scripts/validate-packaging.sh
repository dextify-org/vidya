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
assert_contains Dockerfile 'USER node'
assert_not_contains Dockerfile 'npm install --production'

assert_contains docker-compose.yml 'build:'
assert_contains docker-compose.yml '${VIDYA_BIND_ADDRESS:-127.0.0.1}:${VIDYA_PORT:-31415}:31415'
assert_contains docker-compose.yml 'vidya-data:/data'
assert_contains docker-compose.yml 'HOST: 0.0.0.0'
assert_contains docker-compose.yml 'read_only: true'
assert_contains docker-compose.yml 'cap_drop:'
assert_contains docker-compose.yml 'no-new-privileges:true'
assert_not_contains docker-compose.yml ':latest'

assert_contains installer.nsi 'RequestExecutionLevel user'
assert_contains installer.nsi 'InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"'
assert_contains installer.nsi 'WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run"'
assert_contains installer.nsi 'Section /o "Start VIDYA automatically with Windows"'
assert_contains installer.nsi 'SectionIn RO'
assert_contains installer.nsi '!define MUI_FINISHPAGE_RUN "$INSTDIR\VIDYA.exe"'
assert_not_contains installer.nsi 'RequestExecutionLevel admin'
assert_not_contains installer.nsi 'HKLM'
assert_not_contains installer.nsi "  Exec '"

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
