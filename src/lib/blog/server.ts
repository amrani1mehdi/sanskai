import "server-only";

import { apiBaseUrl } from "@/lib/crm/session";
import { LOCALES, localeHref, type Locale } from "@/lib/i18n/config";
import type { PublicPost, PublicPostSummary } from "./types";

/**
 * The published blog, read on the server.
 *
 * Called straight from the page components rather than through the browser
 * proxy: these are server components, so they can talk to the API directly and
 * the article arrives already rendered in the HTML — which is what a blog needs
 * to be readable without JavaScript and indexable by a crawler.
 *
 * The public endpoints take no credential. They serve published articles only,
 * so nothing here can leak a draft even if it asked for one by slug.
 */

type ApiSummary = {
  slug: string;
  alternates: Record<Locale, string>;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
  author?: string | null;
};

type ApiPost = ApiSummary & { body: string };

/**
 * Covers are rewritten to a path on this origin.
 *
 * The API answers with its own absolute URL, and putting that in an <img src>
 * would hand the CRM's address to every visitor — the one thing the rest of
 * this application keeps server-side.
 */
function coverPath(slug: string, coverUrl: string | null): string | null {
  return coverUrl ? `/api/blog/${encodeURIComponent(slug)}/cover` : null;
}

function toSummary(row: ApiSummary): PublicPostSummary {
  return {
    slug: row.slug,
    alternates: row.alternates,
    title: row.title,
    excerpt: row.excerpt,
    /* The cover is addressed by the French slug, whatever language is being
       read — one picture, one URL, so it is cached once rather than three
       times. The API accepts any language's slug for it. */
    coverUrl: coverPath(row.alternates.fr ?? row.slug, row.coverUrl),
    publishedAt: row.publishedAt,
    author: row.author ?? null,
  };
}

/**
 * The index, newest first.
 *
 * A failure returns an empty list rather than throwing. The blog is one section
 * of a marketing site: if the CRM is down, the page should say there is nothing
 * to read yet, not take the whole site's error boundary with it.
 */
export async function fetchPublishedPosts(
  locale: Locale,
): Promise<PublicPostSummary[]> {
  try {
    const response = await fetch(
      `${apiBaseUrl()}/v1/website/blog?locale=${locale}&perPage=50`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );

    if (!response.ok) return [];

    const payload = (await response.json()) as { data: ApiSummary[] };

    return payload.data.map(toSummary);
  } catch {
    return [];
  }
}

/** One article, or null when it does not exist or is not published. */
export async function fetchPublishedPost(
  slug: string,
  locale: Locale,
): Promise<PublicPost | null> {
  try {
    const response = await fetch(
      `${apiBaseUrl()}/v1/website/blog/${encodeURIComponent(slug)}?locale=${locale}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as { data: ApiPost };

    return { ...toSummary(payload.data), body: payload.data.body ?? "" };
  } catch {
    return null;
  }
}

/**
 * Where this article lives in each language.
 *
 * Its slug differs per language, so the language menu and the `hreflang` links
 * cannot be built by re-prefixing the current path — that would point at three
 * URLs that do not exist. This maps each locale to the article's real address
 * in it.
 */
export function articlePaths(post: {
  alternates: Record<Locale, string>;
}): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      localeHref(locale, `/blog/${post.alternates[locale]}`),
    ]),
  ) as Record<Locale, string>;
}
