"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Paperclip, Search, SlidersHorizontal, X } from "lucide-react";
import { Pagination, paginate } from "@/components/crm/pagination";
import { PrestationChip } from "@/components/crm/prestation-chip";
import { StatusBadge } from "@/components/crm/status-badge";
import {
  PRESTATIONS,
  SERVICES,
  SERVICE_BY_ID,
  STAGES,
} from "@/lib/crm/config";
import {
  formatAmount,
  formatRelative,
  formatShortDate,
  initialsOf,
} from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import type { Lead, LeadStatus, PrestationId, ServiceId } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

type ServiceFilter = ServiceId | "tous";
type StatusFilter = LeadStatus | "tous";
type PrestationFilter = PrestationId | "tous";

/** Filters the sidebar and dashboard can preset through the URL. */
export type InitialFilters = {
  service?: string;
  statut?: string;
  prestation?: string;
  q?: string;
};

/** Enough rows to scan without scrolling on a laptop. */
const PAGE_SIZE = 10;

const selectClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

/** URL values are untrusted — anything unknown falls back to "tous". */
function pick<T extends string>(value: string | undefined, allowed: T[]): T | "tous" {
  return value && (allowed as string[]).includes(value) ? (value as T) : "tous";
}

export function LeadsView({ initial = {} }: { initial?: InitialFilters }) {
  const { leads, hydrated } = useCrm();

  const [query, setQuery] = useState(initial.q ?? "");
  const [service, setService] = useState<ServiceFilter>(
    pick(
      initial.service,
      SERVICES.map((item) => item.id),
    ),
  );
  const [status, setStatus] = useState<StatusFilter>(
    pick(
      initial.statut,
      STAGES.map((stage) => stage.id),
    ),
  );
  const [prestation, setPrestation] = useState<PrestationFilter>(
    pick(
      initial.prestation,
      PRESTATIONS.map((item) => item.id),
    ),
  );
  const [page, setPage] = useState(1);
  /** The sub-service filter only means anything inside Développement. */
  const showPrestations = service === "developpement";

  const changeService = (next: ServiceFilter) => {
    setService(next);
    if (next !== "developpement") setPrestation("tous");
    setPage(1);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return leads
      .filter((lead) => {
        if (service !== "tous" && lead.service !== service) return false;
        if (status !== "tous" && lead.status !== status) return false;
        if (prestation !== "tous" && lead.prestation !== prestation) return false;
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
      })
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [leads, query, service, status, prestation]);

  const pageData = paginate(filtered, page, PAGE_SIZE);

  const filtersActive =
    query.trim() !== "" ||
    service !== "tous" ||
    status !== "tous" ||
    prestation !== "tous";

  const resetFilters = () => {
    setQuery("");
    setService("tous");
    setStatus("tous");
    setPrestation("tous");
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Leads
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes les demandes envoyées depuis le site, par ordre d&apos;arrivée.
        </p>
      </header>

      <StatTiles leads={leads} />

      {/* Recherche et filtres */}
      <div className="mt-8 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un nom, une entreprise, un email, une référence…"
              className="w-full rounded-lg border border-border bg-background py-2.5 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal
              size={16}
              className="hidden text-muted-foreground sm:block"
            />

            <select
              aria-label="Filtrer par service"
              value={service}
              onChange={(event) => changeService(event.target.value as ServiceFilter)}
              className={selectClass}
            >
              <option value="tous">Tous les services</option>
              {SERVICES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            {showPrestations ? (
              <select
                aria-label="Filtrer par sous-service"
                value={prestation}
                onChange={(event) => {
                  setPrestation(event.target.value as PrestationFilter);
                  setPage(1);
                }}
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
              aria-label="Filtrer par statut"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="tous">Tous les statuts</option>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>

            {filtersActive ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={14} /> Réinitialiser
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <LeadTable leads={pageData.rows} hydrated={hydrated} />

      <Pagination
        page={pageData.page}
        pageCount={pageData.pageCount}
        total={pageData.total}
        from={pageData.from}
        to={pageData.to}
        noun="lead"
        onChange={setPage}
      />
    </div>
  );
}

function StatTiles({ leads }: { leads: Lead[] }) {
  const tiles = useMemo(() => {
    const count = (status: LeadStatus) =>
      leads.filter((lead) => lead.status === status).length;

    return [
      { label: "Total", value: leads.length, dot: "bg-muted-foreground/45" },
      { label: "Nouveaux", value: count("nouveau"), dot: "bg-accent" },
      { label: "En cours", value: count("en_cours"), dot: "bg-foreground" },
      { label: "Approuvés", value: count("approuve"), dot: "bg-success" },
    ];
  }, [leads]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-border bg-card px-4 py-4"
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", tile.dot)} />
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {tile.label}
            </p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function LeadTable({ leads, hydrated }: { leads: Lead[]; hydrated: boolean }) {
  if (leads.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <FileText size={28} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-display font-bold text-foreground">Aucun lead</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucune demande ne correspond à ces critères.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card scrollbar-brand">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            {[
              "Référence",
              "Lead",
              "Service",
              "Statut",
              "Montant",
              "Pièces",
              "Reçu le",
            ].map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            return (
              <tr
                key={lead.id}
                className="border-b border-border/70 transition-colors last:border-0 hover:bg-secondary/50"
              >
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="font-mono text-xs font-semibold text-accent hover:underline"
                  >
                    {lead.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="group flex items-center gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                      {initialsOf(lead.prenom, lead.nom)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground group-hover:text-accent">
                        {lead.prenom} {lead.nom}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lead.entreprise}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="text-sm text-foreground">
                    {SERVICE_BY_ID[lead.service].label}
                  </span>
                  {lead.prestation ? (
                    <PrestationChip
                      prestation={lead.prestation}
                      short
                      className="mt-1.5"
                    />
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 align-top text-sm whitespace-nowrap text-foreground">
                  {lead.service === "financement" ? formatAmount(lead.montant) : "—"}
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  {lead.documentCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Paperclip size={13} />
                      {lead.documentCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm whitespace-nowrap text-muted-foreground">
                  {formatShortDate(lead.createdAt)}
                  {/* Relative time depends on `now`, so it waits for the client. */}
                  {hydrated ? (
                    <span className="block text-xs text-muted-foreground/70">
                      {formatRelative(lead.createdAt)}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
