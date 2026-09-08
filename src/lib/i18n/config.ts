/**
 * Locale configuration, shared by server and client.
 *
 * The language is part of the URL, with French unprefixed:
 *
 *   /financement        French
 *   /en/financement     English
 *   /de/financement     German
 *
 * It used to be a cookie, with all three languages served from one path. That
 * was fine for a visitor and invisible to everyone else: crawlers arrive
 * without cookies, so Google, ChatGPT and Gemini only ever saw one language and
 * two thirds of the site did not exist as far as they were concerned. Three
 * addresses is what makes three languages indexable.
 *
 * French is unprefixed because it is the language the business works in, and
 * because the site's existing links already point at unprefixed paths.
 */

export const LOCALES = ["en", "fr", "de"] as const;

export type Locale = (typeof LOCALES)[number];

/** Served at the bare path. Changing this changes what `/` means. */
export const DEFAULT_LOCALE: Locale = "fr";

/** Order and labels mirror the live site's language menu. */
export const LOCALE_OPTIONS: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "en", label: "EN", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "de", label: "DE", flag: "\u{1F1E9}\u{1F1EA}" },
];

/** The `hreflang` value for a locale. */
export const HREFLANG: Record<Locale, string> = {
  fr: "fr",
  en: "en",
  de: "de",
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

/**
 * A path in a given language.
 *
 * Every internal link goes through this rather than hard-coding `/financement`,
 * because the same link has to mean three different URLs depending on the page
 * it sits on. `path` is always the unprefixed form — the canonical way to name
 * a page in this codebase — and the prefix is added here or not at all.
 */
export function localeHref(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");

  if (locale === DEFAULT_LOCALE) {
    return clean === "" ? "/" : clean;
  }

  return `/${locale}${clean}`;
}

/**
 * The unprefixed form of a path, and the language it was in.
 *
 * The inverse of `localeHref`, for the language switcher: to offer the same
 * page in German it has to know which page it is on, stripped of the language
 * currently in the URL.
 */
export function splitLocale(pathname: string): {
  locale: Locale;
  path: string;
} {
  const [, first = "", ...rest] = pathname.split("/");

  if (isLocale(first)) {
    return { locale: first, path: `/${rest.join("/")}`.replace(/\/$/, "") || "/" };
  }

  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}
