import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Locally the root `.env` holds the connection strings; in CI and production they come from the environment.
if (existsSync('../.env')) process.loadEnvFile('../.env');

// The CLI connects as app_migrator, the role that owns the schema. The app itself connects as app_user.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.MIGRATE_DATABASE_URL },
});
