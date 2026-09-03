"use client";

/**
 * The CRM — where leads are actually managed.
 *
 * Board in the middle, filters above it, and the selected lead in a panel on
 * the right that only exists while something is selected. Selecting a card
 * never leaves the board: the whole point of the layout is that a lead can be
 * read, moved and noted without a round trip to another page.
 *
 * One board for every lead. Contact messages used to sit behind a second tab
 * running two stages of their own; they take the same six steps as anything
 * else — read, called, and then it becomes work or it does not — so they are
 * here too, and the service filter is what narrows the board to them.
 */

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { Select } from "@/components/crm/select";
import { LeadForm } from "@/components/crm/lead-form";
import {
  ANY_DATE,
  DateRangeFilter,
  type DateRange,
} from "@/components/crm/date-range-filter";
import { LeadPanel } from "@/components/crm/lead-panel";
import {
  type StageConfig,
  CONTACT,
  PRESTATIONS,
  SERVICES,
  STAGES,
} from "@/lib/crm/config";
import { useCrm } from "@/lib/crm/store";
import type { Lead, PrestationId, ServiceId } from "@/lib/crm/types";

type ServiceFilter = ServiceId | "tous";
type PrestationFilter = PrestationId | "tous";

/**
 * Lowercased, with accents folded away.
 *
 * A board typed into in French cannot ask whoever is searching to reproduce
 * the diacritics — `Société` has to be reachable by "societe", and `Jérôme` by
 * "jerome". NFD splits an accented letter into the letter and its combining
 * mark; dropping the marks leaves the letter.
 */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function CrmWorkspace() {
  const {
    leads: all,
    hydrated,
    error,
    markSeen,
    setStatus,
  } = useCrm();

  const [query, setQuery] = useState("");
  const [service, setService] = useState<ServiceFilter>("tous");
  const [prestation, setPrestation] = useState<PrestationFilter>("tous");
  const [period, setPeriod] = useState<DateRange>(ANY_DATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /* Set when a card is opened from its paperclip, so the panel scrolls to the
     pieces rather than making you hunt for them. */
  const [focus, setFocus] = useState<"documents" | undefined>(undefined);
  /* The column whose "Ajouter" button was pressed — null while the form is
     closed, and what tells the new lead where to land. */
  const [adding, setAdding] = useState<StageConfig | null>(null);

  /** The sub-service filter only means anything inside Développement. */
  const showPrestations = service === "developpement";

  const leads = useMemo(() => {
    /*
     * The query is a set of words, not one string to find verbatim.
     *
     * A name is stored in two columns, so "jean dupont" matched on neither:
     * `prenom` holds "Jean" and `nom` holds "Dupont", and neither contains the
     * whole phrase. Searching the way the board is read — type what you
     * remember, in whatever order — means every word has to appear somewhere
     * across the lead, and none of them has to appear in the same field.
     */
    const terms = fold(query).split(/\s+/).filter(Boolean);

    /* Two real dates, so this memo reads no clock at all.
       The window used to be "the last N days", measured from the sync time
       because reading `Date.now()` here would make the same inputs give
       different answers. The picker resolves its presets to actual dates when
       they are clicked, which removes the problem rather than working around
       it — and stops the window sliding under you while you read the board.

       Both ends inclusive: `to` is compared against the end of that day, or
       a lead that arrived at 14:00 on the last day would fall outside a range
       that names it. */
    const after = period.from ? new Date(`${period.from}T00:00:00`).getTime() : null;
    const before = period.to ? new Date(`${period.to}T23:59:59.999`).getTime() : null;

    return all.filter((lead) => {
      if (service !== "tous" && lead.service !== service) return false;
      if (
        showPrestations &&
        prestation !== "tous" &&
        lead.prestation !== prestation
      ) {
        return false;
      }
      const at = new Date(lead.createdAt).getTime();
      if (after !== null && at < after) return false;
      if (before !== null && at > before) return false;
      if (terms.length === 0) return true;

      const haystack = fold(
        [
          lead.reference,
          lead.nom,
          lead.prenom,
          lead.entreprise,
          lead.email,
          lead.telephone,
          lead.ville,
          /* The number stripped to digits as well as written, so one saved as
             "06 12 34 56 78" is still found by typing it straight through. */
          lead.telephone?.replace(/\D/g, ""),
        ]
          .filter(Boolean)
          .join(" "),
      );

      return terms.every((term) => haystack.includes(term));
    });
  }, [all, service, prestation, period, query, showPrestations]);

  /*
   * Opening a lead, or moving it, marks it seen.
   *
   * All that now drives is the count in the browser tab — the one place an
   * arrival can reach someone who is not looking at the CRM. Deliberately not
   * the card's colour, which follows `contactedAt`: "somebody opened this" and
   * "somebody rang them" are different facts, and only the second means the
   * lead has been dealt with.
   *
   * Guarded on `seenAt`, so re-opening a lead you have already read is not
   * another write.
   */
  const acknowledge = (lead: Lead) => {
    if (lead.seenAt === null) markSeen(lead.id);
  };

  /* Read from the live list, not held in state: a card that moves stage or is
     deleted must not leave the panel showing a stale copy of it. */
  const selected = selectedId
    ? (all.find((lead) => lead.id === selectedId) ?? null)
    : null;

  const filtersActive =
    query.trim() !== "" ||
    service !== "tous" ||
    prestation !== "tous" ||
    period.from !== null ||
    period.to !== null;

  const reset = () => {
    setQuery("");
    setService("tous");
    setPrestation("tous");
    setPeriod(ANY_DATE);
  };

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 lg:px-6">
          {/* One board. Contact messages used to sit behind a second tab with
              two stages of their own; they run the same pipeline now, so the
              count is the whole list and the service filter below is what
              narrows it to messages. */}
          <h1 className="font-display text-lg font-bold text-foreground">
            Leads
            <span className="ml-2 font-sans text-sm font-medium text-muted-foreground tabular-nums">
              {leads.length}
            </span>
          </h1>

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
              className="w-full border border-input bg-card py-2 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal
              size={15}
              className="hidden text-muted-foreground sm:block"
              aria-hidden
            />

            <Select
              label="Filtrer par service"
              value={service}
              onChange={(next) => {
                setService(next as ServiceFilter);
                if (next !== "developpement") setPrestation("tous");
              }}
              /* Contact is in the list now. It is not a service the company
                   sells, which is why it is kept out of `SERVICES`, but on one
                   board it is the only way left to ask for just the messages —
                   the job the second tab used to do. */
              options={[
                { value: "tous", label: "Tous les services" },
                ...SERVICES.map((item) => ({
                  value: item.id,
                  label: item.label,
                })),
                { value: CONTACT.id, label: CONTACT.label },
              ]}
            />

            {showPrestations ? (
              <Select
                label="Filtrer par sous-service"
                value={prestation}
                onChange={(next) => setPrestation(next as PrestationFilter)}
                options={[
                  { value: "tous", label: "Tous les sous-services" },
                  ...PRESTATIONS.map((item) => ({
                    value: item.id,
                    label: item.label,
                  })),
                ]}
              />
            ) : null}

            <DateRangeFilter value={period} onChange={setPeriod} />

            {filtersActive ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={14} /> Réinitialiser
              </button>
            ) : null}
          </div>
        </header>

        {/* A drag that the server refuses rolls the card back. Saying why is
            the other half of that: a card silently returning to where it came
            from reads as a bug in the board. */}
        {error ? (
          <p
            role="alert"
            className="mx-4 mt-3 flex items-start gap-2.5 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-4 py-2.5 text-sm text-danger lg:mx-6"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {/* No status filter: the board *is* the status, and a filter that can
            empty five of six columns fights the thing it sits above. */}
        {/* 20px under the filter bar: enough air that the columns read as
            content rather than another row of the toolbar. */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 pt-5 pb-4 lg:px-6">
          {!hydrated ? (
            <p className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              Chargement des leads…
            </p>
          ) : all.length === 0 ? (
            <p className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              Aucune demande n&apos;a encore été envoyée depuis le site.
            </p>
          ) : (
            <KanbanBoard
              leads={leads}
              stages={STAGES}
              selectedId={selectedId}
              onSelect={(lead, next) => {
                acknowledge(lead);
                setFocus(next);
                setSelectedId((current) =>
                  current === lead.id && !next ? null : lead.id,
                );
              }}
              onMove={(id, status) => {
                setStatus(id, status);

                const moved = all.find((lead) => lead.id === id);
                if (moved) acknowledge(moved);
              }}
              onAdd={(stage) => setAdding(stage)}
            />
          )}
        </div>
      </div>

      {/* Only while something is selected — an empty rail permanently eating a
          third of the board would make the board worse at its one job. */}
      {selected ? (
        <div className="hidden w-[30rem] shrink-0 xl:block">
          <LeadPanel
            lead={selected}
            focus={focus}
            onClose={() => setSelectedId(null)}
          />
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
          <div className="w-[min(30rem,calc(100vw-2rem))]">
            <LeadPanel
              lead={selected}
              focus={focus}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Kept mounted so the dialog can animate closed, and keyed on the column
          so switching which "Ajouter" you pressed resets the sheet. */}
      <LeadForm
        key={adding?.id ?? "closed"}
        open={adding !== null}
        status={adding?.id ?? "nouveau"}
        statusLabel={adding?.label ?? ""}
        onClose={() => setAdding(null)}
      />
    </div>
  );
}
