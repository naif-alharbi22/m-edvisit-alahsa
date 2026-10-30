#!/usr/bin/env bash
# Restores a backup created by backup-db.sh into the running database.
#   ./scripts/restore-db.sh backups/medvisit-YYYYMMDDTHHMMSSZ.sql.gz
# WARNING: this drops and recreates the public schema.
set -euo pipefail
FILE="${1:?Usage: restore-db.sh <backup.sql.gz>}"
read -r -p "This will REPLACE all data in the database. Type 'restore' to continue: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "Aborted."; exit 1; }
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
gunzip -c "$FILE" | docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
echo "Restore complete."
