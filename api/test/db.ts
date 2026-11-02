import { PrismaPg } from '@prisma/adapter-pg';
import {
  type BusinessKind,
  PrismaClient,
} from '../src/generated/prisma/client.js';
import { testDatabaseEnv } from './test-env.js';

/**
 * A Prisma client connected as app_migrator, the table owner, which row level security does
 * not apply to. Only for test setup and cleanup: creating businesses, reading across them,
 * truncating. Never what a test asserts isolation through (that is the app's app_user client).
 */
export function createMigratorClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseEnv().migrateUrl }),
  });
}

/** Empties every business owned table (the probe tables follow by cascade). */
export async function resetBusinesses(migrator: PrismaClient): Promise<void> {
  await migrator.$executeRaw`TRUNCATE businesses CASCADE`;
}

/** Inserts a business as the owner and returns its id. */
export async function createBusiness(
  migrator: PrismaClient,
  subdomain: string,
  name: string,
  kind: BusinessKind = 'salon',
): Promise<string> {
  const business = await migrator.business.create({
    data: { subdomain, name, kind },
    select: { id: true },
  });
  return business.id;
}
