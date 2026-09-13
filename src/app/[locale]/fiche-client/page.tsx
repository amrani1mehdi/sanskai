import type { Metadata } from "next";
import { ClipboardList, Clock, Lock, Shield } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { SalonForm } from "@/components/site/salon-form";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";
import { salonOptions } from "@/lib/leads/salon";
import { getSalonCopy } from "@/lib/leads/salon-copy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getSalonCopy(locale);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    /*
     * Reached from a QR code at a stand, not from search. Indexed, it would sit
     * in results beside the site's own forms as a shorter way in with none of
     * the explanation around them. Kept out of the sitemap for the same reason,
     * and without hreflang alternates, which would only point search engines
     * at pages they are told not to index.
     */
    robots: { index: false, follow: true },
  };
}

/**
 * The client sheet handed out at trade shows, as a page — in French, English
 * and German, like the rest of the site.
 *
 * The QR code on the stand opens the French address; a visitor who reads
 * English or German switches language from the header, and every answer lands
 * in the back office under the same values whichever language they chose.
 */
export default async function FicheClientPage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const copy = getSalonCopy(locale);
  const { common } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-12">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <ClipboardList size={14} /> {copy.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                {copy.title}
              </h1>
              <p className="text-lg text-accent font-medium mb-4">{copy.subtitle}</p>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {copy.intro}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="bg-secondary py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <SalonForm
                form={content.form}
                copy={copy.form}
                options={salonOptions(locale)}
              />

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
