"use client";

/**
 * A filter dropdown, list included.
 *
 * Built rather than native, for one reason: a browser draws the option list of
 * a `<select>` itself, and no CSS reaches inside it. Styling the closed control
 * and leaving the open list to the operating system is the worst of both — the
 * thing you actually look at while choosing stays unstyled.
 *
 * What that costs is everything a native select gives away free, so it is put
 * back by hand: arrow keys and Home/End move the highlight, Enter and Space
 * commit, Escape cancels, Tab closes, the trigger keeps focus throughout, and
 * the pair is wired as a real `combobox` + `listbox` so it is announced as a
 * dropdown rather than a pile of divs.
 */

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

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
  options: Option[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.findIndex((option) => option.value === value);
  const current = options[selected] ?? options[0];
  /** Tinted when it is actually filtering, so a thinned board explains itself. */
  const active = value !== "tous";

  /* Opening starts on the current value rather than the top of the list, so
     arrowing down moves from where you are. Done here and not in an effect:
     the highlight is a consequence of opening, not of having opened. */
  const openList = () => {
    setHighlighted(selected < 0 ? 0 : selected);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open) return;

    list.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  const commit = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const step = event.key === "ArrowDown" ? 1 : -1;
        setHighlighted((current) =>
          Math.min(options.length - 1, Math.max(0, current + step)),
        );
        return;
      }
      case "Home":
        if (open) {
          event.preventDefault();
          setHighlighted(0);
        }
        return;
      case "End":
        if (open) {
          event.preventDefault();
          setHighlighted(options.length - 1);
        }
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) commit(highlighted);
        else openList();
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        return;
    }
  };

  return (
    <div ref={container} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border py-2 pr-2.5 pl-3 text-sm whitespace-nowrap transition-colors",
          "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
          active
            ? "border-accent/40 bg-accent/10 font-medium text-foreground"
            : "border-border bg-card text-foreground hover:border-accent/30",
          open && "border-accent ring-2 ring-accent/30",
        )}
      >
        <span className="min-w-0 flex-1 text-left">{current?.label}</span>
        <ChevronDown
          size={15}
          aria-hidden
          className={cn(
            "shrink-0 transition-transform",
            open && "rotate-180",
            active ? "text-accent" : "text-muted-foreground",
          )}
        />
      </button>

      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${highlighted}`}
          className="absolute z-50 mt-1.5 max-h-72 w-full min-w-max overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg scrollbar-brand"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;

            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => commit(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  index === highlighted
                    ? "bg-accent/12 text-foreground"
                    : "text-muted-foreground",
                  isSelected && "font-medium text-foreground",
                )}
              >
                <Check
                  size={14}
                  aria-hidden
                  className={cn(
                    "shrink-0 text-accent",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
