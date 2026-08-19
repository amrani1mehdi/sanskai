# Sansekai Solution

Next.js rebuild of [sansekaisolution.com](https://sansekaisolution.com) — currently the
public landing page. An admin panel is planned next.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Copy `.env.example` to `.env.local` if you have a CoinGecko key (see below).

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
    api/crypto/route.ts   CoinGecko proxy (45s revalidate)
  components/
    site/                 one file per landing-page section
    ui/                   Reveal (scroll animation), SectionHeading
  lib/
    content.ts            ALL landing-page copy
    crypto.ts             market types + number formatting
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

### Crypto market

`/api/crypto` proxies CoinGecko's public `coins/markets` endpoint (top 250, 7-day
sparklines) and caches for 45 seconds, so many visitors share one upstream call. The
client refetches on the same cadence and supports EUR/USD/GBP, search, and pagination.

Set `COINGECKO_API_KEY` in `.env.local` for production — the public tier rate-limits
(HTTP 429) under modest traffic. The section degrades to an inline notice when the
upstream call fails.

## Checks

```bash
npm run build
npm run lint
npx tsc --noEmit
```
