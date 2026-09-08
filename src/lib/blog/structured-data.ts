import type { Locale } from "@/lib/i18n/config";
import type { PublicPost } from "./types";

/**
 * Schema.org nodes for the blog.
 *
 * These return plain objects rather than finished `<script>` payloads, because
 * they are emitted inside the page's `@graph` alongside the organisation and
 * the site — see `@/lib/seo/json-ld`. A node referencing `#organization` only
 * resolves if the organisation is in the same graph, so nothing here serialises
 * itself.
 *
 * This is what lets a search result carry a headline, a date and a thumbnail
 * rather than being a bare blue link, and it is the part of the page an
 * assistant can read as facts instead of prose.
 */

export function articleNode({
  post,
  locale,
  url,
  base,
}: {
  post: PublicPost;
  locale: Locale;
  url: string;
  base: string;
}): Record<string, unknown> {
  /*
   * Covers are stored as a path on this origin (`/api/blog/…/cover`), which is
   * all a browser needs. A crawler reading this JSON has no page context to
   * resolve it against, so it has to be absolute or the image is simply not
   * there — unlike the OpenGraph tags, which Next resolves against
   * `metadataBase` on the way out.
   */
  const image = post.coverUrl
    ? post.coverUrl.startsWith("http")
      ? post.coverUrl
      : `${base}${post.coverUrl}`
    : null;

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt ?? undefined,
    inLanguage: locale,
    /* `mainEntityOfPage` is what stops two URLs that render the same article
       from being read as two articles. */
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: image ? [image] : undefined,
    datePublished: post.publishedAt ?? undefined,
    /* No separate modified date is stored, so the publication date stands for
       both rather than being invented — a `dateModified` of "now" on every
       render would tell a crawler the article changes constantly. */
    dateModified: post.publishedAt ?? undefined,
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@id": `${base}/#organization` },
    // Resolved from the graph the layout already puts on every page.
    publisher: { "@id": `${base}/#organization` },
    isPartOf: { "@id": `${base}/blog#blog` },
  };
}

/** The blog itself, so the articles read as one publication. */
export function blogNode({
  base,
  name,
  description,
  locale,
}: {
  base: string;
  name: string;
  description: string;
  locale: Locale;
}): Record<string, unknown> {
  return {
    "@type": "Blog",
    "@id": `${base}/blog#blog`,
    url: `${base}/blog`,
    name,
    description,
    inLanguage: locale,
    publisher: { "@id": `${base}/#organization` },
  };
}

/**
 * The index as an ordered list of its articles.
 *
 * Without it the listing page is a wall of links: this says they are the
 * publication's articles and in what order, which is what a crawler needs to
 * treat the page as an index rather than a navigation menu.
 */
export function blogListingNode({
  base,
  posts,
}: {
  base: string;
  posts: { slug: string; title: string }[];
}): Record<string, unknown> {
  return {
    "@type": "ItemList",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: post.title,
      url: `${base}/blog/${post.slug}`,
    })),
  };
}
