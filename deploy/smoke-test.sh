#!/usr/bin/env bash
# Smoke-test LOW after deploy. No secrets printed.
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8082}"

echo "Checking live..."
curl --fail --silent --show-error "${BASE_URL}/api/health/live" >/dev/null
echo "live=ok"

echo "Checking ready..."
curl --fail --silent --show-error "${BASE_URL}/api/health/ready" >/dev/null
echo "ready=ok"

echo "Checking login page..."
code="$(curl --silent --show-error -o /dev/null -w '%{http_code}' "${BASE_URL}/login")"
if [[ "${code}" != "200" ]]; then
  echo "login unexpected status=${code}" >&2
  exit 1
fi
echo "login=ok"
echo "Smoke tests passed."
