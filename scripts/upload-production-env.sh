#!/usr/bin/env bash
# Upload prepared .env.production.local to the production host via SSH alias LIYU.
# Does not print secret values.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/.env.production.local"
test -f "${SRC}"

ssh -o BatchMode=yes LIYU 'mkdir -p /var/www/low/deploy /var/www/low/backups && chmod 700 /var/www/low/backups && if [ -f /var/www/low/.env ]; then stamp=$(date +%Y%m%d-%H%M%S); cp /var/www/low/.env /var/www/low/.env.backup-$stamp; chmod 600 /var/www/low/.env.backup-$stamp; echo BACKUP_CREATED; else echo NO_EXISTING_ENV; fi'

scp -o BatchMode=yes "${SRC}" LIYU:/var/www/low/.env

ssh -o BatchMode=yes LIYU 'chmod 600 /var/www/low/.env && test -f /var/www/low/.env && echo ENV_INSTALLED_OK && stat -c "%a" /var/www/low/.env'
