import type { Locale } from "@/lib/i18n/config";

/**
 * Site-wide structured data.
 *
 * The article-level schema lives in `@/lib/blog/structured-data`; this is what
 * describes the company and the site itself, on every page.
 *
 * It matters more than it looks. A search engine can infer a page's topic from
 * its prose, but not that "Sansekai Solution" is one organisation with one set
 * of contact details rather than a phrase that happens to recur — and an
 * assistant summarising the site has nothing else to anchor those facts to.
 * Structured data is the only part of a page that states them rather than
 * implying them.
 */

/**
 * JSON that is safe to place inside a `<script>` element.
 *
 * A `</script>` sequence anywhere in the data — in an article title, say —
 * would close the block early and turn the rest of the JSON into markup.
 * Escaping `<` avoids that, and JSON parsers read `<` as the character it
 * stands for.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The company, as an entity rather than a phrase that recurs. */
export function organizationJsonLd({
  base,
  legalName,
  name,
  logo,
  email,
  sameAs,
}: {
  base: string;
  legalName: string;
  name: string;
  logo: string;
  email?: string;
  sameAs?: string[];
}) {
  return {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name,
    legalName,
    url: `${base}/`,
    logo: { "@type": "ImageObject", url: `${base}${logo}` },
    ...(email ? { email } : {}),
    /* The profiles that corroborate the entity elsewhere. Without them the
       organisation is only asserted by the site that benefits from it. */
    ...(sameAs?.length ? { sameAs } : {}),
    areaServed: ["GB", "FR", "DE", "CA", "US"],
  };
}

/** The site itself, tied back to the organisation that publishes it. */
export function webSiteJsonLd({
  base,
  name,
  description,
  locale,
}: {
  base: string;
  name: string;
  description: string;
  locale: Locale;
}) {
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/`,
    name,
    description,
    inLanguage: locale,
    publisher: { "@id": `${base}/#organization` },
  };
}

/**
 * The trail to the current page.
 *
 * This is what lets a result show "sansekaisolution.com › Blog › Article"
 * instead of a bare URL, and it tells an assistant where a page sits in the
 * site rather than leaving it to guess from the path.
 */
export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Several schemas in one script tag.
 *
 * `@graph` is how schema.org expresses "these things, and they reference each
 * other" — an article whose `publisher` points at `#organization` only resolves
 * if the organisation is in the same graph. Emitting three separate tags leaves
 * those references dangling.
 */
export function graph(nodes: unknown[]): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  });
}
