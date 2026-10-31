import { execSync } from 'node:child_process';
import { testDatabaseEnv } from './test-env.js';

/** Brings the test database up to the latest migration before any test runs. */
export default function setup(): void {
  const { migrateUrl } = testDatabaseEnv();
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, MIGRATE_DATABASE_URL: migrateUrl },
    stdio: 'pipe',
  });
}
