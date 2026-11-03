# Scope: Multi tenant booking platform

One codebase that gives each salon, clinic, and coach in Morocco its own branded booking site on its own subdomain, with its own availability rules and cash payment tracking; unlike the marketplaces already there, the business owns the page, payment stays cash first, and reminders go through WhatsApp. Built in 3 to 4 days as a portfolio piece for an agency, with tenant isolation as the headline.

**Build approach:** Tracer Bullet (prove one thin real thread through every layer first, then thicken one segment at a time, each end to end).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`; CI runs lint, typecheck, and tests on every push). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less: low risk features here carry `· Alpha` (verify only, no test suite) to save time and tokens (basis: tests go where a regression would break isolation, bookings, or money).

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | done |
| 2 | Tenant isolation & subdomain routing | Foundation | done |
| 3 | Data model | Foundation | in-progress |
| 4 | Design system & UI foundation | Foundation | done |
| 5 | Business signup & owner sign in | Slice 1 | planned |
| 6 | First booking loop | Slice 1 | planned |
| 7 | Live deployment | Slice 2 | planned |
| 8 | Staff & schedules | Slice 3 | planned |
| 9 | Slot engine & double booking guard | Slice 3 | planned |
| 10 | Bookings dashboard & cash tracking | Slice 4 | planned |
| 11 | WhatsApp shortcuts | Slice 4 | planned |
| 12 | Business branding | Slice 5 | planned |
| 13 | Platform landing page | Slice 5 | planned |
| 14 | Demo data | Slice 5 | planned |

## Foundations

### 1. Stack & architecture · done
Decide the stack and scaffold a runnable project, including lint, format, typecheck, and the CI pipeline, since every later slice builds on it and CI gates every commit (basis: foundations before features).
**Done when:** the stack is recorded in a spec (hosting with wildcard subdomains and HTTPS, auth, database, file storage for logos); the scaffold boots locally on subdomains like `atlas.localhost`; lint, typecheck, and tests run green in CI on every push.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`
- [x] Test it: `/test stack & architecture`
Spec [0001](../specs/0001-stack-architecture/index.md) · code in `web/`, `api/`, `shared/`, `infra/`, `.github/workflows/ci.yml`

### 2. Tenant isolation & subdomain routing · done
How every request finds its business from the subdomain, and how every read and write is forced to stay inside that business. This is the part agencies usually get wrong, so it is proven by tests, not promised (basis: OWASP Multi Tenant Security cheat sheet; OWASP Top 10 A01 Broken Access Control).
**Done when:** `atlas.` and `anfa.` resolve to different businesses; an unknown subdomain shows a clean "not found" page; reserved names (`www`, `admin`, `api`, …) are refused; a session from one business never works on another (host only cookies, no parent `Domain`); automated tests prove no business can read or change another's data.
- [x] Design it (spec): `/architect tenant isolation & subdomain routing`
- [x] Build it: `/develop tenant isolation & subdomain routing`
  - [x] Thin thread: shared host rules, `businesses` migration with its database locks, host guard, `GET /api/tenant`, Next.js proxy and pages; `atlas.` and `anfa.` show their own names, `pizzeria.` answers 404 (AC-1, AC-2, AC-3, AC-5, AC-6, AC-12, AC-14)
  - [x] Edges: Nginx `www` redirect and foreign host drop; request logs carry the business (AC-4, AC-13)
  - [x] Session check: `AuthGuard` refuses a token from another business, with a test token helper (AC-7)
  - [x] Proof harness: probe tables, catalog test, lint guard on `PrismaService` (AC-8, AC-9, AC-10, AC-11)
- [x] Verify it: `/check verify tenant isolation & subdomain routing`
Spec [0002](../specs/0002-tenant-isolation-subdomain-routing/index.md) · code in `shared/src/subdomain.ts`, `api/src/tenancy/`, `api/src/auth/`, `api/src/tenant/`, `api/prisma/migrations/`, `api/test/`, `web/proxy.ts`, `web/lib/`, `web/app/sites/`, `web/app/site-introuvable/`, `infra/nginx/dev.conf`

