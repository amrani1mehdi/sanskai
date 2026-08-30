import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Megaphone, Monitor, Palette, Rocket } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

const SERVICE_ICONS = {
  website: Monitor,
  logo: Palette,
  ads: Megaphone,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const { businessDevelopment } = getSiteContent(await getLocale());

  return {
    title: businessDevelopment.meta.title,
    description: businessDevelopment.meta.description,
    alternates: { canonical: "/developpement-entreprise" },
    openGraph: {
      title: businessDevelopment.meta.title,
      description: businessDevelopment.meta.description,
      url: "/developpement-entreprise",
      type: "website",
    },
  };
}

export default async function DeveloppementEntreprisePage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const { businessDevelopment } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-16">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <Rocket size={14} /> {businessDevelopment.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
                {businessDevelopment.title}
              </h1>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-accent mb-4">
                {businessDevelopment.subtitle}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {businessDevelopment.desc}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {businessDevelopment.services.map((service, index) => {
                const Icon = SERVICE_ICONS[service.icon];
                return (
                  <MotionReveal
                    key={service.title}
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
                    <h3 className="font-display text-lg font-bold text-card-foreground mb-3">
                      {service.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </MotionReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-padding bg-secondary">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                {businessDevelopment.cta.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {businessDevelopment.cta.description}
              </p>
              <Link
                href={businessDevelopment.cta.href}
                className="gold-gradient text-accent-foreground inline-flex items-center gap-2 rounded-lg px-8 py-4 text-sm font-bold transition-opacity hover:opacity-90"
              >
                {businessDevelopment.cta.label}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </MotionReveal>
          </div>
        </section>
      </main>

      <Footer content={content} />
      <CookieBanner content={content} />
    </>
  );
}
