import { ExternalLink } from "lucide-react";
import { siteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const { registries } = siteContent;

export function Registries() {
  return (
    <section id="registries" className="section-padding bg-secondary">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow={registries.eyebrow}
          titleLead={registries.title}
          subtitle={registries.subtitle}
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registries.items.map((registry, i) => (
            <Reveal key={registry.name} delay={(i % 3) * 80}>
              <a
                href={registry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-accent/40"
              >
                <span className="leading-tight">
                  <span className="block text-xs text-muted-foreground">
                    {registry.country}
                  </span>
                  <span className="block font-medium text-foreground">
                    {registry.name}
                  </span>
                </span>
                <ExternalLink
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent"
                  aria-hidden
                />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
