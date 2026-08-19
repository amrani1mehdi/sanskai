import Link from "next/link";
import { ArrowRight, Bitcoin, TrendingUp } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const icons = {
  "trending-up": TrendingUp,
  bitcoin: Bitcoin,
} as const;

export function Solutions({ content }: { content: SiteContent }) {
  const { solutions, solutionsSection } = content;

  return (
    <section id="solutions" className="section-padding bg-background">
      <div className="container mx-auto px-4">
        <SectionHeading
          titleLead={solutionsSection.titleLead}
          titleAccent={solutionsSection.titleAccent}
          subtitle={solutionsSection.subtitle}
        />

        <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
          {solutions.map((solution, i) => {
            const Icon = icons[solution.icon];
            return (
              <Reveal key={solution.id} delay={i * 100}>
                <Link
                  href={solution.href}
                  className="group flex h-full flex-col rounded-lg border border-border bg-card p-7 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_10px_28px_-12px_hsl(30_20%_20%/0.18)]"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-md bg-secondary">
                    <Icon className="size-5 text-accent" aria-hidden />
                  </span>

                  <h3 className="mt-5 font-display text-lg text-foreground">
                    {solution.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
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
