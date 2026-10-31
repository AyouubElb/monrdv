# MonRDV

MonRDV is a multi tenant booking platform: each salon, clinic, or coach gets its own booking site on its own subdomain.
Stack and architecture: [spec 0001](docs/specs/0001-stack-architecture/index.md).

## Run it locally

You need Node.js 24 (time zone data `2026c` or newer), pnpm 11, and Docker Desktop.

```sh
pnpm install
pnpm dev
```

`pnpm dev` creates `.env` from `.env.example` on first run, starts Postgres, the test database, and Nginx in Docker,
then runs the web app (port 3000) and the API (port 3001) behind Nginx on port 80.

- http://localhost: the root domain
- http://atlas.localhost: any business subdomain
- http://atlas.localhost/api/health: API health
- http://atlas.localhost/api/docs: API docs (Swagger)

`pnpm db:down` stops the containers.

## Checks

```sh
pnpm turbo run lint typecheck test build
```

API tests need the test database (`pnpm db:up`). CI runs the same checks on every push and pull request.

## Layout

| Folder    | What it holds                                                  |
| --------- | -------------------------------------------------------------- |
| `web/`    | Next.js 16 app (App Router, Tailwind)                          |
| `api/`    | NestJS API, Prisma schema and migrations in `api/prisma/`      |
| `shared/` | Rule values, validators, and French messages used by both apps |
| `infra/`  | Docker Compose, Nginx, Postgres role setup                     |
