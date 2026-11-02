# 0004. Design system and UI foundation

**Date**: 2026-11-02
**Status**: Proposed

## Summary

This spec sets MonRDV's look and the building blocks every screen reuses: a calm, warm light theme with an olive and clay platform palette, the IBM Plex Sans font, and shadcn/ui components in the soft `maia` style. Each business picks one color from a list of 10 tested colors, and that single value repaints its buttons, links, and focus rings, so branding never needs new styles and can never fail contrast. The feature also builds the phone booking pieces (service card, day strip, time slots, bottom bar), three empty page frames, and a public `/design` gallery page where you review everything and switch colors live.

## Requirements

**User stories**:
- As a customer booking on my phone, I want large, clear, readable controls so that I can book with my thumb in under a minute.
- As a business owner, I want my booking page in my own color so that it feels like my business, not a marketplace.
- As the developer, I want one token file and one component set so that every later feature looks consistent without design work.
- As an agency reviewing the portfolio, I want a public design system page so that I can judge the UI craft at a glance.

**Acceptance criteria**:
- **AC-1**: shadcn/ui is set up in `web/` with the Radix primitives, the `maia` style, and Lucide icons (`web/components.json`). `web/app/globals.css` holds the token set from *Tokens* below and nothing else defines colors. IBM Plex Sans (400, 500, 600, 700) loads through `next/font`, so the browser makes no request to Google.
- **AC-2**: `web/design.md` exists with the character, the build mandate, pointers to the tokens in `globals.css`, the component inventory, the booking flow pattern, the display formats, and the accessibility rules from this spec.
- **AC-3**: `shared/src/palette.ts` exports the 10 business colors from *Business palette* in that order, `DEFAULT_ACCENT` (`#5c6a24`, Olive), and `paletteColorOrDefault(value)`. A Vitest test asserts every swatch reaches 4.5:1 against white and against the page background `#f4f1ea`, every status text color reaches 4.5:1 on its tint, ink reaches 4.5:1 on the clay highlight, ink and `#6b6358` reach 4.5:1 on the sand surface `#ebe5d8`, and the input border reaches 3:1 on white and on the page background.
- **AC-4**: `GET /api/tenant` returns `accentColor` (`#rrggbb` or `null`). With the dev seed, the primary button on `atlas.localhost` is terracotta `#ab4a28`, on `anfa.localhost` petrol `#0f6e6e`, and on `karim.localhost` (no color) olive `#5c6a24`. Dialogs, sheets, and toasts opened on those pages use the same color.
- **AC-5**: A business whose `accent_color` holds a valid hex that is not in the palette (for example `#ffff00` set by hand in SQL) renders in the default olive. The stored string is never written into the page; only the matching palette constant is.
- **AC-6**: Root domain pages (platform home, signup later, `/design` defaults) use olive as primary and clay `#dca487` as the highlight. The clay highlight never appears on business pages and never carries text other than ink.
- **AC-7**: These shadcn components are installed and themed: Button, Input, Label, Field, Textarea, Select, Checkbox, Radio Group, Card, Badge, Alert, Dialog, Sheet, Dropdown Menu, Separator, Skeleton, Spinner, Sonner (toasts), Avatar, Empty. Booking status badges exist as Badge variants `confirmed` ("Confirmé"), `done` ("Terminé"), `no_show` ("Absent"), `cancelled` ("Annulé"), plus `paid` ("Payé"), using the fixed status colors, never the accent.
- **AC-8**: Booking pattern components exist in `web/components/booking/`: `StepHeader` (back arrow, "Étape 2 sur 4", step title), `ServiceCard` (name, duration, price), `DayStrip` (days scrolling sideways inside their own row), `SlotGrid` (time buttons, selected state marked with `aria-pressed`), and `StickyActionBar` (one main button fixed to the bottom of the screen). They take plain props and fetch nothing.
- **AC-9**: Three shells exist in `web/components/shells/`. `BookingShell`: business initials (or logo later) and name on top, one centered column at most 480px wide, a slot for `StickyActionBar`, a small "Réservation en ligne par MonRDV" footer. `DashboardShell`: a sidebar from 1024px wide, a top bar with a menu button opening a Sheet below that, nav items read from one list in `web/lib/dashboard-nav.ts` (Agenda, Réservations, Prestations, Équipe, Caisse, Ma page), each with a `ready` flag, and only `ready` items rendered. `PlatformShell`: header with the MonRDV wordmark and a "Créer mon espace" button, plus a footer.
- **AC-10**: The existing placeholder pages use the new look: the root page sits in `PlatformShell`, the business page in `BookingShell` and shows a primary button, the "site introuvable" page uses the platform look. No `zinc` or other raw Tailwind palette class remains in `web/app/`.
- **AC-11**: `http://localhost/design` is public on the root domain (production too) and shows: color tokens with their contrast ratios, the type scale, spacing and radius, every AC-7 component in its default, hover, keyboard focus, disabled, error, and loading states where they apply, the booking patterns as a phone mock with French sample data from Salon Atlas, the three shells, and a swatch switcher. Clicking a swatch recolors every component on the page, including an open Dialog. `atlas.localhost/design` answers the existing 404 page.
- **AC-12**: `shared/src/format.ts` exports `formatPrice(centimes)` returning `150 DH` for `15000` and `85,50 DH` for `8550` (no break space before `DH`), `formatTime` returning `14:30`, and `formatDay` returning `mar. 3 nov.` (short) or `mardi 3 novembre` (long), all from a wall clock value (spec 0003). A unit test covers the price cases.
- **AC-13**: axe (the free accessibility scanner) reports no serious or critical violation on `/design` and on `atlas.localhost`. Every control is reachable and usable by keyboard with a visible focus ring. Booking controls (slots, days, the action bar button) are at least 44px tall. Motion is limited to short color and opacity transitions and stops under `prefers-reduced-motion`.
- **AC-14**: At 360px wide, the booking shell and patterns cause no sideways scroll of the page (only `DayStrip` scrolls, inside itself), text never overlaps, and inputs use 16px text so phones do not zoom in on focus.
- **AC-15**: Without a logo, the business mark shows initials from the first letters of the first two words of the name ("Salon Atlas" → `SA`, "Coach Karim" → `CK`, "Zen" → `Z`), white on the accent color. A business name longer than the header wraps to two lines, then ends with an ellipsis.
- **AC-16**: A `web-design-guidelines` review of `web/components/` and `web/app/design/` leaves no unresolved finding.

