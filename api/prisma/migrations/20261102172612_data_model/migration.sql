-- CreateEnum
CREATE TYPE "business_kind" AS ENUM ('salon', 'clinic', 'coach', 'other');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('owner');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('confirmed', 'done', 'no_show', 'cancelled');

-- CreateEnum
CREATE TYPE "cancelled_by" AS ENUM ('customer', 'business');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "accent_color" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "booking_window_days" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "cancel_notice_hours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "kind" "business_kind" NOT NULL DEFAULT 'other', -- edited: dropped again below
ADD COLUMN     "logo_key" TEXT,
ADD COLUMN     "min_notice_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'owner',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "rotated_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_centimes" INTEGER NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_services" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "staff_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_hours" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_minute" SMALLINT NOT NULL,
    "end_minute" SMALLINT NOT NULL,

    CONSTRAINT "weekly_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "staff_id" UUID,
    "starts_at" TIMESTAMP(0) NOT NULL,
    "ends_at" TIMESTAMP(0) NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(0) NOT NULL,
    "ends_at" TIMESTAMP(0) NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'confirmed',
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "consented_at" TIMESTAMPTZ NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" "cancelled_by",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount_centimes" INTEGER NOT NULL,
    "method" "payment_method" NOT NULL,
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID,
    "voided_at" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_business_id_id_key" ON "users"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_business_id_email_key" ON "users"("business_id", "email");

-- CreateIndex
CREATE INDEX "refresh_tokens_business_id_user_id_idx" ON "refresh_tokens"("business_id", "user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_business_id_family_id_idx" ON "refresh_tokens"("business_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_business_id_id_key" ON "refresh_tokens"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_business_id_token_hash_key" ON "refresh_tokens"("business_id", "token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "staff_business_id_id_key" ON "staff"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_business_id_user_id_key" ON "staff"("business_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_business_id_id_key" ON "services"("business_id", "id");

-- CreateIndex
CREATE INDEX "staff_services_business_id_service_id_idx" ON "staff_services"("business_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_services_business_id_id_key" ON "staff_services"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_services_business_id_staff_id_service_id_key" ON "staff_services"("business_id", "staff_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_hours_business_id_id_key" ON "weekly_hours"("business_id", "id");

-- CreateIndex
CREATE INDEX "time_off_business_id_starts_at_idx" ON "time_off"("business_id", "starts_at");

-- CreateIndex
CREATE INDEX "time_off_business_id_staff_id_idx" ON "time_off"("business_id", "staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_off_business_id_id_key" ON "time_off"("business_id", "id");

-- CreateIndex
CREATE INDEX "bookings_business_id_starts_at_idx" ON "bookings"("business_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_business_id_staff_id_starts_at_idx" ON "bookings"("business_id", "staff_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_business_id_service_id_idx" ON "bookings"("business_id", "service_id");

-- CreateIndex
CREATE INDEX "bookings_business_id_customer_phone_idx" ON "bookings"("business_id", "customer_phone");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_business_id_id_key" ON "bookings"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_business_id_code_key" ON "bookings"("business_id", "code");

-- CreateIndex
CREATE INDEX "payments_business_id_booking_id_idx" ON "payments"("business_id", "booking_id");

-- CreateIndex
CREATE INDEX "payments_business_id_recorded_by_idx" ON "payments"("business_id", "recorded_by");

-- CreateIndex
CREATE UNIQUE INDEX "payments_business_id_id_key" ON "payments"("business_id", "id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_business_id_user_id_fkey" FOREIGN KEY ("business_id", "user_id") REFERENCES "users"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_business_id_user_id_fkey" FOREIGN KEY ("business_id", "user_id") REFERENCES "users"("business_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_business_id_staff_id_fkey" FOREIGN KEY ("business_id", "staff_id") REFERENCES "staff"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_business_id_service_id_fkey" FOREIGN KEY ("business_id", "service_id") REFERENCES "services"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_hours" ADD CONSTRAINT "weekly_hours_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_hours" ADD CONSTRAINT "weekly_hours_business_id_staff_id_fkey" FOREIGN KEY ("business_id", "staff_id") REFERENCES "staff"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_business_id_staff_id_fkey" FOREIGN KEY ("business_id", "staff_id") REFERENCES "staff"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_staff_id_fkey" FOREIGN KEY ("business_id", "staff_id") REFERENCES "staff"("business_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_service_id_fkey" FOREIGN KEY ("business_id", "service_id") REFERENCES "services"("business_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_booking_id_fkey" FOREIGN KEY ("business_id", "booking_id") REFERENCES "bookings"("business_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_recorded_by_fkey" FOREIGN KEY ("business_id", "recorded_by") REFERENCES "users"("business_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data model (spec 0003). Handwritten below this line.
-- ---------------------------------------------------------------------------

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

-- The tenant table rule (spec 0002), written out once per table.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON refresh_tokens FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON services FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_services FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE weekly_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON weekly_hours FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_off FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payments FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));
