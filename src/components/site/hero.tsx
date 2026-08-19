import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bitcoin, TrendingUp } from "lucide-react";
import { siteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";

const { hero, solutions } = siteContent;

const cardIcons = {
  "trending-up": TrendingUp,
  bitcoin: Bitcoin,
} as const;

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      {/* Background photo + dark wash, mirroring the live site's stacked overlays. */}
      <div className="absolute inset-0">
        <Image
          src={hero.backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-[hsl(30_15%_12%)] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(30_15%_10%/0.6)] via-transparent to-[hsl(30_15%_10%/0.8)]" />

      <div className="container relative z-10 mx-auto px-4 pt-28 pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-cream backdrop-blur-sm sm:text-xs">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {hero.eyebrow}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-8 font-display text-4xl leading-[1.08] text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              {hero.titleLead}
              <span className="text-accent">{hero.titleAccent}</span>
              {hero.titleTrail}
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <ul className="mt-8 space-y-1 text-base text-white/85 sm:text-lg">
              {hero.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={hero.primaryCta.href}
                className="gold-gradient inline-flex w-full items-center justify-center gap-2 rounded-md px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-gold)] transition-opacity hover:opacity-90 sm:w-[282px]"
              >
                {hero.primaryCta.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={hero.secondaryCta.href}
                className="inline-flex w-full items-center justify-center rounded-md border border-white/30 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:w-[282px]"
              >
                {hero.secondaryCta.label}
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Two glass cards floating over the hero image. */}
        <div className="mx-auto mt-16 grid max-w-3xl gap-5 sm:grid-cols-2">
          {solutions.map((solution, i) => {
            const Icon = cardIcons[solution.icon];
            return (
              <Reveal key={solution.id} delay={320 + i * 80}>
                <Link
                  href={solution.href}
                  className="group block h-full rounded-lg border border-white/12 bg-white/8 p-7 backdrop-blur-md transition-colors hover:border-accent/50 hover:bg-white/12"
                >
                  <span className="gold-gradient inline-flex size-12 items-center justify-center rounded-md">
                    <Icon className="size-5.5 text-accent-foreground" aria-hidden />
                  </span>

                  <h3 className="mt-5 font-display text-lg text-white">
                    {solution.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-white/75">
                    {solution.description}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                    {solution.cta}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
