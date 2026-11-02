# 0002. Tenant isolation and subdomain routing

**Date**: 2026-11-01
**Status**: Accepted

## Summary

Every request finds its business from the subdomain (`atlas.` means Salon Atlas), and the database itself refuses to show or change another business's rows. The API looks the business up through one narrow database function, then each service passes the business id by hand into a helper that opens a transaction and tells Postgres "this is Atlas"; row level security (Postgres rules that filter rows per business) does the rest, and links between tables carry the business too, so no row can point into another business. Next.js routes by host in `proxy.ts` and answers a real 404 for unknown subdomains. Tests at three levels (database catalog, database behavior, API) prove the walls hold, and every table added later is checked automatically.

## Requirements

**User stories**:
- As a customer, I want `atlas.<domain>` to open Salon Atlas's own page, so that I book with the right business.
- As a business owner, I want my data and my session to stay inside my business, so that no other business can see or change my bookings.
- As the developer, I want the database to refuse cross business access and tests that prove it, so that one forgotten check in the code never leaks data.

**Acceptance criteria**:
- **AC-1**: `atlas.localhost` and `anfa.localhost` resolve to different businesses: the business page shows "Salon Atlas" on one and "Clinique Anfa" on the other, and `GET /api/tenant` returns each one's `subdomain`, `name`, `timezone`. A business inserted into the database is served on its subdomain on the very next request (no cache, no restart).
- **AC-2**: Unknown, reserved, malformed, and two level subdomains (`pizzeria.`, `admin.`, `-atlas.`, `www.atlas.`) answer HTTP **404** with the French page "Cette adresse ne correspond à aucun établissement" linking to the platform home and to "Créez votre page" (`/inscription` on the root domain). The API answers 404 `business_not_found` for the same hosts. Requesting the internal `/sites/...` path directly answers 404 on any host.
- **AC-3**: Host matching ignores letter case, port, and one trailing dot: `ATLAS.localhost:80` and `atlas.localhost.` resolve to Salon Atlas.
- **AC-4**: Through the local Nginx, `www.localhost` answers a permanent redirect (301) to `localhost` with the same path, and a request whose host is not `localhost` or `*.localhost` gets its connection closed without any response.
- **AC-5**: Subdomain rules live once in `shared/` and are used by web and API: 3 to 30 characters, `a-z` `0-9` `-`, no hyphen at either end, never starting with `xn--`, not on the reserved list. The database refuses a malformed subdomain (CHECK), a duplicate (UNIQUE), and any change to a saved subdomain.
- **AC-6**: Every API route needs a known business host unless marked: a `@PlatformRoute()` route answers only on the root domain (404 elsewhere); an `@AnyHost()` route answers on every platform host (`/api/health`).
- **AC-7**: A valid access token for Salon Atlas is refused with 401 on `anfa.`. A protected business route answers 401 `unauthenticated` with no token or a tampered token, and 401 `token_expired` with an expired one. (Tokens are minted by a test helper here; login arrives with scope feature 5.)
- **AC-8**: While serving Atlas, the database returns no Anfa rows and refuses to insert, update, or delete them, on `businesses` and on any table that follows the tenant table rule.
- **AC-9**: The database refuses a row whose link points to another business's row (business carrying foreign key), even while serving the row's own business.
- **AC-10**: Any query on a business owned table with no business set fails with `no business set for this request`. The business setting never outlives its transaction: the next use of the same database connection has no business.
- **AC-11**: The catalog test fails when a table with `business_id` lacks row level security, the standard `tenant_isolation` policy, `UNIQUE (business_id, id)`, or business carrying links; when a table without `business_id` is not on its allowlist; when a `SECURITY DEFINER` function has no fixed `search_path` or is executable by `PUBLIC`; or when `app_user` holds any right on `_prisma_migrations`.
- **AC-12**: `app_user` cannot list businesses or remove one: `business_by_subdomain` returns one id or nothing, `SELECT` on `businesses` returns only the current business, and `DELETE` on `businesses` is denied.
- **AC-13**: Each API request log line for a business route carries the resolved subdomain as `business`.
- **AC-14**: If the API cannot be reached (down or no answer within 2 seconds), a business subdomain page answers 503 with `Retry-After`, never 404, so search engines do not drop a real business.

