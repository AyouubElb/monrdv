# Verify: data model · spec 0003 · updated 2026-11-02

_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Run the SQL steps against the dev database (`docker exec -i monrdv-dev-db-1 psql -U app_user -d booking`) inside `BEGIN; SELECT set_config('app.business_id', business_by_subdomain('atlas')::text, true); … ROLLBACK;` unless a step says otherwise. Run `pnpm --filter api db:seed:dev` first.

## Commands

- [x] `pnpm --filter api exec prisma migrate status` → "Database schema is up to date"; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → empty migration (no drift, exclusion constraints not dropped) → AC-1
- [x] On a fresh database (the test database after `pnpm db:down`, volume removed, `pnpm db:up`): `prisma migrate deploy` applies both migrations → AC-1
- [x] `pnpm --filter api test` → the catalog test passes with no change to its allowlist (`businesses`, `_prisma_migrations` only) → AC-2
- [x] `SHOW timezone` as `app_user` → `UTC` → AC-15
- [x] `pnpm turbo run lint typecheck test build` → all tasks green → AC-16

## Data rules (SQL, rolled back)

- [x] Seed read: for `atlas`, `anfa`, and `karim` in turn, read weekly hours, services, time off, bookings, payments → each sees only its own rows; Atlas has Samira Monday to Friday 540 to 1020, Youssef Tuesday to Saturday 720 to 1200, three services, Samira's August vacation, the whole salon Aïd closure (`staff_id` empty); Anfa one doctor and a 30000 consultation; Karim Monday and Wednesday 1080 to 1260; no column or table specific to a kind → AC-3
- [x] Cross business: while serving Atlas, insert a booking with Anfa's doctor id (read it as `app_migrator`) → `23503` → AC-2
- [x] Several ranges: delete Samira's seeded Monday row first, then insert `540`–`720` and `840`–`1080` (both save), `600`–`900` (refused, `23P01`), `720`–`540`, `0`–`1500`, weekday `8` (refused, `23514`); the same `540`–`720` Monday for Youssef saves → AC-4
- [x] Prices: a service at `12000` saves; `-1`, `10000001`, duration `4`, `485`, `47` → refused → AC-5
- [x] Guard: a booking for Samira overlapping `ATL-M4XP` → `23P01`; `ATL-9HDR` already sits back to back with it (10:45); the same time for Youssef saves; cancel `ATL-M4XP` (`status`, `cancelled_at`, `cancelled_by`) then insert the overlap (saves), set `ATL-M4XP` back to `confirmed` → `23P01` → AC-7
- [x] Guard under concurrency: two `psql` sessions each `BEGIN`, insert the same slot for Samira, commit both → exactly one gets `23P01` → AC-7
- [x] Booking rules: `status = 'cancelled'` with no `cancelled_at`; `cancelled_at` without `cancelled_by`; a phone without `+`; an uppercase email; a name of 1 character; code `ATL-IL0O` (refused letters) and code `AT-7K3Q`; a second `ATL-7K3Q` in Atlas → all refused; `DELETE FROM bookings` → `permission denied` → AC-8
- [x] Money: `DELETE FROM payments` → `permission denied`; `UPDATE payments SET amount_centimes = 1` → `a payment can only be voided, once`; same for `method`, `paid_at`, `booking_id`, `recorded_by`; set `voided_at` (works), set it again → refused; insert an amount of `0` → refused → AC-9
- [x] Archive: delete Samira → `23503`; set her `archived_at` → works; delete a new staff member with hours, time off, and a service link but no booking → all their rows are gone; as `app_migrator`, `DELETE FROM businesses WHERE subdomain = 'karim'` → no Karim row left in any table (then reseed) → AC-10
- [x] Time off: a row with `staff_id` empty saves; one with `ends_at` equal to `starts_at` → refused → AC-11
- [x] Business settings: as `app_migrator`, insert a business without `kind` → refused; a new one with `kind` gets `60`, `60`, `24`; `min_notice_minutes = 10081`, `booking_window_days = 0`, `cancel_notice_hours = 169`, `accent_color = '#FFF'`, `phone = '0612345678'` → each refused; `kind = 'garage'` → refused → AC-12
- [x] Owner accounts: the same email in Atlas and Anfa saves; twice in Atlas → `23505`; `Owner@x.ma` → refused; a second staff row with the same `user_id` → `23505`; the same `token_hash` twice in one business → `23505` → AC-13
- [x] Future additions: as `app_migrator`, in a rolled back transaction, take `md5(string_agg(t::text, ''))` of `bookings` and `payments`, run the group session sketch from the spec and `ALTER TYPE payment_method ADD VALUE 'online'`, take the checksums again → both statements succeed, checksums equal → AC-14

## Wall clock

- [x] With `TZ=Europe/Paris`, a script writes a booking with `startsAt: parseWallClock('2026-09-25T10:00')` through Prisma as `app_user` and reads it back → `formatWallClock` gives `2026-09-25T10:00`, the column holds `2026-09-25 10:00:00` → AC-6
- [x] `wallClockToInstant(parseWallClock('2026-09-01T10:00'), 'Africa/Casablanca')` → `2026-09-01T09:00:00.000Z`; for `2026-09-25T10:00` → `2026-09-25T10:00:00.000Z`; `instantToWallClock` returns both readings; `parseWallClock('2026-02-30T10:00')` throws → AC-6

## Value sourcing (the sources this feature owns)

- [x] Migration defaults: a business created with only `subdomain`, `name`, `kind` reads `60`, `60`, `24` → Value sourcing "defaults 60, 60, 24"
- [x] Kind of existing businesses: on a copy of a database holding businesses from before this migration, after `migrate deploy` they read `kind = 'other'`, and `kind` has no default left (`\d businesses`) → Value sourcing "`kind` of existing businesses"
- [x] Time zone: the round trip above with the business in a zone that has an offset (`UPDATE businesses SET timezone = 'Asia/Tokyo'` for Atlas in a rolled back transaction) still stores `10:00` and converts to `01:00Z` with `wallClockToInstant` → Value sourcing "time zone"
- [x] Booking code shape: `ATL-7K3Q` saves, `ATL-7k3q` (lowercase) and `ATL-7K3` (3 characters) refused → Value sourcing "`code`" (the generator itself is feature 6's)
- [x] Emails and phones: `customer_email` with a capital and `customer_phone` not in E.164 are refused, so only `isMoroccanPhone` output and lowercased input can be stored → Value sourcing "`customer_phone`", "`customer_email`"
- [x] Collected total ignores voided rows: `SELECT sum(amount_centimes) FROM payments WHERE voided_at IS NULL` for Atlas → `12000`, then `0` after voiding in a rolled back transaction → Value sourcing "collected"

The other Value sourcing rows (slot pick, `consented_at`, notice and window, cancel rules, totals display, login family) belong to features 5, 6, 9, and 10, and are verified there.

## Acceptance criteria coverage

- AC-1 migrate status and diff, fresh deploy · AC-2 catalog test, cross business insert · AC-3 seed read · AC-4 several ranges · AC-5 prices · AC-6 wall clock (both steps) · AC-7 guard, concurrency · AC-8 booking rules · AC-9 money · AC-10 archive · AC-11 time off · AC-12 business settings · AC-13 owner accounts · AC-14 future additions · AC-15 `SHOW timezone` · AC-16 turbo run
