/**
 * Locale configuration, shared by server and client.
 *
 * Like the live site, the language is not part of the URL — every locale is
 * served from the same path. The choice is kept in a cookie (rather than the
 * live site's localStorage) so the server can render the right language on the
 * first paint instead of flashing the default and swapping after hydration.
 */

export const LOCALES = ["en", "fr", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** A year, matching how long the live site keeps its stored preference. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Order and labels mirror the live site's language menu. */
export const LOCALE_OPTIONS: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "en", label: "EN", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "de", label: "DE", flag: "\u{1F1E9}\u{1F1EA}" },
];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}