## Decision

**Chosen option**: Option 1: one shared database, `business_id` on every business owned row, Postgres row level security plus business carrying keys, business resolved from the host by the API.

The API turns the host into a business id, services hand that id to `TenantDb.forBusiness`, which sets it for one transaction, and Postgres row level security, composite keys, and a loud failure on a missing business enforce isolation even when application code is wrong.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.claude/skills/nestjs-best-practices/`) · `prisma-client-api`, `prisma-cli` (`prisma/skills`, `.claude/skills/prisma-*/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `vitest-unit-testing` (`.claude/skills/vitest-unit-testing/`)

## Rationale

Reasoning, options, and every sub decision with its runner up: see [rationale.md](rationale.md).

## Feature design

### How one request flows

Samira opens her dashboard on `atlas.<domain>`:

1. **Nginx** accepts only the root domain and its subdomains; `www.` is redirected, any other host is dropped.
2. **Next.js `proxy.ts`** parses the host, asks the API whether `atlas` exists, then rewrites to `/sites/atlas/...` (or to the 404 route).
3. **API `HostGuard`** (first global guard) parses the host, calls `business_by_subdomain('atlas')`, and stores `{ id, subdomain }` on the request.
4. **API `AuthGuard`** (second global guard) checks the access token when the route is protected, including `bid` equals the host's business.
5. **Controller** receives the id through `@CurrentBusiness()` and passes it to the service.
6. **Service** runs Prisma inside `TenantDb.forBusiness(businessId, tx => ...)`: one transaction, `set_config('app.business_id', id, true)` first (the `SET LOCAL` equivalent, erased when the transaction ends).
7. **Postgres** filters every row with the `tenant_isolation` policy and refuses links into other businesses.

There is no state machine: a business's subdomain is fixed at signup and never changes.

### Host rules (`shared/src/subdomain.ts`)

- `SUBDOMAIN_MIN_LENGTH = 3`, `SUBDOMAIN_MAX_LENGTH = 30`, `SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/`, plus "does not start with `xn--`".
- `RESERVED_SUBDOMAINS` (a frozen `Set`):
  - Infrastructure: `www api admin app mail email webmail smtp imap pop ftp ns1 ns2 dns cdn static assets media img files uploads status staging dev test localhost autodiscover autoconfig`
  - Platform pages: `connexion inscription login signup register auth sso compte account aide help support contact blog docs faq tarifs pricing legal cgu cgv confidentialite privacy dashboard tableau-de-bord facturation billing`
  - Brand: `monrdv mon-rdv rdv`
- `isValidSubdomain(label)`: pattern, no `xn--` start, not reserved. Feature 5's signup form and DTO use it.
- `parseHost(host, rootDomain)` normalizes (lowercase, strip `:port`, strip one trailing `.`) and returns one of:

| Kind | When | Example (`rootDomain = localhost`) |
|---|---|---|
| `{ kind: 'root' }` | host equals the root domain | `localhost` |
| `{ kind: 'www' }` | `www.` + root domain | `www.localhost` |
| `{ kind: 'business', subdomain }` | exactly one label before the root domain, and `isValidSubdomain` | `atlas.localhost` |
| `{ kind: 'unknown' }` | anything else: other domains, IP addresses, two labels, bad format, reserved | `evil.com`, `www.atlas.localhost`, `admin.localhost` |

`web/lib/host.ts` (`subdomainFromHost`) is replaced by `parseHost`.

### Data model sketch

**`businesses`** (Prisma model `Business`, created by this feature; scope feature 3 adds columns)

| Column | Type | Rule |
|---|---|---|
| `id` | `uuid` | primary key, default `uuidv7()` |
| `subdomain` | `text` | required, UNIQUE, CHECK format (AC-5), fixed after insert (trigger) |
| `name` | `text` | required, CHECK 2 to 80 characters |
| `timezone` | `text` | required, default `'Africa/Casablanca'` |
| `created_at` | `timestamptz` | required, default `now()` |

Handwritten SQL in the migration (Prisma creates the table; the rest is SQL):

