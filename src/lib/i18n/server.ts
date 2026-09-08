import "server-only";

import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { headers } from "next/headers";

/**
 * The locale for the current request.
 *
 * Read from the header the proxy attaches rather than from the `[locale]`
 * route param, and the two cannot disagree: the proxy sets the header from the
 * same path segment the router matches, and sets it to French on the
 * unprefixed paths it rewrites to `/fr`. One accessor therefore serves the
 * localised pages, the root layout — which sits above `[locale]` and never
 * receives the param — and `/admin`, which is outside the localised tree
 * entirely and falls through to French, the language the back office is
 * written in.
 *
 * Reading a header opts the caller out of static rendering. These pages were
 * already dynamic: they read live articles from the CRM on every request.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get("x-locale") ?? undefined;

  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Narrows a route param to a locale.
 *
 * `[locale]` matches any string, so `/xx/financement` reaches the tree with
 * "xx" in hand. The layout calls this and 404s when it fails, rather than
 * quietly rendering French at an address that means nothing — a URL a crawler
 * would otherwise index as a fourth copy of the site.
 */
export function parseLocale(value: string): Locale | null {
  return isLocale(value) ? value : null;
}
