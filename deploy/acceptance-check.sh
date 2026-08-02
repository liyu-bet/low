#!/usr/bin/env bash
# One-shot production acceptance checks (no secret values printed).
set -euo pipefail
cd /var/www/low
test -f .env

echo "== env perms =="
stat -c '%a %U:%G' .env

echo "== compose ps =="
docker compose -p low-production --env-file .env -f docker-compose.prod.yml ps

echo "== images =="
docker compose -p low-production --env-file .env -f docker-compose.prod.yml images

echo "== migrate status =="
docker compose -p low-production --env-file .env -f docker-compose.prod.yml --profile migrate \
  run --rm --entrypoint node_modules/.bin/prisma migrate migrate status

echo "== local health =="
curl --fail --silent --show-error http://127.0.0.1:8082/api/health/live; echo
curl --fail --silent --show-error http://127.0.0.1:8082/api/health/ready; echo

echo "== worker logs (sanitized) =="
docker compose -p low-production --env-file .env -f docker-compose.prod.yml logs --tail=80 worker \
  | sed -E 's/(Bearer|Authorization|DATABASE_URL|token|password|SECRET)[=: ]+[^[:space:]]+/[redacted]/gi'

echo "== syncrun summary =="
docker compose -p low-production --env-file .env -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<EOF
SELECT "jobType", COALESCE(trigger, '\''-'\'') AS trigger, status, processed, "errorCount",
       COALESCE(to_char("finishedAt", '\''YYYY-MM-DD HH24:MI'\''), '\''-'\'') AS finished
FROM "SyncRun"
WHERE "jobType" IN ('\''dsd_sites_sync'\'', '\''gsc_properties_sync'\'', '\''gsc_lifecycle_sync'\'')
ORDER BY "startedAt" DESC
LIMIT 9;
EOF'

echo "== heartbeat =="
docker compose -p low-production --env-file .env -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atc "SELECT status, COALESCE(\"currentJob\", '\''-'\''), EXTRACT(EPOCH FROM (NOW() - \"lastHeartbeatAt\"))::int FROM \"WorkerHeartbeat\" ORDER BY \"lastHeartbeatAt\" DESC LIMIT 1;"'

echo "audit_ok"
