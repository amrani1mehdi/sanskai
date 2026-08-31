"use client";

/**
 * A filter dropdown.
 *
 * Still a native `<select>` underneath: it gets keyboard support, type-ahead
 * and the platform's own picker on a phone for free, and no hand-built listbox
 * repays what it costs to lose those. Only the chrome is replaced — the browser
 * arrow is suppressed and a chevron drawn in its place, so the control matches
 * the search field beside it rather than the operating system.
 */

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  /** Announced to screen readers; the options carry the visible wording. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Anything other than this counts as filtering, and is tinted. */
  neutral?: string;
  className?: string;
}) {
  const active = value !== "tous";

  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-lg border py-2 pr-9 pl-3 text-sm transition-colors",
          "focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none",
          /* A filter that is actually filtering is tinted, so a board looking
             half empty explains itself without opening every dropdown to find
             out which one is doing it. */
          active
            ? "border-accent/40 bg-accent/10 font-medium text-foreground"
            : "border-border bg-card text-foreground hover:border-accent/30",
        )}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-card text-foreground"
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-colors",
          active ? "text-accent" : "text-muted-foreground",
        )}
      />
    </div>
  );
}
