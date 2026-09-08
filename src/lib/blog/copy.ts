import type { Locale } from "@/lib/i18n/config";

/**
 * The blog's own interface copy, in the three languages the site serves.
 *
 * Kept out of `@/lib/i18n/translations` on purpose: that file is a transcript
 * of the live site's i18next bundle, and none of this is in it. Mixing new
 * strings into it would quietly break the one thing it promises — that it can
 * be diffed against the bundle it came from.
 *
 * The articles themselves are translated in the database. This is only the
 * furniture around them.
 */

export type BlogCopy = {
  /** The link in the site header and footer. Shorter than the page title —
      a navigation bar is not the place to spell out "Our articles". */
  navLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  empty: string;
  readMore: string;
  backToList: string;
  publishedOn: string;
  readingTime: (minutes: number) => string;
  metaTitle: string;
  metaDescription: string;
  notFound: string;
  notFoundBody: string;
};

const COPY: Record<Locale, BlogCopy> = {
  en: {
    navLabel: "Blog",
    eyebrow: "Insights",
    title: "Our articles",
    subtitle:
      "Financing, cash flow and business development — what we learn working with companies across Europe and North America.",
    empty: "No articles have been published yet. Please check back soon.",
    readMore: "Read the article",
    backToList: "All articles",
    publishedOn: "Published on",
    readingTime: (minutes) => `${minutes} min read`,
    metaTitle: "Articles — Sansekai Solution",
    metaDescription:
      "Insights on business financing, cash flow and growth from Sansekai Solution.",
    notFound: "Article not found",
    notFoundBody: "This article does not exist, or is no longer published.",
  },
  fr: {
    navLabel: "Blog",
    eyebrow: "Analyses",
    title: "Nos articles",
    subtitle:
      "Financement, trésorerie et développement — ce que nous apprenons auprès des entreprises que nous accompagnons.",
    empty: "Aucun article n’a encore été publié. Revenez bientôt.",
    readMore: "Lire l’article",
    backToList: "Tous les articles",
    publishedOn: "Publié le",
    readingTime: (minutes) => `${minutes} min de lecture`,
    metaTitle: "Articles — Sansekai Solution",
    metaDescription:
      "Analyses sur le financement des entreprises, la trésorerie et la croissance par Sansekai Solution.",
    notFound: "Article introuvable",
    notFoundBody: "Cet article n’existe pas ou n’est plus publié.",
  },
  de: {
    navLabel: "Blog",
    eyebrow: "Einblicke",
    title: "Unsere Artikel",
    subtitle:
      "Finanzierung, Liquidität und Unternehmensentwicklung — was wir aus der Arbeit mit Unternehmen lernen.",
    empty: "Es wurden noch keine Artikel veröffentlicht. Schauen Sie bald wieder vorbei.",
    readMore: "Artikel lesen",
    backToList: "Alle Artikel",
    publishedOn: "Veröffentlicht am",
    readingTime: (minutes) => `${minutes} Min. Lesezeit`,
    metaTitle: "Artikel — Sansekai Solution",
    metaDescription:
      "Einblicke in Unternehmensfinanzierung, Liquidität und Wachstum von Sansekai Solution.",
    notFound: "Artikel nicht gefunden",
    notFoundBody: "Dieser Artikel existiert nicht oder ist nicht mehr veröffentlicht.",
  },
};

export function getBlogCopy(locale: Locale): BlogCopy {
  return COPY[locale];
}

/**
 * A publication date in the reader's own language.
 *
 * The site serves three locales off one URL, so the month has to follow the
 * cookie rather than the server's default — "7 septembre 2026" on a page whose
 * every other word is German is the kind of detail that reads as machine
 * translation.
 */
export function formatPublishedDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(
    { en: "en-GB", fr: "fr-FR", de: "de-DE" }[locale],
    { day: "numeric", month: "long", year: "numeric" },
  );
}
