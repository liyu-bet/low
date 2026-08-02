# The Life of Websites (LOW)

Self-hosted personal system for website lifecycle management. Primary UI: chronological event journal per website.

LOW is a **separate app** with a **separate PostgreSQL database**. It does not read DSD/GSC databases and does not store OAuth tokens, server passwords, or API keys.

See [SPEC.md](./SPEC.md) for architecture rules and the data model.

## LOW v1 — scope (complete)

Implemented:

- Core website registry (CRUD, soft archive)
- Website event timeline / journal
- Key dates with manual overrides (effective dates)
- DSD read-only sync (health, DNS, domain expiry, server)
- GSC properties + lifecycle sync (first impressions / clicks)
- Background worker (JobLock, heartbeat, scheduled sync)
- Attention dashboard (`/dashboard`)
- Website tasks and planning (`/tasks`)
- Bulk website operations
- Complete website profile (`/websites/[id]`)
- Portfolio lifecycle reports (`/reports`)
- GHCR production deployment (`https://low.liyu.bet`)

**Explicitly out of LOW v1 (do not add):**

- Notifications (email, Telegram, push, alert delivery)
- Finance module / financial reports
- Search ranking / position / SERP tracking
- Extra uptime monitoring — site availability comes from **DSD** only; LOW does not duplicate DSD monitoring
- AI, Redis, new background job types, new external integrations

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS + Zod
- Docker Compose (web + worker + Postgres)
- Cookie-based single-admin auth

## Quick start (local)

```bash
cp .env.example .env
# Set ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, POSTGRES_PASSWORD, DATABASE_URL

npm install
```

### PostgreSQL

**Option A — Docker** (when Docker is available):

```bash
docker compose up -d postgres
```

**Option B — portable Postgres** (current Windows setup without Docker):

Use a dedicated data directory (never the DSD database files). Example already used for this machine:

- binaries: sibling `DSD/pgsql`
- data: `../pgdata` (LOW-owned)
- port: `5433`
- database/user: `low`

Then:

```bash
npm run db:check
npx prisma migrate dev --name init
npm run dev
```

Open http://127.0.0.1:8082 → Admin sign in.

Worker (separate process):

```bash
npm run worker:start
```

## Docker Compose

```bash
cp .env.example .env
# Inside Compose network, DATABASE_URL should use host `postgres`:
# DATABASE_URL=postgresql://low:PASSWORD@postgres:5432/low

docker compose up --build
```

- App: http://127.0.0.1:8082
- Postgres: 127.0.0.1:5433 (localhost only)

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on :8082 |
| `npm run build` | Prisma generate + production build |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests |
| `npm run db:validate` | Prisma schema validation |
| `npm run db:check` | `SELECT 1` against local Postgres |
| `npm run worker:start` | Unified DSD/GSC sync worker |

## Auth env

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` (≥16 chars)

## DSD sync env (server-only)

- `DSD_BASE_URL` — e.g. `http://localhost:3000`
- `DSD_LOW_API_TOKEN` — same Bearer token as DSD `DSD_LOW_API_TOKEN`
- `DSD_REQUEST_TIMEOUT_MS` — default `10000`
- `DSD_SYNC_PAGE_SIZE` — default `100`

Never use `NEXT_PUBLIC_` for the token.

### Manual DSD sync

1. Start DSD locally with `DSD_LOW_API_TOKEN` set.
2. Put the same token into LOW `.env`.
3. Open http://127.0.0.1:8082/integrations
4. «Проверить подключение» → «Синхронизировать сайты»

## GSC sync env (server-only)

- `GSC_BASE_URL` — e.g. `http://localhost:3001`
- `GSC_LOW_API_TOKEN` — same Bearer token as GSC `GSC_LOW_API_TOKEN`
- `GSC_REQUEST_TIMEOUT_MS` — default `15000`
- `GSC_SYNC_PAGE_SIZE` — default `100`
- `GSC_LIFECYCLE_CONCURRENCY` — default `4`
- `GSC_LIFECYCLE_MAX_PROPERTIES_PER_RUN` — default `500` (cap 1000)

Google OAuth access/refresh tokens are **never** copied into LOW.

### Manual GSC sync

1. Start GSC Portfolio Dashboard with `GSC_LOW_API_TOKEN` set (different port from DSD/LOW).
2. Put the same token into LOW `.env` as `GSC_LOW_API_TOKEN`.
3. Open http://127.0.0.1:8082/integrations
4. «Проверить подключение» → «Синхронизировать свойства» → «Найти первые показы и клики»

`firstSeenAt` / `gscFirstSeenAt` = first import into the GSC app. Impression/click dates = earliest available via Search Console API lookback.

## Worker env

- `WORKER_ENABLED` — default `true`; `false` exits cleanly
- `WORKER_TIMEZONE` — default `Europe/Belgrade`
- `DSD_SYNC_INTERVAL_MINUTES` — default `15`
- `DSD_FULL_RECONCILIATION_HOUR` — default `3`
- `GSC_PROPERTIES_SYNC_INTERVAL_HOURS` — default `6`
- `GSC_FULL_RECONCILIATION_HOUR` — default `4`
- `GSC_LIFECYCLE_SYNC_HOUR` — default `5`
- `JOB_LOCK_*_TTL_MINUTES` — lock TTL per job
- Heartbeat / timeout / backoff: see `.env.example`

Run locally: `npm run worker:start`. Compose service: `worker` (no published ports). Status: `/integrations` and compact block on `/websites`.

**Limits:** worker hits live M2M when env points there; lifecycle is capped per run (backlog drains over days); no Redis.

## Local ports (example)

| App | Port |
| --- | --- |
| DSD | 3000 |
| GSC | 3001 |
| LOW | 8082 |

## Production

- URL: `https://low.liyu.bet`
- Images: GHCR (`ghcr.io/liyu-bet/low-web`, `low-worker`), tag pinned as `LOW_IMAGE_TAG=<short-sha>`
- Compose: `docker-compose.prod.yml`, project `low-production`
- Deploy: `.github/workflows/publish-images.yml`
- Server env is uploaded separately (never via git)
- Rollback: `./deploy/rollback.sh <previous-sha>` (does not downgrade migrations)

## Roadmap after v1

LOW v1 is **complete**. Further product modules (notifications, finance, rank tracking) are intentionally deferred and are **not** part of the current scope.
