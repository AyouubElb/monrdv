# Verify: tenant isolation & subdomain routing · spec 0002 · updated 2026-11-01

_Steps derived from spec 0002 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

Before you start: `pnpm dev` is running (Postgres, Nginx, web on 3000, API on 3001), the dev database is migrated (`pnpm --filter api exec prisma migrate deploy`) and seeded (`pnpm --filter api db:seed:dev`).

## UI / manual

- [x] Open `http://atlas.localhost` → page shows "Salon Atlas" → AC-1
- [x] Open `http://anfa.localhost` → page shows "Clinique Anfa" → AC-1
- [x] Open `http://pizzeria.localhost` → status 404, French page "Cette adresse ne correspond à aucun établissement" with links "Retour à l’accueil" (`http://localhost/`) and "Créez votre page" (`http://localhost/inscription`), tab title "Établissement introuvable · MonRDV" → AC-2
- [x] Open `http://admin.localhost`, `http://-atlas.localhost`, `http://www.atlas.localhost` → same 404 page → AC-2
- [x] Open `http://atlas.localhost/sites/anfa` and `http://localhost/sites/atlas` → 404 page (internal path never served directly) → AC-2
- [x] Open `http://localhost` → platform home placeholder ("MonRDV"), status 200 → AC-2 (root passes through)
- [x] Stop the API, open `http://atlas.localhost` → status 503, French text, `Retry-After: 30`; `http://localhost` still answers 200; restart the API → AC-14

## Commands

- [x] `curl -s -H "Host: atlas.localhost" http://localhost:3001/api/tenant` → `{"subdomain":"atlas","name":"Salon Atlas","timezone":"Africa/Casablanca"}`; same with `anfa.localhost` → Clinique Anfa → AC-1
- [x] Insert `('karim', 'Coach Karim')` into `businesses` as `postgres`, then `curl -H "Host: karim.localhost" http://localhost:3001/api/tenant` → 200 on the very next request; delete the row → 404 → AC-1
- [x] `curl -H "Host: ATLAS.localhost:80" …/api/tenant` and `curl -H "Host: atlas.localhost." …/api/tenant` → Salon Atlas → AC-3
- [x] `curl -H "Host: pizzeria.localhost" …/api/tenant` (also `admin.`, `-atlas.`, `www.atlas.`, `www.localhost`, `localhost`, `evil.com`) → 404 `{"statusCode":404,"code":"business_not_found","message":"Cette adresse ne correspond à aucun établissement."}` → AC-2
- [x] `curl -H "Host: localhost:3001" -H "X-Forwarded-Host: anfa.localhost" http://localhost:3001/api/tenant` → Clinique Anfa (forwarded host trusted from loopback); `pnpm --filter api exec vitest run test/untrusted-proxy.e2e-spec.ts` still green (spoofed header ignored) → value sourcing: host
- [x] `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" --resolve www.localhost:80:127.0.0.1 "http://www.localhost/a/b?x=1"` → `301 http://localhost/a/b?x=1` → AC-4
- [x] `curl -H "Host: evil.com" http://127.0.0.1/` → empty reply (connection closed, curl exit 52) → AC-4
- [x] `curl -H "Host: atlas.localhost" http://localhost:3001/api/health` and `-H "Host: evil.com"` → 200 on both (`@AnyHost()`) → AC-6
- [x] As `app_user` (`psql -U app_user -d booking`): `SELECT count(*) FROM businesses` → error `no business set for this request`; in a transaction with `set_config('app.business_id', <atlas id>, true)`: `SELECT subdomain FROM businesses` → only `atlas`; `UPDATE businesses SET name='X' WHERE subdomain='anfa'` → `UPDATE 0`; after `COMMIT` the same connection errors again with no business → AC-10, AC-12
- [x] As `app_user`: `DELETE FROM businesses` → `permission denied`; `SELECT business_by_subdomain('atlas')` → one uuid, `('pizzeria')` → NULL → AC-12
- [x] As `postgres`: `UPDATE businesses SET subdomain='atlas2' WHERE subdomain='atlas'` → `subdomain cannot change`; `INSERT … ('Bad_Name', …)` → CHECK violation; a second `atlas` → UNIQUE violation → AC-5
- [x] Hit `atlas.localhost/api/tenant`, then read the API's "request completed" log line → carries `"business":"atlas"`; the line for `pizzeria.localhost` has no `business` → AC-13
- [x] With the probe module (`createTestApp([ProbeModule])`): Atlas token (`signAccessToken` from `api/test/tokens.ts`) on `atlas.` `/api/probe/protected` → 200; same token on `anfa.` → 401 `unauthenticated`; no cookie, tampered, or wrong key → 401 `unauthenticated`; expired → 401 `token_expired`; protected platform route on root → 401 → AC-7
- [x] Probe routes: `/api/probe/platform` 200 on `localhost`, 404 `not_found` on `atlas.`; `/api/probe/any` 200 on every host → AC-6
- [x] In `TenantDb.forBusiness(atlas)`: count of Anfa rows in `isolation_probe_parent` is 0; insert with Anfa's `business_id` → 42501; update and delete of Anfa rows → 0 rows → AC-8
- [x] In `TenantDb.forBusiness(atlas)`: insert into `isolation_probe_child` with Atlas's `business_id` and Anfa's parent id → 23503 → AC-9
- [x] Single connection pool: `forBusiness(atlas)` then a bare query on the same connection → `no business set for this request` → AC-10
- [x] `pnpm --filter api exec vitest run test/isolation-catalog.e2e-spec.ts` → 12 passed (real schema clean; each broken rule caught, rolled back) → AC-11
- [x] Add `import { PrismaService } from '../prisma/prisma.service.js'` to a file in `api/src/tenant/`, run `pnpm --filter api lint` → `no-restricted-imports` error; remove it → AC-10 (code rule)
- [x] `pnpm turbo run lint typecheck test build` → all green → all

## Acceptance-criteria coverage

- AC-1: Atlas and Anfa pages; `/api/tenant` per host; live inserted business
- AC-2: 404 page for unknown, reserved, malformed, two level hosts; API `business_not_found`; `/sites/...` on any host
- AC-3: case, port, trailing dot
- AC-4: `www` 301 with path; foreign host closed
- AC-5: CHECK, UNIQUE, fixed subdomain trigger (shared rules: `shared/src/subdomain.test.ts`)
- AC-6: health and probe routes by kind
- AC-7: probe protected route with test tokens
- AC-8, AC-9: probe tables inside `forBusiness`
- AC-10: missing business errors; setting does not outlive the transaction; lint guard
- AC-11: catalog test
- AC-12: `app_user` on `businesses` and `business_by_subdomain`
- AC-13: request log line
- AC-14: 503 with the API stopped
