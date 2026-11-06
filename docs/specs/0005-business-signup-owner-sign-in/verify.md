# Verify: business signup & owner sign in · spec 0005 · updated 2026-11-06

_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

**How to read this file.** `[x]` means `/develop` already verified the step on the real app on the date shown, so `/check verify` can skip it unless the code it covers changed since. `[ ]` means it still has to run. Milestones 1 to 4 are built and every step has passed. `/check verify` reran milestones 1 and 2 on 2026-11-06 (code they cover changed after 2026-11-03; first run 2026-11-03), with the API steps sent by curl through Nginx against the dev database, and ran every step that was still open.

**Setup used for the checks.** Dev stack through Nginx (`http://localhost`, `http://<subdomain>.localhost`), Chrome driven by `playwright-cli`. API checks ran as supertest specs against the test database (`createTestApp`), then were deleted, so they are verified but **not locked**: see *Still for /test to lock*.

**Test account left in the dev database:** Salon Démo, `salon-demo.localhost`, `samira@demo.ma`, password `Salondemo1!`.

**Route rename:** the dashboard lives at `/dashboard` (the engineer asked for it during the build). The spec text still says `/tableau-de-bord`; read every `/tableau-de-bord` in the ACs as `/dashboard`.

## Milestone 1: thin thread (verified 2026-11-06)

### API (supertest against the test database)

Code covered: `api/src/modules/signup/`, `api/src/modules/auth/`, `api/src/common/`, `shared/src/`

- [x] `POST /api/signup` on host `localhost` with `"  Salon Test "`, `" Samira "`, `" Samira@Example.MA "`, `"06 12 34 56 78"`, settings 120 / 30 / 48 → 201 `{ "subdomain": "salon-test" }`, no `Set-Cookie` → AC-4
- [x] The rows it wrote: business name `Salon Test` (trimmed), kind, phone `+212612345678`, settings 120 / 30 / 48, timezone `Africa/Casablanca`; user email `samira@example.ma`, role `owner`, hash `$argon2id$v=19$m=19456,p=1,t=2$…` that verifies the password; staff row `Samira` with `user_id` = the new user → AC-4
- [x] `GET /api/tenant` on host `salon-test.localhost` right after signup → 200 → AC-5
- [x] Same signup again → 409 `subdomain_taken` "Cette adresse est déjà prise." → AC-6
- [x] Subdomain `admin` → 400 `validation_failed`, nothing written → AC-6
- [x] Password `Salonatlas12` → 400 `validation_failed` → AC-7
- [x] `minNoticeMinutes: 45` (not one of the choices) → 400 `validation_failed` → AC-4 (settings accept only `BOOKING_SETTING_CHOICES`)
- [x] `POST /api/signup` on host `atlas.localhost` → 404 `not_found` → security model (signup is root domain only)
- [x] `POST /api/auth/login` on the business host with `" A@X.MA "` and the right password → 200 `MeResponse`; `at=…; Max-Age=900; Path=/; HttpOnly; SameSite=Lax` and `rt=…; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`, no `Domain` → AC-9
- [x] `GET /api/auth/me` with that `at` cookie → 200, `firstName` = `Samira`, business name and subdomain → AC-9, AC-11
- [x] The same `at` cookie on another business host → 401 `unauthenticated` → AC-10
- [x] Right credentials on another business, wrong password, unknown email → the same 401 `invalid_credentials` "Email ou mot de passe incorrect." each time, no cookie → AC-10
- [x] One refresh row stored after login; `token_hash` is 64 hex characters (SHA 256, raw token never stored) → key invariant
- [x] Unknown route `GET /api/nope` → 404 `{ statusCode, code: "not_found", message: "Page introuvable." }` (global exception filter) → `ApiError` shape

### Browser

Code covered: `web/app/inscription/`, `web/app/sites/[subdomain]/connexion/`, `web/app/sites/[subdomain]/dashboard/`, `web/components/`, `web/lib/`, `web/proxy.ts`, plus the API paths above

