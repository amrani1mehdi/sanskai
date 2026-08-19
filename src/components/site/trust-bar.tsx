import { Award, Clock, Lock, Shield, Users } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";

const icons = {
  clock: Clock,
  shield: Shield,
  users: Users,
  lock: Lock,
  award: Award,
} as const;

export function TrustBar({ content }: { content: SiteContent }) {
  return (
    <section className="border-y border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {content.trustBar.map((item, i) => {
            const Icon = icons[item.icon];
            return (
              <Reveal
                key={item.title}
                delay={i * 60}
                className="flex items-center gap-3"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Icon className="size-5 text-accent" aria-hidden />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.subtitle}
                  </span>
                </span>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
