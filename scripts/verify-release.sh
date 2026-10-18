#!/usr/bin/env bash
# Antipisher release verification (Linux/macOS)
set -euo pipefail
RELEASE_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$RELEASE_DIR"

if [ ! -f SHA256SUMS.txt ]; then
  echo "SHA256SUMS.txt not found in $RELEASE_DIR" >&2
  exit 1
fi

sha256sum -c SHA256SUMS.txt

SOURCE_ZIP=$(ls Antipisher-Source-*.zip 2>/dev/null | head -n1 || true)
if [ -n "$SOURCE_ZIP" ]; then
  if unzip -l "$SOURCE_ZIP" | grep -Eq 'audit/|SHA256SUMS\.txt'; then
    echo "FAIL: source ZIP contains audit/ or checksums" >&2
    exit 1
  fi
  echo "OK: source ZIP hygiene"
fi

echo "Release verification OK"