### 3. Data model · in-progress · Alpha
Core entities every slice builds on: businesses, owner, staff, services, who does which service, weekly hours, time off and closures, bookings, cash payments (basis: the data model is the costliest thing to redo).
**Done when:** one model fits salon, clinic, and coach; staff hours allow several ranges a day; prices are in MAD; times are stored so a legal time change never shifts an existing booking; group sessions and online payment can be added later without a breaking migration.
- [x] Design it (spec): `/architect data model`
- [x] Build it: `/develop data model`
  - [x] Schema and migration: nine Prisma models plus the handwritten SQL (checks, double booking and hours guards, payments trigger, delete revokes, row level security, UTC sessions), applied with no drift, catalog test green (AC-1, AC-2, AC-4, AC-5, AC-7 to AC-13, AC-15, AC-16)
  - [x] Wall clock helpers in `shared/` (AC-6)
  - [x] Dev seed with Salon Atlas, Clinique Anfa, and Coach Karim (AC-3, AC-14)
- [x] Verify it: `/check verify data model`
Spec [0003](../specs/0003-data-model/index.md) · code in `api/prisma/schema.prisma`, `api/prisma/migrations/20261102172612_data_model/`, `api/prisma/dev-seed.sql`, `api/test/db.ts`, `shared/src/wall-clock.ts`

### 4. Design system & UI foundation · done · Alpha
French visual language, layout, and base components, with one accent color per business so branding needs no new styles (basis: every page depends on it).
**Done when:** `design.md` covers type, color, spacing, and components; one accent token swaps the brand color per business; the booking page is designed for phones first; base components work by keyboard and meet WCAG 2.2 AA contrast.
- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: `/develop design system & UI foundation`
  - [x] Thin thread: shadcn setup (Radix, maia, Lucide), tokens and IBM Plex Sans, palette module with its contrast test, `accentColor` through the API and seed, business layout sets the color; `atlas.` terracotta, `anfa.` petrol, `karim.` olive (AC-1, AC-3, AC-4, AC-5, AC-6)
  - [x] Base components themed, with status badges, and the public `/design` gallery with the swatch switcher (AC-7, AC-11)
  - [x] Booking patterns, brand marks, three shells, display formats; placeholder pages moved onto the shells (AC-8, AC-9, AC-10, AC-12, AC-14, AC-15)
  - [x] `web/design.md` and the accessibility pass: `web-design-guidelines` review, keyboard, 360px, reduced motion (AC-2, AC-13, AC-16)
- [x] Verify it: `/check verify design system & UI foundation`
Spec [0004](../specs/0004-design-system-ui-foundation/index.md) · code in `web/app/globals.css`, `web/design.md`, `web/components/`, `web/app/design/`, `web/app/sites/[subdomain]/layout.tsx`, `web/lib/dashboard-nav.ts`, `shared/src/palette.ts`, `shared/src/format.ts`

## Slice 1: First booking, end to end

### 5. Business signup & owner sign in
On the platform's root domain, an owner creates a business (name, type, subdomain), becomes its first staff member, and lands in their dashboard. Leans on the stack and tenant isolation specs (basis: OWASP Authentication and Password Storage cheat sheets; OWASP API4 for rate limits).
**Done when:** a new subdomain works immediately with no manual step; taken or reserved subdomains are refused with a clear message; signup is rate limited; the owner signs in only on their own subdomain.
- [ ] Build it: `/develop business signup & owner sign in`

### 6. First booking loop
The thinnest real thread: the owner adds one service and business hours; a guest picks a service, a day, and an open slot, leaves name, phone, and email, and gets a confirmation page with a booking reference; the owner sees it in a simple list (basis: CNDP deliberation D-941-2025 and website compliance guidance).
**Done when:** a booking made on `atlas.` appears only in Atlas's dashboard; a booked slot disappears for everyone; Moroccan phone numbers are validated; a consent box (not ticked by default) and a short privacy notice sit on the form; no "reason for visit" field exists, so clinics never store health details.
- [ ] Build it: `/develop first booking loop`

## Slice 2: Live on real subdomains

### 7. Live deployment · Alpha
Put the thread online early, so wildcard subdomains and HTTPS are proven on day 2, not discovered on day 4 (basis: Tracer Bullet retires the deploy risk first).
**Done when:** the root domain and any business subdomain load over HTTPS; a business created live gets a working subdomain with no DNS step; pushes to the main branch deploy after CI passes; secrets stay out of the repo.
- [ ] Build it: `/develop live deployment`

