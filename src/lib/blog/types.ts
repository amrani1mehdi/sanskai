import type { Locale } from "@/lib/i18n/config";

/**
 * Articles, as both sides of the application see them.
 *
 * The back office edits every language at once and the public site reads one,
 * so there are two shapes rather than one with half its fields optional: a
 * component holding a `Post` never has to ask which language it is looking at.
 */

/** A field carrying all three translations, keyed by locale. */
export type Translated = Record<Locale, string>;

export type PostStatus = "brouillon" | "publie";

/** An article in the editor: every language, plus the publishing state. */
export type Post = {
  id: string;
  /** One address per language, like title and body. */
  slug: Translated;
  status: PostStatus;
  statusLabel: string;
  title: Translated;
  excerpt: Translated;
  body: Translated;
  cover: PostCover | null;
  publishedAt: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostCover = {
  name: string;
  mimeType: string;
  size: number;
  /** Proxied through this origin, so the API's address stays server-side. */
  url: string;
};

/** An article as a visitor reads it: one language, already chosen. */
export type PublicPost = {
  slug: string;
  /**
   * This article's slug in every language.
   *
   * Carried on the article rather than derived, because a slug is not the same
   * string in each language — `/blog/financer-votre-croissance` and
   * `/en/blog/funding-your-growth` are one piece. It is what the `hreflang`
   * links and the language menu point at.
   */
  alternates: Record<Locale, string>;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  publishedAt: string | null;
  author: string | null;
};

/** A row of the public index — the same, without the body. */
export type PublicPostSummary = Omit<PublicPost, "body">;

/** An empty article, for the "new post" form. */
export function emptyTranslated(): Translated {
  return { en: "", fr: "", de: "" };
}
