import type { Metadata } from "next";
import { Clock, Globe, Lock, Shield } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { InvestmentForm } from "@/components/site/investment-form";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { investment } = getSiteContent(await getLocale());

  return {
    title: investment.meta.title,
    description: investment.meta.description,
    alternates: { canonical: "/investissement" },
    openGraph: {
      title: investment.meta.title,
      description: investment.meta.description,
      url: "/investissement",
      type: "website",
    },
  };
}

export default async function InvestissementPage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const { investment, common } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-16">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <Globe size={14} /> {investment.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
                {investment.title}
              </h1>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-accent mb-4">
                {investment.subtitle}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {investment.heroDesc}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <MotionReveal x={-20}>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
                  {investment.titleLead}
                  <span className="text-gold-gradient">
                    {investment.titleAccent}
                  </span>
                </h2>

                {investment.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-muted-foreground leading-relaxed mb-8"
                  >
                    {paragraph}
                  </p>
                ))}

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {investment.cards.map((card) => (
                    <div
                      key={card.label}
                      className="bg-secondary rounded-xl p-6 border border-border"
                    >
                      <h4 className="font-display font-bold text-sm text-foreground mb-1">
                        {card.label}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-xs text-muted-foreground">
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
              </MotionReveal>

              <MotionReveal x={20}>
                <InvestmentForm content={content} />
              </MotionReveal>
            </div>
          </div>
        </section>
      </main>

      <Footer content={content} />
      <CookieBanner content={content} />
    </>
  );
}
