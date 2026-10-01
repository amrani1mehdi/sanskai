import type { Metadata } from "next";
import { Clock, Handshake, Lock, Shield } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { PartnerForm } from "@/components/site/partner-form";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { localeHref } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getPartnerCopy } from "@/lib/leads/partner-copy";
import { localeAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getPartnerCopy(locale);

  /* Unlike the client sheet, a page people are meant to find: it is linked
     from the header and footer, so it is indexed, listed in the sitemap and
     given its alternates like the site's other pages. */
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: localeAlternates(locale, "/devenir-partenaire"),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: localeHref(locale, "/devenir-partenaire"),
      type: "website",
    },
  };
}

/**
 * Becoming a partner — where a cabinet sends the documents that start a
 * collaboration with Sansekai.
 *
 * In French, English and German like the rest of the site. Whichever language
 * the form is filled in, the documents land in the back office under the same
 * slots and the partner under the same service.
 */
export default async function DevenirPartenairePage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const copy = getPartnerCopy(locale);
  const { common } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-12">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <Handshake size={14} /> {copy.navLabel}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                {copy.title}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {copy.intro}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="bg-secondary py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <PartnerForm form={content.form} copy={copy.form} />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield size={14} className="text-accent" /> {common.confidential}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-accent" /> {common.response24h}
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock size={14} className="text-accent" /> {common.secure}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer content={content} locale={locale} />
      <CookieBanner content={content} />
    </>
  );
}
