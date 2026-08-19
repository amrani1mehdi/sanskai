import type { Metadata } from "next";
import {
  ArrowLeftRight,
  Bitcoin,
  ChartColumn,
  CircleCheck,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { CryptoMarket } from "@/components/site/crypto-market";
import { CryptoForm } from "@/components/site/crypto-form";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

const CARD_ICONS = {
  wallet: Wallet,
  chart: ChartColumn,
  trade: ArrowLeftRight,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const { cryptoPage } = getSiteContent(await getLocale());

  return {
    title: cryptoPage.meta.title,
    description: cryptoPage.meta.description,
    alternates: { canonical: "/crypto-monnaie" },
    openGraph: {
      title: cryptoPage.meta.title,
      description: cryptoPage.meta.description,
      url: "/crypto-monnaie",
      type: "website",
    },
  };
}

export default async function CryptoMonnaiePage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const { cryptoPage } = content;
  const { interview } = cryptoPage;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-16">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <Bitcoin size={14} /> {cryptoPage.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
                {cryptoPage.title}
              </h1>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-accent mb-4">
                {cryptoPage.subtitle}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl whitespace-pre-line">
                {cryptoPage.heroDesc}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} className="max-w-4xl mx-auto text-center mb-10">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
                {interview.badge}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                {interview.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {interview.description}
              </p>
            </MotionReveal>

            <MotionReveal y={24} className="max-w-sm mx-auto">
              <div className="rounded-2xl overflow-hidden border border-border card-elevated bg-card">
                <div className="relative w-full" style={{ aspectRatio: "9 / 16" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${interview.videoId}`}
                    title={interview.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground text-center">
                    {interview.disclaimer}
                  </p>
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        <CryptoMarket content={content} />

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto mb-12">
              <p className="text-muted-foreground leading-relaxed text-center">
                {cryptoPage.explainer}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 mt-8">
                {cryptoPage.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CircleCheck size={16} className="text-accent shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {cryptoPage.cards.map((card, index) => {
                const Icon = CARD_ICONS[card.icon];
                return (
                  <MotionReveal
                    key={card.title}
                    y={24}
                    delay={index * 100}
                    className="bg-card rounded-xl p-8 card-elevated border border-border text-center"
                  >
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                      <Icon size={24} className="text-accent" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-card-foreground mb-3">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </MotionReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-padding bg-secondary">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <MotionReveal y={20}>
                <CryptoForm content={content} />
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
