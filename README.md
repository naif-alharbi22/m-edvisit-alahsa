# MedVisit Al-Ahsa

MedVisit Al-Ahsa is a bilingual (Arabic/English) medical-tourism platform for
Al-Ahsa, Saudi Arabia. International patients upload a medical report, get an
AI triage that recommends a specialty and hospitals, book a consultation, and
reserve a nearby hotel. Hospitals and hotels run their side of the journey from
dedicated dashboards, and platform administrators oversee everything with
analytics, user management and an audit trail.

> Deploying? Go straight to **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Features

### Patients
- **AI smart triage**: upload a PDF or image report; GPT-4o extracts findings, urgency and the recommended specialty, then links to the facilities that offer it.
- **Hospital directory**: search by name and filter by specialty; doctor profiles, treatment packages, accreditations, ratings and nearby hotels.
- **Appointment booking**: pick a facility, doctor or package and a time; requests go to the hospital for confirmation, with conflict and duplicate guards.
- **Hotel booking**: live room availability per night, inventory-safe reservations, optional link to a medical appointment.
- **Patient dashboard**: reports, appointments and stays with cancel actions, plus reviews for completed visits and stays.
- **AI assistant**: streaming chat in Arabic or English, grounded in the live hospital and hotel catalog.
- **Notifications** in the header bell, and by email when SMTP is configured.

### Hospital administrators (`/hospital`)
- Analytics dashboard: appointments, revenue, completion and no-show rates, unique patients, average visit value, demand by specialty, doctor performance and patient origin, with 30-day, 90-day and 12-month ranges and period-over-period change.
- Appointment desk: upcoming/past views, status filter, search, confirm, reschedule, add notes, complete, mark no-show or cancel with a reason, CSV export.
- Doctor and treatment-package management, and editing of the public facility profile.

### Hotel managers (`/hotel`)
- Revenue dashboard: occupancy, ADR, RevPAR, revenue, bookings, cancellation rate, average stay, share of medically linked stays, room-type performance, and today's arrivals and departures.
- Reservation desk: filters, confirm, check-in, check-out, cancel, no-show, CSV export.
- Room-type inventory and rates, and editing of the hotel profile.

### Platform administrators (`/admin`)
- Platform analytics: registration, appointment, medical revenue and hotel revenue trends; triage volume by specialty and urgency; the patient cohort funnel (registered, triaged, booked, completed, stayed); facility and hotel leaderboards; patient nationalities.
- User management: create staff accounts, assign hospital admins and hotel managers to their property, change roles, deactivate accounts (sessions are revoked within a minute).
- Facility and hotel management with per-property detail pages, cross-platform appointment and booking views, and a searchable audit log.

### Platform
- Full Arabic (RTL) and English localization, including server-rendered notifications and emails.
- Role-based access control enforced in the proxy, in every page, and again in every API handler.
- Health endpoints, structured JSON logs, startup environment validation, rate limiting, security headers, CSRF origin checks and an audit trail of staff actions.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, standalone output), React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI primitives, Recharts 3, Lucide icons |
| Data | PostgreSQL 16, Prisma 7 with the `pg` driver adapter |
| Auth | NextAuth 4 (JWT sessions; email/password and optional Google) |
| Validation | Zod 4 schemas shared by API handlers and forms |
| AI | OpenAI (triage defaults to `gpt-4o`, chat to `gpt-4o-mini`) |
| i18n | next-intl 4 with typed messages |
| Email | Nodemailer (any SMTP provider) |
| Testing | Vitest (unit and integration against Postgres), Playwright (end-to-end) |
| Delivery | Docker multi-stage build, Docker Compose, optional Caddy for HTTPS, GitHub Actions |

## Architecture

```
Browser ──> Caddy (optional TLS) ──> Next.js server (Node 22)
                                      ├─ src/proxy.ts            role gate + locale routing
                                      ├─ src/app/[locale]/...    server-rendered pages
                                      ├─ src/app/api/...         JSON route handlers
                                      │    └─ withErrorHandling, Zod validators, session guards
                                      ├─ src/server/services     business rules and transactions
                                      ├─ src/server/analytics    KPI and time-series queries
                                      └─ Prisma client ──> PostgreSQL
```

- **Layering.** Route handlers and pages stay thin. They authenticate, validate input with Zod and call a service. Services own the business rules, transactions, notifications and audit entries, and throw typed domain errors that become consistent JSON responses.
- **Authorization.** `src/proxy.ts` redirects users away from portals their role cannot open. Pages call `requirePageRole`, and API handlers call `requireApiRole` plus a scope resolver that pins hospital and hotel staff to their own property. The user record is re-read from the database on every request, so deactivation and role changes apply immediately.
- **Inventory safety.** Hotel bookings lock the room-type row (`SELECT ... FOR UPDATE`) inside a transaction before checking nightly availability, so concurrent requests cannot overbook.
- **Time zone.** Business dates and analytics buckets use Asia/Riyadh (UTC+3, no daylight saving). Stays are stored as calendar dates.
- **Deterministic formatting.** Numbers use Latin digits in both languages and dates use the Gregorian calendar. Output is identical on the server and in every browser, which avoids hydration mismatches.

### Analytics definitions

| Metric | Definition |
|---|---|
| Appointments | Appointments scheduled in the period, excluding cancelled ones |
| Revenue (hospital) | Sum of prices of completed appointments |
| Completion rate | Completed ÷ (completed + no-show + cancelled) |
| No-show rate | No-show ÷ (completed + no-show + cancelled) |
| Occupancy | Sold room-nights ÷ available room-nights; available = active platform allotment × nights |
| ADR | Room revenue ÷ sold room-nights |
| RevPAR | Room revenue ÷ available room-nights |
| Cancellation rate | Cancelled ÷ all bookings with check-in in the period |
| Change | Same metric for the immediately preceding period of equal length |