## Slice 3: Staff & real availability

### 8. Staff & schedules · Alpha
Owner screens for staff, their weekly hours, days off, one off time blocks, business closures (like Eid), and which services each person does.
**Done when:** the Salon Atlas example works (Samira weekdays 9:00 to 17:00, Youssef Tuesday to Saturday 12:00 to 20:00, Samira on vacation August 10 to 15, salon closed on Eid); a one person business needs no extra setup.
- [ ] Build it: `/develop staff & schedules`

### 9. Slot engine & double booking guard · needs a decision
Turns each business's rules into open slots, and guarantees one slot is never sold twice. The heart of the app (basis: IANA time zone database; decree 2.26.530).
**Done when:** slots respect staff hours, service duration plus buffer, who can do the service, time off, closures, existing bookings, and the business's minimum notice and maximum booking window; customers pick "any staff" or a person, and one person businesses skip that step; two customers grabbing the same slot at once means exactly one wins; times stay correct across Morocco's legal time changes (permanent return to GMT on 20 September 2026), with no hardcoded offset.
- [ ] Design it (spec): `/architect slot engine & double booking guard`

## Slice 4: Run the day

### 10. Bookings dashboard & cash tracking
Where the owner runs the day: who is coming, who showed up, and what cash came in.
**Done when:** day and week views grouped by staff; statuses confirmed, done, no show, cancelled; the owner marks a booking paid in cash with the amount; daily and weekly totals show expected versus collected; totals never mix businesses.
- [ ] Build it: `/develop bookings dashboard & cash tracking`

### 11. WhatsApp shortcuts · Alpha
Plain WhatsApp links that fit how Moroccans actually book and get reminded, with no messaging API (basis: market scan, WhatsApp is the main booking channel).
**Done when:** the confirmation page has a "send to WhatsApp" button with the booking details prewritten; each booking in the dashboard has a "remind on WhatsApp" link that opens a prewritten reminder to the customer's number.
- [ ] Build it: `/develop whatsapp shortcuts`

## Slice 5: Showcase

### 12. Business branding · Alpha
Logo, accent color, address, phone, and a short description on each booking page: the most visible proof of multi tenancy in a demo.
**Done when:** `atlas.` and `anfa.` look clearly different; uploads accept images only, under a size cap; a business can change only its own branding.
- [ ] Build it: `/develop business branding`

### 13. Platform landing page · Alpha
The root domain explains the product in French and leads to the three demo businesses and to signup (basis: Google SEO Starter Guide; Open Graph protocol; Core Web Vitals).
**Done when:** the landing page links work live; titles, descriptions, social cards, and a sitemap are in place, and each booking page carries its own business title and description; landing and booking pages score "good" on Core Web Vitals on a phone.
- [ ] Build it: `/develop platform landing page`

### 14. Demo data · Alpha
Salon Atlas, Clinique Anfa, and Coach Karim, each with staff, services, hours, a week of bookings, and cash records, so the demo always looks alive.
**Done when:** one command recreates the three businesses, and running it again resets the demo cleanly.
- [ ] Build it: `/develop demo data`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Online payment through CMI**: deposit or full prepayment, each business with its own CMI store credentials · needs a decision · GA
- **Automatic WhatsApp reminders**: sent before the visit through a messaging API · needs a decision
- **Email notifications**: booking confirmations and new booking alerts · needs a decision
- **Group sessions with seats**: coach classes with a capacity, like "7/12 places left" · needs a decision
- **Customer cancel link**: a secure link to cancel and free the slot
- **Customer accounts**: sign in and booking history
- **Staff logins**: staff see their own agenda, with roles · needs a decision
- **Arabic interface**: language switch with right to left layout
- **Platform super admin**: list and suspend businesses
- **Subscription billing**: businesses pay for the platform · needs a decision · GA
- **Full CNDP compliance**: declaration, data access and deletion, retention rules · needs a decision · GA
- **Analytics & error monitoring** · needs a decision
- **Password reset by email**: owners reset a forgotten password; needs an email provider · needs a decision (from spec 0001)

## References

