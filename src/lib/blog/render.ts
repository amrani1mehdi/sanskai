import sanitizeHtml from "sanitize-html";

/**
 * Article HTML, made safe to inject.
 *
 * Articles are written in a rich-text editor now, so the body arrives as HTML
 * rather than markdown and there is nothing to parse — but there is still
 * everything to sanitise. An editor decides what it *emits*; it does not decide
 * what arrives at this function, and the two are only the same thing while
 * nobody is trying.
 *
 * "Only staff can post" is a rule about who is supposed to write, not a
 * guarantee about what reaches the page: a stolen session, a body pasted in
 * from another site, or a direct API call all end up here. So this runs on
 * every render rather than once at save — the stored value is never trusted,
 * however it got there.
 */

/** What an article is allowed to contain. */
const ALLOWED_TAGS = [
  "h2", "h3", "h4",
  "p", "blockquote", "pre", "code",
  "ul", "ol", "li",
  "strong", "em", "s", "u",
  "a", "img", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td",
];

export function renderArticle(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      /* `target` and `rel` are listed even though no author types them: the
         attribute filter runs after `transformTags`, so the hardening added
         below is stripped straight back off unless it is allowed here. */
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading"],
      code: ["class"],
    },
    /*
     * No `data:` — an <img src="data:text/html,…"> is a document, not a
     * picture, and these three are the only schemes an article needs.
     */
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      /* h1 is the article's own title, rendered by the page. A heading in the
         body becomes h2 so the document keeps a single top-level heading. */
      h1: "h2",
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          /* Anything leaving the site opens away from it and cannot reach back
             through window.opener. Internal links are left alone. */
          ...(isExternal(attribs.href)
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {}),
        },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: "lazy" },
      }),
    },
  });
}

function isExternal(href: string | undefined): boolean {
  return typeof href === "string" && /^https?:\/\//i.test(href);
}

/**
 * Roughly how long the article takes to read.
 *
 * Tags are stripped before counting: the body is HTML now, and counting it raw
 * would score `<strong>` and `</p>` as words and inflate a short article into a
 * long one.
 *
 * Two hundred words a minute, the figure most publishers settle on, and never
 * less than one — "0 min de lecture" reads as an error rather than as a short
 * piece.
 */
export function readingMinutes(html: string): number {
  const text = (html ?? "")
    .replace(/<[^>]*>/g, " ")
    // Entities are one character to a reader, not a word.
    .replace(/&[a-z]+;|&#\d+;/gi, " ");

  const words = text.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.round(words / 200));
}
