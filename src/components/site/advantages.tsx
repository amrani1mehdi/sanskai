import { CircleCheck } from "lucide-react";
import { siteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const { advantages } = siteContent;

export function Advantages() {
  return (
    <section id="why-us" className="section-padding hero-gradient">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow={advantages.eyebrow}
          titleLead={advantages.titleLead}
          titleAccent={advantages.titleAccent}
          subtitle={advantages.subtitle}
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {advantages.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 3) * 90}>
              <article className="h-full rounded-lg border border-border/70 bg-secondary/60 p-6 transition-colors hover:border-accent/40">
                <CircleCheck className="size-5 text-accent" aria-hidden />
                <h3 className="mt-4 font-display text-base text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
