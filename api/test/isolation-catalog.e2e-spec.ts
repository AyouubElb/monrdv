import type { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { createMigratorClient } from './db.js';

// covers: AC-11. Reads the Postgres catalog, so every table added later (scope feature 3 on)
// is checked the moment it exists: nobody has to remember an isolation test per table.

/** Tables allowed to have no `business_id`. Add one here only with a reason. */
const TABLES_WITHOUT_BUSINESS_ID = new Set([
  'businesses', // the tenant table itself, guarded by `business_self`
  '_prisma_migrations', // Prisma's own; app_user holds no right on it
]);

const TENANT_POLICY_QUAL =
  '(business_id = ( SELECT app_current_business_id() AS app_current_business_id))';

type Db = Prisma.TransactionClient | PrismaClient;

/** Every tenant rule broken in the `public` schema, as readable sentences. Empty when all hold. */
async function findCatalogViolations(db: Db): Promise<string[]> {
  const violations: string[] = [];

  const tables = await db.$queryRaw<
    {
      name: string;
      rls: boolean;
      hasBusinessId: boolean;
      businessIdNotNull: boolean;
    }[]
  >`
    SELECT c.relname::text AS name,
           c.relrowsecurity AS rls,
           a.attname IS NOT NULL AS "hasBusinessId",
           coalesce(a.attnotnull, false) AS "businessIdNotNull"
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attribute a
      ON a.attrelid = c.oid AND a.attname = 'business_id' AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`;

  const policies = await db.$queryRaw<
    {
      table: string;
      name: string;
      permissive: string;
      cmd: string;
      roles: string[];
      qual: string | null;
      withCheck: string | null;
    }[]
  >`
    SELECT tablename::text AS table, policyname::text AS name, permissive, cmd,
           roles::text[] AS roles, qual, with_check AS "withCheck"
    FROM pg_policies WHERE schemaname = 'public'`;

  const uniqueIndexes = await db.$queryRaw<
    { table: string; columns: string[] }[]
  >`
    SELECT c.relname::text AS table,
           ARRAY(
             SELECT a.attname::text
             FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
             ORDER BY k.ord
           ) AS columns
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND i.indisunique AND i.indpred IS NULL`;

  const foreignKeys = await db.$queryRaw<
    {
      name: string;
      table: string;
      refTable: string;
      columns: string[];
      refColumns: string[];
    }[]
  >`
    SELECT con.conname::text AS name, cl.relname::text AS table, ref.relname::text AS "refTable",
           ARRAY(
             SELECT a.attname::text
             FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
             ORDER BY k.ord
           ) AS columns,
           ARRAY(
             SELECT a.attname::text
             FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum
             ORDER BY k.ord
           ) AS "refColumns"
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE con.contype = 'f' AND n.nspname = 'public'`;

  for (const table of tables) {
    if (!table.hasBusinessId) {
      if (!TABLES_WITHOUT_BUSINESS_ID.has(table.name)) {
        violations.push(
          `${table.name}: has no business_id and is not on the allowlist`,
        );
      }
      continue;
    }

    if (!table.businessIdNotNull) {
      violations.push(`${table.name}: business_id is nullable`);
    }
    if (!table.rls) {
      violations.push(`${table.name}: row level security is not enabled`);
    }

    const tablePolicies = policies.filter((p) => p.table === table.name);
    const tenantPolicy = tablePolicies.find(
      (p) => p.name === 'tenant_isolation',
    );
    if (
      !tenantPolicy ||
      tenantPolicy.permissive !== 'PERMISSIVE' ||
      tenantPolicy.cmd !== 'ALL' ||
      tenantPolicy.roles.join() !== 'public' ||
      tenantPolicy.qual !== TENANT_POLICY_QUAL ||
      tenantPolicy.withCheck !== TENANT_POLICY_QUAL
    ) {
      violations.push(
        `${table.name}: lacks the standard tenant_isolation policy`,
      );
    }
    // Permissive policies are OR'ed: any other one could open rows of other businesses.
    for (const extra of tablePolicies) {
      if (
        extra.name !== 'tenant_isolation' &&
        extra.permissive === 'PERMISSIVE'
      ) {
        violations.push(
          `${table.name}: extra permissive policy ${extra.name} widens tenant_isolation`,
        );
      }
    }

    const hasBusinessIdUnique = uniqueIndexes.some(
      (index) =>
        index.table === table.name && index.columns.join() === 'business_id,id',
    );
    if (!hasBusinessIdUnique) {
      violations.push(`${table.name}: lacks UNIQUE (business_id, id)`);
    }

    for (const fk of foreignKeys.filter((f) => f.table === table.name)) {
      const carriesBusiness =
        fk.refTable === 'businesses'
          ? fk.columns.join() === 'business_id' && fk.refColumns.join() === 'id'
          : fk.columns[0] === 'business_id' &&
            fk.refColumns[0] === 'business_id';
      if (!carriesBusiness) {
        violations.push(
          `${table.name}: link ${fk.name} to ${fk.refTable} does not carry business_id`,
        );
      }
    }
  }

  const definers = await db.$queryRaw<
    { name: string; config: string[] | null; grantees: string[] }[]
  >`
    SELECT p.proname::text AS name, p.proconfig AS config,
           CASE WHEN p.proacl IS NULL THEN ARRAY['PUBLIC']
                ELSE ARRAY(
                  SELECT CASE WHEN x.grantee = 0 THEN 'PUBLIC'
                              ELSE pg_get_userbyid(x.grantee)::text END
                  FROM aclexplode(p.proacl) x
                  WHERE x.privilege_type = 'EXECUTE' AND x.grantee <> p.proowner
                ) END AS grantees
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef`;

  for (const fn of definers) {
    if (!fn.config?.includes('search_path=""')) {
      violations.push(
        `function ${fn.name}: SECURITY DEFINER without search_path = ''`,
      );
    }
    if (fn.grantees.some((grantee) => grantee !== 'app_user')) {
      violations.push(
        `function ${fn.name}: SECURITY DEFINER executable by ${fn.grantees.join(', ')}`,
      );
    }
  }

  const [migrations] = await db.$queryRaw<{ anyRight: boolean }[]>`
    SELECT has_table_privilege(
      'app_user', 'public._prisma_migrations',
      'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'
    ) AS "anyRight"`;
  if (migrations?.anyRight) {
    violations.push('app_user holds a right on _prisma_migrations');
  }

  return violations;
}

class Rollback extends Error {}

describe('tenant isolation catalog', () => {
  let migrator: PrismaClient;

  beforeAll(() => {
    migrator = createMigratorClient();
  });

  afterAll(async () => {
    await migrator.$disconnect();
  });

  /** Breaks one rule inside a transaction, reads the violations, then rolls everything back. */
  async function violationsAfter(statements: string[]): Promise<string[]> {
    let found: string[] = [];
    await migrator
      .$transaction(async (tx) => {
        for (const statement of statements)
          await tx.$executeRawUnsafe(statement);
        found = await findCatalogViolations(tx);
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });
    return found;
  }

  it('passes on the real schema plus the probe tables', async () => {
    await expect(findCatalogViolations(migrator)).resolves.toEqual([]);
  });

  it('checks the probe tables, so the rule really runs on business tables', async () => {
    const [{ count }] = await migrator.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM pg_policies
      WHERE policyname = 'tenant_isolation' AND tablename LIKE 'isolation_probe_%'`;

    expect(count).toBe(2);
  });

  it.each([
    [
      'row level security is off',
      [
        `CREATE TABLE catalog_bad (id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses (id), UNIQUE (business_id, id))`,
        `CREATE POLICY tenant_isolation ON catalog_bad FOR ALL USING (business_id = (SELECT app_current_business_id())) WITH CHECK (business_id = (SELECT app_current_business_id()))`,
      ],
      'catalog_bad: row level security is not enabled',
    ],
    [
      'the tenant_isolation policy is missing',
      [
        `CREATE TABLE catalog_bad (id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses (id), UNIQUE (business_id, id))`,
        `ALTER TABLE catalog_bad ENABLE ROW LEVEL SECURITY`,
      ],
      'catalog_bad: lacks the standard tenant_isolation policy',
    ],
    [
      'the policy does not check the business',
      [
        `CREATE TABLE catalog_bad (id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses (id), UNIQUE (business_id, id))`,
        `ALTER TABLE catalog_bad ENABLE ROW LEVEL SECURITY`,
        `CREATE POLICY tenant_isolation ON catalog_bad FOR ALL USING (true) WITH CHECK (true)`,
      ],
      'catalog_bad: lacks the standard tenant_isolation policy',
    ],
    [
      'an extra permissive policy opens other rows',
      [
        `CREATE POLICY open_all ON isolation_probe_parent FOR SELECT USING (true)`,
      ],
      'isolation_probe_parent: extra permissive policy open_all widens tenant_isolation',
    ],
    [
      'UNIQUE (business_id, id) is missing',
      [
        `CREATE TABLE catalog_bad (id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses (id))`,
        `ALTER TABLE catalog_bad ENABLE ROW LEVEL SECURITY`,
        `CREATE POLICY tenant_isolation ON catalog_bad FOR ALL USING (business_id = (SELECT app_current_business_id())) WITH CHECK (business_id = (SELECT app_current_business_id()))`,
      ],
      'catalog_bad: lacks UNIQUE (business_id, id)',
    ],
    [
      'a link does not carry the business',
      [
        `CREATE TABLE catalog_bad (id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses (id), parent_id uuid NOT NULL REFERENCES isolation_probe_parent (id), UNIQUE (business_id, id))`,
        `ALTER TABLE catalog_bad ENABLE ROW LEVEL SECURITY`,
        `CREATE POLICY tenant_isolation ON catalog_bad FOR ALL USING (business_id = (SELECT app_current_business_id())) WITH CHECK (business_id = (SELECT app_current_business_id()))`,
      ],
      'catalog_bad: link catalog_bad_parent_id_fkey to isolation_probe_parent does not carry business_id',
    ],
    [
      'a table without business_id is not on the allowlist',
      [`CREATE TABLE catalog_global (id int PRIMARY KEY)`],
      'catalog_global: has no business_id and is not on the allowlist',
    ],
    [
      'a SECURITY DEFINER function has no fixed search_path',
      [
        `CREATE FUNCTION catalog_bad_fn() RETURNS int LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'`,
        `REVOKE EXECUTE ON FUNCTION catalog_bad_fn() FROM PUBLIC`,
      ],
      "function catalog_bad_fn: SECURITY DEFINER without search_path = ''",
    ],
    [
      'a SECURITY DEFINER function is executable by PUBLIC',
      [
        `CREATE FUNCTION catalog_bad_fn() RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = '' AS 'SELECT 1'`,
      ],
      'function catalog_bad_fn: SECURITY DEFINER executable by PUBLIC',
    ],
    [
      'app_user holds a right on _prisma_migrations',
      [`GRANT SELECT ON _prisma_migrations TO app_user`],
      'app_user holds a right on _prisma_migrations',
    ],
  ])('fails when %s', async (_case, statements, expected) => {
    const found = await violationsAfter(statements);

    expect(found).toContain(expected);
  });
});
