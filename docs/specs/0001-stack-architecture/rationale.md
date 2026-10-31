# 0001. Stack and architecture: rationale

Decision record for [index.md](index.md). `/develop` does not read this file.

## Context

> ⚠️ Premise note: the stack builds authentication in house rather than adopting a proven auth library. Custom auth is a known failure pattern: token rotation, cookie scope, session fixation, and hashing are each a potential breach (basis: OWASP Authentication cheat sheet). The engineer chose it deliberately for a single login method and for learning value; the risk is contained by following the OWASP sheets rule by rule and by testing every rule in Auth design. If the product later needs password reset, social login, or two factor login, adopting a library is the better path.

> ⚠️ Premise note: a solo 3 to 4 day build is carrying two apps, a monorepo, a custom auth flow, and a first cloud deployment. Each is reasonable alone; together they are the main schedule risk. The Tracer Bullet order in the scope (deploy in slice 2) exists to surface deployment problems early instead of on the last day.

The product is a multi tenant booking platform for salons, clinics, and coaches in Morocco: every business gets its own subdomain, its own availability rules, and cash payment tracking. It is a portfolio piece for an agency, built solo in 3 to 4 days, whose headline is tenant isolation done right. Customers book from phones; owners manage from phone or laptop. Screens are French only.

Forces that shaped the stack:
- **Showcase**: the engineer wants a separate NestJS API and a Next.js client, in tools agencies hire for.
- **Isolation**: a session from one business must never work on another, and data must stay inside its business even if application code has a bug.
- **Correct time**: Morocco left GMT+1 permanently on 20 September 2026; slot times must follow the official time zone data, not a hardcoded offset.
- **Cost and learning**: the engineer has never deployed to a cloud and wants a free option that teaches real deployment.
- **Live subdomains**: the demo must run on `*.<domain>` with HTTPS for every business, including ones created live.
- **CI gate**: the engineer works with CI/CD and wants tests to block bad commits.
- **Time**: 3 to 4 days, so familiar tools win over faster unfamiliar ones.

## Options considered

### Option 1: Next.js + NestJS monorepo, PostgreSQL, Docker on one cloud VM (chosen)

Two apps and a shared package in one repo, Postgres in a container, Nginx in front, Cloudflare at the edge, deployed by GitHub Actions to an Oracle Always Free VM.

**Pros**: separate API to showcase; full control of wildcard subdomains; costs only a domain; teaches the whole deployment loop.
**Cons**: two apps and a VM to operate; no redundancy; ARM images; more moving parts for a 3 to 4 day build.

### Option 2: one Next.js full stack app, PostgreSQL, same VM

Pages, server actions, and route handlers in one Next.js app; no separate API.

**Pros**: one deployable, no internal hop, fastest to build; isolation enforced in one codebase.
**Cons**: no standalone API layer to show the agency; the engineer specifically wants NestJS.

### Option 3: managed platforms (Next.js on a frontend host, NestJS on an app platform, managed Postgres)

Each part on a managed service with free tiers.

**Pros**: little server work; managed backups and certificates.
**Cons**: three providers; wildcard HTTPS on the leading frontend host requires delegating DNS to it; free tiers sleep or expire; web and API on different origins complicate host only cookies; teaches little about cloud servers.

### Option 4: managed containers on a big cloud (container service + managed Postgres)

The same containers on a cloud's container service with its managed database.

**Pros**: enterprise shaped; scalable; strong CV keyword.
**Cons**: wildcard subdomains usually need a load balancer and certificate setup; managed Postgres is rarely free beyond trial credits; much more configuration than a VM for a first deployment.

## Rationale

Option 1 is the only option that meets the showcase force (a real NestJS API) and the cost and learning forces (free, real deployment) together. Option 2 is faster but drops the API layer the engineer wants to demonstrate. Options 3 and 4 move the hardest part, wildcard subdomains with HTTPS, into provider specific setups that cost money or time, while Cloudflare's free proxied wildcard and Universal SSL solve it for one VM at no cost (basis: Cloudflare Universal SSL covers the root and one subdomain level).

PostgreSQL is chosen because two of its features carry the isolation and correctness story: row level security as a second lock behind the application, and exclusion constraints that refuse overlapping bookings at the database (basis: relational database as the default; integrity in the database). Running the app as a non owner role without `BYPASSRLS` is what makes row level security real, because superusers and table owners bypass it by default (basis: OWASP Multi Tenant Security cheat sheet). Prisma is chosen over Drizzle for maturity under a short deadline: Drizzle's row level security support is attractive, but its 1.0 is still in beta, while Prisma 7 is stable and Prisma 8 is a release candidate (basis: boring technology for a 3 to 4 day build).

The engineer chose a 15 minute access token with a rotating refresh token over plain server sessions. Plain sessions would be simpler and revoke instantly; the token pair works if logout and password change also block the login family in memory for 15 minutes, which closes the revocation gap on a single server at no database cost. Rotation with reuse detection adds theft detection, and a 20 second grace window keeps two tabs refreshing at once from logging the owner out. Cookies use the `__Host-` prefix so the browser itself forbids a `Domain` attribute, keeping each session on its exact subdomain (basis: OWASP Session Management cheat sheet; MDN `Set-Cookie`).

