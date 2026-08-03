#!/usr/bin/env bash
# Safe Postgres dump + verify for LOW production (no secret echo).
set -euo pipefail

ROOT="${1:-/var/www/low}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${ROOT}/backups"
KEEP="${BACKUP_KEEP:-14}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

cd "${ROOT}"
test -f .env

OUT="${BACKUP_DIR}/low-postgres-${STAMP}.sql.gz"
echo "Writing backup..."

dump_once() {
  docker compose -p low-production --env-file .env -f docker-compose.prod.yml \
    exec -T postgres \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' \
    | gzip -c > "${OUT}"
}

dump_once
BYTES="$(wc -c < "${OUT}" | tr -d ' ')"
if [[ -z "${BYTES}" || "${BYTES}" -lt 100 ]]; then
  echo "Backup too small (${BYTES:-0} bytes), retrying once..." >&2
  sleep 2
  dump_once
fi

chmod 600 "${OUT}"

# Verify non-empty compressed dump
BYTES="$(wc -c < "${OUT}" | tr -d ' ')"
if [[ -z "${BYTES}" || "${BYTES}" -lt 100 ]]; then
  echo "Backup verification failed: dump too small (${BYTES:-0} bytes)" >&2
  rm -f "${OUT}"
  exit 1
fi

# Verify gzip integrity and that dump is not empty SQL
if ! gzip -t "${OUT}"; then
  echo "Backup verification failed: gzip integrity check failed" >&2
  rm -f "${OUT}"
  exit 1
fi

SQL_HEAD="$(gzip -dc "${OUT}" | head -c 200 || true)"
if [[ -z "${SQL_HEAD}" ]]; then
  echo "Backup verification failed: decompressed dump empty" >&2
  rm -f "${OUT}"
  exit 1
fi

echo "Backup verified (bytes=${BYTES})."

# Retain last KEEP verified backups
mapfile -t OLD < <(ls -1t "${BACKUP_DIR}"/low-postgres-*.sql.gz 2>/dev/null || true)
if ((${#OLD[@]} > KEEP)); then
  for ((i=KEEP; i<${#OLD[@]}; i++)); do
    rm -f "${OLD[$i]}"
  done
fi

echo "Backup complete."
