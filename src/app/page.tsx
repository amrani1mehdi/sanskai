import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { TrustBar } from "@/components/site/trust-bar";
import { Solutions } from "@/components/site/solutions";
import { CryptoMarket } from "@/components/site/crypto-market";
import { Advantages } from "@/components/site/advantages";
import { Registries } from "@/components/site/registries";
import { Testimonials } from "@/components/site/testimonials";
import { FinalCta } from "@/components/site/final-cta";
import { Footer } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export default async function Home() {
  const locale = await getLocale();
  const content = getSiteContent(locale);

  return (
    <>
      <Navbar content={content} locale={locale} />

      <main className="flex-1">
        <Hero content={content} />
        <TrustBar content={content} />
        <Solutions content={content} />
        <CryptoMarket content={content} />
        <Advantages content={content} />
        <Registries content={content} />
        <Testimonials content={content} />
        <FinalCta content={content} />
      </main>

      <Footer content={content} />
      <CookieBanner content={content} />
    </>
  );
}
