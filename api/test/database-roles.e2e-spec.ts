import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';

// The API connects as app_user. Row level security only protects tenants if this role
// cannot bypass it, is not a superuser, and owns nothing (owners skip RLS by default).
describe('database roles', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('connects as app_user, which is not a superuser and has NOBYPASSRLS', async () => {
    const [role] = await prisma.$queryRaw<
      { name: string; superuser: boolean; bypassRls: boolean }[]
    >`SELECT rolname AS name, rolsuper AS superuser, rolbypassrls AS "bypassRls"
      FROM pg_roles WHERE rolname = current_user`;

    expect(role).toEqual({
      name: 'app_user',
      superuser: false,
      bypassRls: false,
    });
  });

  it('owns no table, view, sequence, or schema', async () => {
    const [owned] = await prisma.$queryRaw<
      { relations: number; schemas: number }[]
    >`SELECT
        (SELECT count(*)::int FROM pg_class WHERE relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)) AS relations,
        (SELECT count(*)::int FROM pg_namespace WHERE nspowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)) AS schemas`;

    expect(owned).toEqual({ relations: 0, schemas: 0 });
  });

  it('leaves the public schema to app_migrator and cannot create tables in it', async () => {
    const [schema] = await prisma.$queryRaw<{ owner: string }[]>`
      SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname = 'public'`;
    expect(schema?.owner).toBe('app_migrator');

    await expect(
      prisma.$executeRaw`CREATE TABLE public.should_fail (id int)`,
    ).rejects.toThrow(/permission denied/);
  });

  it('runs with the safety timeouts', async () => {
    const [settings] = await prisma.$queryRaw<
      { statementTimeout: string; idleInTransaction: string }[]
    >`SELECT current_setting('statement_timeout') AS "statementTimeout",
             current_setting('idle_in_transaction_session_timeout') AS "idleInTransaction"`;

    expect(settings).toEqual({
      statementTimeout: '5s',
      idleInTransaction: '10s',
    });
  });
});
