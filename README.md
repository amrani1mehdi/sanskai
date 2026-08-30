# Sansekai Solution

Next.js rebuild of [sansekaisolution.com](https://sansekaisolution.com): the landing
page plus the financing, investment, expertise and contact pages, in English,
French and German.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```


## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- Tailwind CSS v4 — tokens defined CSS-first in `src/app/globals.css`
- `lucide-react` for icons, Montserrat/Inter via `next/font`

## Structure

```
src/
  app/
    layout.tsx            fonts + metadata
    page.tsx              landing page composition
    globals.css           design tokens, custom utilities
  components/
    site/                 one file per landing-page section
    ui/                   Reveal (scroll animation), SectionHeading
  lib/
    content.ts            ALL landing-page copy
    utils.ts              cn()
```

### Design tokens

Colours are raw HSL triplets on `:root` (and `.dark`), exposed to Tailwind through
`@theme inline` — so `bg-card`, `text-accent`, `border-border` all work, and alpha
modifiers like `bg-accent/10` do too. The palette mirrors the live site: warm cream
background, gold-brown accent (`36 40% 45%`).

Custom utilities: `container` (centred, max 1400px), `section-padding`,
`hero-gradient`, `gold-gradient`, `reveal` / `reveal-visible`.

### Content

Every string on the page lives in `src/lib/content.ts`. When the admin panel lands,
that module gets swapped for the same shape read from the database — components read
from `siteContent` only and should not need changing.

## Checks

```bash
npm run build
npm run lint
npx tsc --noEmit
```
