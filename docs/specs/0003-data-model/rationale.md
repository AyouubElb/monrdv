# 0003. Data model: rationale

Decision record for [index.md](index.md). `/develop` does not read this file.

## Context

Every slice after the foundations (signup, first booking, staff and schedules, the slot engine, the dashboard, branding, demo data) reads and writes the same core entities. The data model is the costliest thing to redo, and this is a solo 3 to 4 day build, so it has to be right once and then stay still.

Forces:
- **Three kinds of business, one codebase.** Salon Atlas (several staff, short services), Clinique Anfa (one doctor, consultations), Coach Karim (alone, evening sessions) must fit the same tables, with no behavior keyed on the business type.
- **Morocco changes its legal time.** It moved to permanent UTC+1 in 2018 and back to GMT on 20 September 2026 (decree 2.26.530). A booking made before such a change, for a date after it, must still happen at the hour the customer and owner agreed.
- **Isolation is the headline.** Spec 0002 fixed the tenant table rule (`business_id`, `UNIQUE (business_id, id)`, links that carry the business, `tenant_isolation`), and a catalog test refuses any table that breaks it.
- **Cash first, money must be trustworthy.** Owners mark bookings paid in cash and compare expected with collected. Online payment through CMI (deposits, prepayment) is Deferred but must not need a breaking migration.
- **Group sessions are Deferred** but must also arrive without a breaking migration.
- **No customer logins.** Guests type a name, phone, and email; nobody's identity is proven.
- **Personal data under law 09-08 (CNDP).** Consent must be recorded, and clinics must never store health details.
- **The engineer prefers explicit, simple code**: few tables, few layers, no hidden state. Prisma 7.10 with `@prisma/adapter-pg` on Postgres 18 is fixed by spec 0001.

## Options considered

### Option 1: wall clock times, customer details per booking, payments ledger, additive extension points (chosen)

Appointments and time off stored as the business's clock reading (`timestamp`) plus the business time zone; customer details copied on each booking; one `payments` row per amount received; group sessions and online payment left as later additions.

**Pros**: survives legal time changes with no repair step; one row per booking keeps every slice simple; money history is append only; future features are additions.
**Cons**: two meanings of `Date` in code (wall clock and instant) that must never be mixed; no shared customer record; departs from the usual "always `timestamptz`" rule.

### Option 2: the conventional model (instants everywhere, payment columns on the booking)

Every time is `timestamptz`; a booking carries `paid_amount` and `paid_at`; customer details on the booking.

