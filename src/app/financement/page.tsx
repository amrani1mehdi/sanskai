import type { Metadata } from "next";
import { Clock, CircleCheck, Lock, Shield, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { FinancingForm } from "@/components/site/financing-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { financing } = getSiteContent(await getLocale());

  return {
    title: financing.meta.title,
    description: financing.meta.description,
    alternates: { canonical: "/financement" },
    openGraph: {
      title: financing.meta.title,
      description: financing.meta.description,
      url: "/financement",
      type: "website",
    },
  };
}

export default async function FinancementPage() {
  const locale = await getLocale();
  const content = getSiteContent(locale);
  const { financing, common } = content;

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <section className="hero-gradient pt-28 pb-16">
          <div className="container mx-auto px-4">
            <MotionReveal y={20} trigger="mount" className="max-w-3xl">
              <span className="inline-flex items-center gap-2 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <TrendingUp size={14} /> {financing.badge}
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
                {financing.title}
              </h1>
              <p className="text-lg text-accent font-medium mb-4">
                {financing.subtitle}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {financing.heroDesc}
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="section-padding bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <MotionReveal x={-20}>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
                  {financing.formTitle}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {financing.formSubtitle}
                </p>

                <div className="space-y-4 mb-10">
                  {financing.benefits.map((benefit) => (
                    <div key={benefit} className="flex gap-3">
                      <CircleCheck size={20} className="text-accent shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground leading-relaxed">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-secondary rounded-xl p-6 border border-border mb-8">
                  <h3 className="font-display font-bold text-foreground mb-3">
                    {financing.reqTitle}
                  </h3>
                  <div className="space-y-2">
                    {financing.requirements.map((requirement) => (
                      <div key={requirement} className="flex gap-2 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <p className="text-sm text-muted-foreground">{requirement}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold text-foreground mb-4">
                  {financing.faqTitle}
                </h3>
                <Accordion type="single" collapsible className="mb-8">
                  {financing.faqs.map((faq, index) => (
                    <AccordionItem key={faq.question} value={`faq-${index + 1}`}>
                      <AccordionTrigger className="text-sm text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

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
                <FinancingForm content={content} />
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
