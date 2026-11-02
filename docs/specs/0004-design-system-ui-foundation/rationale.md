# 0004. Design system and UI foundation: rationale

The decision record for [index.md](index.md). `/develop` does not need this file.

## Context

Every screen in MonRDV (booking pages, the owner dashboard, the landing page) is still a placeholder; `globals.css` says so. Spec 0001 settled Tailwind CSS v4 and shadcn/ui and left the look to this feature. Without a shared system, each of the next ten features would invent its own colors, spacing, and components, and the demo would look stitched together.

The product is multi tenant: the same pages serve Salon Atlas, Clinique Anfa, and Coach Karim, and the most visible proof of that in a demo is each business looking like itself. Spec 0003 already stores an optional `accent_color` per business, checked only for the `#rrggbb` format. Any color an owner can pick must stay readable (WCAG 2.2 AA asks 4.5:1 for text), and a bright yellow button with white text sits near 1.6:1.

Most customers book on a phone, often from a WhatsApp link, so the booking page must work one handed at 360px wide. The screens are French only for now, with Arabic deferred. The build window is 3 to 4 days, the feature is tagged `Alpha` (verify only), and the engineer prefers explicit, simple code with few layers.

## Options considered

### Option 1: Curated palette, one runtime variable (chosen)

shadcn tokens in `globals.css`; each business overrides only `--primary` with one of 10 pretested colors, written server side on `:root`.

**Pros**: cannot fail contrast; no color math at runtime; one line of CSS per business; portals inherit it.
**Cons**: owners cannot use their exact brand hex; adding a color requires a test run.

### Option 2: Any color, adjusted automatically

Owners pick any hex; a helper in `shared/` computes white or ink text and darkens the color when used as text.

**Pros**: exact brand colors; no list to maintain.
**Cons**: about 40 lines of color math to trust and test; adjusted colors can drift visibly from the brand anyway; harder to reason about line by line.

### Option 3: Full generated theme per business

Generate a complete scale (50 to 950) per business and serve a CSS file per tenant.

**Pros**: richest branding (tinted backgrounds, borders, charts per business).
**Cons**: a generator, a cache, and a per tenant stylesheet route; far beyond what a 4 day build needs; every generated scale needs contrast checks.

## Rationale

Option 1 matches the forces: tenant branding is the headline, contrast must be guaranteed rather than hoped for, and the engineer wants code that reads line by line. A fixed list turns "is this color readable?" into a unit test, and the per business change stays one CSS variable. Option 2 was the runner up; it becomes worth it only if real owners ask for exact brand colors, and the palette module is the place it would plug in.

