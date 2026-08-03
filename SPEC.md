# The Life of Websites (LOW) — Technical Specification

## 1. Purpose

LOW is a self-hosted personal system for managing the lifecycle of a large number of websites.

Primary entity: **Website**.  
Primary interface: a chronological journal of manual and automatic events (`WebsiteEvent`).

LOW does **not** replace DSD or GSC. It correlates lifecycle facts and work history around websites, using read-only machine-to-machine APIs for external enrichment.

## 2. Adjacent systems

| System | Repo / app | Responsibility |
| --- | --- | --- |
| DSD | `liyu-bet/dsd` | Servers, sites, health, DNS, hosting, CDN, registrars, credentials |
| GSC | `liyu-bet/gsc` | Google OAuth, Search Console accounts, properties, search metrics |
| LOW | this app | Lifecycle timeline, dates with provenance, manual work log, integration links |

## 3. Critical architecture rules

1. LOW is a **separate application** with a **separate PostgreSQL database**.
2. LOW **must not** read DSD or GSC databases directly.
3. LOW **must not** copy GSC OAuth tokens.
4. LOW **must not** copy DSD server passwords or API keys.
5. Integrations run only through **separate read-only M2M APIs**.
6. LOW stores only **external account references** and a **hasAccess** flag (plus non-secret metadata).
7. All manual and automatic actions live in one **append-only** `WebsiteEvent` journal.
8. Every automatic event **must** have a unique `dedupeKey`.
9. Domains are always matched via **normalization**.
10. The **source of every important date** must be visible to the user.
11. Search Console “added” date = **first discovery date**, unless the user overrides it manually (`gscAddedAtManual`).
12. First impressions date = first available GSC day where **impressions > 0**.
13. Automatic dates may be corrected manually **without deleting** the change history (corrections are new events / explicit manual fields; journal remains append-only).

## 4. Stack (iteration 1)

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Zod
- Docker Compose
- Separate worker process
- Cookie-based multi-user authentication (PostgreSQL `User` table)

**Out of scope for LOW v1:** Redis, queues, OAuth/external IdP, complex RBAC, AI features, notifications, finance, search-rank tracking, and duplicate uptime monitoring (availability comes from DSD).

## 5. Domain model

### 5.1 Website

| Field | Notes |
| --- | --- |
| `domain` | Display / original host as entered |
| `normalizedDomain` | Canonical match key (`unique`) |
| `name` | Optional human label |
| `primaryUrl` | Optional canonical URL |
| `status` | Operational status |
| `lifecycleStage` | Lifecycle stage |
| `group` | Optional grouping label |
| `tags` | String array |
| `launchedAt` | Automatic / base launch date |
| `launchedAtManual` | Manual override; effective = `launchedAtManual ?? launchedAt` |
| `launchDateSource` | Provenance of base launch date (legacy / system) |
| `firstHealthyAt` | First healthy signal (DSD later); UI read-only |
| `gscFirstSeenAt` | First discovery via GSC sync; UI read-only |
| `gscAddedAtManual` | User override for GSC-added date |
| `firstImpressionAt` | First GSC day with impressions > 0 |
| `firstImpressionAtManual` | Manual override for first impressions |
| `firstClickAt` | First GSC day with clicks > 0 |
| `firstClickAtManual` | Manual override for first click |
| `lastWorkAt` | Last meaningful work activity |
| `archivedAt` | Soft archive timestamp |

Effective dates for UI:

```text
launch           = coalesce(launchedAtManual, launchedAt)
gscAdded         = coalesce(gscAddedAtManual, gscFirstSeenAt)
firstImpression  = coalesce(firstImpressionAtManual, firstImpressionAt)
firstClick       = coalesce(firstClickAtManual, firstClickAt)
```

Manual overrides are audited via append-only `WebsiteEvent` types
`DATE_OVERRIDE_SET` / `DATE_OVERRIDE_UPDATED` / `DATE_OVERRIDE_CLEARED`
(category `DATES`, source `MANUAL`). Calendar dates are stored/displayed as UTC date-only to avoid timezone day-shift.

### 5.2 WebsiteEvent (append-only)

