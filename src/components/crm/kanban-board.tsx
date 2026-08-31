"use client";

/**
 * The CRM board — one column per stage, cards dragged between them.
 *
 * Presentational: the workspace above owns the leads, the filters and the
 * selection, so the board can be pointed at service dossiers or contact
 * messages without knowing the difference. `stages` is what makes that work —
 * a message has two, a dossier has six.
 *
 * Drag and drop uses the native HTML5 API rather than a library: one drop
 * target type, no reordering inside a column, which the browser handles alone.
 */

import { Mail, Paperclip, Phone, StickyNote } from "lucide-react";
import { PrestationChip } from "@/components/crm/prestation-chip";
import { SERVICE_BY_ID, type StageConfig } from "@/lib/crm/config";
import { formatAmount, formatShortDate, formatTime } from "@/lib/crm/format";
import type { Lead, LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function KanbanBoard({
  leads,
  stages,
  selectedId,
  onSelect,
  onMove,
  onLog,
}: {
  leads: Lead[];
  stages: StageConfig[];
  selectedId: string | null;
  onSelect: (lead: Lead, focus?: "documents") => void;
  onMove: (id: string, status: LeadStatus) => void;
  onLog: (id: string, kind: "appel" | "email") => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStatus | null>(null);

  const byStage = useMemo(() => {
    const grouped = new Map<LeadStatus, Lead[]>(
      stages.map((stage) => [stage.id, [] as Lead[]]),
    );

    for (const lead of leads) grouped.get(lead.status)?.push(lead);

    for (const list of grouped.values()) {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return grouped;
  }, [leads, stages]);

  const drop = (status: LeadStatus) => {
    if (dragging) onMove(dragging, status);
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="overflow-x-auto pb-3 scrollbar-brand">
      <div className="flex min-w-max gap-4">
        {stages.map((stage) => {
          const list = byStage.get(stage.id) ?? [];

          return (
            <section
              key={stage.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(stage.id);
              }}
              onDragLeave={() =>
                setOver((current) => (current === stage.id ? null : current))
              }
              onDrop={() => drop(stage.id)}
              className={cn(
                /* Capped to the viewport so the board never grows taller than
                   the screen — otherwise a busy column pushes the horizontal
                   scrollbar below the fold and the right-hand stages become
                   unreachable without scrolling to the bottom first. */
                "flex max-h-[calc(100vh-13rem)] w-72 shrink-0 flex-col rounded-xl border bg-secondary/50 transition-colors",
                over === stage.id ? "border-accent bg-accent/5" : "border-border",
              )}
            >
              <header className="border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stage.dot)} />
                  <h2 className="font-display text-sm font-bold text-foreground">
                    {stage.label}
                  </h2>
                  <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{stage.hint}</p>
              </header>

              {/* Each column scrolls on its own; the header stays put, so you
                  can always see which stage you are dropping into. */}
              <div className="min-h-24 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-brand">
                {list.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    dragging={dragging === lead.id}
                    selected={selectedId === lead.id}
                    onSelect={(focus) => onSelect(lead, focus)}
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    onLog={onLog}
                  />
                ))}

                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Aucun lead
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  lead,
  dragging,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  onLog,
}: {
  lead: Lead;
  dragging: boolean;
  selected: boolean;
  onSelect: (focus?: "documents") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onLog: (id: string, kind: "appel" | "email") => void;
}) {
  return (
    /*
     * A button, not a link.
     *
     * Selecting a card opens the panel beside the board rather than leaving
     * the board — going to the full page for every glance is the thing this
     * layout exists to avoid. The full page is one click further, from the
     * panel.
     */
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative rounded-lg border p-3 transition-shadow",
        dragging ? "opacity-50" : "hover:shadow-md",
        /* Untreated leads are tinted in the accent, so what still needs
           picking up is obvious across the whole board rather than only in
           the first column. */
        lead.status === "nouveau" ? "bg-accent/8" : "bg-card",
        selected
          ? "border-accent ring-2 ring-accent/30"
          : lead.status === "nouveau"
            ? "border-accent/30"
            : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect()}
        aria-label={`Voir ${lead.prenom} ${lead.nom}, ${lead.reference}`}
        aria-pressed={selected}
        className="absolute inset-0 cursor-grab rounded-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:cursor-grabbing"
      />

      <div className="pointer-events-none relative">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-accent">
            {lead.reference}
          </span>
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            {formatShortDate(lead.createdAt)} · {formatTime(lead.createdAt)}
          </span>
        </div>

        <p className="mt-1 text-sm font-medium text-foreground">
          {lead.prenom} {lead.nom}
        </p>
        <p className="truncate text-xs text-muted-foreground">{lead.entreprise}</p>

        <p className="mt-2 text-xs text-muted-foreground">
          {SERVICE_BY_ID[lead.service].shortLabel}
        </p>

        {lead.prestation ? (
          <PrestationChip prestation={lead.prestation} short className="mt-1.5" />
        ) : null}

        {lead.service === "financement" ? (
          <p className="mt-1 font-display text-sm font-bold text-foreground">
            {formatAmount(lead.montant)}
          </p>
        ) : null}
      </div>

      <div className="relative mt-3 flex items-center gap-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        {lead.documentCount > 0 ? (
          /* Straight to the pieces. Everywhere else on the card selects the
             lead; this selects it *and* opens its documents, because a
             paperclip with a number on it is a thing you expect to click. */
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect("documents");
            }}
            title={`Consulter les ${lead.documentCount} pièce${
              lead.documentCount > 1 ? "s" : ""
            } de ${lead.reference}`}
            aria-label={`Consulter les pièces jointes de ${lead.reference}`}
            className="relative z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary hover:text-accent"
          >
            <Paperclip size={11} aria-hidden />
            {lead.documentCount}
          </button>
        ) : null}

        {lead.noteCount > 0 ? (
          <span className="pointer-events-none inline-flex items-center gap-1">
            <StickyNote size={11} />
            {lead.noteCount}
          </span>
        ) : null}

        {/* Shortcuts — only the ones the lead actually gave us a contact for. */}
        <span className="relative z-10 ml-auto flex items-center gap-1">
          {lead.telephone ? (
            <CardAction
              href={`tel:${lead.telephone.replace(/\s/g, "")}`}
              label={`Appeler ${lead.prenom} ${lead.nom} au ${lead.telephone}`}
              onClick={() => onLog(lead.id, "appel")}
            >
              <Phone size={13} />
            </CardAction>
          ) : null}

          <CardAction
            href={`mailto:${lead.email}?subject=${encodeURIComponent(
              `Votre demande ${lead.reference} — Sansekai Solution`,
            )}`}
            label={`Envoyer un email à ${lead.email}`}
            onClick={() => onLog(lead.id, "email")}
          >
            <Mail size={13} />
          </CardAction>
        </span>
      </div>
    </article>
  );
}

function CardAction({
  href,
  label,
  onClick,
  children,
}: {
  href: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      draggable={false}
      onClick={(event) => {
        // The whole card is a select target; this must not also select it.
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:bg-secondary hover:text-accent"
    >
      {children}
    </a>
  );
}