## Decision

**Chosen option**: Option 1: shadcn/ui themed through CSS variables, with one runtime accent variable per business picked from a curated palette.

The platform look (olive, clay, warm neutrals, IBM Plex Sans, `maia`) lives in `globals.css`. Each business overrides only `--primary`, with a value taken from a fixed list of 10 colors that are tested for contrast.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`, follow its `design-system.md` workflow for tokens, radius, fonts, and the gallery page) · `web-design-guidelines` (`vercel-labs/agent-skills`, `.claude/skills/web-design-guidelines/`, the review in AC-16) · `frontend-design` (user level skill, not in the repo: art direction for `design.md` and the gallery) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `playwright-cli` (`microsoft/playwright-cli`, `.claude/skills/playwright-cli/`, for the axe check in verify) · `vitest-unit-testing` (`.claude/skills/vitest-unit-testing/`)

## Rationale

Reasoning, options, the color research, and every contrast check: see [rationale.md](rationale.md).

## Feature design

### Character

Calm and warm. A quiet, warm off white frame lets each business's color and name be the star. Soft corners, roomy spacing, controls sized for thumbs. One font. No decorative motifs, no gradients, no illustrations. French copy, short and direct, from the customer's side ("Choisissez une prestation", "Continuer").

### Tokens (`web/app/globals.css`, light only)

| Role | Token | Value | Notes |
|---|---|---|---|
| Page background | `--background` | `#f4f1ea` | Warm plaster |
| Card, popover, input fill | `--card`, `--popover` | `#ffffff` | |
| Text (ink) | `--foreground` | `#2b2a24` | 12.76:1 on background |
| Secondary text | `--muted-foreground` | `#6b6358` | 5.24:1 on background, 5.91:1 on white, 4.71:1 on sand |
| Sand surface | `--muted`, `--secondary` | `#ebe5d8` | Ink (11.46:1) and secondary text only; never under accent text |
| Hairline border | `--border` | `#e3ddd0` | Cards and separators (decorative) |
| Input border | `--input` | `#8c8374` | 3.74:1 on white, 3.32:1 on background |
| Primary | `--primary` | `#5c6a24` (olive) | Overridden per business; buttons, links, selected states |
| Text on primary | `--primary-foreground` | `#ffffff` | Every palette color passes with white |
| Soft primary | `--primary-soft` | `color-mix(in oklab, var(--primary) 12%, white)` | Selected day background, hover tints |
| Focus ring | `--ring` | `var(--primary)` | 2px ring plus 2px offset |
| Platform highlight | `--highlight` / `--highlight-foreground` | `#dca487` / `#2b2a24` | Root domain only; fill only, 6.65:1 with ink |
| Danger | `--destructive` | `#b42318` | Errors, delete actions |
| Status confirmed / paid | `--status-confirmed` / `-soft` | `#1a6b43` on `#e4efea` | 5.52:1 |
| Status done | `--status-done` / `-soft` | `#3f4a5a` on `#e8e9eb` | 7.39:1 |
| Status no show | `--status-noshow` / `-soft` | `#8a4f00` on `#f4ebe0` | 5.57:1 |
| Status cancelled | `--status-cancelled` / `-soft` | `#b42318` on `#f6e5e3` | 5.40:1 |