- [x] `/inscription` at 1280px: intro column plus form card, step header "Étape 1 sur 2", four type cards with icons, `.localhost` suffix beside the subdomain, phone, the three selects prefilled "1 h", "2 mois", "Jusqu’à 24 h avant" → AC-1
- [x] `/inscription` at 360px: no sideways scroll (`scrollWidth` 360), smallest control 44px, inputs 16px, type cards stacked in one column → AC-19
- [x] Empty "Continuer" → four French errors, focus on the first invalid field (name), no API call → AC-3, AC-19
- [x] After "Continuer", each error clears as its field is fixed; no check on blur (blur checks moved the button under the cursor and lost clicks) → AC-19
- [x] Typing "Café Él Hamra !" fills `cafe-el-hamra`; after typing in the subdomain field, editing the name no longer changes it → AC-2
- [x] "Continuer" with a valid step 1 → focus on the "Votre compte" heading; "Retour" → every value kept, focus on "Votre établissement" → AC-1, AC-19
- [x] Password checklist updates live; each item reads "Fait :" or "À faire :" to screen readers; the eye button switches the field between hidden and visible → AC-1
- [x] Weak password submit → "Le mot de passe ne respecte pas toutes les règles ci-dessous." under the field, focus on the password → AC-7, AC-19
- [x] Valid submit → "Votre espace est prêt" with focus on it, the address `salon-demo.localhost`, "Me connecter" to `http://salon-demo.localhost/connexion?email=…` → AC-4
- [x] `http://salon-demo.localhost/` right after signup shows "Salon Démo" → AC-5
- [x] Signing up again with `salon-demo` → back to step 1, focus on the subdomain, "Cette adresse est déjà prise.", every value kept → AC-6
- [x] "Vos données servent uniquement à gérer votre espace." under the submit button, no checkbox → AC-17
- [x] `/dashboard` signed out → `/connexion` → AC-11
- [x] `/connexion?email=samira%40demo.ma` → email prefilled; title "Connexion · Salon Démo"; `<meta name="robots" content="noindex">`; business mark and name in the business color, "Espace pro" → AC-9, AC-17
- [x] "Mot de passe oublié ? Écrivez-nous à contact@localhost." shown, no link → AC-9
- [x] Wrong password → Alert "Email ou mot de passe incorrect.", focus on the password → AC-10
- [x] Right password → `/dashboard` with "Bonjour Samira", title "Tableau de bord · Salon Démo"; cookies `at` and `rt` scoped to `salon-demo.localhost` only → AC-9, AC-11
- [x] Signed in, opening `/connexion` → `/dashboard` → AC-11
- [x] With the Salon Démo cookies, `http://atlas.localhost/dashboard` → `/connexion` → AC-10
- [x] Dashboard at 360px: no sideways scroll, menu button in the top bar → AC-19

### Milestone 1 steps added after the first run

- [x] "Me connecter" carries the email in lowercase (`Nadia@Verif-UI.MA` typed → `?email=nadia%40verif-ui.ma`) → AC-4
- [x] Double tap on "Créer mon espace" and "Se connecter" sends one request each (one `POST /api/signup`, one `POST /api/auth/login`; button disabled with the spinner while it runs) → AC-19
- [x] Keyboard only through both forms: Tab order, arrow keys and Space on the type cards, Enter submits each step, the eye button by keyboard → AC-19
- [x] Dashboard "Voir ma page" opens `/` in a new tab; the two "Bientôt" items show as not yet available → AC-11

## Milestone 2: session lifecycle (verified 2026-11-06)

### API (throwaway supertest spec against the test database, deleted afterwards)

Code covered: `api/src/modules/auth/`, `api/src/common/auth/`, `api/src/common/guards/auth.guard.ts`

- [x] `POST /api/auth/refresh` with a valid `rt` → 204 with a new `at` and `rt`; the old row has `rotated_at`, the new row has the same `family_id` → AC-13
- [x] The same old `rt` again within 20 seconds → 204, a fresh pair; the family now has 3 rows → AC-13
- [x] The old row's `rotated_at` moved 30 seconds back (instead of a fake clock), the old `rt` again → 401 `unauthenticated`, both cookies cleared (`Expires=Thu, 01 Jan 1970`), every row of the family has `revoked_at`, both newer `rt` values refused, and the newest `at` refused on `/api/auth/me` (blocked `sid`) → AC-13
- [x] Two parallel refreshes with one `rt` → both 204 (one rotates, the other takes the grace) → AC-13
- [x] An Atlas `rt` sent to `anfa.localhost/api/auth/refresh` → 401 `unauthenticated`; the same `rt` still works on `atlas.localhost`; no `rt` at all → 401 → AC-10
- [x] Logout with a valid `at` → 204, both cookies cleared; that `at` on `/api/auth/me` → 401; its `rt` on refresh → 401; logout with no cookie → 401 → AC-14
- [x] Expired rows and rows revoked 2 days ago for Samira (Atlas) and Amina (Anfa); Samira refreshes → only her dead rows are gone, Amina's stay → AC-15

### Browser (`salon-demo.localhost`, account `samira@demo.ma`)

Code covered: `web/proxy.ts`, `web/lib/session-refresh.ts`, `web/lib/api/client.ts`, `web/components/shells/`, `web/app/sites/[subdomain]/dashboard/`, plus the API paths above

