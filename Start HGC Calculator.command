#!/bin/bash
# Start de HGC keuzehulp lokaal op http://127.0.0.1:8765 (macOS).
# Dubbelklik dit bestand in Finder. Sluit het Terminal-venster om te stoppen.

cd "$(dirname "$0")" || exit 1
PORT=8765
URL="http://127.0.0.1:$PORT"

# Draait de keuzehulp al? Open dan alleen de browser.
if curl -s -o /dev/null "$URL"; then
  echo "De keuzehulp draait al op $URL"
  [ "$HGC_NO_BROWSER" = "1" ] || open "$URL"
  exit 0
fi

# Node zoeken: eerst PATH, daarna nvm.
NODE="$(command -v node)"
if [ -z "$NODE" ]; then
  NODE="$(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -n 1)"
fi

(sleep 1; [ "$HGC_NO_BROWSER" = "1" ] || open "$URL") &

if [ -n "$NODE" ]; then
  echo "HGC keuzehulp start met Node ($NODE)"
  echo "Sluit dit venster of druk op Ctrl+C om te stoppen."
  exec "$NODE" dev-server.mjs "$PORT"
elif command -v python3 >/dev/null 2>&1; then
  echo "Node niet gevonden, HGC keuzehulp start met Python op $URL"
  echo "Sluit dit venster of druk op Ctrl+C om te stoppen."
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
else
  echo "Node.js en Python zijn niet gevonden. Installeer Node.js via https://nodejs.org"
  read -r -p "Druk op Enter om te sluiten."
  exit 1
fi