- **Type**: IBM Plex Sans as `--font-sans`, with a system fallback stack. Scale: 12 (fine print), 14 (labels, captions), 16 (body and every input), 18 (lead), 20 (card title), 24 (section title), 30 (page title on phones, 36 from 768px). Headings 600, body 400, buttons 600. `tabular-nums` on prices, times, and totals. Headings use `text-wrap: balance`.
- **Spacing**: the Tailwind 4px scale. Page side padding 16px on phones, 24px from 768px.
- **Radius**: controls 12px, cards 16px, badges and chips fully round (the `maia` defaults, pinned in `@theme inline`).
- **Elevation**: hairline borders first; one soft shadow for popovers, sheets, and the sticky bar only.
- **Breakpoints**: Tailwind defaults. Design and check at 360px first, then 768px and 1280px.
- **Wordmark**: text only, "Mon" in ink and "RDV" in `--primary`, Plex Sans 600.

### Business palette (`shared/src/palette.ts`)

| Order | Name | Hex | With white | On `#f4f1ea` |
|---|---|---|---|---|
| 1 | Olive (default) | `#5c6a24` | 5.93 | 5.26 |
| 2 | Majorelle | `#6050dc` | 5.71 | 5.06 |
| 3 | Cobalt | `#1f3fa7` | 9.02 | 8.00 |
| 4 | Pétrole | `#0f6e6e` | 6.04 | 5.36 |
| 5 | Émeraude | `#2a7550` | 5.59 | 4.95 |
| 6 | Terracotta | `#ab4a28` | 5.61 | 4.98 |
| 7 | Framboise | `#b8336a` | 5.65 | 5.00 |
| 8 | Prune | `#7a3e8e` | 7.22 | 6.40 |
| 9 | Ocre | `#9a5b0a` | 5.42 | 4.80 |
| 10 | Encre | `#2f2a24` | 14.21 | 12.60 |

Shape: `export const BUSINESS_PALETTE = [{ name: 'Olive', hex: '#5c6a24' }, …] as const`. `paletteColorOrDefault(value: string | null)` returns the palette entry's own `hex` when `value` (lowercased) matches one, else `DEFAULT_ACCENT`. Feature 12 reuses `BUSINESS_PALETTE` for its picker and its API check.

### Applying the accent

The business layout `web/app/sites/[subdomain]/layout.tsx` (new) reads the business with `getCurrentBusiness()` (already cached per request), computes `const accent = paletteColorOrDefault(business?.accentColor ?? null)` (a missing business falls back to the default here; the page itself still answers 404 as today), and renders `<style>{`:root{--primary:${accent}}`}</style>` before its children. Setting it on `:root` (not on a wrapper `div`) makes portals (Dialog, Sheet, toasts render at the end of `<body>`) pick it up too. It is server rendered, so the color is right on first paint with no JavaScript. `--ring` and `--primary-soft` follow automatically because they reference `var(--primary)`.

### Booking flow pattern (phones first)

One question per screen: 1 prestation → 2 personne (skipped when the business has one staff member) → 3 jour et heure → 4 coordonnées → confirmation. Each step screen is `StepHeader`, the content, and `StickyActionBar` with "Continuer" (disabled until the step is answered). The back arrow returns to the previous step. Feature 6 builds the steps; this feature builds the pieces and shows them on `/design`.

### Display formats (`shared/src/format.ts`)

| Value | Format | Example |
|---|---|---|
| Price | Whole dirhams, decimals only when not zero, comma decimal, no break space, `DH` | `150 DH`, `85,50 DH` |
| Time | 24 hour, colon | `14:30` |
| Day, short | date-fns `fr`, `EEE d MMM` | `mar. 3 nov.` |
| Day, long | date-fns `fr`, `EEEE d MMMM` | `mardi 3 novembre` |

Inputs are wall clock values from spec 0003's helpers, so formatting never shifts time zones.

### Component inventory

