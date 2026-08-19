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

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Solutions />
        <CryptoMarket />
        <Advantages />
        <Registries />
        <Testimonials />
        <FinalCta />
      </main>

      <Footer />
      <CookieBanner />
    </>
  );
}
