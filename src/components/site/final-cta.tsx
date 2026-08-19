import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta({ content }: { content: SiteContent }) {
  const { finalCta } = content;

  return (
    <section className="section-padding hero-gradient relative overflow-hidden">
      {/* Soft gold bloom behind the copy. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      <div className="container relative mx-auto px-4">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl leading-tight text-foreground sm:text-4xl md:text-[2.75rem]">
            {finalCta.titleLead}
            <span className="text-accent">{finalCta.titleAccent}</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
            {finalCta.subtitle}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={finalCta.primaryCta.href}
              className="gold-gradient inline-flex items-center justify-center gap-2 rounded-md px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-gold)] transition-opacity hover:opacity-90"
            >
              {finalCta.primaryCta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>

            <Link
              href={finalCta.secondaryCta.href}
              className="inline-flex items-center justify-center rounded-md border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/50 hover:text-accent"
            >
              {finalCta.secondaryCta.label}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
