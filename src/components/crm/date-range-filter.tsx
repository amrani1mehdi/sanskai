"use client";

/**
 * The board's date filter.
 *
 * It was a dropdown of four fixed windows — all dates, 7, 30, 90 days — which
 * answered the only questions anyone asked most mornings and none of the ones
 * they asked at month end. "Everything in August" was not on the list, and no
 * combination of the four got you there.
 *
 * So: a calendar, with the four windows kept as one-click presets beside it,
 * because "the last 30 days" should not cost two clicks on a grid. Picking a
 * preset writes real dates into the range rather than storing "30" — which
 * keeps the filtering pure, and means the window stops sliding under you while
 * you read the board.
 */

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Both ends inclusive, each `YYYY-MM-DD`, `null` for open-ended. */
export type DateRange = { from: string | null; to: string | null };

export const ANY_DATE: DateRange = { from: null, to: null };

/** Monday, as everywhere else on the site. */
const WEEK_START = 1;
const DAY_NAMES = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

const iso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const parse = (value: string | null): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return Number.isFinite(y) ? new Date(y, m - 1, d) : null;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, by: number) =>
  new Date(date.getFullYear(), date.getMonth() + by, 1);

/** The days to draw for a month, padded to whole weeks. */
function monthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const lead = (first.getDay() - WEEK_START + 7) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - lead);

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

const short = (value: string) =>
  parse(value)!.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** What the trigger says, given the range. */
function summarise({ from, to }: DateRange): string {
  if (!from && !to) return "Toutes les dates";
  if (from && !to) return `Depuis le ${short(from)}`;
  if (!from && to) return `Jusqu'au ${short(to)}`;
  return from === to ? short(from!) : `${short(from!)} — ${short(to!)}`;
}

/** Windows counted back from today, resolved to real dates when clicked. */
const PRESETS: { label: string; days: number }[] = [
  { label: "7 derniers jours", days: 7 },
  { label: "30 derniers jours", days: 30 },
  { label: "90 derniers jours", days: 90 },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  /* Set on the first click of a pair, so the grid can shade what the range
     would be while the pointer moves toward the second. */
  const [pending, setPending] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = value.from !== null || value.to !== null;
  const today = iso(new Date());

  const pick = (day: string) => {
    /* First click opens a range, second closes it. Clicking before the open end
       is not an error — it is someone picking the two ends in the other order,
       so the pair is sorted rather than refused. */
    if (pending === null) {
      setPending(day);
      onChange({ from: day, to: day });
      return;
    }

    const [from, to] = pending <= day ? [pending, day] : [day, pending];
    setPending(null);
    onChange({ from, to });
    setOpen(false);
  };

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);

    setPending(null);
    onChange({ from: iso(from), to: iso(to) });
    setOpen(false);
  };

  const clear = () => {
    setPending(null);
    onChange(ANY_DATE);
    setOpen(false);
  };

  const days = monthGrid(month);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 border px-3 py-2 text-sm whitespace-nowrap transition-colors",
          active || open
            ? "border-foreground bg-card text-foreground"
            : "border-border bg-card text-muted-foreground hover:text-foreground",
        )}
      >
        <CalendarDays size={15} className="shrink-0" aria-hidden />
        {summarise(value)}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Filtrer par période"
          className="absolute right-0 z-50 mt-1 flex border border-border bg-card shadow-[0_10px_30px_-12px_rgba(24,24,27,0.4)]"
        >
          {/* The old dropdown's four options, kept because they are still the
              common case — the calendar is for everything else. */}
          <div className="flex w-40 shrink-0 flex-col border-r border-border p-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className="px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}

            <button
              type="button"
              onClick={clear}
              disabled={!active}
              className={cn(
                "mt-auto flex items-center gap-1.5 px-2.5 py-2 text-left text-sm transition-colors",
                active
                  ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/40",
              )}
            >
              <X size={13} aria-hidden /> Toutes les dates
            </button>
          </div>

          <div className="w-64 p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, -1))}
                aria-label="Mois précédent"
                className="p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft size={15} />
              </button>

              <p className="font-mono text-[11px] tracking-[0.1em] text-foreground uppercase">
                {month.toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>

              <button
                type="button"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Mois suivant"
                className="p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-px">
              {DAY_NAMES.map((name) => (
                <span
                  key={name}
                  className="py-1 text-center font-mono text-[10px] text-muted-foreground"
                >
                  {name}
                </span>
              ))}

              {days.map((day) => {
                const key = iso(day);
                const outside = day.getMonth() !== month.getMonth();
                const isFrom = key === value.from;
                const isTo = key === value.to;
                const within =
                  value.from !== null &&
                  value.to !== null &&
                  key > value.from &&
                  key < value.to;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pick(key)}
                    aria-pressed={isFrom || isTo}
                    className={cn(
                      "py-1.5 text-center text-xs tabular-nums transition-colors",
                      outside && "text-muted-foreground/40",
                      !outside && "text-foreground",
                      within && "bg-secondary",
                      (isFrom || isTo) && "bg-foreground font-semibold text-background",
                      !isFrom && !isTo && "hover:bg-secondary",
                      key === today && !isFrom && !isTo && "font-semibold underline",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
