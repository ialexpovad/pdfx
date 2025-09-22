#!/usr/bin/env bash

# just test the already-built addon
# node/addon/test-addon.sh
# or rebuild then test
# node/addon/test-addon.sh --build

set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--build" ]]; then
  echo "⏳ Building addon (clean)…"
  rm -rf build
  npm ci --silent
  npx cmake-js build
  echo "✅ Build done."
fi

ART="./build/Release/pdfx.node"
if [[ ! -f "$ART" ]]; then
  echo "❌ Native addon not found at: $ART" >&2
  echo "   Build it first: npm run build   or   $0 --build" >&2
  exit 1
fi

echo "▶️  Inspecting exported methods from $ART"
node -e "const p=require('${ART}'); console.log(Object.keys(p))"
