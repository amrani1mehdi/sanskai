import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getSiteContent } from "@/lib/content";

/**
 * What crawlers may read.
 *
 * Two audiences now: the search engines, and the assistants.
 *
 * The back office and the API are disallowed for everyone. `/admin` already
 * sends `robots: { index: false }` in its metadata, but that only helps once a
 * crawler has fetched the page — this keeps it from asking at all, which
 * matters for a login form and for API routes that would otherwise be crawled
 * as though they were pages.
 *
 * Being listed here is not access control: `robots.txt` is a request, and a
 * crawler that ignores it still meets the session gate on every admin route.
 */

/**
 * The assistants' crawlers, named explicitly.
 *
 * A blanket `User-agent: *` already permits these — nothing here is being
 * unblocked. They are spelled out because the default is silence, and silence
 * is the wrong thing to leave in a file that some CDNs and security products
 * read in order to decide what to block on your behalf. Written down, the
 * intent survives a change of host.
 *
 *  - GPTBot            OpenAI's crawler; what builds the corpus behind ChatGPT
 *  - OAI-SearchBot     the index ChatGPT search cites answers from
 *  - ChatGPT-User      fetches a page live when a user's question needs it
 *  - Google-Extended   Google's separate switch for Gemini grounding, which is
 *                      NOT covered by allowing Googlebot
 *  - PerplexityBot     Perplexity's index
 *  - ClaudeBot         Anthropic's crawler
 *  - Applebot-Extended Apple Intelligence
 *  - CCBot             Common Crawl, which many models are trained from
 */
const ASSISTANT_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Google-Extended",
  "PerplexityBot",
  "ClaudeBot",
  "Applebot-Extended",
  "CCBot",
];

const DISALLOWED = ["/admin", "/admin/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteContent(DEFAULT_LOCALE).meta.url.replace(/\/$/, "");

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED },
      /*
       * One rule per agent rather than one rule listing all of them: a
       * crawler obeys only the most specific group that matches its name, so
       * a shared group is fine — but named groups are what these operators'
       * own documentation shows, and they are what a reader checking "are we
       * blocking Gemini?" expects to find.
       */
      ...ASSISTANT_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOWED,
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
