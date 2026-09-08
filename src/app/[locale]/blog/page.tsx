import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";
import { localeHref } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/seo/alternates";
import { fetchPublishedPosts } from "@/lib/blog/server";
import { formatPublishedDate, getBlogCopy } from "@/lib/blog/copy";
import { blogListingNode, blogNode } from "@/lib/blog/structured-data";
import { breadcrumbJsonLd, graph } from "@/lib/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getBlogCopy(locale);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: localeAlternates(locale, "/blog"),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: localeHref(locale, "/blog"),
      type: "website",
    },
  };
}

/**
 * The public article index.
 *
 * A server component reading the API directly, so the list is in the HTML the
 * crawler receives rather than fetched afterwards by a script — which for a
 * blog is most of the point of publishing one.
 */
export default async function BlogIndexPage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const copy = getBlogCopy(locale);
  const posts = await fetchPublishedPosts(locale);

  const base = content.meta.url.replace(/\/$/, "");

  /* The publication and the articles on it, as an ordered list — so this page
     reads as an index rather than a menu of links. */
  const jsonLd = graph([
    blogNode({
      base,
      name: copy.title,
      description: copy.metaDescription,
      locale,
    }),
    blogListingNode({ base, posts }),
    breadcrumbJsonLd([
      { name: "Sansekai Solution", url: `${base}/` },
      { name: copy.title, url: `${base}/blog` },
    ]),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-12">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 px-4 py-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
                {copy.eyebrow}
              </span>
              <h1 className="font-display mb-4 text-4xl leading-tight font-bold text-foreground md:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="text-lg text-muted-foreground">{copy.subtitle}</p>
            </MotionReveal>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            {posts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-6 py-16 text-center text-muted-foreground">
                {copy.empty}
              </p>
            ) : (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, index) => (
                  <li key={post.slug}>
                    <MotionReveal y={16} delay={index * 0.05}>
                      <article className="group h-full overflow-hidden rounded-lg border border-border/70 bg-secondary/60 transition-colors hover:border-accent/40">
                        <Link
                          href={localeHref(locale, `/blog/${post.slug}`)}
                          className="flex h-full flex-col"
                        >
                          {post.coverUrl && (
                            /* A plain <img>: the source is an API route on this
                               origin serving an image of unknown dimensions,
                               which is the case next/image cannot optimise. */
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={post.coverUrl}
                              alt=""
                              loading="lazy"
                              className="aspect-[16/9] w-full object-cover"
                            />
                          )}

                          <div className="flex flex-1 flex-col p-6">
                            {post.publishedAt && (
                              <time
                                dateTime={post.publishedAt}
                                className="mb-2 font-mono text-xs text-muted-foreground"
                              >
                                {formatPublishedDate(post.publishedAt, locale)}
                              </time>
                            )}

                            <h2 className="font-display mb-2 text-lg font-bold text-foreground">
                              {post.title}
                            </h2>

                            {post.excerpt && (
                              <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                                {post.excerpt}
                              </p>
                            )}

                            <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                              {copy.readMore}
                              <ArrowRight
                                size={15}
                                aria-hidden
                                className="transition-transform group-hover:translate-x-0.5"
                              />
                            </span>
                          </div>
                        </Link>
                      </article>
                    </MotionReveal>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <Footer content={content} locale={locale} />
      <CookieBanner content={content} />
    </>
  );
}
