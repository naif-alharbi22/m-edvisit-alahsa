# syntax=docker/dockerfile:1.7
#
# Multi-stage build for MedVisit Al-Ahsa.
#   deps      – installs npm dependencies (cached layer)
#   builder   – generates the Prisma client and builds Next.js (standalone output)
#   migrator  – one-shot job: applies migrations, bootstraps the admin, optional demo seed
#   runner    – minimal non-root runtime image for the web app

ARG NODE_VERSION=22

# Build and migration stages use the full Debian image, which ships OpenSSL
# (needed by the Prisma schema engine). The runtime stage stays slim: the
# Prisma 7 query compiler is WebAssembly and needs no native engine.
FROM node:${NODE_VERSION}-bookworm AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Builds behind a TLS-inspecting proxy can pass that proxy's CA as the optional
# "build_ca" secret (see BUILD_CA_CERT in docker-compose.yml); it is only used
# for network access during the build and never copied into an image.

# ─── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=build_ca,required=false \
    if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --no-audit --no-fund

# ─── Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
# Prisma config needs a syntactically valid URL at generate time; no database is contacted.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN --mount=type=secret,id=build_ca,required=false \
    if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npx prisma generate && npx next build

# ─── Migrations / seed job ───────────────────────────────────────────────────
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY docker/migrate.sh ./docker/migrate.sh
RUN chmod +x ./docker/migrate.sh
CMD ["./docker/migrate.sh"]

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