The engineer chose class-validator DTOs in NestJS and Zod in Next.js over one shared Zod schema. Shared Zod would remove duplicated wiring, but class-validator keeps the API in pure NestJS convention and lets the official Swagger plugin generate docs with no bridge library. Drift, the main risk of two libraries, is contained by sharing rule values and validator functions in `shared/` and by a parity test. The repo is flat (`web/`, `api/`, `shared/` at the root) at the engineer's choice; Turborepo's `apps/` + `packages/` convention would add a folder level that two apps do not need.

Nginx is chosen over Caddy because Caddy's main advantage, automatic certificates, does not apply when Cloudflare issues the origin certificate, while Nginx is the most widely deployed web server and the one ops teams expect (basis: W3Techs and Netcraft surveys). ESLint and Prettier are chosen over Biome because the engineer already knows them and the deadline favors familiar tools. The server formats slot times in the business's time zone because a customer's outdated phone could otherwise show the wrong hour after Morocco's change (basis: IANA tz release 2026c).

### Landscape scan (2026-10-29 to 2026-10-31)

- Next.js 16 is current; a 2026 CVE allowed crafted requests to bypass auth checks in the routing layer, fixed in 16.2.11.
- IANA tz `2026c` (2026-07-08) first carries Morocco's move to permanent UTC on 2026-09-20; the latest release is `2026f` (2026-10-27). The engineer's Node 24.21.0 reports `2026c`.
- Auth.js is in maintenance mode under the Better Auth team; Better Auth's NestJS connector is community maintained.
- Prisma 8 is a release candidate (8.0.0-rc.23 on 2026-10-15); 7.10.1 is the latest stable; Prisma 8 requires Node 24.11 or newer.
- Drizzle documents row level security with `pgPolicy` and `pgRole`; 1.0 is in beta.
- Oracle Always Free A1 was halved in 2026, to about 2 OCPU and 12 GB running all month.
- AWS's free plan gives up to 200 USD of credit for 6 months, then closes the account unless upgraded.
- Cloudflare's free plan proxies wildcard records, and Universal SSL covers the root and first level subdomains.
- Cloudflare R2's free tier includes 10 GB of storage and free egress.
- `nestjs-zod` v5 needs `cleanupOpenApiDoc` for Swagger (relevant only if the shared Zod option is revisited).
- Nginx is the most used web server at about 33% (W3Techs, December 2025); Netcraft reports about 20% in July 2026, a methodology difference.
- The archived reference Postgres MCP server had a read only bypass; no Postgres MCP server is used.

## References

**Project sources**:
- [docs/scope/scope.md](../../scope/scope.md), feature 1 (Stack & architecture) and its References section
- Installed skills listed in the Decision of [index.md](index.md)

**Practices & standards**:
- Relational database as the default; integrity rules enforced in the database
- Boring, proven technology under a tight deadline
- Least privilege database roles (the app role cannot bypass row level security)
- Refresh token rotation with reuse detection
- No N+1 queries
- OWASP Authentication, Password Storage, Session Management, and Multi Tenant Security cheat sheets
- IANA time zone database as the single source of legal time

**Links** (confirmed by the web checks during the design conversation):
- CVE-2026-64642 (Next.js proxy auth bypass): https://cvefeed.io/vuln/detail/CVE-2026-64642
- IANA tzdb NEWS: https://data.iana.org/time-zones/tzdb/NEWS
- IANA Time Zone Database: https://www.iana.org/time-zones
- Prisma ORM release status: https://www.prisma.io/docs/orm/release-status
- Prisma ORM 8 with NestJS: https://www.prisma.io/blog/prisma-orm-8-nestjs
- Drizzle ORM, Row Level Security: https://orm.drizzle.team/docs/rls
- Better Auth, NestJS integration: https://www.better-auth.com/docs/integrations/nestjs
- nestjs-zod README: https://github.com/BenLorantfy/nestjs-zod
- Multi Tenant Security, OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- Session Management, OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Authentication, OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Password Storage, OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- API4:2023 Unrestricted Resource Consumption, OWASP: https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption
- Set-Cookie header, MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- Cloudflare Universal SSL: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/index.md
- AWS Free Tier credits and 6 month plan: https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/
- Oracle Always Free A1 cut: https://linuxiac.com/oracle-quietly-cuts-free-tier-ampere-a1-resources-in-half/
- Cloudflare R2 free tier: https://dev.to/0012303/cloudflare-r2-has-a-free-tier-s3-compatible-object-storage-with-zero-egress-fees-54a2
- W3Techs, Nginx: https://w3techs.com/technologies/details/ws-nginx
- Netcraft, July 2026 Web Server Survey: https://www.netcraft.com/blog/july-2026-web-server-survey
- PostgreSQL MCP read only bypass: https://dev.to/grove_chatforest/the-postgresql-mcp-server-read-only-protection-that-wasnt-2m88
