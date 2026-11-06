# 0005. Business signup and owner sign in

**Date**: 2026-11-03
**Status**: Accepted

## Summary

An owner creates their business on the root domain in a two step form: the business first (name, type, address, phone, booking rules), then their account (first name, email, password). Their address works right away, and they sign in on their own subdomain with the token pair from spec 0001, which keeps them signed in for days and kicks out a thief who copies a token. Old token rows are cleaned up as the owner signs in and refreshes, inside their own business, so no code ever needs to see every business at once. Password change and password reset are not part of this feature.

## Requirements

**User stories**:
- As a business owner, I want to create my space in two short steps on my phone so that my booking page exists in about two minutes.
- As a business owner, I want a clear message when my chosen address is taken or reserved so that I can pick another before I fill in the rest.
- As a business owner, I want to sign in on my own address and stay signed in for days so that I open my dashboard without typing my password every time.
- As a business owner, I want my session to work only on my business so that no other business can use it.
- As the developer, I want owner accounts in the dev seed so that I can test sign in and isolation by hand.

**Acceptance criteria**:
- **AC-1**: `http://localhost/inscription` (root domain, `PlatformShell`, olive and clay) shows one form in two steps, with a step header "Étape 1 sur 2" / "Étape 2 sur 2". Step 1 "Votre établissement": name (2 to 80 characters), type as four radio cards with icons ("Salon de beauté" `salon`, "Clinique ou cabinet" `clinic`, "Coach" `coach`, "Autre" `other`), subdomain field with the `.<root domain>` suffix shown beside it, a required Moroccan phone, and a "Vos règles de réservation" group with three selects prefilled with "1 h", "2 mois", "Jusqu'à 24 h avant" (choices in *Booking setting choices*). Step 2 "Votre compte": first name ("Votre prénom", 1 to 60 characters), email, password with a show and hide toggle and a live checklist of the password rules. "Retour" on step 2 goes back with every value kept.
- **AC-2**: While the owner has not edited the subdomain field, typing the name fills it with `suggestSubdomain(name)`: "Salon Atlas" gives `salon-atlas`, "Café Él Hamra !" gives `cafe-el-hamra`, "Clinique Dr. Anfa & Co" gives `clinique-dr-anfa-co`. Once the owner types in the subdomain field, it stops following the name.
- **AC-3**: "Continuer" validates the step 1 fields in the browser first; a bad format shows "Utilisez 3 à 30 lettres minuscules, chiffres ou tirets." without calling the API. Then it calls `GET /api/signup/subdomain`: `taken` shows "Cette adresse est déjà prise." and `reserved` shows "Cette adresse est réservée." under the field, and step 2 does not open. `available` opens step 2.
- **AC-4**: Submitting step 2 creates, in one transaction, the business (name trimmed, `kind`, `subdomain`, phone in E.164 form, the three chosen settings), its owner user (email trimmed and lowercased, `role = owner`, argon2id hash with 19456 KiB memory, 2 iterations, parallelism 1) and the owner's staff row (`name` = first name trimmed, `user_id` = the new user). The page then shows "Votre espace est prêt", the address `salon-atlas.localhost`, and a "Me connecter" button to `http://salon-atlas.localhost/connexion?email=<the email, URL encoded>`. The signup response sets no cookie.
- **AC-5**: The new address works with no manual step: right after signup, `http://salon-atlas.localhost/` shows the booking page with "Salon Atlas", and `GET /api/tenant` on that host answers 200.
- **AC-6**: A subdomain taken between the check and the submit (or sent without the check) answers 409 `subdomain_taken`; the form goes back to step 1 with "Cette adresse est déjà prise." on the field and every value kept. A reserved or badly formed subdomain sent straight to the API answers 400 `validation_failed` and writes nothing.
- **AC-7**: A password must be 8 to 128 characters with at least one uppercase letter, one lowercase letter, one digit, and one special character (any character that is not a letter or a digit). The web form and the API use the same shared rule list. `Salonatlas1!` is accepted; `salonatlas1!` (no uppercase), `SALONATLAS1!` (no lowercase), `Salonatlas!!` (no digit), `Salonatlas12` (no special), and `Sa1!` (too short) are refused, by the API with 400 `validation_failed`.
- **AC-8**: Rate limits answer 429 `too_many_requests` with "Trop de tentatives. Réessayez dans quelques minutes." and a `Retry-After` header: the 6th signup from one IP within an hour; the 31st subdomain check from one IP within 15 minutes; the 6th login within 15 minutes for the same business and email, or from the same IP; the 31st refresh from one IP within 15 minutes. The forms show the message in an Alert.
- **AC-9**: `http://atlas.localhost/connexion` shows a card with the business mark and name in the business color, "Espace pro", email (prefilled from `?email=` when it is a valid email, otherwise empty), password with a show and hide toggle, a "Se connecter" button, and the line "Mot de passe oublié ? Écrivez-nous à contact@<root domain>." with no link to a reset page. Correct credentials set `at` (Max-Age 900) and `rt` (Max-Age 604800), both HttpOnly, SameSite=Lax, Path=/, with no `Domain`; with `COOKIE_SECURE=true` they are `__Host-at` and `__Host-rt` and Secure. The browser then goes to `/tableau-de-bord`.
- **AC-10**: The owner signs in only on their own subdomain. Salon Atlas's owner email and correct password on `anfa.localhost` answer 401 `invalid_credentials` "Email ou mot de passe incorrect.", the same answer as a wrong password or an unknown email. An Atlas refresh cookie sent to `anfa.localhost/api/auth/refresh` answers 401 `unauthenticated`.
- **AC-11**: `/tableau-de-bord` with no valid session redirects to `/connexion`. With a session it shows `DashboardShell` with the business name, the heading "Bonjour <first name>", a next steps list ("Ajoutez vos prestations" and "Fixez vos horaires", each marked "Bientôt", and "Voir ma page" linking to `/` in a new tab), and a "Se déconnecter" button in the menu (sidebar and Sheet). A signed in owner who opens `/connexion` is redirected to `/tableau-de-bord`.
- **AC-12**: After the access cookie is gone (15 minutes), loading `/tableau-de-bord` with only the refresh cookie renders the page: the Next.js proxy refreshes first, renders with the new access token, and the response sets the new pair. A browser call to the API that gets 401 `token_expired` calls `POST /api/auth/refresh` once and retries; a second failure sends the owner to `/connexion`.
- **AC-13**: Each refresh marks the presented row `rotated_at = now()` and issues a new refresh token in the same family. The same old token presented again within 20 seconds of its rotation gets a fresh pair in the same family. Presented later than 20 seconds, every row of the family is revoked, its `sid` is blocked, the API answers 401 `unauthenticated`, and the newer token of that family stops working too.
- **AC-14**: "Se déconnecter" calls `POST /api/auth/logout`: every row of the family gets `revoked_at`, the `sid` is blocked for 15 minutes (an access token copied before logout gets 401 on `/api/auth/me`), both cookies are cleared, and the owner lands on `/connexion`.
- **AC-15**: On each successful login and refresh, the API deletes that user's own refresh rows where `expires_at < now()` or `revoked_at < now() - 1 day`, inside the business's transaction. Rows of other users and other businesses are untouched. There is no timer, no cron, and no database function that crosses businesses for this.
- **AC-16**: Every POST, PUT, PATCH, and DELETE under `/api` whose `Origin` header is missing or differs from `<scheme>://<request host>` (scheme `https` when `COOKIE_SECURE=true`, else `http`) answers 403 `bad_origin` and writes nothing. Example: a POST to `atlas.localhost/api/auth/logout` with `Origin: http://anfa.localhost` answers 403.
- **AC-17**: Every business page footer has an "Espace pro" link to `/connexion`. `/connexion` and every `/tableau-de-bord` page carry `noindex`. Under the signup submit button sits the line "Vos données servent uniquement à gérer votre espace." with no checkbox.
- **AC-18**: The dev seed adds one owner per demo business, all with the password `Dev-Owner-2026!`: `samira@atlas.test` (staff row Samira), `amina@anfa.test` (Dr Amina Alaoui), `karim@karim.test` (Karim). Each signs in on their own subdomain and is refused on the other two.
- **AC-19**: Both forms work by keyboard and screen reader: each error is tied to its field through the shadcn `Field` pattern, a failed submit moves focus to the first invalid field, a step change moves focus to the new step heading, and the submit buttons show a spinner and stay disabled while a request runs (a double tap sends one request). At 360px wide there is no sideways scroll, inputs use 16px text, and the type cards and buttons are at least 44px tall.

