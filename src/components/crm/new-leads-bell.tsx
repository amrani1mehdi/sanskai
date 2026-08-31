"use client";

/**
 * Leads that have arrived and not been read.
 *
 * The board refreshes itself every fifteen seconds, which is the hard part —
 * but a card appearing in a column nobody is looking at is indistinguishable
 * from nothing happening. This is what says so.
 *
 * "New" is arrival, not status: a lead sitting untreated for a week is not
 * news, and a lead that landed a minute ago is, whatever column it is in. The
 * marker is kept in the browser, so it survives a refresh and only clears when
 * somebody actually marks it read.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { SERVICE_BY_ID } from "@/lib/crm/config";
import { formatShortDate, formatTime } from "@/lib/crm/format";
import type { Lead } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export function NewLeadsBell({
  leads,
  onMarkAll,
  onMarkOne,
  onSelect,
}: {
  /** Arrivals not yet read, newest first. */
  leads: Lead[];
  onMarkAll: () => void;
  onMarkOne: (id: string) => void;
  onSelect: (lead: Lead) => void;
}) {
  const [open, setOpen] = useState(false);
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

  const count = leads.length;

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          count > 0
            ? `${count} nouveau${count > 1 ? "x" : ""} lead${count > 1 ? "s" : ""}`
            : "Aucun nouveau lead"
        }
        className={cn(
          "relative rounded-lg border p-2 transition-colors",
          count > 0
            ? "border-new/50 bg-new-soft text-foreground hover:border-new"
            : "border-border bg-card text-muted-foreground hover:text-foreground",
        )}
      >
        <Bell size={16} />

        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white tabular-nums"
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-84 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border bg-new-soft px-4 py-2.5">
            <p className="flex-1 text-xs font-semibold text-foreground">
              {count === 0
                ? "Aucun nouveau lead"
                : `${count} nouveau${count > 1 ? "x" : ""} lead${
                    count > 1 ? "s" : ""
                  }`}
            </p>

            {count > 0 ? (
              <button
                type="button"
                onClick={onMarkAll}
                className="inline-flex items-center gap-1.5 rounded-md bg-new-strong px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <CheckCheck size={13} aria-hidden /> Tout marquer comme lu
              </button>
            ) : null}
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center">
              <BellOff
                size={22}
                className="mx-auto mb-2 text-muted-foreground"
                aria-hidden
              />
              <p className="text-xs text-muted-foreground">
                Les demandes envoyées depuis le site apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto scrollbar-brand">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-start gap-1 border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(lead);
                      // Opening it is reading it.
                      onMarkOne(lead.id);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4 text-left transition-colors hover:bg-secondary"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {lead.prenom} {lead.nom}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lead.entreprise} · {SERVICE_BY_ID[lead.service].shortLabel}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatShortDate(lead.createdAt)} ·{" "}
                        {formatTime(lead.createdAt)}
                      </span>
                    </span>
                  </button>

                  {/* Dismiss without opening — some arrivals only need noting. */}
                  <button
                    type="button"
                    onClick={() => onMarkOne(lead.id)}
                    title="Marquer comme lu"
                    aria-label={`Marquer ${lead.reference} comme lu`}
                    className="mt-2.5 mr-2 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-new-strong hover:text-white"
                  >
                    <Check size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
