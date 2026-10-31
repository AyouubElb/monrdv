import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/**
 * Test database URLs: from the environment (CI), else from the root `.env` (local).
 * Never falls back to DATABASE_URL, so tests cannot touch the development database.
 */
export function testDatabaseEnv(): { url: string; migrateUrl: string } {
  const fileEnv = existsSync('../.env')
    ? parseEnv(readFileSync('../.env', 'utf8'))
    : {};
  const url = process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL;
  const migrateUrl =
    process.env.TEST_MIGRATE_DATABASE_URL ?? fileEnv.TEST_MIGRATE_DATABASE_URL;
  if (!url || !migrateUrl) {
    throw new Error(
      'Set TEST_DATABASE_URL and TEST_MIGRATE_DATABASE_URL (see .env.example), then start the test database with `pnpm db:up`.',
    );
  }
  return { url, migrateUrl };
}