| Group | Components | Built in this feature |
|---|---|---|
| Controls | Button, Input, Label, Field, Textarea, Select, Checkbox, Radio Group | shadcn, themed |
| Feedback | Alert, Badge (with status variants), Skeleton, Spinner, Sonner, Empty | shadcn, themed |
| Containers and overlays | Card, Dialog, Sheet, Dropdown Menu, Separator, Avatar | shadcn, themed |
| Booking patterns | StepHeader, ServiceCard, DayStrip, SlotGrid, StickyActionBar | new, `web/components/booking/` |
| Shells | BookingShell, DashboardShell, PlatformShell | new, `web/components/shells/` |
| Brand | Wordmark, BusinessMark (initials, logo later) | new, `web/components/brand/` |
| Gallery only | AccentSwitcher (client component) | new, `web/app/design/` |

Later features add what they need (Calendar, Table, Tabs) through the shadcn CLI, themed by the same tokens. Forms with React Hook Form and Zod (spec 0001) arrive with the first real form in feature 5.

**Data model sketch**: no schema change. Reads the existing optional `businesses.accent_color` (`#rrggbb`, checked by the database, spec 0003). The dev seed sets `atlas` → `#ab4a28`, `anfa` → `#0f6e6e`, `karim` → `NULL`.

**State transitions**: none.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/tenant` (changed) | GET | business from the host (spec 0002) | `subdomain`, `name`, `timezone`, `accentColor` (`string \| null`, new) | public | 404 unknown business |

`TenantInfo` in `shared/src/api-types.ts` and the response DTO gain `accentColor: string | null`; the service adds `accentColor: true` to its `select`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Business page render | Accent color | `businesses.accent_color` → `GET /api/tenant` `accentColor` → `paletteColorOrDefault` |
| Business page render | Text on accent | Always white (palette rule, proven by the AC-3 test) |
| Business page render | Selected and hover tints, focus ring | Derived in CSS from `--primary` (`color-mix`, `var`) |
| Business page render | Business name | `GET /api/tenant` `name` |
| Business page render | Initials | Derived from `name`: first letter of the first two words, uppercased |
| Root domain render | Primary and highlight | `globals.css` defaults (olive, clay) |
| Gallery switcher | Swatch list and names | `BUSINESS_PALETTE` from `shared/` |
| Gallery switcher | Current accent | Client state in `AccentSwitcher`, written to `:root` as `--primary` |
| Gallery samples | Services, days, slots, prices | Static French sample data in `web/app/design/` (Salon Atlas) |
| Dashboard menu | Items and which ones show | `web/lib/dashboard-nav.ts` list with `ready` flags |
| Status badges | Label and colors | Badge variant per `BookingStatus` value (spec 0003) plus `paid`; fixed status tokens |
| Price, time, day text | Formatted string | `shared/src/format.ts` from centimes or wall clock values |

**Key invariants**:
- Only `globals.css` defines colors. Components use tokens (`bg-primary`, `text-muted-foreground`), never raw palette classes or hex values.
- A business changes only `--primary`. Nothing else in the theme is per business.
- Every color written into a page as CSS comes from a constant in `shared/src/palette.ts`, never from a stored or user supplied string.
- Every palette color passes 4.5:1 with white text and as text on `#f4f1ea`; adding a color means it must pass the AC-3 test.
- Status colors never use the accent, so "Confirmé" reads the same on every business.
- The clay highlight carries only ink text and appears only on root domain pages.
- Inputs use 16px text; booking controls are at least 44px tall.

**Security model**: no new data and no writes. The accent is public business data already served by a public endpoint. The one injection risk is writing a string into a `<style>` tag; it is closed because only palette constants are ever written (AC-5), on top of the database format check. `/design` is static, public, and holds only sample data, no real business or customer data.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: open `atlas.localhost`, `anfa.localhost`, `karim.localhost`; the primary button is terracotta, petrol, olive; open a Dialog on Atlas and it is terracotta too, verifies **AC-4**.
- Failure case: set Atlas's `accent_color` to `#ffff00` in SQL; the page renders olive and the HTML contains no `#ffff00`, verifies **AC-5**.
- Contrast: the palette test fails if any swatch, status pair, highlight pair, or input border drops below its threshold, verifies **AC-3**.
- Money format: `formatPrice(15000)` → `150 DH`, `formatPrice(8550)` → `85,50 DH`, `formatPrice(0)` → `0 DH`, verifies **AC-12**.
- Accessibility: axe on `/design` and `atlas.localhost` shows no serious or critical violation; tab through `/design` and every control shows the ring, verifies **AC-13**.
- Phone: at 360px the booking mock has no sideways page scroll, verifies **AC-14**.
- Isolation of the gallery: `atlas.localhost/design` shows the 404 page, verifies **AC-11**.

## Build plan

