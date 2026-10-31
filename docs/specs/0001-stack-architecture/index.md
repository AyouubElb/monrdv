# 0001. Stack and architecture for the multi tenant booking platform

**Date**: 2026-10-31
**Status**: In Progress

## Summary

This spec picks the tools and the overall shape of the app. It is one repository holding a Next.js web app and a NestJS API that share a small package of rule values and types, with PostgreSQL 18 as the database, reached through Prisma. Owners log in with a login system built in the API itself: a short lived signed token plus a rotating refresh token, both in cookies locked to the business's own subdomain. Everything runs in Docker on one free Oracle Cloud server behind Nginx and Cloudflare, and GitHub Actions tests and deploys every change.

## Requirements

The contract for the scaffold step of scope feature 1 (`/develop stack & architecture`) and its `/check verify`. The live deployment itself is scope feature 7; it follows the topology below but is checked there.

**User stories**:
- As the developer, I want one command to start the whole stack locally on real subdomains, so that every later slice is built and tested the way it will run in production.
- As the developer, I want CI to refuse any commit that breaks lint, types, or tests, so that the portfolio stays green from day 1.

**Acceptance criteria**:
- **AC-1**: From a fresh clone, `pnpm install` then `pnpm dev` starts Postgres, Nginx, the web app, and the API; `http://atlas.localhost` renders a Next.js page that shows the subdomain it resolved (`atlas`).
- **AC-2**: `GET http://atlas.localhost/api/health` reaches NestJS through Nginx and returns 200 with the database reachable and the forwarded host (`atlas.localhost`) echoed back.
- **AC-3**: Postgres 18 runs with two roles: `app_migrator` owns the schema and runs migrations; `app_user` (what the API connects as) is not a superuser, owns no table, and has `NOBYPASSRLS`. A test asserts this.
- **AC-4**: The API refuses to start when the runtime's time zone data is older than `2026c`, and a test confirms `Africa/Casablanca` is at offset `+00:00` on 2026-10-01.
- **AC-5**: One rule from `shared/` (the Moroccan phone check) is used by a NestJS DTO and by a Next.js Zod schema, and a parity test feeds the same samples to both and expects the same verdicts.
- **AC-6**: `pnpm turbo run lint typecheck test` passes locally; the same checks plus `build` run in GitHub Actions on every push and pull request (Vitest against a real Postgres service), and any failure fails the run.
- **AC-7**: `git commit` runs Husky with lint-staged (ESLint and Prettier on staged files).
- **AC-8**: Swagger UI loads at `http://atlas.localhost/api/docs`, generated from the controllers by the `@nestjs/swagger` CLI plugin.

## Decision

**Chosen option**: Option 1: Next.js and NestJS in one monorepo, PostgreSQL, self hosted with Docker on one cloud VM.

