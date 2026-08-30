"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { parseDateInput, toDateInput } from "@/lib/eligibility";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  /** `YYYY-MM-DD`, or an empty string when nothing is chosen yet. */
  value: string;
  onChange: (value: string) => void;
  locale: string;
  placeholder: string;
  /** Nothing later than this is selectable — defaults to today. */
  max?: Date;
  /** How far back the year list goes. */
  yearsBack?: number;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
};

const WEEK_START = 1; // Monday, as in all three of the site's locales.

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Date field with a calendar panel styled from the site's tokens.
 *
 * Month and year are dropdowns rather than only arrows: this is used for
 * company founding dates, which are usually years back, and paging a month at
 * a time to reach them would be miserable.
 */
export function DatePicker({
  value,
  onChange,
  locale,
  placeholder,
  max,
  yearsBack = 40,
  id,
  invalid,
  describedBy,
}: DatePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => startOfDay(max ?? new Date()), [max]);

  const selected = useMemo(() => (value ? parseDateInput(value) : null), [value]);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? maxDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Opening should land on the selected month, not wherever it was left. Done
  // here rather than in an effect so it happens with the state that opens it.
  const toggle = () =>
    setOpen((current) => {
      if (!current) setView(selected ?? maxDate);
      return !current;
    });

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: "long" });
    return Array.from({ length: 12 }, (_, month) =>
      format.format(new Date(2020, month, 1)),
    );
  }, [locale]);

  const weekdayNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2024-01-01 was a Monday, so this starts the week where WEEK_START says.
    return Array.from({ length: 7 }, (_, i) =>
      format.format(new Date(2024, 0, 1 + i)),
    );
  }, [locale]);

  const years = useMemo(() => {
    const latest = maxDate.getFullYear();
    return Array.from({ length: yearsBack + 1 }, (_, i) => latest - i);
  }, [maxDate, yearsBack]);

  const displayValue = useMemo(() => {
    if (!selected) return "";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(selected);
  }, [selected, locale]);

  /** Day cells for the visible month, padded so the first lands on its weekday. */
  const days = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();

    const first = new Date(year, month, 1);
    const lead = (first.getDay() - WEEK_START + 7) % 7;
    const total = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= total; day++) {
      cells.push(new Date(year, month, day));
    }

    return cells;
  }, [view]);

  const shiftMonth = (delta: number) =>
    setView((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + delta,
        1,
      );
      return next > maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), 1) : next;
    });

  const canGoForward =
    view.getFullYear() < maxDate.getFullYear() ||
    (view.getFullYear() === maxDate.getFullYear() &&
      view.getMonth() < maxDate.getMonth());

  const select = (date: Date) => {
    onChange(toDateInput(date));
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3.5 text-left text-sm text-foreground outline-none transition-all",
          "focus:border-accent focus:ring-2 focus:ring-accent",
          invalid ? "border-danger" : "border-border",
        )}
      >
        <span className={cn(!displayValue && "text-muted-foreground")}>
          {displayValue || placeholder}
        </span>
        <CalendarDays className="size-4 shrink-0 text-accent" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={placeholder}
          className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-border bg-card p-4 shadow-[var(--card-shadow-hover)] sm:right-auto sm:w-80"
        >
          {/* Month and year controls */}
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>

            <select
              value={view.getMonth()}
              onChange={(event) =>
                setView(
                  new Date(view.getFullYear(), Number(event.target.value), 1),
                )
              }
              aria-label="Month"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent"
            >
              {monthNames.map((name, month) => (
                <option key={name} value={month}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={view.getFullYear()}
              onChange={(event) =>
                setView(
                  new Date(Number(event.target.value), view.getMonth(), 1),
                )
              }
              aria-label="Year"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={!canGoForward}
              aria-label="Next month"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayNames.map((name) => (
              <span
                key={name}
                className="py-1 text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {name.slice(0, 2)}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) return <span key={`pad-${index}`} />;

              const disabled = date > maxDate;
              const isSelected = selected ? sameDay(date, selected) : false;
              const isToday = sameDay(date, today);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(date)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                    isSelected
                      ? "gold-gradient font-semibold text-accent-foreground"
                      : "text-foreground hover:bg-secondary",
                    !isSelected && isToday && "ring-1 ring-accent/50",
                    disabled &&
                      "cursor-not-allowed text-muted-foreground/40 hover:bg-transparent",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
