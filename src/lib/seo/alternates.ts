import { DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/config";

/**
 * The `alternates` block for a page that exists in all three languages.
 *
 * This is the half of the routing change that makes the other half count. Three
 * URLs alone look to a search engine like three separate pages that happen to
 * say similar things — which invites them to compete with each other. `hreflang`
 * is what says they are one page in three languages, so the right one is served
 * to the right reader and none of them cannibalises the others.
 *
 * `x-default` names the URL for a reader whose language is none of the three.
 * French, because it is what the bare path already serves.
 *
 * @param path  the unprefixed path, e.g. `/financement`
 * @param slugs per-language paths, when they differ — an article's slug is not
 *              the same string in every language
 */
export function localeAlternates(
  locale: Locale,
  path: string,
  slugs?: Partial<Record<Locale, string>>,
) {
  const hrefFor = (code: Locale) =>
    slugs?.[code] ?? localeHref(code, path);

  const languages: Record<string, string> = {};

  for (const code of LOCALES) {
    languages[code] = hrefFor(code);
  }

  languages["x-default"] = hrefFor(DEFAULT_LOCALE);

  return {
    /* The canonical is this language's own URL, not the French one. Pointing
       all three at French would tell Google the English page is a duplicate to
       be dropped — the opposite of what publishing three languages is for. */
    canonical: hrefFor(locale),
    languages,
  };
}
