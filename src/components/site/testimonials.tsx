import { Quote, Star } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

export function Testimonials({ content }: { content: SiteContent }) {
  const { testimonials } = content;

  return (
    <section id="testimonials" className="section-padding bg-secondary">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow={testimonials.eyebrow}
          titleLead={testimonials.titleLead}
          titleAccent={testimonials.titleAccent}
        />

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
          {testimonials.items.map((testimonial, i) => (
            <Reveal key={testimonial.author} delay={i * 90}>
              <figure className="relative flex h-full flex-col rounded-lg border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
                <Quote
                  className="absolute right-6 top-6 size-6 text-border"
                  aria-hidden
                />

                <div
                  className="flex gap-0.5"
                  aria-label={`${testimonial.rating} out of 5`}
                >
                  {Array.from({ length: testimonial.rating }).map((_, star) => (
                    <Star
                      key={star}
                      className="size-3.5 fill-accent text-accent"
                      aria-hidden
                    />
                  ))}
                </div>

                <blockquote className="mt-5 flex-1 text-sm leading-relaxed text-foreground/90">
                  “{testimonial.quote}”
                </blockquote>

                <figcaption className="mt-6 border-t border-border pt-4 leading-tight">
                  <span className="block text-sm font-semibold text-foreground">
                    {testimonial.author}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {testimonial.role}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
