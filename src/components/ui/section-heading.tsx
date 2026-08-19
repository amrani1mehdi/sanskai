import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

type SectionHeadingProps = {
  eyebrow?: string;
  titleLead: string;
  titleAccent?: string;
  subtitle?: string;
  className?: string;
};

/**
 * The recurring centred heading block: gold eyebrow, two-tone display title,
 * muted subtitle.
 */
export function SectionHeading({
  eyebrow,
  titleLead,
  titleAccent,
  subtitle,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("text-center", className)}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="text-3xl leading-tight text-foreground sm:text-4xl md:text-[2.6rem]">
        {titleLead}
        {titleAccent ? <span className="text-accent">{titleAccent}</span> : null}
      </h2>

      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </Reveal>
  );
}