| Field | Notes |
| --- | --- |
| `websiteId` | Parent website |
| `eventType` | Stable machine type, e.g. `note`, `launch`, `date_corrected`, `gsc.first_impression` |
| `category` | UI/grouping category |
| `title` | Short human title |
| `description` | Optional longer text |
| `source` | `MANUAL` \| `SYSTEM` \| `DSD` \| `GSC` |
| `sourceSystem` | Optional free-form system label |
| `externalId` | Optional id in source system |
| `dedupeKey` | Required & unique for automatic events; null for manual |
| `occurredAt` | When the fact happened |
| `recordedAt` | When LOW recorded it |
| `amountMinor` / `currency` | Optional money fields |
| `quantity` / `unit` | Optional quantity fields |
| `metadata` | JSON, non-secret only |
| `createdBy` | `admin` or `system` / job name |

Rules:

- No updates/deletes of historical rows in normal flows.
- Corrections create **new** events (and may update denormalized Website date fields).
- Automatic writers must set `dedupeKey` and rely on unique constraint for idempotency.

### 5.3 AccountReference

Stores a pointer to an external account **without secrets**.

Allowed: system, external account id, label, `hasAccess`, non-secret metadata.  
Forbidden: OAuth tokens, refresh tokens, passwords, API keys, private keys.

### 5.4 WebsiteIntegration

Links a Website to an external system entity (DSD site, GSC property) and optionally to an `AccountReference`.

### 5.5 SyncRun

Audit of integration sync executions (status, counts, errors). No secrets.

### 5.6 JobLock

Postgres-based lock for worker jobs (no Redis in iteration 1).

## 6. Domain normalization

Function: `normalizeDomain(input: string): string`

Must:

1. Trim whitespace.
2. Accept bare domains and URLs.
3. Lowercase.
4. Strip scheme, path, query, hash, credentials, port.
5. Strip trailing dot.
6. Strip leading `www.`.
7. Convert IDN to punycode (ASCII).
8. Reject empty / invalid hosts.

`normalizedDomain` is the only key used to match DSD/GSC entities by domain.

## 7. Auth

