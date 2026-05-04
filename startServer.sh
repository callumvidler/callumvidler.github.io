#!/usr/bin/env bash
# Serve the static site over HTTP for local development.
# Usage: ./startServer.sh [port]   (default port 8000)

set -e

PORT="${1:-8000}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

echo "Serving $ROOT on http://localhost:$PORT/"
echo "Press Ctrl+C to stop."

if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
    python -m SimpleHTTPServer "$PORT"
else
    echo "Error: python3 or python is required to run the local server." >&2
    exit 1
fi
