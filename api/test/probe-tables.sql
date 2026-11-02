-- Test only tables that follow the tenant table rule (spec 0002), so the isolation tests
-- and the catalog test run before any real business table exists (scope feature 3).
-- Applied by test/global-setup.ts as app_migrator, after the migrations. Safe to run again.

DROP TABLE IF EXISTS isolation_probe_child;
DROP TABLE IF EXISTS isolation_probe_parent;

CREATE TABLE isolation_probe_parent (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  label       text NOT NULL,
  UNIQUE (business_id, id)
);
ALTER TABLE isolation_probe_parent ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON isolation_probe_parent FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));

CREATE TABLE isolation_probe_child (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  parent_id   uuid NOT NULL,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, parent_id) REFERENCES isolation_probe_parent (business_id, id)
);
ALTER TABLE isolation_probe_child ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON isolation_probe_child FOR ALL
  USING (business_id = (SELECT app_current_business_id()))
  WITH CHECK (business_id = (SELECT app_current_business_id()));
