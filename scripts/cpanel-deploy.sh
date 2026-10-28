#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v unzip >/dev/null 2>&1; then
  echo "The cPanel deployment task needs unzip to extract the prebuilt site." >&2
  exit 1
fi

unzip -o -q trainingtestindonesia-deploy.zip 'dist/*' -d .
if [[ ! -f dist/index.html ]]; then
  echo "The deployment archive does not contain dist/index.html." >&2
  exit 1
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  if (( node_major >= 22 )); then
    npm ci --omit=dev
  else
    echo "Skipping npm install: Node.js 22 or newer is required; found $(node --version)."
  fi
else
  echo "Skipping npm install: configure the Node.js app, then run NPM Install there."
fi

# Passenger reloads the Node application on the next request.
mkdir -p tmp
touch tmp/restart.txt
