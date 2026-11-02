# 0003. Data model

**Date**: 2026-11-02
**Status**: In Progress

## Summary

This spec fixes every table the slices build on: owner accounts and their login tokens, staff, services, who does which service, weekly hours, time off, bookings, and cash payments. Appointment times are stored as the business's own wall clock reading ("25 September, 10:00, Casablanca"), so a future legal time change never moves a booking. The database itself refuses double bookings, overlapping hours, deleted bookings, and erased cash records, and every table follows the tenant rule from spec 0002. Group sessions and online payment are left as later additions that change no existing row.

## Requirements

**User stories**:
- As the developer, I want one data model that fits a salon, a clinic, and a coach, so that every slice builds on the same tables with no code per business type.
- As a business owner, I want a booking to stay at the hour agreed with the customer even if Morocco changes its legal time, so that nobody arrives at the wrong hour.
- As a business owner, I want cash records that can never vanish or change silently, so that my daily totals can be trusted.
- As the developer, I want group sessions and online payment to be pure additions later, so that this migration never has to be rewritten.

**Acceptance criteria**:
- **AC-1**: One migration (`<timestamp>_data_model`) applies with `prisma migrate deploy` on a fresh database and on the existing dev database holding Salon Atlas and Clinique Anfa. It creates `users`, `refresh_tokens`, `staff`, `services`, `staff_services`, `weekly_hours`, `time_off`, `bookings`, `payments`, and the new `businesses` columns. Running `prisma migrate dev` afterwards finds no change to make.
- **AC-2**: The existing catalog test (`api/test/isolation-catalog.e2e-spec.ts`) passes unchanged with the nine new tables: each has `business_id`, row level security, the `tenant_isolation` policy, `UNIQUE (business_id, id)`, and links that carry `business_id`. Its allowlist still holds only `businesses` and `_prisma_migrations`. While serving Atlas, a booking pointing at an Anfa staff member is refused (`23503`).
- **AC-3**: One model fits all three types. The dev seed creates Salon Atlas (`salon`: Samira weekdays 9:00 to 17:00, Youssef Tuesday to Saturday 12:00 to 20:00, three services, Samira on vacation 10 to 15 August, the whole salon closed for Aïd), Clinique Anfa (`clinic`: one doctor, a 300 MAD consultation), and Coach Karim (`coach`, subdomain `karim`: one staff member, Monday and Wednesday 18:00 to 21:00), using the same tables and no column or table specific to a type.
- **AC-4**: Weekly hours allow several ranges a day. Samira's Monday 9:00 to 12:00 and 14:00 to 18:00 (`540` to `720`, `840` to `1080`) both save. An overlapping range for the same person and day (`600` to `900`) is refused, as are an end before its start, an end after `1440`, and a weekday outside 1 to 7. The same range for two different staff members saves.
- **AC-5**: Prices are whole centimes in MAD: a 120 MAD service saves as `12000`. A negative price, a price above 100 000 MAD, and a duration under 5, over 480, or not a multiple of 5 minutes are refused.
- **AC-6**: Booking and time off times are wall clock times. A booking saved with `starts_at` `2026-09-25T10:00` reads back through Prisma as `2026-09-25T10:00` (via `formatWallClock`), also when the API process runs with `TZ=Europe/Paris`. `wallClockToInstant(parseWallClock('2026-09-01T10:00'), 'Africa/Casablanca')` returns `2026-09-01T09:00:00Z` (UTC+1 before the change), the same for `2026-09-25T10:00` returns `2026-09-25T10:00:00Z`, and `instantToWallClock` reverses both.
- **AC-7**: Double booking guard. For one staff member, a booking overlapping another booking that is not cancelled is refused (`23P01`), including when two transactions insert at the same moment (exactly one succeeds). Back to back bookings (10:00 to 10:45, then 10:45 to 11:30) both save; the same time with another staff member saves; once the first booking is `cancelled`, an overlapping one saves; turning that cancelled booking back to `confirmed` is then refused.
- **AC-8**: Booking consistency. `status` is `cancelled` exactly when `cancelled_at` and `cancelled_by` are both set. `consented_at`, a name of 2 to 80 characters, an E.164 phone, and a lowercase email are required. `code` matches `AAA-XXXX` and is unique within the business. `app_user` cannot delete a booking (`permission denied`).
- **AC-9**: Money is never erased. `app_user` cannot delete a payment. Changing a payment's amount, method, booking, `paid_at`, or `recorded_by` is refused. Setting `voided_at` works once; any later change is refused. An amount of 0 or less is refused.
- **AC-10**: Archive, never delete. Deleting a staff member or service that a booking references is refused (`23503`), while setting `archived_at` works. Deleting a staff member with no bookings also removes their weekly hours, time off, and service links. Deleting a whole business as `app_migrator` removes its rows from every table in one statement.
- **AC-11**: Time off. A row with no staff member (whole business closed) saves; an end at or before its start is refused.
- **AC-12**: Business settings. A new business gets `min_notice_minutes` 60, `booking_window_days` 60, `cancel_notice_hours` 24. Values outside 0 to 10 080, 1 to 365, and 0 to 168 are refused. `kind` is required and one of `salon`, `clinic`, `coach`, `other`. The optional branding values must match their formats (`#rrggbb`, E.164 phone, length limits).
- **AC-13**: Owner accounts. The same email can exist in two businesses but not twice in one; an email with capital letters is refused (the API lowercases first). A user links to at most one staff row. `refresh_tokens.token_hash` is unique within a business.
- **AC-14**: Future additions break nothing. On the seeded dev database, inside a transaction that is rolled back, the group session sketch (create `class_sessions`, add `bookings.session_id`, recreate `bookings_no_overlap` with `AND session_id IS NULL`) and `ALTER TYPE payment_method ADD VALUE 'online'` succeed without changing any existing row.
- **AC-15**: Every database session uses UTC (`SHOW timezone` as `app_user` returns `UTC`), so an instant the app writes into a `timestamptz` column is stored unchanged.
- **AC-16**: `pnpm turbo run lint typecheck test build` passes, with the Prisma client regenerated and the existing tests untouched except the `createBusiness` helper.

