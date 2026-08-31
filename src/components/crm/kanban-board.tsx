"use client";

/**
 * Pipeline view — one column per stage, cards dragged between them.
 *
 * Drag and drop uses the native HTML5 API rather than a library: the board has
 * a single drop target type and no reordering inside a column, which the
 * browser handles on its own.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Mail, Paperclip, Phone, StickyNote } from "lucide-react";
import { PrestationChip } from "@/components/crm/prestation-chip";
import { SERVICE_BY_ID, STAGES } from "@/lib/crm/config";
import { formatAmount, formatShortDate } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import type { Lead, LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export function KanbanBoard() {
  const { dossiers: leads, setStatus, logContact } = useCrm();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStatus | null>(null);

  const byStage = useMemo(() => {
    const grouped = new Map<LeadStatus, Lead[]>(
      STAGES.map((stage) => [stage.id, [] as Lead[]]),
    );
    for (const lead of leads) grouped.get(lead.status)?.push(lead);
    for (const list of grouped.values()) {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return grouped;
  }, [leads]);

  const drop = (status: LeadStatus) => {
    if (dragging) setStatus(dragging, status);
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Glissez une fiche d&apos;une colonne à l&apos;autre pour changer son statut.
        </p>
      </header>

      <div className="overflow-x-auto pb-4 scrollbar-brand">
        <div className="flex min-w-max gap-4">
          {STAGES.map((stage) => {
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
                  /* Capped to the viewport so the board itself never grows
                     taller than the screen. Without this, a busy column pushed
                     the horizontal scrollbar below the fold — you had to scroll
                     to the bottom of the longest column before you could reach
                     the columns on the right. */
                  "flex max-h-[calc(100vh-14rem)] w-72 shrink-0 flex-col rounded-xl border bg-secondary/50 transition-colors",
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

                {/* Each column scrolls on its own; the header above stays put,
                    so you can always see which stage you are dropping into. */}
                <div className="min-h-24 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-brand">
                  {list.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      dragging={dragging === lead.id}
                      onDragStart={() => setDragging(lead.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onLog={logContact}
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
    </div>
  );
}

function KanbanCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
  onLog,
}: {
  lead: Lead;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onLog: ReturnType<typeof useCrm>["logContact"];
}) {

  return (
    /* The card is the drag source and the link target, so the link is stretched
       over it with a pseudo-element and the action buttons are lifted above. */
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative cursor-grab rounded-lg border border-border bg-card p-3 transition-shadow active:cursor-grabbing",
        dragging ? "opacity-50" : "hover:shadow-md",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/admin/leads/${lead.id}`}
          className="font-mono text-[11px] font-semibold text-accent after:absolute after:inset-0 after:content-['']"
        >
          {lead.reference}
        </Link>
        <span className="text-[11px] whitespace-nowrap text-muted-foreground">
          {formatShortDate(lead.createdAt)}
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

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        {lead.documentCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Paperclip size={11} />
            {lead.documentCount}
          </span>
        ) : null}

        {lead.noteCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <StickyNote size={11} />
            {lead.noteCount}
          </span>
        ) : null}

        {/* Raccourcis — seulement ceux dont le lead a transmis le contact. */}
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
        // The card behind is a link; this action must not open it too.
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:bg-secondary hover:text-accent"
    >
      {children}
    </a>
  );
}
