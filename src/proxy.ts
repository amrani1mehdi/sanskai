import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";
import { ADMIN_URL_HEADER } from "@/lib/crm/return-to";

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

/**
 * The business page's address, and the ways people write it.
 *
 * The page is called DÉVELOPPEMENT DIGITAL, so the address gets typed and
 * pasted with its capitals and its accent — and a URL path is case-sensitive,
 * while an accented character travels percent-encoded as `%C3%89`. Left alone,
 * `/DÉVELOPPEMENT-digital` is a 404 on a page somebody was told to visit.
 *
 * Matched by folding case and accents rather than by listing the spellings, so
 * `/Développement-Digital` and every other mixture lands too.
 *
 * Deliberately this one path and not a general rule: a blog slug may carry an
 * accent of its own and mean it, and folding those would send a real article to
 * an address that does not exist.
 */
const CANONICAL_BUSINESS_PATH = "developpement-digital";

/**
 * Lower case, accents removed — `DÉVELOPPEMENT` and `developpement` alike.
 *
 * Decoded first: a path keeps its percent-encoding here, so the accent arrives
 * as the literal text `%C3%89` and would survive every fold below untouched.
 * A malformed escape throws, and an address nobody can decode is not one worth
 * redirecting, so it is left to 404 on its own.
 */
function fold(segment: string): string {
  let decoded: string;

  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return segment.toLowerCase();
  }

  return decoded
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* The back office has no locale and no rewrites. It passes through here for
     one reason: to note the address it was asked for, which its sign-in gate
     cannot otherwise see. */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const headers = new Headers(request.headers);
    headers.set(ADMIN_URL_HEADER, `${pathname}${request.nextUrl.search}`);

    return NextResponse.next({ request: { headers } });
  }

  /* Sent to the canonical spelling before anything else looks at the path, so
     the address bar settles on one form and only one is ever indexed. */
  const segments = pathname.split("/");
  const last = segments[segments.length - 1] ?? "";

  if (last !== CANONICAL_BUSINESS_PATH && fold(last) === CANONICAL_BUSINESS_PATH) {
    const url = request.nextUrl.clone();
    segments[segments.length - 1] = CANONICAL_BUSINESS_PATH;
    url.pathname = segments.join("/");

    return NextResponse.redirect(url, 308);
  }

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
   *
   * The back office is matched on its own line instead, only so its address
   * can be noted for the sign-in gate — see the first branch of `proxy`.
   */
  matcher: [
    "/((?!api|admin|_next|sitemap\\.xml|robots\\.txt|llms\\.txt|images|favicon\\.ico|.*\\.[\\w]+$).*)",
    "/admin/:path*",
  ],
};
