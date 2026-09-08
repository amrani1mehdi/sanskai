import type { Metadata } from "next";
import { ChartColumn, Cpu, Globe, Shield } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";
import { localeAlternates } from "@/lib/seo/alternates";
import { localeHref } from "@/lib/i18n/config";

const ITEM_ICONS = {
  chart: ChartColumn,
  globe: Globe,
  shield: Shield,
  cpu: Cpu,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { expertise } = getSiteContent(locale);

  return {
    title: expertise.meta.title,
    description: expertise.meta.description,
    alternates: localeAlternates(locale, "/expertise"),
    openGraph: {
      title: expertise.meta.title,
      description: expertise.meta.description,
      url: localeHref(locale, "/expertise"),
      type: "website",
    },
  };
}

export default async function ExpertisePage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const { expertise } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-16">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                {expertise.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
                {expertise.title}
              </h1>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-accent mb-4">
                {expertise.subtitle}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {expertise.desc}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {expertise.items.map((item, index) => {
                const Icon = ITEM_ICONS[item.icon];
                return (
                  <MotionReveal
                    key={item.title}
                    y={24}
                    delay={index * 100}
                    className="bg-card rounded-xl p-8 card-elevated border border-border group hover:border-accent/20 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent transition-all duration-300">
                      <Icon
                        size={24}
                        className="text-accent group-hover:text-accent-foreground transition-colors"
                      />
                    </div>
                    <h3 className="font-display text-xl font-bold text-card-foreground mb-3">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </MotionReveal>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer content={content} locale={locale} />
      <CookieBanner content={content} />
    </>
  );
}
