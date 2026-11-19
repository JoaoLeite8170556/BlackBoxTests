#!/usr/bin/env bash
set -euo pipefail
URL="http://127.0.0.1:5173/"
if ! curl -sf -o /dev/null "$URL"; then
  echo "A arrancar o Camry Found..."
  cd "$(dirname "$0")/camry-found"
  npm run dev -- --host 127.0.0.1 --port 5173 &
  for i in {1..30}; do
    curl -sf -o /dev/null "$URL" && break
    sleep 0.5
  done
fi
xdg-open "$URL" 2>/dev/null || sensible-browser "$URL" 2>/dev/null || echo "Abre no browser: $URL"
