import type { MetadataRoute } from "next";
import { fetchPublishedPosts } from "@/lib/blog/server";
import { DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/config";
import { getSiteContent } from "@/lib/content";

/**
 * The sitemap: every page, in every language, including every published
 * article.
 *
 * Static pages could be listed by hand; articles cannot. They are written in
 * the back office and appear the moment the author publishes, with no deploy in
 * between — so the sitemap has to be generated from the same source the blog
 * reads, or every new article is invisible until someone remembers to edit a
 * file. That is why this is `sitemap.ts` and not `sitemap.xml`.
 *
 * Each entry carries `alternates.languages`, which is the sitemap's own form of
 * `hreflang`: it tells a crawler that the three URLs are one page in three
 * languages rather than three pages competing for the same queries. The pages
 * say the same thing in their `<head>`; saying it here too is what Google's own
 * documentation asks for, and it is the only signal a crawler gets before it
 * has fetched anything.
 */

/** The unprefixed paths of the static pages, with how often each changes. */
const STATIC_PAGES: {
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}[] = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/financement", changeFrequency: "monthly", priority: 0.9 },
  { path: "/developpement-digital", changeFrequency: "monthly", priority: 0.9 },
  { path: "/expertise", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/devenir-partenaire", changeFrequency: "yearly", priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteContent(DEFAULT_LOCALE).meta.url.replace(/\/$/, "");
  const abs = (locale: Locale, path: string) => `${base}${localeHref(locale, path)}`;

  /** The `languages` map for one page, given its path in each language. */
  const languages = (paths: Record<Locale, string>) => ({
    ...paths,
    // For a reader whose language is none of the three.
    "x-default": paths[DEFAULT_LOCALE],
  });

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.flatMap((page) => {
    const paths = Object.fromEntries(
      LOCALES.map((locale) => [locale, abs(locale, page.path)]),
    ) as Record<Locale, string>;

    /* One entry per language, each naming all three. A sitemap lists URLs, and
       the French and German pages are URLs in their own right — listing only
       the French one would leave two thirds of the site undiscovered. */
    return LOCALES.map((locale) => ({
      url: paths[locale],
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: languages(paths) },
    }));
  });

  /*
   * Articles, fetched once in the default locale.
   *
   * One request is enough because each article carries its slug in all three
   * languages — which is exactly what the per-language addresses were for.
   */
  const posts = await fetchPublishedPosts(DEFAULT_LOCALE);

  const articleEntries: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const paths = Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        abs(locale, `/blog/${post.alternates[locale]}`),
      ]),
    ) as Record<Locale, string>;

    return LOCALES.map((locale) => ({
      url: paths[locale],
      lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages: languages(paths) },
    }));
  });

  return [...staticEntries, ...articleEntries];
}
