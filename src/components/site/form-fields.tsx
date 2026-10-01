"use client";

/**
 * The pieces the client sheet and the partner form are built from.
 *
 * Both are pages of numbered blocks, text fields and tap-target choices, read
 * on a phone as often as not. One set of parts keeps them looking like one site
 * and behaving the same way — the same error line under the same field, the
 * same chip under a thumb.
 */

import { useId } from "react";
import type { Option } from "@/lib/leads/salon";
import { cn } from "@/lib/utils";

/** The site's other forms use the same field, so the pages read as one site. */
const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

/** One of a form's numbered blocks. */
export function Block({
  number,
  title,
  children,
}: {
  number?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 font-display text-lg font-bold text-card-foreground">
        {number ? (
          <span
            aria-hidden
            className="gold-gradient flex size-7 shrink-0 items-center justify-center rounded-full text-xs text-accent-foreground"
          >
            {number}
          </span>
        ) : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-medium text-foreground mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(inputClass, error && "border-danger focus:border-danger")}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A row of choices, as chips a thumb can hit.
 *
 * Real inputs underneath, visually hidden, so the keyboard, a screen reader and
 * the browser's own form handling all see ordinary radios and checkboxes.
 */
export function Choices({
  legend,
  name,
  type,
  options,
  isChecked,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  type: "radio" | "checkbox";
  options: Option[];
  isChecked: (value: string) => boolean;
  onChange: (value: string) => void;
  error?: string;
}) {
  const errorId = useId();

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-xs font-medium text-foreground mb-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type={type}
              name={name}
              value={option.value}
              checked={isChecked(option.value)}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-4 py-2 text-sm transition-colors",
                "border-border bg-background text-foreground hover:border-accent/60",
                "peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:font-medium peer-checked:text-accent",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
