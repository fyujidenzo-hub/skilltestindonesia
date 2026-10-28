#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm must be available to the cPanel deployment task." >&2
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( node_major < 22 )); then
  echo "This application requires Node.js 22 or newer; found $(node --version)." >&2
  exit 1
fi

if [[ ! -f .env.production ]]; then
  for required in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_APP_ID; do
    if [[ -z "${!required:-}" ]]; then
      echo "Provide the public Firebase build variables through the cPanel environment or a private .env.production file before deploying." >&2
      exit 1
    fi
  done
fi

npm ci
npm run build

# Passenger reloads the Node application on the next request.
mkdir -p tmp
touch tmp/restart.txt