## Decision

**Chosen option**: Option 1: one relational model with wall clock appointment times, customer details on each booking, a payments ledger, and additive extension points.

Nine new business owned tables under spec 0002's tenant rule, appointment times stored on the business's clock, every hard business rule (no double booking, no overlapping hours, no erased money) enforced by Postgres, and group sessions and online payment reachable by additions only.

**Implementation skills**: `prisma-client-api`, `prisma-cli` (`prisma/skills`, `.claude/skills/prisma-*/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`)

## Rationale

Reasoning, options, and every sub decision with its runner up: see [rationale.md](rationale.md).

## Feature design

### Two kinds of time

| Kind | Meaning | Postgres type | In code |
|---|---|---|---|
| **Wall clock** | What the business's clock shows: "25 September 2026, 10:00" in `businesses.timezone` | `timestamp(0)` (no time zone) | A `Date` whose **UTC fields** hold the clock reading (`2026-09-25T10:00:00Z` means 10:00 on the business's clock) |
| **Instant** | A moment that happened, the same everywhere | `timestamptz` | A normal `Date` |

- Wall clock: `bookings.starts_at`, `bookings.ends_at`, `time_off.starts_at`, `time_off.ends_at`. Whole minutes only.
- Instant: every `created_at`, `consented_at`, `cancelled_at`, `paid_at`, `voided_at`, `archived_at`, `expires_at`, `rotated_at`, `revoked_at`.
- Weekly hours have no date: `weekday` (1 = Monday … 7 = Sunday) plus `start_minute` and `end_minute` (minutes from midnight: `540` = 9:00, `1440` = midnight at the end of the day).
- `@prisma/adapter-pg` 7.10.1 reads a `timestamp` column as its text plus `+00:00` and writes a `Date`'s UTC fields, so the convention round trips whatever the process time zone (checked in the adapter source).
- Never compare a wall clock `Date` with `new Date()` or an instant. Convert first with the helpers below. While `Africa/Casablanca` sits at UTC+0, mixing the two gives the right answer by accident, so the mistake stays invisible until an offset appears.

**Helpers** (`shared/src/wall-clock.ts`, exported from `shared/src/index.ts`, using `@date-fns/tz` as chosen in spec 0001):

```ts
/** 'YYYY-MM-DDTHH:mm' → wall clock Date. Throws on any other shape. */
export function parseWallClock(text: string): Date;
/** Wall clock Date → 'YYYY-MM-DDTHH:mm'. */
export function formatWallClock(wall: Date): string;
/** The real moment a wall clock reading happens in a time zone (new TZDate(y, m, d, h, min, timeZone)). */
export function wallClockToInstant(wall: Date, timeZone: string): Date;
/** What a time zone's clock shows at an instant (read TZDate fields into Date.UTC(...)). */
export function instantToWallClock(instant: Date, timeZone: string): Date;
```

### Data model sketch

**Tables at a glance**

| Table | One row is | Key links |
|---|---|---|
| `businesses` (exists, gains columns) | a salon, clinic, or coach | none |
| `users` | an owner account | business |
| `refresh_tokens` | one refresh token of a login family | user |
| `staff` | a person customers can book | user (optional, the owner only) |
| `services` | something a customer books ("Coupe femme, 45 min, 120 MAD") | none |
| `staff_services` | "this person does this service" | staff, service |
| `weekly_hours` | one working range of one person on one weekday | staff |
| `time_off` | a vacation, a one off block, or a closure of the whole business | staff (optional: empty means the whole business) |
| `bookings` | one customer, one staff member, one service, one time | staff, service |
| `payments` | one amount received for a booking | booking, user (optional) |

**Relationships and delete rules**

