---
name: monrdv-design-system
source: spec 0004 (docs/specs/0004-design-system-ui-foundation)
character: "Calm and warm. A quiet, warm off white frame lets each business's color and name be the star. Soft corners, roomy spacing, controls sized for thumbs, one font, French copy that speaks from the customer's side."
tokens: 'Real values live in web/app/globals.css (the only file that defines colors). Read them there; this file never copies them.'
contrast: 'Every business color passes 4.5:1 with white text and as text on the page background; status text, ink on clay, ink and secondary text on sand pass 4.5:1; the input border passes 3:1. shared/src/palette.test.ts proves each pair.'
---

# MonRDV design system

The live gallery is `http://localhost/design` (root domain only). It shows every token, component, state, pattern, and shell on this page, and its swatch switcher repaints everything in any business color.

## Build mandate

You are a senior product designer. Every page ships as a complete product surface: brand, real French copy written for this product, a considered layout with hierarchy, every state (empty, loading, error), supporting content, and a footer where the page warrants one. Never a lone form on an empty page. Build from the components and shells below; reach for the shadcn CLI (`pnpm dlx shadcn@latest add <name>`, from `web/`) before writing custom markup, and theme anything new with the existing tokens only.

## Character and direction

- **The frame is quiet, the business is the star.** Warm plaster background, white cards, ink text, hairline borders. The only loud thing on a business page is its own color.
- **One color per business, and only one.** A business changes `--primary` and nothing else. Buttons, links, selected states, and the focus ring follow it. Selected days and hover tints use `--primary-soft`, mixed from it.
- **Root domain pages are olive with a clay highlight.** Clay (`--highlight`) is a fill for small chips and accents on platform pages only, always with ink text, never on a business page.
- **One font, IBM Plex Sans,** loaded by `next/font` in `app/layout.tsx` (the browser never calls Google). Headings 600, body 400, buttons 600, `tabular-nums` on prices, times, and totals.
- **No decoration.** No gradients, illustrations, or motifs. Depth comes from hairline borders; one soft shadow is reserved for popovers, dialogs, sheets, and the sticky action bar.

## Where the tokens live

All in `web/app/globals.css`:

- `:root` holds the color roles (background, card, ink, secondary text, sand, input border, primary and its soft and hover mixes, highlight, destructive, and the four status pairs), plus `--radius`.
- `@theme inline` maps them to Tailwind classes (`bg-primary`, `text-muted-foreground`, `bg-status-confirmed-soft`), sets the font stack, and pins the radius scale: `rounded-lg` 12px for controls, `rounded-xl` 16px for cards and dialogs, `rounded-full` (or `rounded-4xl`) for badges and chips.
- `@theme` sets the shadows (only the soft one is visible).
- The type scale is Tailwind's own: `text-xs` 12 (fine print), `text-sm` 14 (labels), `text-base` 16 (body, every input), `text-lg` 18 (lead), `text-xl` 20 (card title), `text-2xl` 24 (section title), `text-3xl` 30 then `md:text-4xl` 36 (page title).
- Spacing is the Tailwind 4px scale. Page side padding is 16px on phones and 24px from 768px.

The business palette (10 colors, olive first and default) lives in `shared/src/palette.ts`. `paletteColorOrDefault` turns a stored value into a palette constant; only that constant is ever written into a page.

## Component inventory

| Group                   | Components                                                                | Where                             |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------- |
| Controls                | Button, Input, Label, Field, Textarea, Select, Checkbox, Radio Group      | `components/ui/` (shadcn, themed) |
| Feedback                | Alert, Badge (with status variants), Skeleton, Spinner, Sonner, Empty     | `components/ui/`                  |
| Containers and overlays | Card, Dialog, Sheet, Dropdown Menu, Separator, Avatar                     | `components/ui/`                  |
| Booking patterns        | StepHeader, ServiceCard, DayStrip, SlotGrid, StickyActionBar, StatusBadge | `components/booking/`             |
| Shells                  | BookingShell, DashboardShell, PlatformShell                               | `components/shells/`              |
| Brand                   | Wordmark, BusinessMark                                                    | `components/brand/`               |

Notes on the shadcn components, which were restyled from the `maia` style:

