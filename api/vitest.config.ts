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
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: testDatabase.url,
    },
  },
});