```sql
-- Business of the current transaction; fails loudly when none is set.
CREATE FUNCTION app_current_business_id() RETURNS uuid
  LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v text := current_setting('app.business_id', true);
BEGIN
  IF v IS NULL OR v = '' THEN
    RAISE EXCEPTION 'no business set for this request';
  END IF;
  RETURN v::uuid;
END $$;

-- Host lookup before any business is set: one id or NULL, never a list.
CREATE FUNCTION business_by_subdomain(p_subdomain text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.businesses WHERE subdomain = p_subdomain
$$;
REVOKE EXECUTE ON FUNCTION business_by_subdomain(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business_by_subdomain(text) TO app_user;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_subdomain_format
    CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' AND subdomain NOT LIKE 'xn--%'),
  ADD CONSTRAINT businesses_name_length CHECK (char_length(name) BETWEEN 2 AND 80);

CREATE FUNCTION businesses_subdomain_fixed() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'subdomain cannot change';
END $$;
CREATE TRIGGER businesses_subdomain_fixed
  BEFORE UPDATE OF subdomain ON businesses
  FOR EACH ROW WHEN (OLD.subdomain IS DISTINCT FROM NEW.subdomain)
  EXECUTE FUNCTION businesses_subdomain_fixed();

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_self ON businesses FOR ALL
  USING (id = (SELECT app_current_business_id()))
  WITH CHECK (id = (SELECT app_current_business_id()));

REVOKE DELETE ON businesses FROM app_user;
REVOKE ALL ON _prisma_migrations FROM app_user;
```

Row level security is enabled but not forced: the table owner is `app_migrator`, which only migrations, definer functions, and test cleanup use; the app always connects as `app_user` (not owner, `NOBYPASSRLS`, asserted by spec 0001 AC-3).

**The tenant table rule** (every business owned table from scope feature 3 on; the catalog test enforces it):

```sql
CREATE TABLE bookings (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL,
  -- ...
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, staff_id) REFERENCES staff (business_id, id)
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));
```

```prisma
model Booking {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId String @map("business_id") @db.Uuid
  staffId    String @map("staff_id") @db.Uuid
  staff      Staff  @relation(fields: [businessId, staffId], references: [businessId, id])

  @@unique([businessId, id])
  @@map("bookings")
}
```

- Every link between two business owned tables includes `business_id` as its first column. A link to `businesses` itself stays `business_id → businesses.id`.
- `UNIQUE (business_id, id)` also serves as the index leading with `business_id` (spec 0001 rule).
- The policy wraps the function in `(SELECT ...)` so Postgres evaluates it once per statement, not once per row.

### API surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/tenant` | GET | host | `{ subdomain, name, timezone }` | public, business route | 404 `business_not_found` |
| `/api/health` | GET | none | unchanged | public, `@AnyHost()` | 503 when the database is down |
| any business route | any | host, access cookie if protected | | business route (default) | 404 `business_not_found`; 401 `unauthenticated`, `token_expired` |
| any platform route | any | host | | `@PlatformRoute()` | 404 `not_found` off the root domain |

Error bodies: `{ statusCode, code, message }`, with French `message` from `shared/src/messages.ts`.

**`HostGuard`** (global, registered before `AuthGuard`), by route kind and `parseHost` result:

| Route kind | `root` | `www` | `business` | `unknown` |
|---|---|---|---|---|
| business (default) | 404 | 404 | `business_by_subdomain`; null → 404, else `req.business = { id, subdomain }` | 404 |
| `@PlatformRoute()` | pass | 404 | 404 | 404 |
| `@AnyHost()` | pass | pass | pass (no lookup) | pass |

The host is `req.hostname` (Express; honors `X-Forwarded-Host` only from `TRUSTED_PROXY`, as spec 0001 decided and `untrusted-proxy.e2e-spec.ts` proves).

**`AuthGuard`** (global, deny by default per spec 0001; this feature builds its business check, feature 5 adds login, refresh, and the `sid` block list):
- `@Public()` routes skip it. Every other route needs the access cookie: `__Host-at` when `COOKIE_SECURE=true`, else `at` (read with `cookie-parser`).
- Verify with `@nestjs/jwt`, HS256 only, `JWT_ACCESS_SECRET`. Expired → 401 `token_expired`. Missing, malformed, or bad signature → 401 `unauthenticated`.
- `claims.bid !== req.business.id` → 401 `unauthenticated` (same answer, nothing revealed). A protected route that is not a business route has no business to match and is always refused.
- `@CurrentUser()` returns `{ userId, businessId, role, sid }` from `sub`, `bid`, `role`, `sid`.

