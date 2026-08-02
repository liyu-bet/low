# The Life of Websites (LOW)

Self-hosted personal system for website lifecycle management. Primary UI: chronological event journal per website.

LOW is a **separate app** with a **separate PostgreSQL database**. It does not read DSD/GSC databases and does not store OAuth tokens, server passwords, or API keys.

See [SPEC.md](./SPEC.md) for architecture rules and the data model.

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
| `npm test` | Unit tests (domain, auth guard, website prep) |
| `npm run db:validate` | Prisma schema validation |
| `npm run db:check` | `SELECT 1` against local Postgres |
| `npm run worker:start` | Background worker |

## Auth env

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` (≥16 chars)

## Iteration 1 status

**Done:** foundation, local DB, admin auth, Website CRUD (RU UI), manual events + timeline, key dates with manual overrides and audit events.

**Next:** read-only DSD integration via service token (no passwords/secrets copied into LOW).