**Market scan (October 2026)**
- Medical booking in Morocco is crowded with directories (DabaDoc since 2014, Med.ma, Toubib.ma); salons are served by marketplaces like Fresha that push online prepayment; no Morocco focused tool for coaches was found.
- WhatsApp is the main booking and reminder channel; SMS to +212 numbers through global tools is reported unreliable. These figures come from vendors, so treat them as direction, not fact.
- Morocco returned to GMT permanently on 20 September 2026 (decree 2.26.530), ending GMT+1 and the Ramadan clock switches.
- CNDP deliberation D-941-2025 (November 2025) covers medical appointment booking under law 09-08: consent and prior information are required.

**Practices & standards**
- Foundations before features; the data model is the costliest thing to redo.
- Tracer Bullet: one thin real thread through every layer (including deploy) before any layer is built out.
- Tests go where a regression would break isolation, bookings, or money; everything else is verified on the real app.

**Links** (web verified, October 2026)

Security
- [Multi Tenant Security, OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html): tenant identification, database isolation, cross tenant access, rate limiting.
- [A01 Broken Access Control, OWASP Top 10:2025](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/)
- [Session Management, OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): leave the cookie `Domain` attribute unset to avoid cross subdomain cookie attacks.
- [Set-Cookie header, MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): host only cookies versus the `Domain` attribute.
- [Authentication, OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Password Storage, OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [API4:2023 Unrestricted Resource Consumption, OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption): rate limits on public endpoints.

Time
- [IANA Time Zone Database](https://www.iana.org/time-zones): check that the runtime's time zone data includes Morocco's September 2026 change.
- [FNH: definitive return to GMT on 20 September 2026](https://fnh.ma/article/alaune/maroc-retour-heure-gmt-dimanche-20-septembre-2026)
- [Hespress: decree 2.26.530](https://fr.hespress.com/480202-maroc-le-retour-a-lheure-gmt-officiellement-acte-a-partir-du-20-septembre.html)

Performance, accessibility, SEO
- [Web Vitals, web.dev](https://web.dev/articles/vitals): "good" means LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less.
- [WCAG 2.2, W3C Recommendation](https://www.w3.org/TR/WCAG22/)
- [SEO Starter Guide, Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [The Open Graph protocol](https://ogp.me/)

Moroccan law
- [Loi 09-08, Bulletin officiel (CNDP)](https://www.cndp.ma/wp-content/uploads/2023/11/Loi-09-08-Fr.pdf)
- [Conformité des sites web, CNDP](https://www.cndp.ma/conformite-des-sites-web/): notify the CNDP, inform users, consent box not ticked by default.
- [Délibération D-941-2025, CNDP](https://www.cndp.ma/wp-content/uploads/2025/12/Deliberation-n%c2%b0-D-941-2025-du-28112025-relative-au-modele-de-demande-dautorisation-type-pour-les-traitements-de-suivi-des-patients-20251203.pdf): patient follow up processing, including medical appointment booking.

Market
- [Telquel: DabaDoc](https://telquel.ma/2014/02/11/dabadoc-lapplication-de-prise-de-rendez-vous-medical-en-ligne_11040)
- [Telquel: Med.ma](https://telquel.ma/2021/10/31/med-ma-votre-medecin-a-portee-de-main_1741788)
- [Fresha: Casablanca beauty salons](https://www.fresha.com/lp/en/bt/beauty-salons/in/ma-dar-el-beida)
- [Marocibot: salon booking tools compared for Morocco](https://marocibot.pages.dev/journal/fresha-vs-setmore-vs-calendly-best-salon-booking-software-in-morocco-2026) (vendor content)

## Legend

**The decision box.** A feature that needs a decision carries one box whose label ends with `(spec)` (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture). Skills find it by that `(spec)` suffix, never by an exact label. Every other box is an execution box, and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `planned` (no decision owed) | `/scope` | one box: `Build it: /develop <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha and up, `Test it` Beta and up, `Review it` + `Document it` GA); any follow up it surfaced enrolled |
| `in-progress` (building) | `/develop` | milestone boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` after `/develop`; `Alpha` after `/check verify`; `Beta`/`GA` after `/test`) is the suggested point to call it done |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (removed from scope, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag means it inherits.
- **Workflow tier tag** beside a heading (e.g. `· Alpha`) sets that one feature's rigor above or below the project default; no tag inherits the default. It decides the feature's check boxes and each skill's next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust the build time self check in `/develop`); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