**Pros**: the most familiar shape; one meaning of `Date`; the fewest tables.
**Cons**: a legal time change after booking moves the booking by the change (fails the scope's rule unless a repair script runs on every time zone update); a deposit plus cash on site needs a breaking change.

### Option 3: the future ready model now (appointments plus attendees, a customers table)

Split every booking into a time block holding the staff member and the people in it; a `customers` table per business keyed by phone; wall clock times and a payments ledger as in Option 1.

**Pros**: group sessions need no later migration; one client file per person and one place to delete for CNDP requests.
**Cons**: every booking writes two rows and every screen joins them, for a Deferred feature; merging customers by a typed phone without a login attaches strangers to each other's history and needs merge rules now.

## Rationale

Option 1 is the only one that meets the scope's time rule without a repair step (the Morocco force), while keeping one row per booking (the simplicity force). Option 2 fails the time rule by construction, and its payment columns would break the day CMI deposits arrive. Option 3 pays the group session and customer identity costs now, for features that are Deferred, and its phone based merge is unsafe without logins. Option 1 reaches both Deferred features through additions only (proven in AC-14), and puts the money and booking rules in Postgres, where a bug in a later slice cannot bypass them.

The installed Postgres skill says "use `timestamptz`, not `timestamp`". That rule targets moments; a future appointment on a civil clock is the known exception, because its meaning is the clock reading, not the instant. Things that happened (`created_at`, `paid_at`, consent) stay `timestamptz`.

### Decisions the engineer made (with the runner up)

| Topic | Chosen | Runner up and why not |
|---|---|---|
| Appointment times | Wall clock `timestamp` + business time zone | Instants: a legal change after booking shifts it |
| Working hours | On staff only; opening hours = union of staff hours | Business plus staff hours: set twice, silent gaps |
| Time off | One `time_off` table, `business_id` always, optional `staff_id` foreign key (empty = whole business) | Two tables: two forms, two slot engine queries |
| Customer details | Copied on each booking | `customers` table: merge rules on an unproven identity |
| Payments | `payments` table, one row per amount | Columns on the booking: a deposit plus cash would break it |
| Price on booking | No copy; "expected" uses the current service price (the customer pays the real price on site) | Copy at booking time: keeps past expected totals fixed, judged unnecessary |
| Group sessions | Change nothing now; add `class_sessions` and `bookings.session_id` later | Appointments plus attendees now: double the work for a Deferred feature |
| Staff or service with bookings | Archive (`archived_at`); delete blocked | Cascade: erases cash history. No archive: listed forever |
| Migration timing | One migration now with every table | One per slice: feature 3 builds nothing, five chances to drift |
| Business type | `salon`, `clinic`, `coach`, `other`; wording only | Three only: a hammam or tutor cannot sign up |
| Notice and window | 60 minutes and 60 days by default, editable at signup and in settings | 2 hours and 30 days: too strict for same day salon bookings |
| Service price | Fixed, required, 0 allowed | Optional ("prix sur place"): breaks expected totals |
| Cash mistakes | Void (`voided_at`), never delete | Delete the row: no trace remains |
| Clean up time | None; slots start at fixed times, the owner lengthens the duration if needed | `busy_until` column: extra detail the engineer did not want |
| Deleting bookings | Never; cancel only. Customers may cancel online up to `cancel_notice_hours` (24 by default, editable), then must call | Allow delete: a booking with cash could vanish |
| Customer cancel link | Stays Deferred; the deadline rule is stored now | Build it with feature 11: a few extra hours now |
| References in the spec | None | Sources only |

### Implementation calls made in this spec (with the runner up)

- **Weekly hours as minutes from midnight** (`smallint`). Prisma returns a Postgres `time` as a `Date` on 1 January 1970, awkward to compute with; integers make slot math plain and give the no overlap rule through `int4range`. Runner up: `time`, as spec 0001 first named.
- **Wall clock carried as a `Date` with UTC fields.** `@prisma/adapter-pg` 7.10.1 reads `timestamp` as text plus `+00:00` and writes UTC fields, so it round trips with no custom mapping. Runner up: strings everywhere, which Prisma cannot map to a `timestamp` column.
- **Database time zone pinned to UTC in the migration.** The same adapter sends `timestamptz` values without an offset, so a non UTC session would shift every instant written by the app. The migration reaches existing databases; the roles init script only runs on a new volume. Runner up: the init script.
- **`NO ACTION` for blocked deletes**, so deleting a whole business still cascades. Runner up: `RESTRICT`, checked immediately, which would make the business cascade fail.
- **Payments append only by trigger.** Revoking `DELETE` alone would still let an `UPDATE` set an amount to anything. Runner up: revoke `UPDATE` and add a void function, one more definer function to own.
- **One `refresh_tokens` table with `family_id`.** Revoking a login family is one `UPDATE`. Runner up: a separate `login_sessions` table.
- **Booking code** `AAA-XXXX`: the subdomain's first 3 letters or digits, then 4 characters without look alike ones (no `0 1 I L O U`), unique per business, retried on a clash. Runner up: a running number per business, which reveals volume and needs a counter.
- **Emails lowercase with a `CHECK`.** Runner up: the `citext` extension, a second extension for one comparison.
- **`kind` has no default.** Signup must choose; existing rows are backfilled through a temporary default in the migration. Runner up: default `other`, which would hide a signup bug.
- **Enums as Postgres enum types through Prisma.** Adding `online` later is one `ALTER TYPE`. Runner up: `text` plus `CHECK`.
- **Branding and settings columns now**, as part of the one migration. Runner up: let feature 12 add them.
- **Staff sorted by `created_at`**, so the owner is first. Runner up: a `position` column the owner reorders.
- **An extra index `(business_id, staff_id, starts_at)` on bookings**, because the guard's index skips cancelled rows and cannot serve the `staff_id` link (the installed Postgres skill: index every foreign key). It also serves a per person agenda.
- **Price and payment amounts capped at 100 000 MAD**, catching a typo before it reaches totals. Runner up: no cap.
- **`recorded_by` optional**, since a future online payment has no person behind it.
- **Feature 3 stays `Alpha`** (verified, no new test suite): the catalog test already covers isolation for every table, and features 9 and 10 own the tests for the guard and money rules.