Ranges are the last 30 days (daily buckets), 90 days (weekly) or 12 months (monthly).
Hotel room counts are the allotment offered through the platform, not the hotel's total inventory.

## Getting started (local development)

Prerequisites are Node.js 22.9 or newer and PostgreSQL 16. Docker can provide the database.

```bash
npm ci
cp .env.example .env

# Optional: a throwaway database matching the URL below
docker run -d --name medvisit-db -p 5432:5432 \
  -e POSTGRES_USER=medvisit -e POSTGRES_PASSWORD=medvisit -e POSTGRES_DB=medvisit \
  postgres:16-alpine
# then in .env:
#   DATABASE_URL=postgresql://medvisit:medvisit@localhost:5432/medvisit
#   NEXTAUTH_SECRET=<any long random string>

npm run db:migrate              # apply migrations and generate the Prisma client
npm run db:seed                 # load the demo dataset (about a year of activity)
npm run dev                     # http://localhost:3000
```

Set `OPENAI_API_KEY` to enable triage and the assistant; without it those endpoints answer 503 and the rest of the app works.
Set `DEMO_MODE=true` to show one-click demo sign-in buttons on the login page.

### Demo accounts

All demo accounts use the password `MedVisit@2026` (configurable with `SEED_PASSWORD`).

| Role | Email |
|---|---|
| Platform administrator | `admin@medvisit.sa` |
| Hospital administrator (Al-Moosa Specialist Hospital) | `admin.almoosa@medvisit.sa` |
| Hotel manager (Al-Hofuf Grand Hotel) | `manager.grand@medvisit.sa` |
| Patient | `patient@medvisit.sa` |

Every seeded hospital and hotel has its own staff account, for example `admin.kfh@medvisit.sa` or `manager.oasis@medvisit.sa`; see `prisma/seed-data.ts`.
The demo hotels are fictional; the hospitals are real Al-Ahsa institutions with illustrative data.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Generate Prisma client, production build, assemble `.next/standalone` |
| `npm start` | Run the standalone production server (reads `.env` if present) |
| `npm run lint` | ESLint, including React Compiler rules |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | All Vitest suites (unit and integration) |
| `npm run test:unit` | Unit tests only, no database needed |
| `npm run test:integration` | Integration tests against a real Postgres test database |
| `npm run test:e2e` | Playwright end-to-end tests against a production build |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Load demo data if the database is empty |
| `npm run db:reset-demo` | Wipe and reload demo data (refused in production unless `SEED_ALLOW_RESET=true`) |
| `npm run db:bootstrap-admin` | Create or update the super admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` |
| `npm run db:studio` | Prisma Studio |

## Testing

```bash
npm run test:unit

# Integration tests drop and recreate the schema of a database whose name contains "test".
createdb -U medvisit medvisit_test            # once
TEST_DATABASE_URL=postgresql://medvisit:medvisit@localhost:5432/medvisit_test npm run test:integration

# End-to-end: needs a seeded DATABASE_URL in .env and a Chromium for Playwright.
npm run build
npx playwright install chromium               # once
npm run test:e2e                               # or E2E_BASE_URL=https://staging.example.com npm run test:e2e
```

- **Unit tests** cover status transitions, availability math, analytics bucketing and KPIs, formatting in both locales, CSV safety, validators, environment parsing, triage parsing and translation parity.
- **Integration tests** run services and route handlers against Postgres: booking conflicts and overbooking, cancellation rules, role scoping, reviews and ratings, analytics, CSRF and upload limits.
- **End-to-end tests** drive the real UI: public pages in both languages, sign-in and role redirects, and the patient, hospital, hotel and admin journeys.

GitHub Actions runs lint, typecheck, all three test layers and a Docker build on every push and pull request.

## Project structure

```
prisma/                 schema, migrations, demo seed, admin bootstrap
src/app/[locale]/(site)     public site and patient area
src/app/[locale]/(portal)   hospital, hotel and admin portals
src/app/api/            route handlers (public, me, hospital, hotel, admin, triage, chat, health)
src/components/         UI kit, charts, portal shell, staff tables and forms, feature components
src/i18n/               locale routing and en/ar messages
src/lib/                auth, session guards, env, formatting, validators, rate limiting, CSV
src/server/services/    domain services (appointments, bookings, users, facilities, hotels, ...)
src/server/analytics/   time bucketing and KPI queries
tests/                  unit, integration and e2e suites
docker/, deploy/, scripts/  migration entrypoint, Caddyfile, backup and restore
.github/workflows/      CI and image release pipelines
```

## Design notes and known limitations

- **Money** is stored as floating-point SAR with two-decimal rounding. Switch to `Decimal` before adding multi-currency or payment settlement.
- **Payments** are out of scope. Bookings and appointments are reservations that the property confirms.
- **Rate limiting** is in memory, per server instance. With several replicas, put a shared limiter (for example at the proxy or with Redis) in front.
- **Uploaded reports** are sent to OpenAI for analysis and only the structured result is stored, not the file. Review this against your data-protection obligations and OpenAI data-processing terms before going live.
- **Digits**: Arabic pages intentionally use Latin digits and the Gregorian calendar for consistency with medical and billing documents.
- **Next.js 16** differs from older versions. `src/proxy.ts` replaces middleware, and route params are async. Read `node_modules/next/dist/docs/` before upgrading patterns.
- During integration tests, Node may print a `pg` deprecation warning about concurrent `client.query()` calls. It comes from Prisma's adapter and is harmless with `pg` 8, which is pinned.
