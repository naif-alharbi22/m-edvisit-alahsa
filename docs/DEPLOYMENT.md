# Deployment guide

This guide takes a fresh Linux server to a running MedVisit Al-Ahsa instance
with Docker Compose. A typical first deployment takes about 15 minutes.

## What gets deployed

| Service | Image | Role |
|---|---|---|
| `db` | `postgres:16-alpine` | PostgreSQL with a persistent `pgdata` volume. Not exposed to the host. |
| `migrate` | `medvisit-migrate` (built from the `migrator` target) | One-shot job on every start: applies migrations, optionally loads demo data, creates or checks the super admin. |
| `app` | `medvisit-app` (built from the `runner` target) | Next.js standalone server on port 3000, non-root, with a health check. Starts only after `migrate` succeeds. |
| `caddy` | `caddy:2-alpine` | Optional (`--profile proxy`). Reverse proxy with automatic HTTPS from Let's Encrypt. |

## Requirements

- Linux host with Docker Engine 24 or newer and the Compose plugin (`docker compose version`).
- 2 vCPU and 4 GB RAM are comfortable. The image build itself needs about 3 GB of memory; build elsewhere or use release images on smaller hosts.
- For HTTPS: a DNS name pointing at the server, and ports 80 and 443 open.
- Optional: an OpenAI API key for AI triage and the assistant, SMTP credentials for email, and Google OAuth credentials for Google sign-in.

## Quick start

```bash
git clone <your-fork-url> medvisit && cd medvisit
cp .env.example .env
```

Edit `.env` and set at least these values:

```bash
POSTGRES_PASSWORD=$(openssl rand -hex 24)      # paste the generated value
NEXTAUTH_SECRET=$(openssl rand -base64 32)     # paste the generated value
NEXTAUTH_URL=http://<server-ip>:3000           # the URL users will open
ADMIN_EMAIL=you@your-organisation.sa
ADMIN_PASSWORD=<at least 12 characters>
```

Use a hex password for Postgres, because it is embedded in a connection URL.
To explore with sample data first, also set `SEED_DEMO_DATA=true`.

Start the stack:

```bash
docker compose up -d --build
docker compose ps                  # app should become "healthy"
docker compose logs migrate        # migrations, seed and admin bootstrap output
curl http://localhost:3000/api/health
```

Sign in at `NEXTAUTH_URL` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
From the admin portal, create facilities and hotels, then create hospital administrator and hotel manager accounts assigned to them.

## HTTPS with the bundled Caddy proxy

1. Point an A or AAAA record for your domain at the server.
2. Set these values in `.env`:
   ```bash
   DOMAIN=medvisit.your-domain.sa
   NEXTAUTH_URL=https://medvisit.your-domain.sa
   ACME_EMAIL=ops@your-domain.sa     # optional, defaults to admin@DOMAIN
   APP_PORT=127.0.0.1:3000           # keep the app port off the public interface
   ```
3. Start with the proxy profile:
   ```bash
   docker compose --profile proxy up -d --build
   docker compose logs -f caddy      # watch the certificate being issued
   ```

Caddy renews certificates automatically, adds HSTS, compresses responses, caps request bodies at 15 MB and streams the assistant's server-sent events without buffering.
Certificates live in the `caddy_data` volume; keep it between restarts to avoid Let's Encrypt rate limits.

### Using your own proxy or load balancer instead

- Forward the original `Host` header, or set `X-Forwarded-Host`, plus `X-Forwarded-Proto` and `X-Forwarded-For`.
- Disable response buffering for `/api/chat`, which streams server-sent events.
- Allow request bodies of at least `MAX_UPLOAD_MB` plus 1 MB for report uploads.
- Add `Strict-Transport-Security` at the proxy. The app does not send it, so plain-HTTP setups keep working.
- Set `NEXTAUTH_URL` to the public HTTPS URL. API requests whose `Origin` does not match the request host or this URL are rejected.

## Configuration reference

