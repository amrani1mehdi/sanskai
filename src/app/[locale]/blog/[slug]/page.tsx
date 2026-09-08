import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";
import { localeHref } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/seo/alternates";
import { articlePaths, fetchPublishedPost } from "@/lib/blog/server";
import { renderArticle, readingMinutes } from "@/lib/blog/render";
import { formatPublishedDate, getBlogCopy } from "@/lib/blog/copy";
import { articleNode, blogNode } from "@/lib/blog/structured-data";
import { breadcrumbJsonLd, graph } from "@/lib/seo/json-ld";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await fetchPublishedPost(slug, locale);

  if (!post) {
    return { title: getBlogCopy(locale).notFound, robots: { index: false } };
  }

  return {
    title: `${post.title} — Sansekai Solution`,
    description: post.excerpt ?? undefined,
    /*
     * Built from the article's own per-language slugs, not from this path with
     * a different prefix: the German translation lives at a German slug, so
     * re-prefixing would point `hreflang` at three URLs that do not exist.
     */
    alternates: localeAlternates(
      locale,
      `/blog/${post.slug}`,
      articlePaths(post),
    ),
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: localeHref(locale, `/blog/${post.slug}`),
      /* `article`, not `website` — it is what tells a link preview to show the
         publication date rather than treating this as a landing page. */
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverUrl ? [post.coverUrl] : undefined,
    },
  };
}

/**
 * One article.
 *
 * Rendered on the server, body and all, so the text is in the HTML: a blog
 * post that needs JavaScript to appear is invisible to the crawlers it was
 * written for.
 *
 * There is no `generateStaticParams` here. Articles are written in the back
 * office and published the moment the author says so, and pre-rendering the
 * list at build time would mean a deploy standing between writing an article
 * and it existing. The locale comes from the URL and the article from the CRM,
 * so these pages are dynamic regardless.
 */
export default async function ArticlePage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const copy = getBlogCopy(locale);

  const post = await fetchPublishedPost(slug, locale);

  // A draft, a deleted article or a mistyped URL are the same thing to a
  // visitor: a page that is not there.
  if (!post) notFound();

  const html = renderArticle(post.body);
  const paths = articlePaths(post);

  const base = content.meta.url.replace(/\/$/, "");
  /* The absolute URL of *this* language's page. The locale prefix belongs in
     it: `/en/blog/…` and `/blog/…` are different documents, and structured
     data naming the wrong one points a crawler at the French article from the
     English page. */
  const url = `${base}${localeHref(locale, `/blog/${post.slug}`)}`;

  /* The article, the publication it belongs to, and the trail to it — one
     graph, so the cross-references between them resolve. The organisation and
     the website are already on the page from the root layout. */
  const jsonLd = graph([
    articleNode({ post, locale, url, base }),
    blogNode({
      base,
      name: copy.title,
      description: copy.metaDescription,
      locale,
    }),
    breadcrumbJsonLd([
      { name: "Sansekai Solution", url: `${base}${localeHref(locale, "/")}` },
      { name: copy.title, url: `${base}${localeHref(locale, "/blog")}` },
      { name: post.title, url },
    ]),
  ]);

  return (
    <>
      {/* Structured data, so a result can carry the headline, date and image
          rather than being a bare link. Rendered by the server with the page,
          which is the only way a crawler sees it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <Navbar content={content} locale={locale} alternates={paths} />

      <main className="flex-1">
        <article>
          <header className="hero-gradient pt-28 pb-12">
            <div className="container mx-auto px-4">
              <MotionReveal y={20} trigger="mount" className="max-w-3xl">
                <Link
                  href={localeHref(locale, "/blog")}
                  className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent"
                >
                  <ArrowLeft size={15} aria-hidden />
                  {copy.backToList}
                </Link>

                <h1 className="font-display mb-4 text-3xl leading-tight font-bold text-foreground md:text-4xl lg:text-5xl">
                  {post.title}
                </h1>

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt}>
                      {copy.publishedOn}{" "}
                      {formatPublishedDate(post.publishedAt, locale)}
                    </time>
                  )}
                  <span aria-hidden>·</span>
                  <span>{copy.readingTime(readingMinutes(post.body))}</span>
                  {post.author && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{post.author}</span>
                    </>
                  )}
                </p>
              </MotionReveal>
            </div>
          </header>

          <div className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-3xl">
              {post.coverUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={post.coverUrl}
                  alt=""
                  className="mb-10 aspect-[16/9] w-full rounded-lg border border-border/70 object-cover"
                />
              )}

              {/* Sanitised on every render by `renderArticle` — see that module
                  for what an article is allowed to contain. */}
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              <Link
                href={localeHref(locale, "/blog")}
                className="mt-12 inline-flex items-center gap-1.5 border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
              >
                <ArrowLeft size={15} aria-hidden />
                {copy.backToList}
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer content={content} locale={locale} />
      <CookieBanner content={content} />
    </>
  );
}
