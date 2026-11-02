import { defineConfig } from 'vitest/config';
import { testDatabaseEnv } from './test/test-env.js';

const testDatabase = testDatabaseEnv();

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    // One shared test database, cleaned between tests: test files run one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: testDatabase.url,
      ROOT_DOMAIN: 'localhost',
      JWT_ACCESS_SECRET: 'test-only-access-secret-at-least-32-bytes',
      COOKIE_SECURE: 'false',
    },
  },
});