Picks made in the design conversation (engineer's choice, runner up in brackets):

| Choice | Pick | Runner up | Why |
|---|---|---|---|
| Design source | Built together in chat, reviewed on a real `/design` page | An artifact preview first | Nothing built twice; fixes are token edits |
| Mood | Calm and warm | Clean clinical | Fits salon, clinic, and coach; leaves room for business colors |
| Platform trio | G. Olive `#5c6a24` + clay `#dca487` + plaster `#f4f1ea` | A. Majorelle + saffron | Natural, organic feel; olive passes with white text |
| Component style | shadcn `maia` | `vega` | Soft corners, 40px+ controls, thumb friendly |
| Primitives | Radix | Base UI | Most examples and answers online |
| Font | IBM Plex Sans | Rubik | Readable small on phones; IBM Plex Sans Arabic exists for later |
| Icons | Lucide | Phosphor | shadcn default; every example uses it |
| Dark mode | Light only | Dark now | Saves about half a day |
| Accent safety | Curated palette | Any color, auto adjusted | See above |
| Wire accent now | Yes | Gallery only | Multi tenant look visible on day one |
| Components | Base set plus booking patterns | Base set only | Feature 6 just wires them |
| Shells | All three | Booking only | Features 5 and 6 need them next |
| Dashboard menu | Full list, unbuilt hidden | "Bientôt" tags | No dead links |
| Gallery | Public, with swatch switcher | Dev only | Portfolio proof |
| Booking flow | Steps with a sticky bottom bar | One scrolling page | Calmest on a phone |
| Price | `150 DH` | `150 MAD` | What Moroccan customers read |
| Time | `14:30` | `14 h 30` | Compact on slot buttons |
| Accessibility proof | Palette test plus axe in verify | axe in verify only | The contrast promise is tested, cheaply |
| Wordmark | Text, "RDV" in primary | Plain text | No image to design |
| Agent skills | `web-design-guidelines` installed | More accessibility skills | Official, focused, no overlap |
| shadcn MCP | Declined | Connect | The `shadcn` skill already covers it |

Decided while writing (recommendations): accent written on `:root` through a `<style>` tag rather than a wrapper `div` (portals render outside any wrapper; runner up: a CSS variable on `<body>` via a client effect, which flashes); input border `#8c8374` because WCAG 2.2 asks 3:1 for the boundary of a field (runner up: a 2px lighter border); formats in `shared/` so feature 11's WhatsApp messages can reuse them (runner up: `web/lib/`); initials from the first two words (runner up: first two letters).

## Evidence

### Color research (2026-11-02)

- The 60/30/10 rule from interior design is widely applied to UI: 60% neutral base, 30% secondary surfaces and text, 10% accent for actions. Material Design names primary, secondary, tertiary, and neutral roles, each with a text color that sits on it.
- Majorelle blue is `#6050dc` across color references. Moroccan inspired palettes pair it with saffron, terracotta, sand, and mint; the Jardin Majorelle uses blue, yellow, and green.
- Yellow fails as text on white (saffron `#f4c430` is 1.64:1), so yellow and clay are fill colors only, under dark ink.
- Second search: directions from booking and wellness brands (teal with sand, navy with coral, olive with clay, plum with blush). Most hex values came from a single third party site or were proposals; all were checked below before being shown.

### Contrast checks (computed with the WCAG relative luminance formula)

| Pair | Ratio | Result |
|---|---|---|
| White on olive `#5c6a24` | 5.93 | pass |
| Olive on `#f4f1ea` | 5.26 | pass |
| Ink `#2b2a24` on clay `#dca487` | 6.65 | pass |
| Clay `#b5704f` (first proposal) with ink / white | 3.70 / 3.89 | fail, replaced by `#dca487` |
| Sage `#6b7550` (first proposal) on page | 4.34 | fail, replaced by olive |
| Terracotta `#c75b3d` (palette site) with white | 4.21 | fail |
| Terracotta `#b5502c` on `#f4f1ea` | 4.49 | fail, darkened to `#ab4a28` (4.98) |
| Émeraude `#2f7d55` on `#f4f1ea` | 4.45 | fail, darkened to `#2a7550` (4.95) |
| Mint `#62a87c` with white | 2.83 | fail, not used |
| Status no show `#a15c00` on its tint | 4.40 | fail, darkened to `#8a4f00` (5.57) |
| Input border `#cfc6b6` (first proposal) on white | 1.69 | fail, replaced by `#8c8374` (3.74) |

### Preview

The comparison page reviewed during the conversation (trios A to H, the four shadcn styles on one booking card, the business palette, status badges): [MonRDV style preview](https://claude.ai/artifact/VdRiENotEfRwnBNqxXLn14). Its style cards use Majorelle; the chosen trio is G.

### Agent skill search

Found through `npx skills find` and the repos' READMEs: `vercel-labs/agent-skills@web-design-guidelines` (Vercel, installed), `addyosmani/web-quality-skills@accessibility`, `jakubkrehel/skills` (`better-accessibility`, `better-colors`, `better-typography`), `wshobson/agents@tailwind-design-system`, `nextlevelbuilder/ui-ux-pro-max-skill`, `pbakaus/impeccable`. Not installed: they overlap with `shadcn`, `frontend-design`, or `design-taste-frontend`, or they generate a competing direction.