| From | To | Cardinality | When the parent row is deleted |
|---|---|---|---|
| `businesses` | every other table | 1 to N | `CASCADE` (spec 0002) |
| `users` | `refresh_tokens` | 1 to N | `CASCADE` |
| `users` | `staff.user_id` | 1 to 0..1 | `NO ACTION` (blocked) |
| `staff` ↔ `services` | through `staff_services` | N to M | `CASCADE` from either side |
| `staff` | `weekly_hours`, `time_off` | 1 to N | `CASCADE` |
| `staff`, `services` | `bookings` | 1 to N | `NO ACTION` (blocked; archive instead) |
| `bookings` | `payments` | 1 to N | `NO ACTION` (blocked) |
| `users` | `payments.recorded_by` | 1 to N | `NO ACTION` (blocked) |

Blocked links use `NO ACTION`, not `RESTRICT`: Postgres checks `NO ACTION` at the end of the statement, so deleting a whole business still cascades through every table, while deleting a referenced staff member alone fails. Prisma's default for a required relation is `Restrict`, so every blocked relation states `onDelete: NoAction`.

**Prisma models** (the exact target; validated with `prisma validate` on Prisma 7.10.1). Everything in `api/prisma/schema.prisma` stays, with `Business` extended:

```prisma
enum BusinessKind {
  salon
  clinic
  coach
  other

  @@map("business_kind")
}

enum UserRole {
  owner

  @@map("user_role")
}

enum BookingStatus {
  confirmed
  done
  no_show
  cancelled

  @@map("booking_status")
}

enum CancelledBy {
  customer
  business

  @@map("cancelled_by")
}

enum PaymentMethod {
  cash

  @@map("payment_method")
}

/// One salon, clinic, or coach. Row level security shows only the current business (`business_self`).
model Business {
  id                String       @id @default(dbgenerated("uuidv7()")) @db.Uuid
  /// Fixed at signup: a trigger refuses any change.
  subdomain         String       @unique
  name              String
  timezone          String       @default("Africa/Casablanca")
  /// Wording only ("votre coiffeur", "votre praticien"); never changes behavior.
  kind              BusinessKind
  minNoticeMinutes  Int          @default(60) @map("min_notice_minutes")
  bookingWindowDays Int          @default(60) @map("booking_window_days")
  /// Customers may cancel online until this many hours before the booking.
  cancelNoticeHours Int          @default(24) @map("cancel_notice_hours")
  /// E.164; the number shown when it is too late to cancel online.
  phone             String?
  address           String?
  description       String?
  accentColor       String?      @map("accent_color")
  /// Object key in the public storage bucket.
  logoKey           String?      @map("logo_key")
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz

  users         User[]
  refreshTokens RefreshToken[]
  staff         Staff[]
  services      Service[]
  staffServices StaffService[]
  weeklyHours   WeeklyHours[]
  timeOff       TimeOff[]
  bookings      Booking[]
  payments      Payment[]

  @@map("businesses")
}

model User {
  id           String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId   String   @map("business_id") @db.Uuid
  /// Lowercase; the API lowercases before saving.
  email        String
  passwordHash String   @map("password_hash")
  role         UserRole @default(owner)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  business      Business       @relation(fields: [businessId], references: [id], onDelete: Cascade)
  refreshTokens RefreshToken[]
  staff         Staff?
  payments      Payment[]

  @@unique([businessId, id])
  @@unique([businessId, email])
  @@map("users")
}

model RefreshToken {
  id         String    @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId String    @map("business_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  /// The login family; the `sid` claim of the access token.
  familyId   String    @map("family_id") @db.Uuid
  /// SHA 256 of the token; the token itself is never stored.
  tokenHash  String    @map("token_hash")
  expiresAt  DateTime  @map("expires_at") @db.Timestamptz
  rotatedAt  DateTime? @map("rotated_at") @db.Timestamptz
  revokedAt  DateTime? @map("revoked_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [businessId, userId], references: [businessId, id], onDelete: Cascade)

  @@unique([businessId, id])
  @@unique([businessId, tokenHash])
  @@index([businessId, userId])
  @@index([businessId, familyId])
  @@map("refresh_tokens")
}

model Staff {
  id         String    @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId String    @map("business_id") @db.Uuid
  /// Set only for the owner's own staff row.
  userId     String?   @map("user_id") @db.Uuid
  name       String
  archivedAt DateTime? @map("archived_at") @db.Timestamptz
  /// Lists sort by it, so the owner comes first.
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  business      Business       @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user          User?          @relation(fields: [businessId, userId], references: [businessId, id], onDelete: NoAction)
  staffServices StaffService[]
  weeklyHours   WeeklyHours[]
  timeOff       TimeOff[]
  bookings      Booking[]

  @@unique([businessId, id])
  @@unique([businessId, userId])
  @@map("staff")
}

model Service {
  id              String    @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId      String    @map("business_id") @db.Uuid
  name            String
  durationMinutes Int       @map("duration_minutes")
  /// 120 MAD = 12000.
  priceCentimes   Int       @map("price_centimes")
  archivedAt      DateTime? @map("archived_at") @db.Timestamptz
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz

  business      Business       @relation(fields: [businessId], references: [id], onDelete: Cascade)
  staffServices StaffService[]
  bookings      Booking[]

  @@unique([businessId, id])
  @@map("services")
}

model StaffService {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId String @map("business_id") @db.Uuid
  staffId    String @map("staff_id") @db.Uuid
  serviceId  String @map("service_id") @db.Uuid

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  staff    Staff    @relation(fields: [businessId, staffId], references: [businessId, id], onDelete: Cascade)
  service  Service  @relation(fields: [businessId, serviceId], references: [businessId, id], onDelete: Cascade)

  @@unique([businessId, id])
  @@unique([businessId, staffId, serviceId])
  @@index([businessId, serviceId])
  @@map("staff_services")
}

model WeeklyHours {
  id          String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId  String @map("business_id") @db.Uuid
  staffId     String @map("staff_id") @db.Uuid
  /// 1 = Monday … 7 = Sunday.
  weekday     Int    @db.SmallInt
  /// Minutes from midnight: 540 = 9:00.
  startMinute Int    @map("start_minute") @db.SmallInt
  endMinute   Int    @map("end_minute") @db.SmallInt

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  staff    Staff    @relation(fields: [businessId, staffId], references: [businessId, id], onDelete: Cascade)

  @@unique([businessId, id])
  @@map("weekly_hours")
}

model TimeOff {
  id         String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId String   @map("business_id") @db.Uuid
  /// Empty: the whole business is closed.
  staffId    String?  @map("staff_id") @db.Uuid
  /// Wall clock (see "Two kinds of time").
  startsAt   DateTime @map("starts_at") @db.Timestamp(0)
  endsAt     DateTime @map("ends_at") @db.Timestamp(0)
  label      String?
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  staff    Staff?   @relation(fields: [businessId, staffId], references: [businessId, id], onDelete: Cascade)

  @@unique([businessId, id])
  @@index([businessId, startsAt])
  @@index([businessId, staffId])
  @@map("time_off")
}

model Booking {
  id            String        @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId    String        @map("business_id") @db.Uuid
  /// Shown to humans, like ATL-7K3Q. Not a secret.
  code          String
  staffId       String        @map("staff_id") @db.Uuid
  serviceId     String        @map("service_id") @db.Uuid
  /// Wall clock (see "Two kinds of time"). ends_at = starts_at + the service duration at booking time.
  startsAt      DateTime      @map("starts_at") @db.Timestamp(0)
  endsAt        DateTime      @map("ends_at") @db.Timestamp(0)
  status        BookingStatus @default(confirmed)
  customerName  String        @map("customer_name")
  /// E.164, from isMoroccanPhone.
  customerPhone String        @map("customer_phone")
  customerEmail String        @map("customer_email")
  /// When the consent box was ticked (CNDP).
  consentedAt   DateTime      @map("consented_at") @db.Timestamptz
  cancelledAt   DateTime?     @map("cancelled_at") @db.Timestamptz
  cancelledBy   CancelledBy?  @map("cancelled_by")
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz

  business Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  staff    Staff     @relation(fields: [businessId, staffId], references: [businessId, id], onDelete: NoAction)
  service  Service   @relation(fields: [businessId, serviceId], references: [businessId, id], onDelete: NoAction)
  payments Payment[]

  @@unique([businessId, id])
  @@unique([businessId, code])
  @@index([businessId, startsAt])
  @@index([businessId, staffId, startsAt])
  @@index([businessId, serviceId])
  @@index([businessId, customerPhone])
  @@map("bookings")
}

model Payment {
  id             String        @id @default(dbgenerated("uuidv7()")) @db.Uuid
  businessId     String        @map("business_id") @db.Uuid
  bookingId      String        @map("booking_id") @db.Uuid
  amountCentimes Int           @map("amount_centimes")
  method         PaymentMethod
  paidAt         DateTime      @default(now()) @map("paid_at") @db.Timestamptz
  /// The owner who recorded it; empty for a future online payment.
  recordedBy     String?       @map("recorded_by") @db.Uuid
  /// Set once to cancel a mistaken payment; totals ignore voided rows.
  voidedAt       DateTime?     @map("voided_at") @db.Timestamptz

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  booking  Booking  @relation(fields: [businessId, bookingId], references: [businessId, id], onDelete: NoAction)
  recorder User?    @relation(fields: [businessId, recordedBy], references: [businessId, id], onDelete: NoAction)

  @@unique([businessId, id])
  @@index([businessId, bookingId])
  @@index([businessId, recordedBy])
  @@map("payments")
}
```

