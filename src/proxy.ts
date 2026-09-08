import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";

/**
 * Puts the language into the route without putting it into the URL.
 *
 * Every public page lives under `app/[locale]/`, so the router needs a locale
 * segment to match. French is unprefixed, so `/financement` has none — this
 * rewrites it to `/fr/financement` internally. A rewrite, not a redirect: the
 * address bar keeps `/financement`, and there is no round trip.
 *
 * `/en/...` and `/de/...` already carry their segment and pass straight
 * through.
 *
 * Nothing here reads a cookie or `Accept-Language`. Choosing a language for the
 * visitor would mean redirecting them, and redirecting a crawler away from `/`
 * is how a multilingual site ends up with one language indexed — which is the
 * exact problem these URLs exist to solve. The language menu is explicit
 * instead.
 *
 * In Next 16 this file is `proxy.ts`; `middleware.ts` is the deprecated name
 * for the same thing.
 */
/**
 * Carries the resolved locale to the root layout.
 *
 * The root layout sets `<html lang>` and the site-wide structured data, but it
 * sits above `[locale]` and so never receives the param. A header is the
 * documented way to pass something from the proxy to the render, and it is
 * read there with `headers()`.
 */
export const LOCALE_HEADER = "x-locale";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const prefixed = LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (prefixed) {
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, prefixed);

    return NextResponse.next({ request: { headers } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, DEFAULT_LOCALE);

  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  /*
   * Public pages only.
   *
   * `admin` is excluded because the back office is French-only and lives
   * outside the localised tree; `api`, `_next` and the SEO files are excluded
   * because rewriting them under a locale would look for routes that do not
   * exist. `sitemap.xml`, `robots.txt` and `llms.txt` in particular must stay
   * exactly where crawlers expect them.
   */
  matcher: [
    "/((?!api|admin|_next|sitemap\\.xml|robots\\.txt|llms\\.txt|images|favicon\\.ico|.*\\.[\\w]+$).*)",
  ],
};
