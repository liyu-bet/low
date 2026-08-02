#!/usr/bin/env bash
# Rollback LOW web/worker to a previous GHCR short SHA (no migrate downgrade).
# Usage: ./deploy/rollback.sh <previous-short-sha>
set -euo pipefail

TAG="${1:-}"
if [[ -z "${TAG}" ]]; then
  echo "Usage: $0 <previous-short-sha>" >&2
  exit 1
fi

cd /var/www/low
test -f .env
export LOW_IMAGE_TAG="${TAG}"

COMPOSE=(docker compose -p low-production --env-file .env -f docker-compose.prod.yml)

echo "Rolling back to LOW_IMAGE_TAG=${LOW_IMAGE_TAG}"
"${COMPOSE[@]}" pull
"${COMPOSE[@]}" --profile migrate run --rm migrate
"${COMPOSE[@]}" up -d web worker
./deploy/smoke-test.sh http://127.0.0.1:8082
"${COMPOSE[@]}" ps
echo "Rollback complete."
