"use client";

/**
 * The CRM — where leads are actually managed.
 *
 * Board in the middle, filters above it, and the selected lead in a panel on
 * the right that only exists while something is selected. Selecting a card
 * never leaves the board: the whole point of the layout is that a lead can be
 * read, moved and noted without a round trip to another page.
 *
 * Two boards, one component. Service dossiers run the six-stage pipeline;
 * contact messages have two states, answered or not, because "Qualifié" and
 * "Approuvé" mean nothing on a question somebody asked. Switching between them
 * swaps the columns rather than pretending one set fits both.
 */

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { LeadPanel } from "@/components/crm/lead-panel";
import {
  CONTACT,
  CONTACT_STAGES,
  PRESTATIONS,
  SERVICES,
  STAGES,
} from "@/lib/crm/config";
import { useCrm } from "@/lib/crm/store";
import type { PrestationId, ServiceId } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/** Which board is on screen. Messages are separate because their stages are. */
type Board = "dossiers" | "messages";
type ServiceFilter = ServiceId | "tous";
type PrestationFilter = PrestationId | "tous";
/** Received within the last N days. */
type PeriodFilter = "tous" | "7" | "30" | "90";

const PERIODS: { id: PeriodFilter; label: string }[] = [
  { id: "tous", label: "Toutes les dates" },
  { id: "7", label: "7 derniers jours" },
  { id: "30", label: "30 derniers jours" },
  { id: "90", label: "90 derniers jours" },
];

const selectClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function CrmWorkspace() {
  const { dossiers, messages, hydrated, syncedAt, setStatus, logContact } =
    useCrm();

  const [board, setBoard] = useState<Board>("dossiers");
  const [query, setQuery] = useState("");
  const [service, setService] = useState<ServiceFilter>("tous");
  const [prestation, setPrestation] = useState<PrestationFilter>("tous");
  const [period, setPeriod] = useState<PeriodFilter>("tous");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const source = board === "messages" ? messages : dossiers;
  const stages = board === "messages" ? CONTACT_STAGES : STAGES;
  /** The sub-service filter only means anything inside Développement. */
  const showPrestations = board === "dossiers" && service === "developpement";

  const leads = useMemo(() => {
    const needle = query.trim().toLowerCase();

    /* The window is measured from the last sync rather than `Date.now()`.
       Reading the clock inside a memo is impure — the same inputs would give
       different answers — and the sync time is the honest reference anyway:
       the list is only ever as current as the last fetch. It moves every
       poll, so the window slides on its own. */
    const cutoff =
      period === "tous" || !syncedAt
        ? null
        : new Date(syncedAt).getTime() - Number(period) * 24 * 60 * 60 * 1000;

    return source.filter((lead) => {
      if (board === "dossiers" && service !== "tous" && lead.service !== service) {
        return false;
      }
      if (showPrestations && prestation !== "tous" && lead.prestation !== prestation) {
        return false;
      }
      if (cutoff !== null && new Date(lead.createdAt).getTime() < cutoff) {
        return false;
      }
      if (!needle) return true;

      return [
        lead.reference,
        lead.nom,
        lead.prenom,
        lead.entreprise,
        lead.email,
        lead.telephone,
        lead.ville,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    });
  }, [source, board, service, prestation, period, query, showPrestations, syncedAt]);

  /* Read from the live list, not held in state: a card that moves stage or is
     deleted must not leave the panel showing a stale copy of it. */
  const selected = selectedId
    ? (source.find((lead) => lead.id === selectedId) ?? null)
    : null;

  const filtersActive =
    query.trim() !== "" ||
    service !== "tous" ||
    prestation !== "tous" ||
    period !== "tous";

  const reset = () => {
    setQuery("");
    setService("tous");
    setPrestation("tous");
    setPeriod("tous");
  };

  const changeBoard = (next: Board) => {
    setBoard(next);
    // The filters below are per board; carrying them across makes the other
    // board look empty for reasons that are no longer on screen.
    setService("tous");
    setPrestation("tous");
    setSelectedId(null);
  };

  return (
    <div className="flex h-[calc(100vh-1px)] min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 lg:px-6">
          <h1 className="font-display text-lg font-bold text-foreground">Leads</h1>

          {/* Dossiers and messages are different objects with different
              stages, so this switches the board rather than filtering it. */}
          <div
            role="tablist"
            aria-label="Type de lead"
            className="flex rounded-lg border border-border bg-card p-0.5"
          >
            {(
              [
                ["dossiers", "Dossiers", dossiers.length],
                ["messages", CONTACT.shortLabel, messages.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={board === id}
                onClick={() => changeBoard(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  board === id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            ))}
          </div>

          <div className="relative min-w-48 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un nom, une entreprise, une référence…"
              aria-label="Rechercher un lead"
              className="w-full rounded-lg border border-border bg-card py-2 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={15} className="hidden text-muted-foreground sm:block" aria-hidden />

            {board === "dossiers" ? (
              <select
                aria-label="Filtrer par service"
                value={service}
                onChange={(event) => {
                  const next = event.target.value as ServiceFilter;
                  setService(next);
                  if (next !== "developpement") setPrestation("tous");
                }}
                className={selectClass}
              >
                <option value="tous">Tous les services</option>
                {SERVICES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}

            {showPrestations ? (
              <select
                aria-label="Filtrer par sous-service"
                value={prestation}
                onChange={(event) =>
                  setPrestation(event.target.value as PrestationFilter)
                }
                className={selectClass}
              >
                <option value="tous">Tous les sous-services</option>
                {PRESTATIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              aria-label="Filtrer par période"
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodFilter)}
              className={selectClass}
            >
              {PERIODS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            {filtersActive ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={14} /> Réinitialiser
              </button>
            ) : null}
          </div>
        </header>

        {/* No status filter: the board *is* the status, and a filter that can
            empty five of six columns fights the thing it sits above. */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 lg:px-6">
          {!hydrated ? (
            <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              Chargement des leads…
            </p>
          ) : source.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              {board === "messages"
                ? "Aucun message n'a encore été reçu via le formulaire de contact."
                : "Aucune demande n'a encore été envoyée depuis le site."}
            </p>
          ) : (
            <KanbanBoard
              leads={leads}
              stages={stages}
              selectedId={selectedId}
              onSelect={(lead) =>
                setSelectedId((current) => (current === lead.id ? null : lead.id))
              }
              onMove={setStatus}
              onLog={logContact}
            />
          )}
        </div>
      </div>

      {/* Only while something is selected — an empty rail permanently eating a
          third of the board would make the board worse at its one job. */}
      {selected ? (
        <div className="hidden w-96 shrink-0 xl:block">
          <LeadPanel lead={selected} onClose={() => setSelectedId(null)} />
        </div>
      ) : null}

      {/* Below xl there is no room beside the board, so the same panel slides
          over it rather than being cut in half. */}
      {selected ? (
        <div className="fixed inset-0 z-40 flex xl:hidden">
          <button
            type="button"
            aria-label="Fermer l'aperçu"
            onClick={() => setSelectedId(null)}
            className="flex-1 bg-foreground/40"
          />
          <div className="w-[min(24rem,calc(100vw-3rem))]">
            <LeadPanel lead={selected} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
