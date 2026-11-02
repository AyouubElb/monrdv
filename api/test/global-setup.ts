import { execSync } from 'node:child_process';
import { testDatabaseEnv } from './test-env.js';

/**
 * Brings the test database up to the latest migration before any test runs, then adds the
 * isolation probe tables. Both run as app_migrator, the role that owns the schema.
 */
export default function setup(): void {
  const { migrateUrl } = testDatabaseEnv();
  const env = { ...process.env, MIGRATE_DATABASE_URL: migrateUrl };
  execSync('pnpm exec prisma migrate deploy', { env, stdio: 'pipe' });
  execSync('pnpm exec prisma db execute --file test/probe-tables.sql', {
    env,
    stdio: 'pipe',
  });
}