**Handwritten SQL** (appended to the same migration below a divider, as in migration `20261101141007_tenant_isolation`):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prisma sends instants without an offset, so every session must read them as UTC.
DO $$ BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone = %L', current_database(), 'UTC');
END $$;

-- Existing businesses got kind 'other' through a temporary default (edited into Prisma's ADD COLUMN);
-- new businesses must choose.
ALTER TABLE businesses ALTER COLUMN kind DROP DEFAULT;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_min_notice CHECK (min_notice_minutes BETWEEN 0 AND 10080),
  ADD CONSTRAINT businesses_booking_window CHECK (booking_window_days BETWEEN 1 AND 365),
  ADD CONSTRAINT businesses_cancel_notice CHECK (cancel_notice_hours BETWEEN 0 AND 168),
  ADD CONSTRAINT businesses_phone_e164 CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT businesses_address_length CHECK (char_length(address) <= 200),
  ADD CONSTRAINT businesses_description_length CHECK (char_length(description) <= 300),
  ADD CONSTRAINT businesses_accent_color CHECK (accent_color ~ '^#[0-9a-f]{6}$'),
  ADD CONSTRAINT businesses_logo_key_length CHECK (char_length(logo_key) <= 200);

ALTER TABLE users
  ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  ADD CONSTRAINT users_email_length CHECK (char_length(email) BETWEEN 3 AND 254);

ALTER TABLE staff
  ADD CONSTRAINT staff_name_length CHECK (char_length(name) BETWEEN 1 AND 60);

ALTER TABLE services
  ADD CONSTRAINT services_name_length CHECK (char_length(name) BETWEEN 2 AND 80),
  ADD CONSTRAINT services_duration CHECK (duration_minutes BETWEEN 5 AND 480 AND duration_minutes % 5 = 0),
  ADD CONSTRAINT services_price CHECK (price_centimes BETWEEN 0 AND 10000000);

ALTER TABLE weekly_hours
  ADD CONSTRAINT weekly_hours_weekday CHECK (weekday BETWEEN 1 AND 7),
  ADD CONSTRAINT weekly_hours_range CHECK (start_minute >= 0 AND start_minute < end_minute AND end_minute <= 1440),
  ADD CONSTRAINT weekly_hours_no_overlap EXCLUDE USING gist (
    business_id WITH =, staff_id WITH =, weekday WITH =,
    int4range(start_minute, end_minute) WITH &&);

ALTER TABLE time_off
  ADD CONSTRAINT time_off_range CHECK (starts_at < ends_at),
  ADD CONSTRAINT time_off_label_length CHECK (char_length(label) <= 60);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_range CHECK (starts_at < ends_at),
  ADD CONSTRAINT bookings_code_format CHECK (code ~ '^[A-Z0-9]{3}-[2-9A-HJKMNP-TV-Z]{4}$'),
  ADD CONSTRAINT bookings_customer_name_length CHECK (char_length(customer_name) BETWEEN 2 AND 80),
  ADD CONSTRAINT bookings_customer_phone_e164 CHECK (customer_phone ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT bookings_customer_email CHECK (
    customer_email = lower(customer_email) AND char_length(customer_email) BETWEEN 3 AND 254),
  ADD CONSTRAINT bookings_cancelled_fields CHECK (
    (status = 'cancelled') = (cancelled_at IS NOT NULL)
    AND (cancelled_at IS NULL) = (cancelled_by IS NULL)),
  -- The double booking guard. Group sessions later recreate it with AND session_id IS NULL.
  ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    business_id WITH =, staff_id WITH =, tsrange(starts_at, ends_at) WITH &&)
    WHERE (status <> 'cancelled');

ALTER TABLE payments
  ADD CONSTRAINT payments_amount CHECK (amount_centimes BETWEEN 1 AND 10000000);

-- Money is never erased: a payment row can only gain voided_at, once.
CREATE FUNCTION payments_only_void() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.voided_at IS NOT NULL
     OR NEW.voided_at IS NULL
     OR (NEW.id, NEW.business_id, NEW.booking_id, NEW.amount_centimes, NEW.method, NEW.paid_at, NEW.recorded_by)
        IS DISTINCT FROM
        (OLD.id, OLD.business_id, OLD.booking_id, OLD.amount_centimes, OLD.method, OLD.paid_at, OLD.recorded_by)
  THEN
    RAISE EXCEPTION 'a payment can only be voided, once';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payments_only_void BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_only_void();

-- Bookings are cancelled, payments are voided; neither is ever deleted by the app.
REVOKE DELETE ON bookings, payments FROM app_user;

-- The tenant table rule (spec 0002), written out once per table: users, refresh_tokens, staff,
-- services, staff_services, weekly_hours, time_off, bookings, payments.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));
-- … the same two statements for each of the other eight tables.
```

- Prisma generates `ALTER TABLE "businesses" ADD COLUMN "kind" "business_kind" NOT NULL`, which fails on the existing Atlas and Anfa rows. Edit that generated line to add `DEFAULT 'other'`; the handwritten block then drops the default.
- `btree_gist` is a trusted extension, so `app_migrator` (owner of the database) can create it. If `CREATE EXTENSION` is refused anyway, add it to `infra/postgres/init/01-roles.sh` as the superuser and recreate the dev volume.
- `ALTER DATABASE … SET timezone` takes effect for new connections; restart `pnpm dev` after migrating.
- A `CHECK` on an optional column passes when the value is empty, so the branding checks only apply once a value is set.

### State transitions

**Booking** (`status`):

```
confirmed → done        owner, after the start time
confirmed → no_show     owner, after the start time (came neither on time nor at all, and never warned)
confirmed → cancelled   owner at any time; the customer online until cancel_notice_hours before the start (once the Deferred cancel link exists)
done ↔ no_show          owner correction
cancelled → confirmed   owner undo, only if the time is still free (the guard refuses otherwise)
```

The database enforces only `bookings_cancelled_fields` and the guard. Feature 10 enforces the transitions in the API.

**Payment**: recorded → voided (once, by the owner). Nothing else changes a payment.

### API surface

This feature adds no endpoint and changes none. Each slice builds its own on these tables:

| Slice | Tables it writes |
|---|---|
| Feature 5, signup and sign in | `businesses`, `users`, `staff` (the owner's row with `user_id`), `refresh_tokens` |
| Feature 6, first booking loop | `services`, `staff_services`, `weekly_hours`, `bookings` |
| Feature 8, staff and schedules | `staff`, `staff_services`, `weekly_hours`, `time_off` |
| Feature 10, dashboard and cash | `bookings.status`, `payments` |
| Feature 12, branding and settings | `businesses` branding and booking settings columns |

`GET /api/tenant` keeps working unchanged (it reads `subdomain`, `name`, `timezone`).

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Migration | defaults 60, 60, 24 | decided in this spec |
| Migration | `kind` of existing businesses | temporary default `other`; the dev seed sets the real kind |
| Wall clock ↔ instant | time zone | `businesses.timezone` with the runtime's time zone data (`2026c` or newer, spec 0001) |
| Booking write (feature 6) | `starts_at` | the slot the customer picked, `YYYY-MM-DDTHH:mm` from the slot engine (feature 9), through `parseWallClock` |
| Booking write | `ends_at` | `starts_at` + `services.duration_minutes` at booking time |
| Booking write | `staff_id` | the customer's pick, or the slot engine's pick for "any staff" (feature 9) |
| Booking write | `code` | first 3 letters or digits of `businesses.subdomain`, uppercased, padded with `X`; then `-` and 4 characters from `23456789ABCDEFGHJKMNPQRSTVWXYZ` (`randomInt` from `node:crypto`); retried up to 3 times on a `P2002` clash |
| Booking write | `customer_phone` | `isMoroccanPhone` E.164 output (spec 0001) |
| Booking write | `customer_email` | the input, trimmed and lowercased |
| Booking write | `consented_at` | server `now()` when the request carries consent `true` (feature 6) |
| Minimum notice | earliest bookable start | now + `min_notice_minutes`, compared in the business time zone |
| Booking window | last bookable day | today in the business time zone + `booking_window_days` |
| Owner cancels | `cancelled_at`, `cancelled_by` | server now; `business` |
| Customer cancels (Deferred) | allowed or not | `wallClockToInstant(starts_at, timezone)` minus `cancel_notice_hours`, compared with now |
| Too late to cancel | phone to call | `businesses.phone` |
| Payment write (feature 10) | `amount_centimes` | owner input in MAD × 100 |
| Payment write | `paid_at` | default `now()` |
| Payment write | `recorded_by` | `@CurrentUser().userId` |
| Payment void | `voided_at` | server now |
| Day totals (feature 10) | expected | sum of the **current** `services.price_centimes` over the day's bookings that are not cancelled |
| Day totals | collected | sum of `payments.amount_centimes` where `voided_at` is empty |
| Dashboard | visits of a customer | count of the business's bookings with the same `customer_phone` |
| Booking page | opening hours per weekday | union of the `weekly_hours` of staff with no `archived_at` |
| Staff lists | order | `staff.created_at` |
| Login (feature 5) | `family_id` | a new `uuidv7()` at login, sent as the `sid` claim |
| Signup (feature 5) | `kind`, the three settings | signup form, settings defaulting to 60, 60, 24 |

### Key invariants

- Every business owned table follows spec 0002's tenant rule; the catalog test proves it.
- Appointment and time off times are wall clock `timestamp(0)`; things that happened are `timestamptz`. Code converts only through `shared/src/wall-clock.ts`.
- Every database session runs with `timezone = UTC`.
- For one staff member, bookings that are not cancelled never overlap.
- For one staff member and weekday, weekly ranges never overlap.
- A booking is never deleted by the app; it is cancelled. `status = 'cancelled'` exactly when `cancelled_at` and `cancelled_by` are set.
- A payment is never deleted and never changed, except setting `voided_at` once. "Collected" counts only rows with no `voided_at`.
- Staff and services referenced by a booking are archived (`archived_at`), never deleted.
- Money is whole centimes in MAD (`int`); there is no currency column.
- A booking has no free text field, so no health detail can be stored.
- Emails (owner and customer) are stored lowercase.

### Security model

- Every new table: `app_user` sees and changes only the current business's rows (`tenant_isolation`), and links cannot point into another business (spec 0002).
- `app_user` holds no `DELETE` on `bookings` or `payments` (nor on `businesses`, spec 0002); payment rows are append only by trigger.
- `password_hash` and `token_hash` never leave the API: every response DTO selects explicit fields.
- Customer name, phone, and email are personal data under law 09-08 (CNDP). The model stores consent time and no free text; data access and deletion stay with the Deferred "Full CNDP compliance" item, where deletion becomes blanking these three fields (bookings themselves are never deleted).
- The booking `code` is printed and shared on WhatsApp, so it is not a secret: no action may be authorized by the code alone. The Deferred cancel link carries its own secret.

### Configuration required

No new environment variable. New dependency: `@date-fns/tz` in `shared/` (chosen in spec 0001).

### Critical test scenarios

Feature 3 is tagged `Alpha`, so `/check verify` runs these against the dev database (as `app_user` inside a transaction that sets `app.business_id`, unless noted); only the catalog test runs in CI. Features 9 and 10 turn the guard and money scenarios into tests.

- Happy path: `pnpm --filter api db:seed:dev`, then while serving Atlas read Samira's weekly hours, Atlas's services, and the day's bookings; the same queries work for Anfa and Karim. Verifies **AC-1**, **AC-3**.
- Several ranges: insert `540` to `720` and `840` to `1080` for Samira on Monday (both save), then `600` to `900` (refused), `720` to `540`, `0` to `1500`, weekday `8` (refused). Verifies **AC-4**.
- Guard: overlapping booking for Samira → `23P01`; back to back saves; same time for Youssef saves; cancel the first then insert the overlap (saves), then set the cancelled one back to `confirmed` → `23P01`; two `psql` sessions insert the same slot inside open transactions, commit both, one gets `23P01`. Verifies **AC-7**.
- Money: `DELETE FROM payments` → `permission denied`; `UPDATE payments SET amount_centimes = 0` → `a payment can only be voided, once`; set `voided_at` (works), set it again → refused. Verifies **AC-9**.
- Wall clock: a small script inserts a booking at `2026-09-25T10:00` through Prisma and reads it back with `TZ=Europe/Paris`; the helper conversions for 1 and 25 September. Verifies **AC-6**.
- Archive: delete Samira (has bookings) → `23503`; delete a staff member with no bookings → their hours, time off, and links are gone; as `app_migrator` delete Coach Karim's business → no row of it remains in any table. Verifies **AC-10**.
- Rules: booking with `status = 'cancelled'` and no `cancelled_at`, a phone without `+`, an uppercase email, a bad code → refused; `DELETE FROM bookings` → `permission denied`; business settings out of range, bad `accent_color`, missing `kind` → refused; the same owner email in Atlas and Anfa saves, twice in Atlas refused; time off with no staff saves, with end before start refused. Verifies **AC-5**, **AC-8**, **AC-11**, **AC-12**, **AC-13**.
- Cross business: while serving Atlas, insert a booking with Anfa's staff id → `23503`; the catalog test passes. Verifies **AC-2**.
- Future additions: in a rolled back transaction as `app_migrator`, run the group session sketch and `ALTER TYPE payment_method ADD VALUE 'online'`; compare a checksum of `bookings` and `payments` before and after. Verifies **AC-14**.
- `SHOW timezone` as `app_user` → `UTC`. Verifies **AC-15**.
- `pnpm turbo run lint typecheck test build` → green. Verifies **AC-16**.

**Group session sketch** (for AC-14; the real design comes with the Deferred feature):

```sql
CREATE TABLE class_sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  starts_at timestamp(0) NOT NULL,
  ends_at timestamp(0) NOT NULL,
  places smallint NOT NULL CHECK (places BETWEEN 2 AND 200),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, staff_id) REFERENCES staff (business_id, id)
);
ALTER TABLE bookings ADD COLUMN session_id uuid,
  ADD FOREIGN KEY (business_id, session_id) REFERENCES class_sessions (business_id, id);
ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap,
  ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    business_id WITH =, staff_id WITH =, tsrange(starts_at, ends_at) WITH &&)
    WHERE (status <> 'cancelled' AND session_id IS NULL);