All settings are environment variables read from `.env`. The app validates them at startup and exits with a clear message if a required value is missing or malformed.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `POSTGRES_PASSWORD` | yes | | Database password. Compose builds `DATABASE_URL` from it. |
| `POSTGRES_DB`, `POSTGRES_USER` | no | `medvisit` | Database name and user. |
| `DATABASE_URL` | outside Compose | | Connection string when running with `npm start`. |
| `DATABASE_POOL_MAX` | no | `10` | Connections per app instance. |
| `NEXTAUTH_SECRET` | yes | | Session signing key, at least 32 characters. Changing it signs everyone out. |
| `NEXTAUTH_URL` | yes | `http://localhost:3000` | Public URL of the app. |
| `APP_URL` | no | `NEXTAUTH_URL` | Canonical URL for links in emails and the sitemap. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first start | | Super admin created by the migrate job. The password needs at least 12 characters. |
| `ADMIN_NAME` | no | `Platform Administrator` | Display name for a newly created super admin. |
| `ADMIN_RESET_PASSWORD` | no | `false` | `true` overwrites the existing admin's password with `ADMIN_PASSWORD` on the next start. |
| `OPENAI_API_KEY` | no | | Enables AI triage and the assistant. Without it those endpoints return 503. |
| `OPENAI_TRIAGE_MODEL`, `OPENAI_CHAT_MODEL` | no | `gpt-4o`, `gpt-4o-mini` | Models for triage and chat. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | | Enable Google sign-in. Set both or neither. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` | no | port `587` | Email notifications. Without `SMTP_HOST` notifications stay in-app. |
| `EMAIL_FROM` | no | `MedVisit Al-Ahsa <no-reply@medvisit.local>` | Sender address. |
| `LOG_LEVEL` | no | `info` | `debug`, `info`, `warn` or `error`. Logs are JSON lines on stdout. |
| `RATE_LIMIT_ENABLED` | no | `true` | Limits on sign-in, registration, password changes, new appointments and bookings, triage and chat. |
| `MAX_UPLOAD_MB` | no | `10` | Maximum report upload size. |
| `APP_PORT` | no | `3000` | Host port, or `127.0.0.1:3000` to bind to loopback only. |
| `APP_VERSION` | no | `1.0.0` | Image tag, also reported by the health endpoint. |
| `APP_IMAGE`, `MIGRATE_IMAGE` | no | `medvisit-app`, `medvisit-migrate` | Image names, for example GHCR release images. |
| `SEED_DEMO_DATA` | no | `false` | `true` loads the demo dataset when the database has no facilities yet. |
| `SEED_PASSWORD` | no | `MedVisit@2026` | Password for all demo accounts. |
| `DEMO_MODE` | no | `false` | Shows demo sign-in shortcuts on the login page. Never enable on a real deployment. |
| `DOMAIN`, `ACME_EMAIL` | proxy only | | Hostname and Let's Encrypt contact for Caddy. |
| `BUILD_CA_CERT` | no | empty placeholder | Extra CA bundle for building behind a TLS-inspecting proxy. |

## Optional integrations

- **OpenAI.** Set `OPENAI_API_KEY`. Uploaded reports are sent to OpenAI for analysis; only the structured result is stored. Confirm this fits your data-protection requirements first.
- **Email.** Set the SMTP variables and `EMAIL_FROM`, then restart the app. Patients get emails for appointment and booking status changes, and staff get emails for new requests.
- **Google sign-in.** Create an OAuth client of type "Web application" in Google Cloud and add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI. Then set both Google variables. Google accounts sign in as patients; staff roles are granted by an admin.

## Day-2 operations

### Logs and health

```bash
docker compose logs -f app
curl -s http://localhost:3000/api/health              # readiness: app and database
curl -s "http://localhost:3000/api/health?probe=live"  # liveness: process only
```

The readiness endpoint returns 503 when the database is unreachable. Use it for load-balancer checks and the liveness probe for restarts.

### Upgrading

```bash
./scripts/backup-db.sh                 # always back up first
git pull
docker compose up -d --build
```

The migrate job applies new migrations before the new app container starts. If a migration fails, the new app container is not started and `docker compose logs migrate` shows why.

### Backups and restore

```bash
./scripts/backup-db.sh /var/backups/medvisit          # compressed pg_dump
./scripts/restore-db.sh /var/backups/medvisit/medvisit-20261030T120000Z.sql.gz
```

The restore script asks for confirmation, then replaces the whole database. Schedule backups with cron and copy them off the server, for example:

```cron
15 2 * * * cd /opt/medvisit && ./scripts/backup-db.sh /var/backups/medvisit && find /var/backups/medvisit -mtime +14 -delete
```

### Admin account recovery

Set `ADMIN_PASSWORD` to a new value and `ADMIN_RESET_PASSWORD=true`, then run the migrate job once:

```bash
docker compose run --rm migrate
```

Set `ADMIN_RESET_PASSWORD` back to `false` afterwards. Every start also makes sure the `ADMIN_EMAIL` account keeps the super admin role and stays active, so the platform cannot be locked out.

### Demo data

`SEED_DEMO_DATA=true` loads about a year of realistic activity on the first start, and the job skips it once facilities exist.
To wipe and reload the demo on a non-production instance:

```bash
docker compose run --rm -e SEED_ALLOW_RESET=true migrate npx tsx prisma/seed.ts --reset
```

Do not enable demo data on a production database. Demo accounts share one known password.

## Prebuilt release images

Pushing a tag such as `v1.2.0` runs the release workflow. It publishes these images to GitHub Container Registry, tagged `1.2.0`, `1.2` and the commit SHA:

- `ghcr.io/<owner>/medvisit-app`
- `ghcr.io/<owner>/medvisit-migrate`

To deploy them without building on the server, set this in `.env`:

```bash
APP_IMAGE=ghcr.io/<owner>/medvisit-app
MIGRATE_IMAGE=ghcr.io/<owner>/medvisit-migrate
APP_VERSION=1.2.0
```

Then pull and start. Run `docker login ghcr.io` first if the packages are private.

```bash
docker compose pull migrate app
docker compose up -d --no-build
```

## Building behind a TLS-inspecting proxy

Corporate networks that intercept HTTPS make `npm ci` fail during the image build. Put the proxy's CA bundle inside the project directory and point `BUILD_CA_CERT` at it:

```bash
mkdir -p certs && cp /path/to/corporate-ca.pem certs/
echo "BUILD_CA_CERT=./certs/corporate-ca.pem" >> .env
docker compose build
```

The bundle is passed as a BuildKit secret, so it never ends up in an image layer. The `certs/` directory is ignored by git and Docker.
Compose refuses secret files outside the project directory unless you pass `--allow=fs.read=<path>`, which is why the bundle belongs under `certs/`.

## Scaling and production notes

- **Several app instances.** The app is stateless apart from the in-memory rate limiter, which counts per instance. Behind a load balancer, enforce limits at the proxy too.
- **Managed PostgreSQL.** Replace `DATABASE_URL` in the shared environment block of `docker-compose.yml` with your provider's URL, adding `sslmode=require` if needed. Then remove the `db` service and the `migrate` job's dependency on it. Keep instances × `DATABASE_POOL_MAX` below the provider's connection limit.
- **Secrets.** Keep `.env` readable only by the deploy user (`chmod 600 .env`). Rotating `NEXTAUTH_SECRET` signs everyone out; rotating the database password needs a matching `ALTER USER` in Postgres.
- **Monitoring.** Scrape the readiness endpoint and ship the JSON logs to your log platform. Unhandled server errors are logged with the request method and path.

## Running without Docker

```bash
npm ci
npm run build                          # DATABASE_URL must be set; the build does not connect
npm run db:deploy
npm run db:bootstrap-admin             # reads ADMIN_EMAIL and ADMIN_PASSWORD
NODE_ENV=production npm start          # serves .next/standalone on PORT (default 3000)
```

Run it under a process manager such as systemd, behind a TLS-terminating proxy configured as described above.
