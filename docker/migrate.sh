#!/bin/sh
# One-shot release job: apply migrations, ensure the super admin, optionally seed demo data.
set -eu

echo "[migrate] Applying database migrations..."
npx prisma migrate deploy

# Demo data first (it is skipped when catalog data already exists), then the
# real administrator so it is never shadowed by the demo dataset.
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "[migrate] Seeding demo data (skipped automatically if data exists)..."
  npx tsx prisma/seed.ts
fi

if [ -n "${ADMIN_EMAIL:-}" ]; then
  echo "[migrate] Ensuring super admin ${ADMIN_EMAIL}..."
  npx tsx prisma/bootstrap-admin.ts
fi

echo "[migrate] Done."
