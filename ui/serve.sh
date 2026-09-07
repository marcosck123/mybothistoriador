#!/usr/bin/env bash

set -u

PORT="${1:-8081}"
LOG_FILE="$(dirname "$0")/server.log"

{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] iniciando servidor"
  echo "diretorio: $(pwd)"
  echo "porta: ${PORT}"
  echo "interfaces:"
  hostname -I 2>/dev/null || true
  echo "--- logs HTTP ---"
} >> "$LOG_FILE"

python3 -m http.server "$PORT" 2>&1 | tee -a "$LOG_FILE"
