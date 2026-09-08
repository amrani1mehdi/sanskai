import { fetchPublishedPosts } from "@/lib/blog/server";
import { DEFAULT_LOCALE, LOCALES, localeHref } from "@/lib/i18n/config";
import { getSiteContent } from "@/lib/content";

/**
 * `/llms.txt` — the site, in the form an assistant can read cheaply.
 *
 * A proposed convention (llmstxt.org): one markdown file naming what the site
 * is and what is worth reading on it, so a model does not have to infer that
 * from navigation chrome and cookie banners.
 *
 * Worth being straight about what this is and is not. Neither OpenAI nor
 * Google has committed to reading this file, so it is not what will get these
 * articles quoted in ChatGPT or Gemini. What does that is further down the same
 * list and already true here: the pages are server-rendered, so a crawler that
 * does not run JavaScript still sees the text; they carry `BlogPosting`
 * structured data; each language has its own URL; and the assistants' crawlers
 * are named and allowed in `robots.txt`. This file costs one route and is
 * trivial to remove if the convention goes nowhere.
 *
 * Generated rather than static for the same reason the sitemap is: articles are
 * published from the back office, and a hand-written list would be stale the
 * first time somebody wrote one.
 */
export async function GET() {
  const content = getSiteContent(DEFAULT_LOCALE);
  const base = content.meta.url.replace(/\/$/, "");
  const abs = (path: string) => `${base}${localeHref(DEFAULT_LOCALE, path)}`;
  const posts = await fetchPublishedPosts(DEFAULT_LOCALE);

  const lines = [
    `# ${content.brand.legalName}`,
    "",
    `> ${content.meta.description}`,
    "",
    "Business financing and development for companies in England, France,",
    "Germany, Canada and the United States: financing against upcoming orders,",
    "working capital, debt collection and business development.",
    "",
    /* The language layout, stated plainly. An assistant that knows the pattern
       can reach the German article directly instead of quoting the French one
       at a German-speaking reader. */
    "## Languages",
    "",
    "Every page exists in French, English and German. French is served at the",
    "bare path; the other two are prefixed:",
    "",
    `- French  ${base}/financement`,
    `- English ${base}/en/financement`,
    `- German  ${base}/de/financement`,
    "",
    "Article addresses differ per language — each translation has its own slug.",
    "The full set is listed in the sitemap with hreflang annotations.",
    "",
    "## Pages",
    "",
    `- [Home](${abs("/")}): what the company does, and who it is for.`,
    `- [Financing](${abs("/financement")}): cash-flow and order financing, and the request form.`,
    `- [Business development](${abs("/developpement-entreprise")}): websites, branding and growth work.`,
    `- [Expertise](${abs("/expertise")}): how the company works and in which markets.`,
    `- [Contact](${abs("/contact")}): how to reach the team.`,
    "",
    "## Articles",
    "",
  ];

  if (posts.length === 0) {
    lines.push("No articles have been published yet.");
  } else {
    for (const post of posts) {
      const date = post.publishedAt?.slice(0, 10);
      const summary = post.excerpt ? ` ${post.excerpt}` : "";

      lines.push(
        `- [${post.title}](${base}${localeHref(DEFAULT_LOCALE, `/blog/${post.slug}`)})${
          date ? ` (${date})` : ""
        }:${summary}`,
      );

      // The same article's other two addresses, indented under it.
      for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;

        lines.push(
          `  - ${locale}: ${base}${localeHref(locale, `/blog/${post.alternates[locale]}`)}`,
        );
      }
    }
  }

  lines.push("", "## Full index", "", `- [Sitemap](${base}/sitemap.xml)`, "");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      /* An hour. Long enough that a crawler pulling it repeatedly is cheap,
         short enough that an article published this morning is listed by
         lunchtime. */
      "Cache-Control": "public, max-age=3600",
    },
  });
}