- Local users in PostgreSQL (`User`): `ADMIN` | `MEMBER`.
- Passwords: Node.js `crypto.scrypt` with versioned hash format; never plaintext.
- Users are disabled (`isActive=false`), not deleted.
- Session cookie payload: `userId`, `sessionVersion`, `exp` (HMAC with `SESSION_SECRET`).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` bootstrap the first ADMIN only when User table is empty.
- Tasks/events keep legacy `createdBy` string snapshot plus optional `createdByUserId`.
- ADMIN: users, website settings/archive, bulk ops, integrations/manual sync.
- MEMBER: view sites/reports, create/complete tasks, edit own/assigned tasks, manual work notes.

## 8. Integrations

```text
LOW  --read-only M2M Bearer-->  DSD GET /api/integrations/low/*
LOW  --read-only M2M Bearer-->  GSC GET /api/integrations/low/*
```

### DSD (manual + worker sync)

Server-only env: `DSD_BASE_URL`, `DSD_LOW_API_TOKEN`, `DSD_REQUEST_TIMEOUT_MS`, `DSD_SYNC_PAGE_SIZE`.

- No `NEXT_PUBLIC_` token exposure.
- Matching order: `WebsiteIntegration` by DSD site id → `Website.normalizedDomain` → create Website.
- Snapshot stored in `WebsiteIntegration.externalData` (status, ping, DNS, server, expiry — never secrets).
- `AccountReference` upserted with `hasAccess`/`hasCredential` boolean only.
- Core API: `runDsdSync({ trigger: 'manual'|'worker', mode, updatedSince })`; manual buttons call `runManualDsdFullSync`.
- `SyncRun` with `jobType=dsd_sites_sync`, `trigger`, statuses `RUNNING|SUCCESS|PARTIAL|FAILED|SKIPPED`.
- Automatic append-only events with unique `dedupeKey` (no `SITE_DOWN` on first import).
- JobLock `job:dsd_sites_sync` shared by manual and worker (busy → «Синхронизация уже выполняется»).

UI: `/integrations` (health + sync) and DSD block on website detail.

### GSC (manual + worker properties + lifecycle)

Server-only env: `GSC_BASE_URL`, `GSC_LOW_API_TOKEN`, `GSC_REQUEST_TIMEOUT_MS`, `GSC_SYNC_PAGE_SIZE`, `GSC_LIFECYCLE_CONCURRENCY`, `GSC_LIFECYCLE_MAX_PROPERTIES_PER_RUN`.

- Shared service token with GSC `GSC_LOW_API_TOKEN` (never Google OAuth tokens).
- Property matching: integration by `system+externalEntityId` → `normalizeGscPropertyUrl` → `Website.normalizedDomain` → create Website.
- Multiple GSC properties may link to one Website; each property has its own `WebsiteIntegration`.
- Ambiguous remapping conflicts are recorded; other properties continue.
- `gscFirstSeenAt` = earliest import into the GSC app (`firstSeenAt`), never overwrites an earlier value with a later one; `gscAddedAtManual` untouched.
- Lifecycle job fills `firstImpressionAt` / `firstClickAt` only when null, or refines to an earlier automatic date (`GSC_*_REFINED`); manual overrides untouched.
- Date meaning: `earliest_available_in_search_console_api` (not guaranteed first-ever history).
- Separate SyncRuns: `gsc_properties_sync`, `gsc_lifecycle_sync` (never one transaction with DSD).
- JobLocks: `job:gsc_properties_sync`, `job:gsc_lifecycle_sync`.

UI: `/integrations` GSC block + website GSC properties panel.

### Unified sync worker

Separate Node process (`npm run worker:start` / Compose service `worker`):

- Scheduler loop (no overlapping `setInterval`); SIGTERM/SIGINT graceful stop.
- Jobs: `dsd_sites_sync` (default every 15m; full recon hour 03:00), `gsc_properties_sync` (every 6h; full hour 04:00), `gsc_lifecycle_sync` (daily 05:00).
- Timezone `WORKER_TIMEZONE` (default `Europe/Belgrade`); at most one catch-up after restart; daily jobs at most once per local day.
- Incremental DSD/GSC properties after first successful worker run (`updatedSince` / `incrementalCursor`); forced full at reconciliation hour.
- Lifecycle only for sites missing automatic impression/click; default cap `GSC_LIFECYCLE_MAX_PROPERTIES_PER_RUN=500` (hard max 1000), concurrency default 4.
- Heartbeat in `WorkerHeartbeat`; status on `/integrations` («Фоновая синхронизация») and compact «Автоматизация» on `/websites`.
- Disable with `WORKER_ENABLED=false` (clean exit). No Redis/queue. Worker does not run migrations.
- Limits: live M2M when env points at prod endpoints; lifecycle backlog drains over days; no token/secret logging.

## 9. LOW v1 scope (complete)

1. App skeleton + Docker Compose
2. Prisma schema
3. Multi-user auth (ADMIN/MEMBER) + task/event authorship
4. Website CRUD + soft archive
5. Domain normalization + tests
6. Websites table UI + bulk operations
7. Website detail / complete profile
8. Manual event creation + filtered journal
9. Event timeline
10. Key dates + manual overrides (effective dates)
11. Manual DSD read-only sync
12. Manual GSC read-only properties + lifecycle sync
13. Unified DSD/GSC sync worker (JobLock + heartbeat + UI status)
14. Attention dashboard
15. Website tasks and planning
16. Portfolio lifecycle reports (`/reports` + CSV)
17. GHCR production deployment
18. README + `.env.example`

## 10. Explicit non-goals (LOW v1)

- Redis / external queues
- Multi-admin RBAC
- AI assistants
- Notifications (email, Telegram, push, alert delivery)
- Finance module / financial reports
- Search ranking / position / SERP tracking
- Extra uptime probes — site availability is taken from DSD; LOW does not duplicate DSD monitoring
- Direct DSD/GSC database access
- Copying Google OAuth tokens into LOW
- New integrations or background job types beyond the existing worker

## 11. File map (iteration 1 target)

```text
SPEC.md
README.md
.env.example
docker-compose.yml
Dockerfile
package.json
tsconfig.json
next.config.ts
postcss.config.mjs
tailwind.config.ts
worker.js
src/worker/main.ts
src/lib/worker/...
prisma/schema.prisma
prisma/migrations/...
src/app/...
src/lib/db/prisma.ts
src/lib/domain/normalize.ts
src/lib/domain/normalize.test.ts
src/lib/auth/...
src/lib/validations/...
src/components/...
```

## 12. Verification gates

After each implementation stage:

1. `npm run typecheck`
2. `npm test`
3. `npx prisma validate`
4. `npm run build`
