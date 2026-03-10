#!/usr/bin/env bash
set -euo pipefail

mkdir -p out/release

required_cmds=(security xcrun codesign spctl)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required tool: $cmd"
    exit 1
  fi
done

if [[ "${RELEASE_SIGN:-0}" == "1" ]]; then
  : "${APPLE_SIGN_IDENTITY:?APPLE_SIGN_IDENTITY is required when RELEASE_SIGN=1}"
  security find-identity -v -p codesigning | grep -F "$APPLE_SIGN_IDENTITY" >/dev/null \
    || { echo "Signing identity not found in keychain: $APPLE_SIGN_IDENTITY"; exit 1; }
fi

if [[ "${RELEASE_NOTARIZE:-0}" == "1" ]]; then
  if [[ -n "${APPLE_KEYCHAIN_PROFILE:-}" ]]; then
    xcrun notarytool history --keychain-profile "$APPLE_KEYCHAIN_PROFILE" >/dev/null \
      || { echo "Invalid APPLE_KEYCHAIN_PROFILE or notarytool auth failed"; exit 1; }
  else
    : "${APPLE_API_KEY_PATH:?APPLE_API_KEY_PATH required when RELEASE_NOTARIZE=1 and no keychain profile}"
    : "${APPLE_API_KEY_ID:?APPLE_API_KEY_ID required}"
    : "${APPLE_API_ISSUER:?APPLE_API_ISSUER required}"
    [[ -f "$APPLE_API_KEY_PATH" ]] || { echo "API key file missing: $APPLE_API_KEY_PATH"; exit 1; }
  fi
fi

cat > out/release/preflight.json <<EOF
{
  "status": "pass",
  "releaseSign": "${RELEASE_SIGN:-0}",
  "releaseNotarize": "${RELEASE_NOTARIZE:-0}",
  "capturedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "macOS release preflight passed."
