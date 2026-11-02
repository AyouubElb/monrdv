# 0002. Tenant isolation and subdomain routing: rationale

Decision record for [index.md](index.md). `/develop` does not read this file.

## Context

> ⚠️ Premise note: this feature is built before the data model (scope feature 3) has a spec. It therefore creates only `businesses` and fixes the rule every later table must follow (`business_id`, `UNIQUE (business_id, id)`, business carrying links, the `tenant_isolation` policy). Feature 3 must design within that rule; the catalog test refuses any table that breaks it.

The platform serves many businesses (Salon Atlas, Clinique Anfa, Coach Karim) from one codebase and one database, each on its own subdomain. Tenant isolation is the headline of the portfolio: the agency should see that one business can never read or change another's data, and that this is proven by tests, not promised.

Forces:
- **The host is the only tenant signal.** Public booking pages have no login, so the business must come from the subdomain on every request, and a spoofed header must never choose it.
- **Bugs will happen.** A forgotten filter in one query is the classic multi tenant leak. Isolation must hold when application code is wrong.
- **Cross business damage without reading.** A write can harm another business without reading its data, for example a booking that points at another business's staff member and blocks their slot through the overlap constraint.
- **Sessions are per business.** An owner's session from one subdomain must be useless on another.
- **Next.js 16 with `cacheComponents`** streams pages, and a streamed page keeps status 200 even when it renders a not found page.
- **Time and simplicity.** A solo 3 to 4 day build; the engineer prefers explicit code over hidden machinery.
- **Spec 0001 already fixed** PostgreSQL 18 with row level security, an `app_user` role that cannot bypass it, `__Host-` cookies, a per request transaction with `SET LOCAL`, and the trusted proxy rule for `X-Forwarded-Host`.

## Options considered

### Option 1: shared schema, `business_id`, row level security, business carrying keys (chosen)

One set of tables; every business owned row has `business_id`; Postgres policies filter by the business set for the transaction; foreign keys include `business_id`.

**Pros**: the database enforces isolation even with buggy code; one schema and one migration path; cheap per business (a row, not a schema); the tests are generic (catalog driven).
**Cons**: every query runs inside a transaction that sets the business; policies and composite keys add schema ceremony; a role that bypasses row level security (the owner) must stay out of the app.

### Option 2: shared schema, filtering in application code only

Same tables, but every query adds `where: { businessId }`; no database policies.

**Pros**: simplest; no transaction per request; plain Prisma everywhere.
**Cons**: one forgotten filter leaks data; nothing stops cross business links; the isolation claim rests on reviewing every query, which is exactly the mistake the agency wants to see avoided.

### Option 3: one Postgres schema per business

Each business gets its own schema; the request switches `search_path`.

**Pros**: strong separation; per business backup is easy.
**Cons**: every migration runs once per business; Prisma has no first class support for switching schemas per request; signup must create a schema live; the catalog grows with each business.

### Option 4: one database per business

**Pros**: the strongest separation; noisy neighbors impossible.
**Cons**: a connection pool per business, migrations per database, provisioning at signup; far beyond a single free VM and a 3 to 4 day build.

## Rationale

Option 1 is the only option that keeps isolation when code is wrong (the "bugs will happen" force) without the per business operations of Options 3 and 4, which a single VM and a solo build cannot carry. Option 2 is what the forces argue against: its safety equals the discipline of every future query. Spec 0001 already set up the pieces Option 1 needs (Postgres 18, a non owner `app_user` without `BYPASSRLS`, `SET LOCAL` per transaction), so the cost is the policy, the helper, and the tests. Business carrying keys answer the "cross business damage without reading" force, which row level security alone does not, because Postgres checks foreign keys and unique or exclusion constraints without row level security.

### Decisions the engineer made (with the runner up)