Tracer Bullet: the first slice pushes one themed button through every layer (database seed, API, shared palette, layout, CSS) so the per business color is real on day one; later slices widen the component set.

1. **Thin thread, the accent end to end.**
   1. Run `shadcn init` in `web/` with the Radix base, the `maia` style, and Lucide (`--base radix --preset maia`; confirm the flags with `npx shadcn@latest init --help`), then `add button`, satisfies **AC-1**
   2. Replace the placeholder tokens in `globals.css` with the *Tokens* table; load IBM Plex Sans with `next/font/google` as `--font-sans`, satisfies **AC-1**, **AC-6**
   3. Add `shared/src/palette.ts` and its contrast test, satisfies **AC-3**
   4. Add `accentColor` to the tenant DTO, service `select`, and `TenantInfo`; set the seed colors, satisfies **AC-4**
   5. Add `web/app/sites/[subdomain]/layout.tsx` writing `--primary` on `:root`; show a primary Button on the business placeholder page, satisfies **AC-4**, **AC-5**
2. **Base components and the gallery.**
   1. `shadcn add` the AC-7 components; add the status Badge variants; pin radius and control heights per the `shadcn` skill's `design-system.md`, satisfies **AC-7**
   2. Build `web/app/design/page.tsx`: tokens with ratios, type scale, spacing, radius, every component in its states, and `AccentSwitcher`, satisfies **AC-11**
3. **Booking patterns, shells, formats.**
   1. Add `shared/src/format.ts` with its price test, satisfies **AC-12**
   2. Build the booking patterns and `BusinessMark`, `Wordmark`, satisfies **AC-8**, **AC-15**
   3. Build the three shells and `web/lib/dashboard-nav.ts`, satisfies **AC-9**
   4. Move the root, business, and not found placeholder pages onto the shells; remove raw palette classes; add the phone mock and shells to `/design`, satisfies **AC-10**, **AC-11**, **AC-14**
4. **Document and prove.**
   1. Write `web/design.md` (character, build mandate, token pointers, inventory, flow, formats, accessibility rules), satisfies **AC-2**
   2. Run the `web-design-guidelines` review on `web/components/` and `web/app/design/`, fix findings; check keyboard, 360px, and reduced motion by hand, satisfies **AC-13**, **AC-14**, **AC-16**

## Consequences

**Positive**:
- `atlas.` and `anfa.` look like two brands from day one, with zero per business CSS.
- No business can ever pick an unreadable color, and a test proves it.
- Every later feature builds from ready components and frames, so screens stay consistent without design work.
- The public `/design` page is a portfolio piece on its own.

**Negative / tradeoffs**:
- A business with an exact brand color gets the nearest of 10 swatches, not its own hex.
- The olive primary and the green "Confirmé" badge sit close in hue on root domain and dashboard pages; the badge shape and label carry the meaning, not color alone.
- Light only: dark mode later means a second token set and a second contrast pass over all 10 swatches.
- shadcn components are copied into `web/components/ui/`, so upstream fixes arrive only when you run the CLI's update yourself.
- The `web-design-guidelines` skill fetches its rules from Vercel's GitHub on each run, so the review needs network access and its rules can change between runs.
- A public `/design` page is one more route to keep working as components change.

**Neutral**:
- No migration; one API response field added.
- Feature 12 (branding) shrinks to the owner's picker and logo upload, reusing `BUSINESS_PALETTE`.
- Two palette colors from the research were darkened slightly (Terracotta `#b5502c` → `#ab4a28`, Émeraude `#2f7d55` → `#2a7550`) to pass on the olive trio's background.

## Follow-up

- [ ] Root `AGENTS.md` does not exist yet. Its `## Agent skills` section should list `web-design-guidelines` (`.claude/skills/web-design-guidelines/`, UI review rules) with the other project wide skills, and its `Declined:` line should record the shadcn MCP server, so it is not offered again.
- [ ] `frontend-design` lives in your user skills, not in the repo, so another machine or CI agent will not have it. Consider installing it into `.claude/skills/` (Anthropic's `anthropics/skills` collection) so builds stay reproducible.
- [ ] Feature 12 (business branding): the API must accept only `BUSINESS_PALETTE` values for `accent_color`, and the picker shows the 10 swatches by French name.
- [ ] Feature 6 (first booking loop): build the four steps from `StepHeader`, `ServiceCard`, `DayStrip`, `SlotGrid`, `StickyActionBar` inside `BookingShell`.
- [ ] Feature 5 (signup and sign in): mount `DashboardShell` and `PlatformShell`, and add React Hook Form with the shadcn `Field` pattern for the first real form.