- [x] Login at 1280px → `/dashboard` with "Bonjour Samira" and "Se déconnecter" at the bottom of the sidebar → AC-11
- [x] Delete only the `at` cookie, load `/dashboard` → the page renders, the browser gets a new `at`, and `rt` changed (rotated) → AC-12
- [x] Put an already expired `at` (signed with the dev secret, `exp` 60 seconds ago) in the browser, click "Se déconnecter" → network shows logout 401, refresh 204, logout 204; cookies gone; lands on `/connexion` → AC-12, AC-14
- [x] Only a fake `rt=bogus-token`, load `/dashboard` → `/connexion`, and the dead `rt` is cleared → AC-12
- [x] At 360px: the menu Sheet shows "Se déconnecter" under a divider at the bottom, no sideways scroll; clicking it → `/connexion`, cookies gone; the back button stays on `/connexion` → AC-11, AC-14

### Milestone 2 steps added after the first run

- [x] A refresh that fails in `apiFetch` after `token_expired` (expired `at`, `rt=bogus-token`, click "Se déconnecter": logout 401, refresh 401) → the browser goes to `/connexion`, cookies gone → AC-12
- [x] Two calls expiring together send a single refresh (driven at 360px by clicking the sidebar and Sheet "Se déconnecter" in one tick with an expired `at`: logout 401 twice, one refresh 204, both retried) → AC-12

## Milestone 3: abuse guards (verified 2026-11-04)

### API (throwaway supertest spec against the test database, deleted afterwards)

Code covered: `api/src/common/middleware/`, `api/src/common/rate-limit/`, `api/src/app.setup.ts`, `api/src/app.module.ts`, `api/src/modules/signup/`, `api/src/modules/auth/auth.controller.ts`, `api/src/common/tenancy/tenant-db.service.ts`

- [x] `POST atlas.localhost/api/auth/logout` with `Origin: http://anfa.localhost` → 403 `{ statusCode: 403, code: "bad_origin", message: "Requête refusée. Rechargez la page puis réessayez." }` → AC-16
- [x] `POST /api/signup` with no `Origin` → 403, no business row written → AC-16
- [x] `Origin: https://atlas.localhost` with `COOKIE_SECURE=false` → 403; PUT, PATCH, DELETE with no `Origin` → 403, even on a route that does not exist (the check runs before routing) → AC-16
- [x] The right `Origin` passes (logout with no cookie → 401); a GET needs none (`/api/tenant` → 200) → AC-16
- [x] `GET /api/signup/subdomain`: `atlas` → `taken`, `admin` → `reserved`, `a` → `invalid`, `Atlas` → `invalid`, `salon-libre` → `available`; on `atlas.localhost` → 404 → AC-3
- [x] 31st check from one IP within 15 minutes → 429 `too_many_requests`; another IP → 200 → AC-8
- [x] 6th signup from one IP → 429 `{ statusCode: 429, code: "too_many_requests", message: "Trop de tentatives. Réessayez dans quelques minutes." }`, `Retry-After` between 3500 and 3600 seconds, no `Retry-After-ip` header; another IP still served → AC-8
- [x] Two parallel signups of `salon-race` → one 201, one 409, one row → AC-6
- [x] 5 wrong logins for `owner@atlas.test` from 5 IPs, then `"  OWNER@Atlas.test "` from a new IP → 429 (the account key trims and lowercases); the same email on `anfa.localhost` → 401 (its own count) → AC-8
- [x] 6th login from one IP with different emails → 429 → AC-8
- [x] 31st refresh from one IP → 429 with no `Set-Cookie` (the cookies stay) → AC-8

### Through Nginx (curl on the dev stack)

Code covered: same as the API section above

- [x] `http://localhost/api/signup/subdomain`: `salon-demo` → `taken`, `admin` → `reserved`, `a` → `invalid`, `salon-libre` → `available` → AC-3
- [x] `POST http://salon-demo.localhost/api/auth/logout`: sibling `Origin` → 403, no `Origin` → 403, own `Origin` → 401 → AC-16

### Browser (`localhost/inscription`, `salon-demo.localhost`, account `samira@demo.ma`)

Code covered: `web/app/inscription/signup-form.tsx`, `web/lib/api/session.ts`, `web/proxy.ts`, `web/app/sites/[subdomain]/connexion/`, plus the API paths above

