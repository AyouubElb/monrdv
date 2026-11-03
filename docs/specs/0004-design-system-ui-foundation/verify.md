# Verify: Design system and UI foundation · spec 0004 · updated 2026-11-03
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Before you start: `pnpm dev`, then `pnpm --filter api db:seed:dev` so the three businesses carry their colors.

## UI / manual
- [ ] Open `http://atlas.localhost/` → the "Prendre rendez-vous" button is terracotta `#ab4a28`; the page source holds `:root{--primary:#ab4a28}` → AC-4
- [ ] Open `http://anfa.localhost/` → the primary button is petrol `#0f6e6e` → AC-4
- [ ] Open `http://karim.localhost/` (no color stored) → the primary button is olive `#5c6a24` → AC-4
- [ ] On `http://localhost/design`, click the Terracotta swatch, then "Ouvrir une fenêtre" → the Dialog's "Annuler le rendez-vous" button is terracotta; open "Ouvrir un panneau" and "Afficher une notification" → the Sheet button and the toast follow the same color → AC-4, AC-11
- [ ] Run `UPDATE businesses SET accent_color = '#ffff00' WHERE subdomain = 'atlas';` in the dev database, reload `atlas.localhost` → the page is olive and its HTML contains no `ffff00`; reseed afterwards → AC-5
- [ ] Open `http://localhost/` and `http://localhost/design` → primary is olive and the clay chip (`#dca487`) carries ink text; no business page shows clay → AC-6
- [ ] On `/design`, check every AC-7 component shows, with the status badges "Confirmé", "Terminé", "Absent", "Annulé", "Payé" in their fixed colors, unchanged when you switch swatches → AC-7
- [ ] On `/design`, the button and field matrices show rest, hover, keyboard focus, pressed, disabled, error, and loading states; the color pairs show measured ratios; the type scale, spacing, radius, and elevation are listed → AC-11
- [ ] On `/design`, in the phone mocks, pick a service, a day, and a time → each selection shows (`aria-pressed`), "Continuer" enables only once the step is answered, the full day (jeudi 5) cannot be picked → AC-8
- [ ] On `/design`, the "Cadres de page" section shows the dashboard shell with its six menu items and the platform shell with "Créer mon espace"; resize below 1024px → the dashboard sidebar becomes a menu button that opens a Sheet → AC-9
- [ ] Open `http://atlas.localhost/design` → 404 with the French "Cette page n’existe pas" page; `http://nope.localhost/` → 404 "Cette adresse ne correspond à aucun établissement" → AC-11, AC-10
- [ ] At 360px wide, open `atlas.localhost` and `/design` → no sideways page scroll; only the day strip scrolls inside itself; inputs are 16px → AC-14
- [ ] On `/design`, the business marks show `SA`, `CK`, `Z`, and the long clinic name wraps to two lines then ends with an ellipsis → AC-15
- [ ] Tab through `/design` from the top → the first stop is "Aller au contenu", every stop shows a 2px accent outline, Enter on a time slot selects it, Escape closes the Dialog and focus returns to its trigger → AC-13
- [ ] Turn on reduced motion in the OS or browser, open the Dialog → it appears without animation → AC-13
- [ ] Measure booking controls → slots 48px, days 80px, the action bar button 48px tall → AC-13

## Commands
- [ ] `pnpm --filter @repo/shared test` → `palette.test.ts` passes (10 swatches at 4.5:1 on white and `#f4f1ea`, status pairs, ink on clay, sand pairs, input border at 3:1) and `format.test.ts` passes (`150 DH`, `85,50 DH`, `0 DH` with a no break space, `14:30`, `mar. 3 nov.`, `mardi 3 novembre`) → AC-3, AC-12
- [ ] `TZ=Asia/Tokyo pnpm --filter @repo/shared test` → the same tests pass, so formats never shift with the machine time zone → AC-12
- [ ] `curl -s -H "X-Forwarded-Host: atlas.localhost" http://localhost:3001/api/tenant` → JSON includes `"accentColor":"#ab4a28"`; for `karim.localhost` → `"accentColor":null` → AC-4
- [ ] `grep -rnE "(zinc|slate|gray|neutral|stone)-[0-9]" web/app web/components` → no match → AC-10
- [ ] Run axe (for example `@axe-core/playwright`) on `http://localhost/design` and `http://atlas.localhost/` → no serious or critical violation → AC-13
- [ ] `ls web/components.json web/design.md` and read `components.json` → `"style": "radix-maia"`, `"iconLibrary": "lucide"`; `design.md` has the character, build mandate, token pointers, inventory, booking flow, formats, and accessibility rules → AC-1, AC-2
- [ ] Load `atlas.localhost` with the browser network panel open → no request to `fonts.googleapis.com` or `fonts.gstatic.com` → AC-1
- [ ] Run the `web-design-guidelines` review on `web/components/` and `web/app/design/` → no unresolved finding (the kept exceptions are listed in the build report) → AC-16
- [ ] `pnpm --filter web build` → succeeds; `/design` is static (○) → AC-11

## Value sourcing (each value's source, varied)
- [ ] Accent color: change Anfa's `accent_color` to another palette value (`#7a3e8e`) in SQL → `anfa.localhost` turns plum; set it to `#7A3E8E` (upper case) → still plum; set `NULL` → olive. Reseed afterwards → AC-4, AC-5
- [ ] Text on accent: on every swatch in `/design`, the primary button text stays white and readable → AC-3
- [ ] Tints and focus ring: switch swatches on `/design` → the selected day tint, hover tints, and the focus outline follow the swatch → AC-11
- [ ] Business name and initials: rename Atlas in SQL to "Zen" → the header shows `Z` and "Zen"; reseed afterwards → AC-15
- [ ] Root domain colors: `localhost/` is olive and clay with no `<style>` override in its HTML → AC-6
- [ ] Gallery swatch list: the switcher shows the 10 palette names in order, Olive first → AC-3, AC-11
- [ ] Dashboard menu: set one item in `web/lib/dashboard-nav.ts` to `ready: true` and mount `DashboardShell` without `items` → only that item renders → AC-9
- [ ] Status badges: each `StatusBadge` status renders its French label in its fixed color on every swatch → AC-7
- [ ] Price, time, day text: the "Formats d’affichage" block on `/design` shows `150 DH`, `85,50 DH`, `1 h 30`, `14:30`, `mar. 3 nov.`, `mardi 3 novembre` → AC-12

## Acceptance-criteria coverage
- AC-1 … commands (components.json, fonts) · AC-2 … design.md command · AC-3 … palette test, text on accent · AC-4 … three subdomains, Dialog, API, accent sourcing · AC-5 … `#ffff00` step, case and null variants · AC-6 … root domain steps · AC-7 … gallery components, status badges · AC-8 … phone mocks · AC-9 … shells, dashboard menu ready flag · AC-10 … raw palette grep, placeholder pages · AC-11 … gallery, swatch switcher, `atlas.localhost/design` 404, static build · AC-12 … format tests in two time zones · AC-13 … axe, keyboard, reduced motion, control heights · AC-14 … 360px · AC-15 … business marks · AC-16 … guidelines review
