import type { Metadata } from "next";
import { Lock, Mail, Shield } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { FinancingForm } from "@/components/site/financing-form";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";
import { localeAlternates } from "@/lib/seo/alternates";
import { localeHref } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { contact } = getSiteContent(locale);

  return {
    title: contact.meta.title,
    description: contact.meta.description,
    alternates: localeAlternates(locale, "/contact"),
    openGraph: {
      title: contact.meta.title,
      description: contact.meta.description,
      url: localeHref(locale, "/contact"),
      type: "website",
    },
  };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const { contact, common } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-16">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <Mail size={14} /> {contact.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
                {contact.title}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {contact.desc}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">
              <MotionReveal x={-20}>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
                  {contact.formTitle}
                </h2>
                <p className="text-muted-foreground mb-8">{contact.formDesc}</p>

                <div className="space-y-4 mb-8">
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-sm text-foreground transition-colors hover:text-accent"
                  >
                    <Mail size={16} className="text-accent" /> {contact.email}
                  </a>
                </div>

                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Shield size={14} className="text-accent" /> {common.confidential}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock size={14} className="text-accent" /> {common.secure}
                  </span>
                </div>
              </MotionReveal>

              <MotionReveal x={20}>
                {/* The financing form, posting to the contact route: the same
                    dossier, filed under Contact with a CON- reference. */}
                {/* Where a QR code lands, as on /financement: the form, not the
                    section, because on a phone the form sits below the text. */}
                <div id="formulaire" className="scroll-mt-28">
                  <FinancingForm
                    content={content}
                    locale={locale}
                    service="contact"
                  />
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>
      </main>

      <Footer content={content} locale={locale} />
      <CookieBanner content={content} />
    </>
  );
}
