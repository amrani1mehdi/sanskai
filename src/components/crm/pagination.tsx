"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page numbers with an ellipsis once the run gets long: 1 … 4 5 6 … 12. */
function pageList(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (page >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => pages.add(n));
  }

  const sorted = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) out.push("gap");
    out.push(n);
    previous = n;
  }
  return out;
}

/**
 * Keeps long lists to one screen. The caller owns `page` so it can reset to 1
 * whenever a filter changes — nothing worse than filtering down to four rows
 * while stuck on page 3.
 */
export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  noun,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first row shown. */
  from: number;
  to: number;
  /** Singular noun, e.g. "lead" — pluralised here. */
  noun: string;
  onChange: (page: number) => void;
}) {
  const plural = total > 1 ? "s" : "";

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
    >
      <p className="text-xs text-muted-foreground">
        {total === 0 ? (
          `Aucun ${noun}`
        ) : (
          <>
            <span className="font-medium text-foreground">
              {from}–{to}
            </span>{" "}
            sur {total} {noun}
            {plural}
          </>
        )}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <Step
            label="Page précédente"
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft size={15} />
          </Step>

          {pageList(page, pageCount).map((entry, index) =>
            entry === "gap" ? (
              <span
                key={`gap-${index}`}
                className="px-1 text-xs text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onChange(entry)}
                aria-current={entry === page ? "page" : undefined}
                aria-label={`Page ${entry}`}
                className={cn(
                  "min-w-8 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  entry === page
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                {entry}
              </button>
            ),
          )}

          <Step
            label="Page suivante"
            disabled={page === pageCount}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRight size={15} />
          </Step>
        </div>
      ) : null}
    </nav>
  );
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
    >
      {children}
    </button>
  );
}

/** Slices `items` for `page`, clamping the page so it can never fall off the end. */
export function paginate<T>(items: T[], page: number, size: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * size;

  return {
    page: safePage,
    pageCount,
    total,
    rows: items.slice(start, start + size),
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
  };
}