**`TenantDb`** (`api/src/tenancy/tenant-db.service.ts`):
- `forBusiness<T>(businessId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>`: interactive transaction, `SELECT set_config('app.business_id', ${businessId}, true)` (parameterized), then `work(tx)`. Prisma defaults: `timeout` 5 s (matches `statement_timeout`), `maxWait` 2 s.
- `forNewBusiness<T>(work: (tx, businessId: string) => Promise<T>): Promise<T>`: same, but first `SELECT uuidv7()` inside the transaction and sets that id, so signup (feature 5) can insert the business row and its owner under the `business_self` policy. A taken subdomain surfaces as Prisma `P2002` (feature 5 maps it to 409 `subdomain_taken`).

**Code rules (API)**:
- A controller gets the business only from `@CurrentBusiness()` (a `string` id) and passes it to the service. Never from the body, query, path, or a token claim.
- A service touching business owned tables runs Prisma only inside `TenantDb.forBusiness`. One `forBusiness` per service method; a helper that must join the same transaction takes `tx` as a parameter. No nested `forBusiness`.
- No repository layer: controller → service → Prisma inside `forBusiness` (amends spec 0001's "controller → service → repository").
- Queries need no `where: { businessId }` for safety (Postgres filters); writes set `businessId` explicitly.
- `PrismaService` is importable only in `api/src/prisma/`, `api/src/tenancy/`, `api/src/health/` (ESLint `no-restricted-imports`); everything else goes through `TenantDb`.
- Jobs with no host (feature 5's nightly refresh token cleanup) call a narrow `SECURITY DEFINER` function made for that one task, never a query without a business.

### Web routing (`web/proxy.ts`)

Matcher skips `_next/static`, `_next/image`, `favicon.ico`, and paths with a file extension. The decision logic lives in a pure function `decideRoute(host, pathname, rootDomain)` in `web/lib/tenant-routing.ts` (unit tested); `proxy.ts` only performs it.

| Request | Result |
|---|---|
| any host, path starts with `/sites` | rewrite to `/site-introuvable` (404) |
| `root` | pass through to the platform routes in `app/` |
| `business` | `GET {API_INTERNAL_URL}/api/tenant` with `X-Forwarded-Host: <host>`, 2 s timeout: 200 → rewrite to `/sites/<subdomain><path>`; 404 → rewrite to `/site-introuvable`; error or timeout → 503 response, French text, `Retry-After: 30` |
| `www`, `unknown` | rewrite to `/site-introuvable` (no API call) |

- `app/site-introuvable/page.tsx` calls `notFound()` before any streaming, so the status is a real 404; its `not-found.tsx` renders the French page (AC-2). With `cacheComponents: true`, a `notFound()` inside a streamed layout would answer 200, which is why the check sits in the proxy.
- Links on that page: `rootUrl(path)` = `http://` when `NEXT_PUBLIC_ROOT_DOMAIN` is `localhost`, else `https://`, plus the root domain and path: home `/`, signup `/inscription`.
- `app/sites/[subdomain]/page.tsx`: placeholder business page (feature 6 replaces it) that shows `business.name` inside `<Suspense>`, fetched by `getCurrentBusiness()` in `web/lib/api/tenant.ts`: React `cache()` per request, host from `headers()`, sent as `X-Forwarded-Host`. The `[subdomain]` param is for routing only; the API decides the business from the host.
- Tenant data is never put in `'use cache'` unless the subdomain is part of the cache key (feature 12 rule).
- `app/page.tsx` stays the platform home placeholder (feature 13 replaces it).

### Nginx (`infra/nginx/dev.conf`; feature 7 mirrors it in production)

```nginx
server { listen 80; server_name www.localhost; return 301 http://localhost$request_uri; }
server { listen 80; server_name localhost *.localhost; ... existing proxy rules ... }
server { listen 80 default_server; server_name _; return 444; }
```

In production the fallback server on 443 uses `ssl_reject_handshake on;` so a foreign name never gets a certificate either.

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Any API request | host | `req.hostname` (`X-Forwarded-Host` only from `TRUSTED_PROXY`) |
| Any API request | root domain | `ROOT_DOMAIN` (new API variable) |
| Host parsing | kind, subdomain | `parseHost(host, ROOT_DOMAIN)` from `shared/` |
| Business route | business id | `business_by_subdomain(subdomain)` → `req.business.id` |
| Service call | business id | `@CurrentBusiness()` → service argument → `TenantDb.forBusiness` |
| Each transaction | `app.business_id` | `set_config(..., true)` in `forBusiness` / `forNewBusiness` |
| Row filter and write check | current business | `app_current_business_id()` reading `app.business_id` |
| New business id | uuid | `SELECT uuidv7()` inside `forNewBusiness` |
| Protected route | token business | access cookie claim `bid` (`__Host-at` or `at` by `COOKIE_SECURE`) |
| Token check | secret | `JWT_ACCESS_SECRET` |
| `GET /api/tenant` | `subdomain`, `name`, `timezone` | `businesses` row read under `business_self` |
| Log line | `business` | `req.business.subdomain` via `nestjs-pino` `customProps` |
| Next proxy | host | `request.headers.get('host')` |
| Next proxy | root domain | `NEXT_PUBLIC_ROOT_DOMAIN` |
| Next proxy | business exists | status of `GET {API_INTERNAL_URL}/api/tenant` |
| Business page | business name | `getCurrentBusiness()` → `GET /api/tenant` |
| 404 page | home and signup links | `rootUrl('/')`, `rootUrl('/inscription')` from `NEXT_PUBLIC_ROOT_DOMAIN` |

### Key invariants

- No query reads or writes a business owned row without `app.business_id` set in the same transaction; a missing setting is an error, never an empty result.
- `app.business_id` is only ever set with `is_local = true`; nothing calls plain `SET` or `set_config(..., false)`.
- Every business owned table: `business_id NOT NULL`, `UNIQUE (business_id, id)`, links carry `business_id`, `tenant_isolation` policy, row level security enabled.
- `app_user` never owns a table, never bypasses row level security, cannot delete businesses, has no rights on `_prisma_migrations`.
- Every `SECURITY DEFINER` function sets `search_path = ''`, returns the narrowest answer, and is executable only by `app_user`.
- A subdomain is unique, valid by the shared rule, and never changes.
- The API never trusts a business id from the client: only from the host (and, for sessions, a token whose `bid` must equal it).
- The proxy never answers 404 for a business it could not check; it answers 503.

### Security model

- **Visitors (public routes)**: reach exactly one business, the one named by the host, through public business routes only.
- **Owners (protected routes)**: a session works only on the subdomain that issued it: cookies are host only (`__Host-`, spec 0001) and the token's `bid` must equal the host's business.
- **Database role `app_user`**: sees and changes only the current business's rows; can resolve one subdomain to one id; cannot list or delete businesses.
- **Database role `app_migrator`**: owns the schema, bypasses row level security as owner; used only by migrations, definer functions, test cleanup, and seeds.
- **Hosts**: only the root domain and its subdomains reach the apps; `www.` redirects; everything else is dropped by Nginx.
- No regulated data is introduced here; the CNDP rules apply in feature 6.

### Configuration required

- `ROOT_DOMAIN` (API): the platform root domain, same value as `NEXT_PUBLIC_ROOT_DOMAIN` (`localhost` locally).
- `JWT_ACCESS_SECRET` (API): at least 32 random bytes; a fixed dummy value in `.env.example` and in CI.
- `COOKIE_SECURE` (API): `false` locally, `true` in production; the API refuses to boot with `NODE_ENV=production` and `COOKIE_SECURE=false`.
- `API_INTERNAL_URL` (web, server only): `http://localhost:3001` locally, `http://api:3001` in production.
- Add all four to `.env.example`, both env validators (`api/src/config/env.validation.ts`, `web/env.ts`), and the CI env in `.github/workflows/ci.yml`.

### Critical test scenarios

- Happy path: two businesses in the test database; `GET /api/tenant` with `Host: atlas.localhost` returns Salon Atlas, with `anfa.localhost` returns Clinique Anfa; a business inserted mid test resolves on the next request. Verifies **AC-1**.
- Host shapes: `pizzeria.`, `admin.`, `-atlas.`, `www.atlas.`, `www.`, root, `evil.com` → 404 `business_not_found`; `ATLAS.localhost:80` and `atlas.localhost.` → Atlas. Verifies **AC-2**, **AC-3**.
- Route kinds: a test only probe controller (registered by `createTestApp`) with one business, one platform, one any host route; platform route 200 on root and 404 on `atlas.`; any host route 200 everywhere. Verifies **AC-6**.
- Session: probe protected business route; Atlas token on `atlas.` → 200; same token on `anfa.` → 401; no token, tampered token → 401 `unauthenticated`; expired → 401 `token_expired`. Verifies **AC-7**.
- Database as `app_user` on probe tables (`isolation_probe_parent`, `isolation_probe_child`, created by the test global setup per the tenant table rule): in Atlas's transaction, count of Anfa rows is 0; insert with Anfa's `business_id` fails (SQLSTATE 42501); update and delete of Anfa rows affect 0 rows; child linking Anfa's parent fails (23503). Verifies **AC-8**, **AC-9**.
- Missing business: query a probe table and `businesses` outside `forBusiness` → error `no business set for this request`; with a one connection pool, run `forBusiness(atlas)` then a bare query on the same connection → same error. Verifies **AC-10**.
- `businesses`: in Atlas's transaction `SELECT` returns one row; update of Anfa's row affects 0 rows; changing Atlas's subdomain fails; `DELETE` denied; `business_by_subdomain('anfa')` returns Anfa's id, unknown returns null; `forNewBusiness` inserts a business visible in its own transaction. Verifies **AC-5**, **AC-12**.
- Catalog: the catalog test (allowlist of tables without `business_id`: `businesses`, `_prisma_migrations`) passes on the real schema plus probe tables; a table created without the policy inside a rolled back transaction makes it fail. Verifies **AC-11**.
- Shared rules: `isValidSubdomain` and `parseHost` table tests (lengths 2, 3, 30, 31; hyphen ends; `xn--`; every reserved group). Verifies **AC-3**, **AC-5**.
- Web: `decideRoute` unit tests for every row of the proxy table. Verifies **AC-2**, **AC-14**.
- Real app (`/check verify`): browse `atlas.localhost`, `anfa.localhost`, `pizzeria.localhost` (status 404), `www.localhost` (301), `curl -H "Host: evil.com" http://localhost` (connection closed), stop the API and load `atlas.localhost` (503); read one API log line for `business`. Verifies **AC-1**, **AC-2**, **AC-4**, **AC-13**, **AC-14**.

## Build plan

Tracer Bullet: first one thin thread from Nginx to Postgres that shows Atlas and Anfa apart (tasks 1 to 6), then the locks and the proof around it (tasks 7 to 11).

1. Add `shared/src/subdomain.ts` (`SUBDOMAIN_*`, `RESERVED_SUBDOMAINS`, `isValidSubdomain`, `parseHost`) and export it; replace `web/lib/host.ts` and its test with it. Satisfies **AC-3**, **AC-5**.
2. Add the `Business` model and one migration: Prisma creates `businesses`, the handwritten SQL above adds the CHECKs, trigger, both functions, row level security, `business_self`, and the revokes. Add a dev script that upserts Salon Atlas (`atlas`) and Clinique Anfa (`anfa`) as `app_migrator` (feature 14 replaces it). Satisfies **AC-1**, **AC-5**, **AC-10**, **AC-12**.
3. Add `ROOT_DOMAIN`, `JWT_ACCESS_SECRET`, `COOKIE_SECURE` to the API env validation, `API_INTERNAL_URL` to `web/env.ts`, all four to `.env.example` and CI. Satisfies **AC-1**, **AC-7**.
4. Build `api/src/tenancy/`: `TenantDb` (`forBusiness`, `forNewBusiness`), `@PlatformRoute()`, `@AnyHost()`, `@CurrentBusiness()`, `HostGuard` as the first `APP_GUARD`; mark `/api/health` `@AnyHost()` and `@Public()`. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-6**, **AC-8**.
5. Add `GET /api/tenant` (controller passes `@CurrentBusiness()` to a service that reads the row inside `forBusiness`). Satisfies **AC-1**, **AC-2**.
6. Web: `web/lib/tenant-routing.ts` (`decideRoute`), `web/proxy.ts`, `web/lib/api/tenant.ts`, `app/sites/[subdomain]/page.tsx`, `app/site-introuvable/` (page + French `not-found.tsx`), 503 response. Thread done: `atlas.localhost` and `anfa.localhost` show their names, `pizzeria.localhost` answers 404. Satisfies **AC-1**, **AC-2**, **AC-14**.
7. Nginx `dev.conf`: `www` redirect server and the `default_server` that returns 444. Satisfies **AC-4**.
8. Install `@nestjs/jwt` and `cookie-parser`; build `AuthGuard` (deny by default, `@Public()`, `@CurrentUser()`, cookie name by `COOKIE_SECURE`, `bid` check) as the second `APP_GUARD`, plus a test helper that signs access tokens. Satisfies **AC-7**.
9. Add `business` to request logs (`customProps` in `nestjs-pino`). Satisfies **AC-13**.
10. ESLint `no-restricted-imports` for `PrismaService` outside `src/prisma`, `src/tenancy`, `src/health`. Satisfies **AC-10**.
11. Test harness: probe tables SQL applied by `test/global-setup.ts` as `app_migrator`; `createTestApp` accepts extra modules (the probe controller); `fileParallelism: false` in `api/vitest.config.ts` (one shared test database, cleaned between tests); the catalog test `test/isolation-catalog.e2e-spec.ts`. `/test` then writes the scenarios above. Satisfies **AC-8**, **AC-9**, **AC-11**.

## Consequences

**Positive**:
- Isolation holds even if a controller or service has a bug: Postgres filters rows, refuses foreign links, and fails loudly with no business set.
- Feature 3's tables are checked by the catalog test the moment they exist; nobody has to remember to add an isolation test per table.
- Passing `businessId` by hand keeps the isolation core small and visible: no hidden context, no new library.
- Unknown subdomains answer a real 404 and an API outage answers 503, so search engines treat both correctly.

**Negative / tradeoffs**:
- Every service method touching business data must wrap its work in `forBusiness`; every method signature carries `businessId`.
- One database connection is held per request for the whole service call; a slow handler holds a pool slot (pool default is enough for a demo).
- Each subdomain page costs one extra internal API call in `proxy.ts` (one indexed lookup) before rendering.
- Business carrying links add a column to every foreign key and a `UNIQUE (business_id, id)` per table; Prisma relations become composite.
- Row level security is not forced, so anything running as `app_migrator` (migrations, seeds) bypasses it; that role must never be used by the app.
- API tests run one file at a time (`fileParallelism: false`), slower as the suite grows.
- `AuthGuard` arrives before login exists, so its cookie path is first proven only with test tokens.

**Neutral**:
- Spec 0001's "controller → service → repository" becomes "controller → service" (amended in 0001).
- New dependencies: `@nestjs/jwt` (chosen in spec 0001), `cookie-parser` and its types.
- `web/lib/host.ts` is removed in favor of `shared/`.

## Follow-up

- [ ] Scope feature 3 (data model): every business owned table follows the tenant table rule above; `users`, `refresh_tokens`, `staff`, `services`, `bookings`, cash records included.
- [ ] Scope feature 5 (signup and sign in): use `TenantDb.forNewBusiness`, `isValidSubdomain`, the `/inscription` path, `P2002` → 409 `subdomain_taken`; add the `sid` block list and login routes to `AuthGuard`; the nightly refresh token cleanup goes through its own `SECURITY DEFINER` function.
- [ ] Scope feature 7 (live deployment): production Nginx gets the same `www` redirect and a fallback server with `ssl_reject_handshake on;`.
- [ ] Scope feature 12 (branding): if tenant data gets `'use cache'`, the subdomain is a cache key and a branding update revalidates its tag.
- [ ] On install, confirm `@nestjs/jwt` and `cookie-parser` versions that support NestJS 12; `jose` is the runner up from spec 0001.
- [ ] Root `AGENTS.md` (still missing) should carry the tenant code rules (pass `businessId`, `forBusiness` only, the tenant table rule) in `## Rules` once it exists; `/sync` owns that file.