```

## Build plan

Tracer Bullet, one migration: this feature is structure only, so the thin thread is schema → migration → Prisma client → seed, readable end to end from the dev database while `GET /api/tenant` keeps working.

1. Extend `api/prisma/schema.prisma` with the enums, the new `Business` fields, and the nine models exactly as in the sketch. Run `pnpm --filter api exec prisma migrate dev --create-only --name data_model`. Satisfies **AC-1**.
2. Edit the generated `migration.sql`: add `DEFAULT 'other'` to the `kind` column line, then append the handwritten SQL below a divider (extension, database time zone, `kind` default drop, every `CHECK`, both guards, the payments trigger, the `DELETE` revokes, and row level security plus `tenant_isolation` written out for all nine tables). Satisfies **AC-2**, **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**.
3. Apply it with `pnpm --filter api exec prisma migrate dev` (applies and regenerates the client); run it once more and confirm it finds no change. If that second run proposes dropping `bookings_no_overlap`, `weekly_hours_no_overlap`, or their indexes, Prisma is not recognizing the exclusion constraints: do not accept the proposed migration; stop and report it. Give `createBusiness` in `api/test/db.ts` a `kind` parameter (`'salon'` when omitted) so the existing tests compile; run the catalog test and the full API suite. Satisfies **AC-1**, **AC-2**, **AC-16**.
4. Add `@date-fns/tz` to `shared/`, write `shared/src/wall-clock.ts` (`parseWallClock`, `formatWallClock`, `wallClockToInstant`, `instantToWallClock`), and export it from `shared/src/index.ts`. Satisfies **AC-6**.
5. Rewrite `api/prisma/dev-seed.sql` (still run as `app_migrator`, still safe to run again: delete the three dev businesses by subdomain, which cascades, then insert): Salon Atlas, Clinique Anfa, and Coach Karim with their `kind`, staff, services, service links, weekly hours, time off (Samira's vacation, an Aïd closure), a few bookings over the coming week, and one cash payment. Feature 14 replaces it. Satisfies **AC-3**, and gives AC-14 its seeded data.
6. Run `pnpm turbo run lint typecheck test build`. Satisfies **AC-16**.

## Consequences

**Positive**:
- Every slice from feature 5 on writes code only; the schema, its rules, and its isolation exist and are checked from today.
- A legal time change can never move an existing booking or time off.
- Double bookings, overlapping hours, cross business links, deleted bookings, and erased or edited cash are refused by Postgres even when the API has a bug.
- Group sessions and online payment are additions (a table, a nullable column, an enum value), proven by AC-14.
- The catalog test covers all nine tables with no new isolation test.

**Negative / tradeoffs**:
- The wall clock convention puts two meanings of `Date` in the code. A wall clock `Date` compared with `new Date()` is a silent bug, and with Casablanca at UTC+0 it gives the right answer by accident, so it can hide. Only the helpers convert; feature 9's tests should include a business in a zone with an offset to expose mistakes.
- "Expected" totals use the current service price, so past days' expected totals move when a price is edited (the engineer's choice; "collected" never moves).
- No clean up time between bookings: a salon that needs it lengthens the service duration.
- Bookings and payments can never be deleted, even by the owner; a mistaken booking is cancelled and stays in history.
- Customer details are copied per booking: no customer list beyond grouping by phone, and a customer's new phone number does not update past bookings.
- Every link is composite, so Prisma nested writes must always pass `businessId`, and relations read more verbosely.
- All tables arrive in one migration: a model mistake found in a later slice needs a new migration (applied migrations are never edited).
- Postgres gains its first extension (`btree_gist`).

**Neutral**:
- Amends spec 0001's database conventions: weekly hours are `weekday` plus minutes from midnight, not `time`; days off are wall clock ranges in `time_off`, not `date`.
- The migration pins the database time zone to UTC (it was UTC already by the Postgres image default, now guaranteed).
- `createBusiness` (test helper) and the dev seed gain `kind`; the seed now holds three businesses.
- The scope's feature 9 text still says "service duration plus buffer"; buffer was dropped here.

## Follow-up

- [ ] `/scope`: feature 9's done when drops "plus buffer"; feature 12 gains the settings page for minimum notice, booking window, and cancel notice; feature 5's signup form takes `kind` and the three settings (defaults 60, 60, 24).
- [ ] Feature 5: the owner's staff row is created with `user_id` at signup; emails are lowercased before insert; the nightly refresh token cleanup goes through its own `SECURITY DEFINER` function (spec 0002).
- [ ] Feature 9: map `23P01` to 409; test the guard under concurrency and the slot engine with a business in a zone that has an offset.
- [ ] Feature 10: enforce the booking transitions above in the API; the void action and the expected versus collected totals.
- [ ] Deferred customer cancel link: add `bookings.cancel_token_hash` (hash only) and a public page using `cancel_notice_hours` and `businesses.phone`.
- [ ] Deferred online payment: `ALTER TYPE payment_method ADD VALUE 'online'`.
- [ ] Deferred group sessions: start from the sketch above.
- [ ] Deferred CNDP compliance: deletion requests blank `customer_name`, `customer_phone`, `customer_email` instead of deleting bookings.
- [ ] Root `AGENTS.md` (still missing) should carry, in `## Rules`, the wall clock rule (convert only through `shared/src/wall-clock.ts`) and "bookings are cancelled, payments are voided, neither is deleted"; `/sync` owns that file.