## Decision

**Chosen option**: Option 1: two step signup on the root domain, a second sign in on the business subdomain, and refresh token rows cleaned as you go inside each owner's business.

Signup runs as a platform route that writes the business, owner, and owner's staff row in one `TenantDb.forNewBusiness` transaction. Sign in, refresh, logout, and `me` are business routes that follow spec 0001's token design, with two changes recorded here: the password rule is the engineer's (8+ with four character types), and the nightly cleanup becomes cleanup as you go. `POST /api/auth/password` moves to the settings feature (scope feature 12).

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.claude/skills/nestjs-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `web-design-guidelines` (`vercel-labs/agent-skills`, `.claude/skills/web-design-guidelines/`) · `prisma-client-api` (`.claude/skills/prisma-client-api/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: no new table, column, or migration. The feature writes tables from spec 0003:

| Table | Written by | Fields this feature sets | Links |
|---|---|---|---|
| `businesses` | signup | `subdomain`, `name`, `kind`, `phone` (required by the API, the column stays nullable), `min_notice_minutes`, `booking_window_days`, `cancel_notice_hours`; `timezone` keeps its default `Africa/Casablanca` | 1 business : N users, N staff, N refresh tokens |
| `users` | signup | `email` (lowercase), `password_hash`, `role = owner` | N : 1 business; 1 : 0..1 staff |
| `staff` | signup | `name`, `user_id` | N : 1 business; 0..1 : 1 user |
| `refresh_tokens` | login, refresh, logout | `family_id`, `token_hash`, `expires_at`, `rotated_at`, `revoked_at`; dead rows of the same user deleted | N : 1 user; N : 1 business |

Existing constraints do the hard checks: subdomain format and uniqueness, name 2 to 80, staff name 1 to 60, email 3 to 254, the three setting ranges, `UNIQUE (business_id, email)`.

**State transitions** (one refresh token row):
`active` (rotated_at and revoked_at empty) → `rotated` (one refresh used it; it stays for theft detection) → `revoked` (logout, or reuse detected on its family) → deleted (clean as you go once expired, or revoked over a day ago). `active` → `revoked` directly on logout. Expiry is not a stored state: `expires_at < now()` means dead.

**API surface** (all under `/api`; errors use the `ApiError` shape `{ statusCode, code, message }` with French messages from `shared/src/messages.ts`):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/signup/subdomain` | GET | `value: string` (query) | `{ status: 'available' \| 'taken' \| 'reserved' \| 'invalid' }` | `@Public`, `@PlatformRoute` | 404 off the root domain, 429 |
| `/signup` | POST | `businessName`, `kind`, `subdomain`, `phone`, `minNoticeMinutes`, `bookingWindowDays`, `cancelNoticeHours`, `firstName`, `email`, `password` (all required) | 201 `{ subdomain }`, no cookie | `@Public`, `@PlatformRoute` | 400 `validation_failed`, 403 `bad_origin`, 409 `subdomain_taken`, 429 |
| `/auth/login` | POST | `email`, `password` | 200 `MeResponse`, sets both cookies | `@Public`, business route | 401 `invalid_credentials`, 403, 404 `business_not_found`, 429 |
| `/auth/refresh` | POST | refresh cookie | 204, sets both cookies | `@Public` (reads only the refresh cookie), business route | 401 `unauthenticated` (clears both cookies), 403, 429 |
| `/auth/logout` | POST | access cookie | 204, clears both cookies | protected | 401 `unauthenticated`, `token_expired`; 403 |
| `/auth/me` | GET | access cookie | `MeResponse` | protected | 401 `unauthenticated`, `token_expired` |

`MeResponse` (in `shared/src/api-types.ts`): `{ user: { id, email, firstName }, business: { subdomain, name } }`.

Validation failures from the global `ValidationPipe` answer 400 `{ statusCode: 400, code: 'validation_failed', message }` (an `exceptionFactory` on the existing pipe). The web form validates with the same shared rules first, so this is a backstop and carries no per field detail.

**Booking setting choices** (`shared/src/rules.ts`, `BOOKING_SETTING_CHOICES`; the signup DTO accepts only these values):

| Setting | Choices (label → value) | Default |
|---|---|---|
| Délai minimum | Aucun → 0, 30 min → 30, 1 h → 60, 2 h → 120, 24 h → 1440 (minutes) | 60 |
| Réservation jusqu'à | 2 semaines → 14, 1 mois → 30, 2 mois → 60, 3 mois → 90 (days) | 60 |
| Annulation en ligne | Jusqu'à 2 h avant → 2, 12 h → 12, 24 h → 24, 48 h → 48 (hours) | 24 |

**Shared rules** (`shared/src/`, used by both the web form and the API DTOs, each with a unit test):
- `suggestSubdomain(name)`: lowercase, strip accents (NFD then drop combining marks), every run of characters outside `a-z0-9` becomes one `-`, trim `-` at both ends, cut to 30 characters, trim `-` again. May return a string that still fails `isValidSubdomain` (too short, reserved); the check reports it.
- `subdomainProblem(label)`: `'invalid'` (pattern or `xn--`), `'reserved'` (in `RESERVED_SUBDOMAINS`), or `null`. `isValidSubdomain` stays as is.
- `PASSWORD_RULES`: a list of `{ id, label, test }`: "8 caractères minimum" (and at most 128), "Une majuscule" (`\p{Lu}`), "Une minuscule" (`\p{Ll}`), "Un chiffre" (`\p{Nd}`), "Un caractère spécial" (`[^\p{L}\p{N}]`). The checklist renders the labels; `isValidPassword` passes when every test passes.
- Length limits as constants: business name 2 to 80, first name 1 to 60, email max 254, password 8 to 128.
- New `messages` entries: subdomain taken, reserved, invalid; invalid credentials; too many requests; bad origin; validation failed; service unavailable for the forms.

**Session mechanics** (spec 0001's design, made concrete):
- Cookie writer in `api/src/auth/`: names from `COOKIE_SECURE` (`accessCookieName` exists; add the refresh name), `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` = `COOKIE_SECURE`, no `domain`. `at` Max-Age 900 s, so the browser drops it when the token expires; `rt` Max-Age 604800 s, renewed on each rotation.
- Login: lowercase the email, find the user inside `forBusiness(host business)`. Unknown email still runs `argon2.verify` against a fixed dummy hash, so both failures take the same time. On success: `SELECT uuidv7()` as the family id, insert the refresh row, delete the user's dead rows, sign the access token (`sub`, `bid`, `role`, `sid` = family id, 15 minute `exp`), set cookies.
- Refresh: hash the cookie (SHA 256), look it up by `(business_id, token_hash)` inside the host's business. Missing, revoked, or expired → 401 and clear cookies. Rotate with a conditional update (`UPDATE ... SET rotated_at = now() WHERE id = $1 AND rotated_at IS NULL`); one row updated → issue the new pair. Zero rows updated means it was already rotated: within 20 s of `rotated_at` → new pair in the same family; later → revoke the family, block its `sid`, log a warning, 401.
- Block list: an in memory `Map<sid, expiresAt>` service (15 minutes per entry, swept on read). `AuthGuard` rejects a token whose `sid` is in it with 401 `unauthenticated`.
- Rate limits: `@nestjs/throttler`, in memory, with named limits (`ip`, `account`) applied on the signup and auth controllers. The `account` tracker keys on host business id plus lowercased body email. The client IP is `req.ip` (Express `trust proxy` from `TRUSTED_PROXY`).
- Origin check: an Express middleware added in `configureApp` (so tests get it), before the routes, for unsafe methods only. It compares `Origin` to `<scheme>://<req.hostname>`.

**Web pages and pieces**:
- `web/app/inscription/page.tsx` (root domain): server page in `PlatformShell` with a client `SignupForm`. One React Hook Form instance with a Zod schema built from the shared rules; `step` is React state (no URL change). "Continuer" runs `trigger()` on the step 1 fields, then the subdomain check. On 201 the same page swaps to the success view (client state only; reloading shows the empty form again).
- `web/app/sites/[subdomain]/connexion/page.tsx`: server page; if `getCurrentOwner()` returns an owner, `redirect('/tableau-de-bord')`. Renders a centered Card (business mark, name, "Espace pro") with a client `LoginForm`, and "Propulsé par MonRDV" under it. The business color comes from the existing business layout.
- `web/app/sites/[subdomain]/tableau-de-bord/layout.tsx`: server layout; `getCurrentOwner()` or `redirect('/connexion')`; mounts `DashboardShell` with the business name. `page.tsx` renders the welcome and next steps list (Card plus list items, "Bientôt" as a neutral Badge).
- `DashboardShell` gains a `footer` slot under the menu (sidebar and Sheet) holding a client `LogoutButton`.
- `BookingShell` footer gains the "Espace pro" link to `/connexion` beside the existing MonRDV line.
- `web/lib/api/session.ts`: `getCurrentOwner()` (React `cache`): `GET /api/auth/me` over `API_INTERNAL_URL`, forwarding the request `Cookie` and `X-Forwarded-Host`; 200 → `MeResponse`, 401 → `null`.
- `web/lib/api/client.ts`: `apiFetch(path, init)` for the browser: same origin, JSON, on 401 `token_expired` posts `/api/auth/refresh` once and retries; parses `ApiError` bodies.
- `web/proxy.ts`: for a found business, when the path is `/tableau-de-bord` (or below) or `/connexion`, and the request has a refresh cookie (`rt` or `__Host-rt`) but no access cookie (`at` or `__Host-at`), it posts `/api/auth/refresh` over `API_INTERNAL_URL` with the visitor's `Cookie`, `X-Forwarded-Host`, `X-Forwarded-For`, and `Origin: <scheme>://<host>`. On 204 it rewrites with the new cookies added to the request headers and copies every `Set-Cookie` onto the response. On 401 it continues without a session (the page then redirects to `/connexion`). Any other answer continues unchanged.
- `metadata.robots = { index: false }` on `/connexion` and the dashboard layout. Titles: "Créer mon espace · MonRDV", "Connexion · <business name>", "Tableau de bord · <business name>".
- New dependencies: API `argon2`, `@nestjs/throttler`; web `react-hook-form`, `@hookform/resolvers`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Signup form | subdomain suggestion | `suggestSubdomain(name input)` until the field is edited |
| Signup form | address preview suffix | `NEXT_PUBLIC_ROOT_DOMAIN` |
| Signup form | setting choices and defaults | `BOOKING_SETTING_CHOICES` (defaults 60, 60, 24 from spec 0003) |
| Signup form | password checklist | `PASSWORD_RULES` against the password input |
| Subdomain check | `status` | `subdomainProblem(value)`, then `business_by_subdomain(value)` (spec 0002 function): a row → `taken` |
| Signup | business id | `TenantDb.forNewBusiness` (`SELECT uuidv7()`) |
| Signup | `businesses.name`, `kind`, `subdomain`, settings | the inputs (name trimmed) |
| Signup | `businesses.phone` | `normalizeMoroccanPhone(phone input)` (E.164) |
| Signup | `businesses.timezone` | column default `Africa/Casablanca` |
| Signup | `users.email` | email input, trimmed and lowercased |
| Signup | `users.password_hash` | argon2id of the password input, parameters from spec 0001 |
| Signup | `staff.name`, `staff.user_id` | first name input trimmed; the new user id |
| Signup success view | address and "Me connecter" link | response `subdomain` + `NEXT_PUBLIC_ROOT_DOMAIN` (`http` for `localhost`, else `https`) + `/connexion?email=` + the email input |
| Login | business | the request host (`@CurrentBusiness`, spec 0002), never the body |
| Login | `family_id` / `sid` | `SELECT uuidv7()` in the login transaction (spec 0003) |
| Login, refresh | refresh token | 32 random bytes from `node:crypto`, base64url; stored as its SHA 256 hex |
| Login, refresh | `expires_at` | now + 7 days |
| Login, refresh | access token claims | `sub` = user id, `bid` = host business id, `role` = `users.role`, `sid` = family id, `exp` = now + 15 min; signed with `JWT_ACCESS_SECRET` |
| Refresh | reuse or race | now minus `rotated_at`, compared with 20 seconds |
| Clean as you go | rows to delete | same `user_id`, `expires_at < now()` or `revoked_at < now() - interval '1 day'` |
| Rate limits | client IP | `req.ip` (Nginx restores the real IP, spec 0001; the Next.js proxy forwards `X-Forwarded-For`) |
| Rate limits | account key | host business id + lowercased `email` from the body |
| Origin check | expected origin | `https` when `COOKIE_SECURE=true`, else `http`, + `://` + `req.hostname` |
| `/connexion` | business mark, name, color | `getCurrentBusiness()` (`GET /api/tenant`) and the business layout |
| `/connexion` | email prefill | `?email=` query, used only when it passes the email check |
| `/connexion` | support address | `contact@` + `NEXT_PUBLIC_ROOT_DOMAIN` |
| Dashboard | business name | `MeResponse.business.name` |
| Dashboard | "Bonjour <first name>" | `MeResponse.user.firstName` = `staff.name` where `staff.user_id` = token `sub` |
| Dashboard | "Voir ma page" target | `/` on the same host |
| Dev seed | owner emails, password, staff links | fixed values in AC-18; hash computed once with the spec 0001 parameters and written into `dev-seed.sql` |

**Key invariants**:
- The business for login, refresh, logout, and `me` comes only from the host. A refresh row is looked up inside the host's business, so a cookie from another subdomain matches nothing.
- Signup writes business, user, and staff in one transaction or not at all.
- Raw refresh tokens and passwords are never stored or logged; only SHA 256 and argon2id outputs are stored. Response DTOs select explicit fields, so `password_hash` and `token_hash` never leave the API.
- Exactly one request rotates a given refresh row (conditional update); a second one takes the race or theft path.
- No code path for this feature reads refresh tokens across businesses.
- Server to server calls from Next.js forward the visitor's IP and send the business origin, so rate limits and the Origin check see the visitor, not the web container.
- Login errors never reveal whether an email exists in a business.

**Security model**:
- Signup and the subdomain check are public, root domain only, and rate limited. Login is public on a business subdomain and rate limited per IP and per business and email. Refresh needs a valid refresh cookie for that host. Logout and `me` need a valid access token whose `bid` matches the host (spec 0002 `AuthGuard`) and whose `sid` is not blocked.
- Only one role exists: `owner`. Everything an owner can reach is scoped to their business by row level security (spec 0002).
- Forged requests: SameSite=Lax cookies plus the Origin check on every unsafe method, since sibling subdomains count as the same site.
- Personal data (law 09-08, CNDP): owner first name, email, and phone. Stored only for running the space, said so on the form; no checkbox and no terms page yet. Logs carry user and business ids, never emails, passwords, or tokens (the logger already redacts cookies and `Set-Cookie`).
- Audit trail: login success and failure, logout, and theft detection are logged as structured events (`auth.login.succeeded`, `auth.login.failed`, `auth.logout`, `auth.refresh.reuse_detected` at warning level) with business and user ids. Signup logs `signup.created` with the subdomain.

**Configuration required**: no new variables. The feature reads `JWT_ACCESS_SECRET`, `COOKIE_SECURE`, `ROOT_DOMAIN`, `TRUSTED_PROXY` (API) and `API_INTERNAL_URL`, `NEXT_PUBLIC_ROOT_DOMAIN` (web), all already validated.

**Critical test scenarios**:
- Happy path: sign up "Salon Test" on the root domain → three rows exist with the right values and the hash verifies → `salon-test.` host answers `GET /api/tenant` 200 → login there sets both cookies with the right flags → `me` returns the first name, verifies **AC-4**, **AC-5**, **AC-9**.
- Subdomain: check returns `taken` for `atlas`, `reserved` for `admin`, `invalid` for `a`; two parallel signups for the same subdomain give one 201 and one 409, verifies **AC-3**, **AC-6**.
- Password rules: the AC-7 samples run against the shared rule, the Zod schema, and the API DTO, verifies **AC-7**.
- Isolation: Atlas credentials on `anfa.` → 401 `invalid_credentials`; Atlas refresh cookie on `anfa.` → 401; Atlas access cookie on `anfa.` `me` → 401, verifies **AC-10**.
- Rotation: refresh twice in a row works; replay the first token within 20 s → new pair; replay after 20 s (fake clock) → 401 and the newest token is refused too, verifies **AC-13**.
- Logout: logout, then the old access token on `me` → 401; the old refresh token → 401, verifies **AC-14**.
- Clean as you go: seed expired and old revoked rows for two users in two businesses, log in as one → only that user's dead rows are gone, verifies **AC-15**.
- Abuse: 6 signups from one IP → the 6th is 429 with `Retry-After`; 6 logins for one email → 429; POST with a wrong or missing `Origin` → 403 and no row written, verifies **AC-8**, **AC-16**.
- Web: `suggestSubdomain` samples from AC-2; proxy refresh decision (refresh cookie only → refresh; both cookies → no call; 401 → continue), verifies **AC-2**, **AC-12**.
- Browser: dashboard redirect when signed out, signed in redirect away from `/connexion`, keyboard pass on both forms at 360px, verifies **AC-11**, **AC-19**.

## Build plan

Tracer Bullet: first one thin real thread from the signup form to the dashboard, then thicken the session, then the abuse guards, then the finish.

1. **Thin thread: sign up, sign in, see the dashboard.**
   1. [x] Shared: `suggestSubdomain`, `subdomainProblem`, `PASSWORD_RULES` and `isValidPassword`, length limits, `BOOKING_SETTING_CHOICES`, new messages, `MeResponse`; unit tests for each, satisfies **AC-2**, **AC-7**
   2. [x] Install `argon2` (API) and `react-hook-form`, `@hookform/resolvers` (web), satisfies **AC-1**, **AC-4**
   3. [x] `POST /api/signup` with its DTO, the `validation_failed` exception factory, `forNewBusiness` writes, `P2002` → 409, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**
   4. [x] Cookie writer, `POST /api/auth/login` (dummy hash for unknown email, new family, refresh row), `GET /api/auth/me` with the staff first name, satisfies **AC-9**, **AC-10**
   5. [x] Web `/inscription`: two step `SignupForm` (type cards, settings selects, password checklist, show and hide), success view with the "Me connecter" link, satisfies **AC-1**, **AC-2**, **AC-4**
   6. [x] Web `/connexion` card with `LoginForm` and email prefill; `getCurrentOwner()`; dashboard layout with the redirect and the welcome page in `DashboardShell`, satisfies **AC-9**, **AC-11**
2. **Session lifecycle.**
   1. [x] `POST /api/auth/refresh` with conditional rotation, the 20 second grace, and theft revocation; clean as you go on login and refresh, satisfies **AC-13**, **AC-15**
   2. [x] `sid` block list and its check in `AuthGuard`; `POST /api/auth/logout`; `DashboardShell` footer slot with `LogoutButton`, satisfies **AC-14**
   3. [x] Proxy refresh for dashboard and `/connexion` paths; `apiFetch` with refresh once and retry; signed in redirect on `/connexion`, satisfies **AC-11**, **AC-12**
3. **Abuse guards.**
   1. [x] Origin check middleware in `configureApp`; the proxy and `getCurrentOwner` send `Origin` and `X-Forwarded-For` where needed, satisfies **AC-16**
   2. [x] `@nestjs/throttler` with the `ip` and `account` limits on signup, check, login, refresh; 429 body and `Retry-After`; the form Alerts, satisfies **AC-8**
   3. [x] `GET /api/signup/subdomain` and the step 1 early check; 409 on submit returns to step 1, satisfies **AC-3**, **AC-6**
4. **Finish.**
   1. [x] Dev seed owners with a precomputed hash, linked to their staff rows, satisfies **AC-18**
   2. [x] "Espace pro" footer link, `noindex` and titles, the data line on signup, the forgotten password line, satisfies **AC-9**, **AC-17**
   3. [x] Accessibility pass: focus on errors and step change, spinners and double submit guard, 360px check, `web-design-guidelines` review of the new pages, satisfies **AC-19**

## Consequences

**Positive**:
- The isolation story stays clean: every auth query runs inside one business, and the feature adds no function that bypasses row level security.
- A copied refresh token is detected and the whole login is cut, which a single row per login design cannot do.
- Owners fix a taken address on step 1, before they type their account details.
- Shared rules keep the web form and the API in step, so a password or subdomain accepted in the browser is accepted by the API.

**Negative / tradeoffs**:
- Signing in a second time right after signup adds one step, the price of creating no session on the root domain.
- Refresh token rows of an owner who never comes back stay forever (a few hundred dead rows at most per device). Harmless now; a sweep would need the cross business function this spec avoids.
- The password rule (8+ with four types) is weaker against guessing than spec 0001's 12+ rule and pushes people toward patterns like `Password1!`. Accepted by the engineer.
- Rate limits and the block list live in memory: a restart empties them, and a second API instance needs Redis first (spec 0001).
- The availability check lets anyone test whether a subdomain exists. Those names are public addresses, and the check is rate limited.
- Preset only settings at signup: a custom value (say 45 minutes notice) waits for the settings page.

**Neutral**:
- Two new API dependencies (`argon2` builds a native module; the Docker image needs build tools or a prebuilt binary for `arm64`) and two web dependencies.
- The global `ValidationPipe` now answers in the `ApiError` shape; existing endpoints have no body validation yet, so nothing else changes.
- Spec 0001's "Nightly job deletes expired and revoked refresh tokens" and its password length line are replaced by this spec.

## Follow-up

- [ ] `/scope`: feature 12 (business branding and settings) gains `POST /api/auth/password` with its form (rules from spec 0001: current password, revoke and block every family of the user, fresh pair for this device), and the option of custom booking setting values.
- [ ] `/sync`: spec 0001's Auth design is stale on two lines (password rule, nightly job), and the matching follow-ups in spec 0002 (nightly cleanup through a `SECURITY DEFINER` function) and spec 0003 (same) no longer apply; this spec replaces them.
- [ ] Feature 6 (first booking loop): turn "Ajoutez vos prestations" and "Fixez vos horaires" into links, set their `ready` flags in `web/lib/dashboard-nav.ts`, and start the Playwright smoke test from this signup.
- [ ] Feature 7 (live deployment): make sure `contact@<your domain>` receives mail, and that the `arm64` image builds `argon2`.
- [ ] Deferred "Password reset by email": replace the forgotten password line once an email provider is chosen.
- [ ] The project has no root `AGENTS.md`. The `nestjs-best-practices`, `shadcn`, `vercel-react-best-practices`, and `web-design-guidelines` conventions are not captured in one; an auth area file (`api/src/auth/AGENTS.md`) would be the right home for the session rules above.