- [x] Step 1 with `salon-demo` → "Cette adresse est déjà prise." under the field, `aria-invalid`, focus on the field, step 2 stays closed → AC-3
- [x] `admin` → "Cette adresse est réservée." with no API call → AC-3
- [x] Editing the field clears the error; a free name → one call to `/api/signup/subdomain?value=salon-libre-m3`, step 2 opens with focus on its heading → AC-3, AC-19
- [x] Login passes the Origin check → `/dashboard` "Bonjour Samira" → AC-16
- [x] Delete `at`, load `/dashboard` → renders; the API log shows the proxy refresh with `origin: http://salon-demo.localhost` and `x-forwarded-for` → 204, and `getCurrentOwner`'s `/api/auth/me` now carries `x-forwarded-for` → AC-16, AC-8
- [x] "Se déconnecter" → logout 204 → `/connexion` → AC-16
- [x] Wrong passwords → Alert "Email ou mot de passe incorrect." until the 6th login from the IP (the earlier successful login counted), then Alert "Trop de tentatives. Réessayez dans quelques minutes." → AC-8

### Milestone 3 steps added after the first run (run 2026-11-06)

- [x] The signup form shows the Alert "Trop de tentatives. Réessayez dans quelques minutes." on the step 1 check (31st check from one IP) and on submit (6th signup from one IP); step 2 stays closed on the check → AC-8
- [x] Origin check with `COOKIE_SECURE=true` (second API on port 3002) expects `https://<host>`: `Origin: http://atlas.localhost` → 403 `bad_origin`, `https://atlas.localhost` passes (logout with no cookie → 401); login sets `__Host-at` and `__Host-rt` with `Secure` → AC-16, AC-9

## Milestone 4: finish (verified 2026-11-05; the last four steps 2026-11-06)

Code covered: `api/prisma/dev-seed.sql`, `web/components/shells/booking-shell.tsx`, `web/app/inscription/signup-success.tsx`

- [x] `pnpm --filter api db:seed:dev` runs twice in a row with no error (the business delete cascades through the new users and the staff `user_id` links) → AC-18
- [x] The seed hash is argon2id `m=19456,p=1,t=2` and `argon2.verify` accepts `Dev-Owner-2026!` → AC-18
- [x] `web-design-guidelines` review (code read) of `/inscription`, `/connexion`, `/dashboard`, the shells, and `PasswordInput`: field errors and Alerts use `role="alert"`, the spinner is `role="status"` labelled "Chargement", global `:focus-visible` ring and `prefers-reduced-motion` rule, labels and `autocomplete` on every input, one `h1` per page. One fix: "Voir ma page" on the signup success view now says "(nouvel onglet)" to screen readers → AC-19
- [x] Web typecheck and lint of the changed files pass; API typecheck passes → build
- [x] `samira@atlas.test`, `amina@anfa.test`, `karim@karim.test` each sign in on their own subdomain with `Dev-Owner-2026!` and get 401 `invalid_credentials` on the other two; `/dashboard` greets "Bonjour Samira", "Bonjour Dr Amina Alaoui", "Bonjour Karim" → AC-18
- [x] `http://atlas.localhost/` footer shows "Réservation en ligne par MonRDV · Espace pro", the link goes to `/connexion`; at 360px it wraps cleanly with no sideways scroll → AC-17
- [x] `/dashboard` pages carry `noindex` (checked on all three seed dashboards and the new businesses) → AC-17
- [x] Screen reader and keyboard pass in the browser: double tap sends one request, keyboard only through both forms, each error tied to its field by `aria-describedby` (no real screen reader was run) → AC-19

## Value sourcing checks

- [x] Subdomain suggestion from the name until edited → AC-2 step above
- [x] Address suffix from `NEXT_PUBLIC_ROOT_DOMAIN` (`.localhost`) → AC-1 step above
- [x] Setting choices and defaults from `BOOKING_SETTING_CHOICES` → AC-1 step above
- [x] Password checklist from `PASSWORD_RULES` → AC-1 step above
- [x] Business, user, staff values from the inputs (trimmed, lowercased, E.164) → AC-4 API steps above
- [x] `timezone` from the column default → AC-4 API step above
- [x] Login business from the host, never the body (same body on two hosts gives different answers) → AC-10 steps above
- [x] `sid` = `family_id` of the refresh row → blocking a family's `sid` refused its `at` (milestone 2 reuse and logout steps)
- [x] Dashboard name and first name from `MeResponse` (`staff.name`) → AC-11 step above
- [x] `/connexion` support address from `NEXT_PUBLIC_ROOT_DOMAIN` → AC-9 step above
- [x] Refresh `expires_at` = now + 7 days, renewed on rotation → the row issued by a rotation has `expires_at - created_at` = `7 days`
- [x] Reuse or race decided by now minus `rotated_at` against 20 seconds → milestone 2 API steps (within grace → 204, 30 seconds → 401)
- [x] Rate limit IP from `req.ip` (different `X-Forwarded-For` values counted apart) and account key from host business plus trimmed, lowercased email → milestone 3 API steps
- [x] Origin check scheme from `COOKIE_SECURE` (`false` → `https` refused, `true` → `http` refused) → milestone 3 steps
- [x] Dev seed hash computed once with the spec 0001 parameters → milestone 4 step above
- [x] Dev seed owners sign in only on their own subdomain → milestone 4 step above

