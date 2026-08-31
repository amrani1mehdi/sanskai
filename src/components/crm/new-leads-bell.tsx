"use client";

/**
 * New arrivals, since this session started.
 *
 * The board already updates itself every fifteen seconds, which is the hard
 * part — but a card quietly appearing in a column you are not looking at is
 * indistinguishable from nothing happening. This is the part that says so.
 *
 * "New" means arrived while you were here, not "status is nouveau": the first
 * response of the session is the baseline, so opening the CRM never announces
 * thirty leads you already knew about.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, Inbox } from "lucide-react";
import { SERVICE_BY_ID } from "@/lib/crm/config";
import { formatTime } from "@/lib/crm/format";
import type { Lead } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export function NewLeadsBell({
  leads,
  onSeen,
  onSelect,
}: {
  leads: Lead[];
  onSeen: () => void;
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
        onClick={() => {
          const next = !open;
          setOpen(next);
          // Opening them is what marks them read — the badge should not sit
          // there after you have looked at exactly what it was pointing to.
          if (next) onSeen();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          count > 0
            ? `${count} nouveau${count > 1 ? "x" : ""} lead${count > 1 ? "s" : ""}`
            : "Nouveaux leads"
        }
        className={cn(
          "relative rounded-lg border p-2 transition-colors",
          count > 0
            ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
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
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <p className="border-b border-border bg-accent/10 px-4 py-2.5 text-xs font-semibold text-foreground">
            {count === 0
              ? "Aucun nouveau lead"
              : `${count} lead${count > 1 ? "s" : ""} depuis votre arrivée`}
          </p>

          {count === 0 ? (
            <div className="px-4 py-8 text-center">
              <Inbox size={22} className="mx-auto mb-2 text-muted-foreground" aria-hidden />
              <p className="text-xs text-muted-foreground">
                Les demandes envoyées depuis le site apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto scrollbar-brand">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(lead);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary"
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
                    </span>
                    <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
                      {formatTime(lead.createdAt)}
                    </span>
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
