#!/bin/sh
# Creates the two application roles. Runs once, when the Postgres data directory is first created
# (and in CI against the service container). See spec 0001, Database conventions.
#   app_migrator: owns the schema, runs migrations.
#   app_user:     what the API connects as; not a superuser, owns nothing, cannot bypass row level security.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db_name="$POSTGRES_DB" \
  -v migrator_password="$APP_MIGRATOR_PASSWORD" \
  -v user_password="$APP_USER_PASSWORD" <<'SQL'
-- CREATEDB only lets `prisma migrate dev` create its throwaway shadow database.
CREATE ROLE app_migrator WITH LOGIN PASSWORD :'migrator_password'
  NOSUPERUSER NOCREATEROLE CREATEDB NOBYPASSRLS;
CREATE ROLE app_user WITH LOGIN PASSWORD :'user_password'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;

ALTER DATABASE :"db_name" OWNER TO app_migrator;
ALTER SCHEMA public OWNER TO app_migrator;

REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO app_user;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;

-- Tables the migrator creates later become readable and writable by app_user, never owned by it.
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

ALTER ROLE app_user SET statement_timeout = '5s';
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '10s';
SQL