A layered two app monorepo (web and API) on TypeScript and PostgreSQL 18, with in house token auth, deployed by GitHub Actions to Docker Compose on an Oracle Cloud Always Free ARM VM behind Nginx and Cloudflare.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.claude/skills/nestjs-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `turborepo` (`vercel/turborepo`, `.claude/skills/turborepo/`) · `playwright-cli` (`microsoft/playwright-cli`, `.claude/skills/playwright-cli/`) · `multi-stage-dockerfile` (`github/awesome-copilot`, `.claude/skills/multi-stage-dockerfile/`) · `prisma-orm-setup`, `prisma-client-api`, `prisma-cli` (`prisma/skills`, `.claude/skills/prisma-*/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `vitest-unit-testing` (`.claude/skills/vitest-unit-testing/`) · `github-actions-hardening` (`.claude/skills/github-actions-hardening/`)

## Rationale

Reasoning, options, landscape scan, and sources: see [rationale.md](rationale.md).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture | Two apps and a shared package in one repo, flat at the root: `web/` (Next.js), `api/` (NestJS, layered controller → service → repository), `shared/` | You want a real API layer to show; one repo keeps one CI pipeline and shared rule values; no extra container folders |
| Language | TypeScript, `strict` everywhere | One language across web, API, and shared code |
| Runtime | Node.js 24 LTS; time zone data must be `2026c` or newer (your machine: 24.21.0, `2026c`) | Supported by every chosen library; `2026c` carries Morocco's 20 September 2026 return to GMT |
| Package manager and monorepo | pnpm workspaces (listing `web`, `api`, `shared`) + Turborepo | Runs lint, typecheck, test, build across the workspaces in order, with caching |
| Web framework | Next.js 16 App Router, version 16.2.11 or later | Server rendering for landing and booking pages; 16.2.11 fixes a 2026 bypass of auth checks in the routing layer |
| UI | Tailwind CSS + shadcn/ui | Accessible components you own; one CSS variable per business accent color (look decided in spec for scope feature 4) |
| Web forms and validation | React Hook Form + Zod, importing rule values from `shared/` | Instant French error messages on the phone booking page, light bundle |
| API framework | NestJS on the Express adapter | The engineer's choice; Express keeps every NestJS guide and middleware usable |
| API validation | DTO classes with `class-validator` + `class-transformer`; global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform` | Pure NestJS convention; unknown fields are rejected |
| Shared package | `shared/`: rule values (lengths, limits), validator functions (`isMoroccanPhone`), API payload types, French messages | Values live once, so web and API cannot drift |
| API docs | `@nestjs/swagger` with its CLI plugin, served at `/api/docs` | Generated from controllers and DTOs, no manual docs |
| Database | PostgreSQL 18, official Docker image, in a container on the VM | Row level security and exclusion constraints, built in `uuidv7()` |
| ORM | Prisma, the current stable release on scaffold day (7.10.x today; 8 only if out of release candidate) | Mature, typed, good NestJS guide; Postgres specific features go in handwritten SQL migrations |
| Auth | Built in house in NestJS: argon2id hashing, 15 minute JWT access token + rotating 7 day refresh token, `__Host-` cookies (see Auth design) | One login method only; the session carries the business, which makes isolation simple to enforce and test |
| JWT library | `@nestjs/jwt`, HS256, secret from env (runner up: `jose`) | NestJS native; one service signs and verifies, so a shared secret is enough |
| Password hashing | `argon2` (argon2id) | The OWASP preferred algorithm |
| Rate limiting | `@nestjs/throttler`, in memory store | One API instance; move to Redis only if a second instance appears |
| File storage | Cloudflare R2 through the S3 API (`@aws-sdk/client-s3`); `sharp` resizes and converts logos to WebP | Free tier, free egress, provider swappable; images only, no SVG |
| Dates and time zones | `date-fns` v4 + `@date-fns/tz` | Uses the runtime's time zone data; the server formats wall clock times |
| Phone numbers | `libphonenumber-js` (min metadata) inside `isMoroccanPhone` | Real +212 validation and E.164 output for WhatsApp links |
| Logging | `pino` via `nestjs-pino`, JSON lines with a request id | Readable with `docker compose logs`, ready for a log tool later |
| Config | API: `@nestjs/config` with a class-validator `validate` function; web: a Zod schema in `web/env.ts` | Each app refuses to boot with a missing or malformed variable, in its own validation style |
| Scheduled jobs | `@nestjs/schedule` | Nightly cleanup of expired refresh tokens lives with the code |
| Unit and integration tests | Vitest in both apps (`unplugin-swc` in the API for decorator metadata) | One runner; NestJS dependency injection needs the decorator metadata SWC emits |
| Test database | Real Postgres 18: `db-test` container locally, a Postgres service container in CI; migrated fresh, truncated between tests | Row level security and exclusion constraints only exist in real Postgres |
| Browser smoke test | Playwright, exactly one test (signup → service → book → owner sees it) | Catches broken wiring between web, API, proxy, and database in CI |
| Lint and format | ESLint flat config at the root (`typescript-eslint` type aware rules, including `no-floating-promises`) + Prettier | The engineer's familiar tools; type aware rules catch a missing `await` |
| Git hooks | Husky + lint-staged | Fast checks on staged files before each commit |
| CI/CD | GitHub Actions: `ci.yml` on every push and pull request; `deploy.yml` on `main` after CI passes | Commits are gated; deploys are automatic |
| Image registry | GitHub Container Registry | Free with the repo, uses the workflow token |
| Hosting | Oracle Cloud Always Free Ampere A1 VM (ARM, `arm64`), Ubuntu LTS, Docker Engine + Compose | Free with no time limit, roomy enough for all containers, real cloud learning |
| Reverse proxy | Nginx container: one server block for the root and `*.` subdomains; `/api/` → API, `/` → web | The industry standard; one config serves every tenant |
| Edge DNS and HTTPS | Cloudflare free plan: proxied wildcard record, Universal SSL (root + one subdomain level), SSL mode Full (strict) with a Cloudflare origin certificate on Nginx | Free HTTPS for every business subdomain, encrypted to the server |
| Backups | Nightly `pg_dump` to a private R2 bucket, 7 days kept, one restore rehearsed before the demo | The VM is otherwise the only copy |
| Observability | Structured logs only in this build | Error tracking is a Deferred scope item |
| Email | None in this build | No flow needs it yet; password reset by email is a follow up |
| Language of screens | French only, `lang="fr"`, strings in plain modules, no translation library | Arabic is Deferred in the scope |
| Repository | Public GitHub monorepo | Portfolio visibility |

### Repo layout

```
web/                 Next.js 16 (App Router), Tailwind, shadcn/ui
api/                 NestJS (Express), Prisma schema + migrations in api/prisma/
shared/              rule values, validators, payload types, French messages
infra/               compose.dev.yml, compose.prod.yml, nginx/, postgres/init/ (roles), backup/
.github/workflows/   ci.yml, deploy.yml
pnpm-workspace.yaml  lists web, api, shared
turbo.json           task pipeline: lint, typecheck, test, build
```

### Request path

- The browser only ever talks to `<business>.<root domain>`. Nginx sends `/api/*` to `api:3001` and everything else to `web:3000`, forwarding `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- Next.js server code calls the API over the private Docker network (`API_INTERNAL_URL`), forwarding the visitor's cookies and the original host in `X-Forwarded-Host`. NestJS trusts forwarded headers only from the proxy and internal network (`TRUSTED_PROXY`).
- Authorization is always decided in NestJS. The Next.js routing layer may redirect early for user experience, never to protect data.
- Local development mirrors this: `compose.dev.yml` runs Postgres, `db-test`, and Nginx on port 80, which proxies to `pnpm dev` processes on the host (web on 3000, API on 3001). Browse `http://atlas.localhost`.
- How the API turns a host into a business, and how each query is locked to it (row level security, `SET LOCAL` per request), is decided in the spec for scope feature 2 (tenant isolation).

### Auth design

**Tokens**

| | Access token | Refresh token |
|---|---|---|
| Form | JWT (HS256) with `sub` (user id), `bid` (business id), `role`, `sid` (login family id), `exp` | 32 random bytes, base64url; only its SHA 256 hash is stored |
| Lifetime | 15 minutes | 7 days since last use (each rotation grants a new 7 days) |
| Cookie (production) | `__Host-at`; HttpOnly, Secure, SameSite=Lax, Path=/ | `__Host-rt`; same flags (the `__Host-` prefix forces Path=/, so it travels with every request, but only the refresh endpoint reads it) |
| Cookie (local http) | `at`, `rt` without Secure (`COOKIE_SECURE=false`) | |
| Checked by | The global guard: signature, expiry, `sid` not blocked, `bid` equals the business resolved from the host | `POST /api/auth/refresh` only |

**Endpoints** (all under `/api/auth`, rate limited)

| Endpoint | Method | Auth | Does |
|---|---|---|---|
| `/login` | POST | public | Email + password inside the host's business; sets both cookies; same error for unknown email or wrong password |
| `/refresh` | POST | refresh cookie | Rotates the refresh token, issues a new access token |
| `/logout` | POST | access cookie | Revokes the login family, blocks its `sid`, clears both cookies |
| `/me` | GET | access cookie | Returns the current user and business |
| `/password` | POST | access cookie + current password | Changes the password, revokes and blocks every family of the user, issues a fresh pair for this device |

**Rules**

- Global guard denies by default; `@Public()` opens a route (public booking, signup, login); `@CurrentUser()` gives a handler the user and business.
- Rotation: a used refresh token presented again more than 20 seconds after its rotation means theft: revoke the whole family. Within 20 seconds it is treated as a race between two tabs and gets a fresh pair in the same family.
- Block list: on logout or password change, the family `sid` is kept in memory for 15 minutes and the guard rejects any access token carrying it. It empties on restart (worst case: 15 minutes of exposure for an already stolen token).
- Expired access token: the API answers `401` with code `token_expired`; the web client calls `/api/auth/refresh` once and retries. For server rendered pages, the Next.js routing layer refreshes before rendering when only the refresh cookie remains, passing the new cookies through.
- Passwords: argon2id with at least 19 MiB memory, 2 iterations, parallelism 1; length 12 to 128; no forced character classes.
- Forged request defense: SameSite=Lax plus an `Origin` check on every POST, PUT, PATCH, DELETE (must equal `https://<request host>`), since sibling subdomains count as the same site.
- Rate limits: login 5 per 15 minutes per (business, email) and per IP; signup 5 per hour per IP; refresh 30 per 15 minutes per IP. The client IP comes from `CF-Connecting-IP`, restored by Nginx (`real_ip_header`) only for Cloudflare address ranges.
- Accounts: one account per business; email unique per business, not globally. Role is `owner` only in this build.
- Signup on the root domain ends on "Votre espace est prêt" and redirects to `https://<subdomain>.<root domain>/connexion`; no session is created on the root domain.
- Nightly job deletes expired and revoked refresh tokens.

**Value sourcing**

| Action | Value | Source |
|---|---|---|
| Every API request | Current business | The request host (`Host`, or `X-Forwarded-Host` from the trusted network), resolved per spec for scope feature 2 |
| Authenticated request | Current user, business, role, family | Access token claims `sub`, `bid`, `role`, `sid` |
| Rate limiting | Client IP | `CF-Connecting-IP`, restored by Nginx from Cloudflare ranges only |
| Origin check | Expected origin | `https://` + request host |
| Slot and booking times | Business time zone | `businesses.timezone` (default `Africa/Casablanca`), applied with the runtime's time zone data (`2026c` or newer) |
| Phone storage and WhatsApp links | Normalized number | `isMoroccanPhone` output in E.164 form |

### Database conventions

| Area | Rule |
|---|---|
| Roles | `app_migrator` owns the schema and runs `prisma migrate deploy` (`MIGRATE_DATABASE_URL`). `app_user` is the runtime role (`DATABASE_URL`): not a superuser, owns nothing, `NOBYPASSRLS`, gets table rights through default privileges. Created by an init script in `infra/postgres/init/` |
| Tenant setting | Each request runs in a transaction that sets the current business with `SET LOCAL` (mechanism detailed in the spec for scope feature 2) |
| IDs | `uuid` primary keys defaulting to `uuidv7()`; a short public booking code (like `ATL-7K3Q`) for humans |
| Time | `timestamptz` for moments; `time` + weekday for opening hours; `date` for days off; each business has a `timezone` column |
| Money | Integer centimes (120 MAD → `12000`) |
| Naming | `snake_case` tables and columns, mapped to `camelCase` in Prisma |
| Integrity in the database | `NOT NULL`, `CHECK` (price ≥ 0, end after start), `UNIQUE (business_id, email)`, unique lowercase subdomain, foreign keys with explicit delete rules, exclusion constraint against overlapping bookings per staff member (`btree_gist`) |
| Indexes | Every foreign key; composite indexes lead with `business_id` |
| Migrations | Prisma migrations, never edited once applied; row level security, constraints, extensions, and roles in handwritten SQL migrations; CI applies them to the test database; deploy runs them before the new API starts |
| Safety limits | `app_user`: `statement_timeout` 5 s, `idle_in_transaction_session_timeout` 10 s |
| No N+1 queries | Never query inside a loop: load relations with `include`/`select`, batch with `in`. List endpoints (day view, open slots, cash totals) have a test asserting the query count is identical with 1 or 50 rows. In development, a request running more than 10 queries logs a warning |
| Exposure | Postgres only on the private Docker network; admin access through an SSH tunnel |
| Backups | Nightly `pg_dump` to the private backup bucket, 7 days kept; restore rehearsed once |
| Tests | Separate test database, migrated fresh, truncated between tests |

### Deployment topology (built by scope feature 7)

- **VM**: Oracle Always Free Ampere A1 (`arm64`), Ubuntu LTS, Docker Engine + Compose plugin, SSH key login only.
- **Containers** (`compose.prod.yml`): `nginx` (publishes 443 only), `web`, `api`, `db` (volume `pgdata`), `backup` (nightly cron). All others stay on the private network.
- **Firewall** (Oracle security list): 443 from Cloudflare address ranges only; 22 from your IP only.
- **Edge**: Cloudflare nameservers for your domain; proxied `A` records for the root and `*`; SSL mode Full (strict); a Cloudflare origin certificate (covering root and `*.`) mounted into Nginx.
- **Images**: multi stage Dockerfiles for `web` (Next.js standalone output) and `api`; base image on Node 24 with time zone data `2026c` or newer; built for `arm64` in CI (a native ARM runner when available to the repo, else Buildx emulation); pushed to GHCR tagged with the commit SHA and `latest`.
- **Deploy** (`deploy.yml`, on `main` after CI passes): SSH to the VM → `docker compose pull` → run migrations as `app_migrator` → `docker compose up -d` → check `/api/health` → on failure, roll back to the previous SHA tag.
- **Storage buckets**: `public` (logos, public read) and `backups` (private). Never put backups in the public bucket.
- **Fallback**: if Oracle has no free A1 capacity, the same Compose setup runs on the AWS free plan (6 months).

### Configuration required

- `DATABASE_URL`: runtime connection as `app_user`
- `MIGRATE_DATABASE_URL`: migration connection as `app_migrator`
- `POSTGRES_PASSWORD`, `APP_USER_PASSWORD`, `APP_MIGRATOR_PASSWORD`: database role passwords (VM `.env` and local `.env` only)
- `JWT_ACCESS_SECRET`: at least 32 random bytes
- `ROOT_DOMAIN`: `localhost` locally, your domain in production
- `COOKIE_SECURE`: `false` locally, `true` in production (switches to `__Host-` names)
- `TRUSTED_PROXY`: network range whose forwarded headers the API trusts
- `API_INTERNAL_URL`: web → API over the private network (`http://api:3001`)
- `NEXT_PUBLIC_ROOT_DOMAIN`: root domain for building links in the browser
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_BACKUP_BUCKET`, `R2_PUBLIC_BASE_URL`: storage
- `LOG_LEVEL`, `NODE_ENV`
- GitHub Actions secrets: `VM_HOST`, `VM_USER`, `VM_SSH_KEY` (GHCR uses the workflow token)

## Consequences

**Positive**:
- Tenant isolation has two locks from day 1: the token's business must match the host, and the database's row level security backs it up.
- The database itself refuses overlapping bookings and bad data, whatever the code does.
- Every commit is gated by lint, types, unit and integration tests, and one browser smoke test.
- The whole platform costs only a domain name.
- Every tool is mainstream and familiar to agency teams (Next.js, NestJS, Prisma, PostgreSQL, Nginx, GitHub Actions).

**Negative / tradeoffs**:
- In house auth is security critical code you own: any slip in rotation, cookies, or hashing is a breach. Mitigated by following the OWASP sheets and testing every rule, but it remains the riskiest code in the repo.
- The token pair adds about half a day over plain server sessions (two cookies, rotation, refresh retry).
- Two apps mean two Dockerfiles, two configs, and an internal network hop for server rendered pages.
- Validation wiring is written twice (class-validator and Zod); only the values are shared, and the parity test is the guard.
- One VM means no redundancy: a deploy restarts containers (seconds of downtime), and a disk loss means restoring last night's backup.
- The in memory throttler and token block list tie the API to one instance; a second instance needs Redis first.
- Oracle's free ARM capacity is sometimes unavailable, and every image must be built for `arm64`.
- Prisma needs a transaction per request to set the tenant for row level security, a small fixed overhead on every query.
- The flat layout departs from Turborepo's `apps/` + `packages/` convention, so its docs' examples need translating; a third app later means adding its folder to `pnpm-workspace.yaml`.

**Neutral**:
- Next.js must stay at 16.2.11 or later, and Prisma's major version is pinned on scaffold day.
- The skills CLI added `skills-lock.json` at the repo root; commit it so the installed skills are reproducible.
- Docker Desktop is required locally (installed).

## Follow-up

- [ ] Spec for scope feature 2 (tenant isolation): host to business resolution, trusted forwarded host, row level security policies, `SET LOCAL` per request with Prisma, cross tenant tests.
- [ ] Spec for scope feature 3 (data model): includes `users` and `refresh_tokens` as used by the Auth design above.
- [ ] Create the Oracle Cloud account and check free A1 capacity in your region on day 1; fall back to the AWS free plan if none.
- [ ] Buy a domain and move its DNS to Cloudflare before scope feature 7.
- [ ] Run `git init` and create the public GitHub repository before the scaffold; if git reports certificate errors, set `git config --global http.sslBackend schannel`.
- [ ] On scaffold day, confirm Prisma's stable major (7 or 8) and that the production base image ships time zone data `2026c` or newer.
- [ ] Root `AGENTS.md` does not exist yet. Its `## Agent skills` section should list the project wide skills above (NestJS, React and Next.js, shadcn, Turborepo, Prisma, Postgres, Vitest, Playwright, Dockerfile, GitHub Actions) and record the declined MCP servers (Postgres, Playwright, Next.js DevTools) on its `Declined:` line, so nothing offers them again.
- [ ] Password reset by email is out of this build; it needs an email provider decision when added.
- [ ] Error tracking stays Deferred in the scope.
