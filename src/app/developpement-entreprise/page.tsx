import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { BusinessServices } from "@/components/site/business-services";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

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

        {/* Cards and form together: each card's button selects its service. */}
        <BusinessServices content={content} />
      </main>

      <Footer content={content} />
      <CookieBanner content={content} />
    </>
  );
}
