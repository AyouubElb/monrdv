-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "subdomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_subdomain_key" ON "businesses"("subdomain");

-- ---------------------------------------------------------------------------
-- Tenant isolation (spec 0002). Handwritten below this line.
-- ---------------------------------------------------------------------------

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

-- A subdomain is fixed at signup.
CREATE FUNCTION businesses_subdomain_fixed() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'subdomain cannot change';
END $$;
CREATE TRIGGER businesses_subdomain_fixed
  BEFORE UPDATE OF subdomain ON businesses
  FOR EACH ROW WHEN (OLD.subdomain IS DISTINCT FROM NEW.subdomain)
  EXECUTE FUNCTION businesses_subdomain_fixed();

-- Enabled, not forced: the owner (app_migrator) is used only by migrations, definer
-- functions, seeds, and test cleanup. The app connects as app_user.
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_self ON businesses FOR ALL
  USING (id = (SELECT app_current_business_id()))
  WITH CHECK (id = (SELECT app_current_business_id()));

REVOKE DELETE ON businesses FROM app_user;
-- Prisma creates `_prisma_migrations` before the first migration in every real database;
-- only its throwaway shadow database (used by `migrate dev`) lacks it.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON public._prisma_migrations FROM app_user;
  END IF;
END $$;
