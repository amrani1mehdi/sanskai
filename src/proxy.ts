import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isLocale, localeHref } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
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
 * A visitor arriving for the first time is sent to the language their browser
 * asks for, once, and that is remembered in a cookie. Afterwards the URL alone
 * decides: a returning visitor, and anyone who has touched the language menu,
 * is never redirected again. Crawlers are never redirected at all — sending one
 * away from `/` is how a multilingual site ends up with a single language
 * indexed, the exact problem these URLs exist to solve.
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

/**
 * Where the visitor is noted as having arrived before.
 *
 * It does not pick the language — the URL does, on every request. This says no
 * more than "a choice has been made", so the detection below runs once and
 * never afterwards fights the language menu, which offers French by linking to
 * an unprefixed path.
 */
const LOCALE_COOKIE = "locale";

/** A year: long enough that a returning visitor is never redirected twice. */
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Written only when it would change.
 *
 * A `Set-Cookie` on every response makes every page uncacheable at the edge,
 * which is a steep price for re-sending a value that is already correct.
 */
function remember(
  response: NextResponse,
  request: NextRequest,
  locale: Locale,
): NextResponse {
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

/*
 * Anything that indexes or unfurls the site, which must never be redirected.
 *
 * A crawler arrives without a cookie every single time, so it would meet the
 * detection below on every request — and one sent from `/financement` to
 * `/en/financement` because a data centre asked for English takes the French
 * pages out of the index with it.
 */
const CRAWLER =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegram|discord|lighthouse|headless|preview/i;

function isCrawler(request: NextRequest): boolean {
  return CRAWLER.test(request.headers.get("user-agent") ?? "");
}

/**
 * The best of the languages the browser asked for, or null for none of them.
 *
 * `Accept-Language: en-GB,en;q=0.9,fr;q=0.8` is a ranked list, so it is read in
 * order of quality and the first entry this site actually speaks wins. The
 * region is dropped: `en-GB` and `en-US` are both English here.
 */
function preferredLocale(header: string | null): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((entry) => {
      const [tag = "", ...params] = entry.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));

      return {
        tag: tag.trim().toLowerCase(),
        quality: quality ? Number.parseFloat(quality.slice(2)) : 1,
      };
    })
    .filter((entry) => entry.tag !== "" && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];

    if (isLocale(base)) return base;
  }

  return null;
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

    return remember(NextResponse.next({ request: { headers } }), request, prefixed);
  }

  /*
   * No prefix, so the page is French — but this may be the visitor's first
   * sight of the site, and their browser may be asking for something else.
   *
   * Only when no choice has been recorded yet. The language menu offers French
   * by linking to exactly these unprefixed paths, so redirecting a visitor who
   * already has a cookie would put French permanently out of reach.
   */
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;

  if (!isLocale(chosen) && request.method === "GET" && !isCrawler(request)) {
    const wanted = preferredLocale(request.headers.get("accept-language"));

    if (wanted && wanted !== DEFAULT_LOCALE) {
      const target = request.nextUrl.clone();
      target.pathname = localeHref(wanted, pathname);

      const response = remember(
        NextResponse.redirect(target, 307),
        request,
        wanted,
      );
      /* The answer was decided by a request header, so a shared cache must not
         hand it to the next visitor. */
      response.headers.set("Vary", "Accept-Language, Cookie");

      return response;
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, DEFAULT_LOCALE);

  return remember(
    NextResponse.rewrite(url, { request: { headers } }),
    request,
    DEFAULT_LOCALE,
  );
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
