#!/usr/bin/env bash
# Safe Postgres dump for LOW production (no .env echo).
set -euo pipefail

ROOT="${1:-/var/www/low}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${ROOT}/backups"
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

cd "${ROOT}"
test -f .env

OUT="${BACKUP_DIR}/low-postgres-${STAMP}.sql.gz"
echo "Writing backup to ${OUT}"

docker compose -p low-production --env-file .env -f docker-compose.prod.yml \
  exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip -c > "${OUT}"

chmod 600 "${OUT}"
echo "Backup complete (size hidden)."