## Automated tests already in the repo (`/test` does not need to rewrite these)

- `shared/src/subdomain.test.ts`: `suggestSubdomain` (the three AC-2 samples plus edge cases), `subdomainProblem` → AC-2, AC-3
- `shared/src/rules.test.ts`: shared password samples, which rule each bad sample breaks, setting defaults → AC-7, AC-1
- `shared/src/testing/index.ts`: `passwordSamples`, shared by the web and API parity tests
- `web/lib/validation/signup.test.ts`: Zod password parity with the API, subdomain messages → AC-7, AC-3
- `api/src/common/validation/shared-rules.decorators.spec.ts`: DTO password parity with the web, subdomain format → AC-7, AC-6
- `web/lib/session-refresh.test.ts`: when the proxy refreshes (refresh cookie only → yes; both cookies, no cookie, other paths → no) and reading `Set-Cookie` → AC-12
- After milestone 3: the full API suite (97 tests) and web suite (55 tests) pass.

## Still for /test to lock

The API steps above were checked with throwaway specs, deleted afterwards. These are worth a permanent e2e spec (the scope's test basis: regressions that break isolation):

- Signup happy path: the three rows, the hash parameters, no cookie, tenant 200 on the new host → AC-4, AC-5
- Reserved or malformed subdomain → 400, nothing written; parallel signups → one 201, one 409 → AC-6
- Login cookie flags (`at` 900, `rt` 604800, HttpOnly, Lax, no Domain) → AC-9
- Cross business: credentials, access cookie, and (milestone 2) refresh cookie on another host all refused → AC-10
- Clean as you go across two users and two businesses → AC-15
- Rotation, grace, theft revocation (move `rotated_at` back, as the throwaway spec did), parallel refreshes, and the newer tokens of a revoked family refused → AC-13
- Logout: family revoked, `sid` blocked, cookies cleared → AC-14
- Refresh cookie from another business refused → AC-10
- Origin check: sibling, missing, and wrong scheme `Origin` → 403 `bad_origin`, nothing written; right `Origin` passes; GET needs none → AC-16
- Subdomain check statuses and 404 off the root domain → AC-3
- Rate limits: 6th signup, 31st check, 6th login per account (trim and case insensitive) and per IP, 31st refresh → 429 with plain `Retry-After` and no cookie change → AC-8
- Parallel signups for one subdomain → one 201, one 409 → AC-6

Already locked by milestone 2: `web/lib/session-refresh.test.ts` (when the proxy refreshes, and reading `Set-Cookie`) → AC-12.

## Acceptance criteria coverage

- AC-1 · browser steps, milestone 1 (verified)
- AC-2 · browser step and `subdomain.test.ts` (verified)
- AC-3 · format and availability check verified (API and browser)
- AC-4 · API and browser steps (verified), lowercase link included
- AC-5 · API and browser steps (verified)
- AC-6 · 409 (also the browser race: taken between check and submit), 400, and the parallel race verified
- AC-7 · API, browser, and parity tests (verified)
- AC-8 · every limit verified in the API; login and signup form Alerts verified in the browser
- AC-9 · API and browser steps (verified), `__Host-` names with `COOKIE_SECURE=true` included
- AC-10 · login, access cookie, and refresh cookie verified
- AC-11 · redirects, welcome, "Voir ma page", "Bientôt", and "Se déconnecter" (sidebar and Sheet) verified
- AC-12 · proxy refresh, `apiFetch` refresh and retry, failed retry redirect, single shared refresh, dead `rt` verified
- AC-13 · API steps verified
- AC-14 · API and browser steps verified
- AC-15 · verified on login and on refresh
- AC-16 · verified with `COOKIE_SECURE=false` (API, Nginx, browser flows) and `true` (API)
- AC-17 · data line, "Espace pro" footer link, and `noindex` on `/connexion` and `/dashboard` verified
- AC-18 · seed applied, hash verified, each owner signs in only on their own subdomain
- AC-19 · 360px, focus moves, error ties, keyboard only pass, and double tap verified; guidelines review done (code read)