- Controls are 44px tall by default (`h-11`), inputs use 16px text so phones never zoom on focus, and inputs fill white with the darker `--input` border.
- The primary button darkens on hover (`--primary-hover`), so white text only gains contrast. Never use `bg-primary/80` style transparency on the accent.
- Transitions are color and opacity only. The zoom and slide animations were removed from overlays.
- Booking statuses always go through `<StatusBadge status="confirmed" />` ("Confirmé", "Terminé", "Absent", "Annulé", "Payé"). Status colors never use the accent; the label carries the meaning, not the color alone.
- The Toaster is mounted once in `app/layout.tsx`. Call `toast()` from `sonner`.
- Dialog, Sheet, and toasts portal to the end of `<body>`, so they pick up the business color from `:root`.

Later features add what they need (Calendar, Table, Tabs) through the shadcn CLI. Check the new file against this page: token classes only, 44px controls, no transform animations. The first real form (feature 5) brings React Hook Form with the shadcn `Field` pattern.

## Composition patterns

- **Business pages** use `BookingShell`: business mark and name on top, one centered column at most 480px wide, a small "Réservation en ligne par MonRDV" footer. The color comes from `app/sites/[subdomain]/layout.tsx`, server rendered on `:root`.
- **Owner dashboard pages** use `DashboardShell`: a sidebar from 1024px, a top bar with a menu button below that. The menu reads `lib/dashboard-nav.ts`; flip an item's `ready` to `true` when its page ships.
- **Root domain pages** (home, signup, the 404 pages) use `PlatformShell`: MonRDV wordmark and "Créer mon espace" on top, a footer with the gallery link. Its links are absolute to the root domain.
- Each page has one `<h1>` and one `<main id="contenu">` (the shells provide it). Inside the `/design` gallery, pass `preview` to a shell so it renders a plain `div` instead.

## Booking flow pattern (phones first)

One question per screen: 1 prestation, 2 personne (skipped when the business has one staff member), 3 jour et heure, 4 coordonnées, then the confirmation. Each step is `StepHeader` (back arrow, "Étape 2 sur 4", the question as the page title), the content, and `StickyActionBar` with "Continuer", disabled until the step is answered. Pass the action bar to `BookingShell` through `actionBar` so the shell leaves room under the content. The booking components take plain props and fetch nothing; feature 6 wires them.

## Display formats

From `shared/src/format.ts`, always on wall clock values (spec 0003), so formatting never shifts time zones:

| Value      | Function                   | Example                                         |
| ---------- | -------------------------- | ----------------------------------------------- |
| Price      | `formatPrice(centimes)`    | `150 DH`, `85,50 DH` (no break space before DH) |
| Duration   | `formatDuration(minutes)`  | `45 min`, `1 h 30`                              |
| Time       | `formatTime(wall)`         | `14:30`                                         |
| Day, short | `formatDay(wall, 'short')` | `mar. 3 nov.`                                   |
| Day, long  | `formatDay(wall, 'long')`  | `mardi 3 novembre`                              |

## Copy

French, short, direct, from the customer's side: "Choisissez une prestation", "Continuer", "Ce créneau vient d’être pris". Use the typographic apostrophe (’). Errors say what happened and what to do next.

## Do and don't

- Do use token classes (`bg-primary`, `text-muted-foreground`). Don't use raw Tailwind palette classes (`zinc`, `blue-500`) or hex values in components. The palette swatches are the one exception, because their color is the data.
- Do keep one primary button per screen; secondary actions are `outline` or `ghost`.
- Don't put text on the clay highlight other than ink, and don't use it on business pages.
- Don't put accent colored text on the sand surface; sand carries ink and secondary text only.
- Don't add a per business style. If a business needs something, it goes through `--primary` or it does not happen.

## Accessibility rules

- WCAG 2.2 AA. The contrast pairs are proven by `shared/src/palette.test.ts`; a new color must pass it.
- Every control works by keyboard and shows the focus ring: 2px in the accent with a 2px offset (the unlayered rule at the end of `globals.css`).
- Booking controls (slots, days, the action bar button) are at least 44px tall; inputs use 16px text.
- Selection is exposed with `aria-pressed` on toggle buttons (services, days, slots); a full day is `disabled` and announced as "complet". An accessible name always contains the visible text.
- Motion is short color and opacity transitions only, and stops under `prefers-reduced-motion`.
- At 360px wide nothing scrolls the page sideways; only `DayStrip` scrolls, inside itself.
- Light only. Dark mode would need a second token set and a second contrast pass over all 10 swatches.