| Topic | Chosen | Runner up and why not |
|---|---|---|
| Subdomain format | 3 to 30, `a-z 0-9 -`, no hyphen at the ends, no `xn--` | 2 to 63 (DNS maximum): allows unreadable or two letter names |
| Reserved names | infrastructure, platform pages, brand | infrastructure only: leaves `aide.` or `monrdv.` open to impersonation |
| Unknown subdomain | French 404 page with home and signup links | redirect to home: no real 404, visitor never learns the address was wrong |
| Rename | fixed at signup | rename with redirect: a second table and redirect logic for no current need |
| Session proof (A) | build the business check in `AuthGuard` now, test tokens | wait for feature 5: the headline proof would wait |
| Who creates `businesses` (B) | this feature, minimal columns; feature 3 extends | data model first: swaps the scope order, delays the thread |
| Host lookup (C) | one `SECURITY DEFINER` function returning one id | `businesses` readable by all: branding writes would rest on code only |
| Links (D) | business carrying composite foreign keys | plain foreign keys: a booking could block another business's staff slot |
| Business id travel (E) | passed by hand, controller → service → `forBusiness` | `AsyncLocalStorage` context: less typing, but hidden state the engineer did not want |
| Transaction (F) | one transaction per service call (one per request in practice) | one transaction per query (Prisma's example): cannot group booking and payment |
| Missing business (G) | loud error | empty result: a bug looks like an empty day |
| Web split (H) | `proxy.ts` rewrite to `app/sites/[subdomain]` | host branching in every page: one forgotten branch shows the wrong site |
| Code shape | service calls Prisma inside `forBusiness`, no repository layer | keep repositories (spec 0001): one more file per feature for little gain over Prisma |
| `www` | 301 to root | serve the landing twice: duplicate pages for search engines |
| Foreign hosts | Nginx closes the connection | apps answer 404: a single lock, every app must handle strange hosts |
| Lookup cache | none | 60 s positive cache: saves well under a millisecond, adds a cache to test |
| Route default | business route unless marked | must mark every route: one more decorator on every controller |
| Test depth | catalog, database, API | database only: the host and token steps go unproven |

### Implementation calls made in this spec (with the runner up)

- **Row level security enabled, not forced.** The owner is `app_migrator`, which definer functions, test cleanup, and seeds rely on; the app never connects as it (spec 0001 AC-3). Runner up: `FORCE` plus a dedicated `BYPASSRLS` role owning the definer functions, one more role and ownership step for little gain while the owner role is never used by the app.
- **Policy calls `(SELECT app_current_business_id())`** so it runs once per statement (the installed Postgres skill's guidance). Runner up: a bare call, evaluated per row.
- **Definer functions in `public` with `search_path = ''`, `EXECUTE` revoked from `PUBLIC`.** No PostgREST style exposure exists here, so a private schema adds nothing. Runner up: a `private` schema.
- **Subdomain fixed by trigger.** Column privileges cannot do it while default privileges grant table wide `UPDATE`. Runner up: revoke table `UPDATE` and grant per column, which every later column addition would have to remember.
- **`business_by_subdomain` returns only the id;** `/api/tenant` reads the row under `business_self`, so the definer function exposes as little as possible. Runner up: return the full row from the function.
- **The 404 decision sits in `proxy.ts`.** The Next 16 docs state that a streamed response keeps status 200 and recommend checking in Proxy for a real 404. Runner up: `notFound()` in the business layout, which would stream 200 with a `noindex` tag (a soft 404).
- **Proxy skips the API call for `www` and `unknown` hosts;** the API stays the authority for whether a valid name exists. Runner up: always ask the API.
- **API unreachable → 503 with `Retry-After: 30`.** A 404 would tell search engines a real business is gone. Runner up: 502 from Nginx.
- **`cookie-parser` reads the access cookie,** the standard Express middleware. Runner up: parse `req.headers.cookie` with the `cookie` package.
- **API test files run one at a time** because all share one test database cleaned between tests. Runner up: unique data per file and no global cleanup, harder to keep correct.
- **Probe tables live in the test setup, not in migrations,** so the convention is proven before feature 3 without shipping fake tables. Runner up: wait for feature 3's tables to prove it.
- **ESLint `no-restricted-imports` on `PrismaService`** catches a tenantless query at lint time; the loud database error catches it at run time. Runner up: review only.
- **Logs carry `business` (the subdomain),** readable at a glance. Runner up: the business id.
- **Prisma transaction defaults (5 s timeout, 2 s wait)** match `statement_timeout` 5 s and stay under `idle_in_transaction_session_timeout` 10 s.
- **`forNewBusiness` takes its id from `SELECT uuidv7()`** in the transaction, since Node has no built in UUID v7. Runner up: a UUID library in Node.
- **404 page links derive `http` or `https` from the root domain** (`localhost` is the only plain HTTP host). Runner up: a new `NEXT_PUBLIC_ROOT_URL` variable.
- **Business owned rows `ON DELETE CASCADE` from `businesses`,** so deleting a business (a future platform admin action) removes all its data in one step; `app_user` cannot delete businesses at all. Runner up: `RESTRICT`, which makes removal a long manual sequence.
