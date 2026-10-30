#!/usr/bin/env bash
# Creates a compressed logical backup of the MedVisit database.
#   ./scripts/backup-db.sh [output-dir]
set -euo pipefail
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/medvisit-$STAMP.sql.gz"
docker compose exec -T db sh -c 'pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$FILE"
echo "Backup written to $FILE"
