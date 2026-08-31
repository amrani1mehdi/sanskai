"use client";

/**
 * Messages sent through the /contact form.
 *
 * Not a filtered view of the leads table: a message has no amount, no
 * eligibility, no documents and no sub-service, so the columns that matter on a
 * dossier are all blank here. What matters instead is who wrote, what they
 * said, and whether anyone has dealt with it — so the message itself is on the
 * row rather than hidden behind a click.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Check, Mail, MessageSquare, Search } from "lucide-react";
import { Pagination, paginate } from "@/components/crm/pagination";
import { StatusBadge } from "@/components/crm/status-badge";
import { formatDateTime, initialsOf } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import { CONTACT_STAGES } from "@/lib/crm/config";
import type { LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

type StatusFilter = LeadStatus | "tous";

const PAGE_SIZE = 12;

const selectClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function MessagesView() {
  const { messages, hydrated, setStatus } = useCrm();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return messages
      .filter((lead) => (statusFilter === "tous" ? true : lead.status === statusFilter))
      .filter((lead) =>
        needle === ""
          ? true
          : [lead.reference, lead.entreprise, lead.nom, lead.prenom, lead.email, lead.message]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(needle)),
      );
  }, [messages, query, statusFilter]);

  const pageData = paginate(rows, page, PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Messages de contact
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Reçus via le formulaire <span className="font-mono">/contact</span>.
          {hydrated ? ` ${messages.length} au total.` : ""}
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un nom, une entreprise, un message…"
            aria-label="Rechercher un message"
            className="w-full rounded-lg border border-border bg-card py-2 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter);
            setPage(1);
          }}
          aria-label="Filtrer par statut"
          className={selectClass}
        >
          <option value="tous">Tous les statuts</option>
          {CONTACT_STAGES.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>

      {!hydrated ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
          Chargement des messages…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center">
          <MessageSquare size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {messages.length === 0
              ? "Aucun message n'a encore été reçu via le formulaire de contact."
              : "Aucun message ne correspond à cette recherche."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pageData.rows.map((lead) => (
            <li
              key={lead.id}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/40"
            >
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-foreground">
                  {initialsOf(lead.prenom, lead.nom)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-display text-base font-bold text-foreground hover:text-accent"
                    >
                      {[lead.prenom, lead.nom].filter(Boolean).join(" ")}
                    </Link>
                    <span className="font-mono text-xs font-semibold text-accent">
                      {lead.reference}
                    </span>
                    <StatusBadge status={lead.status} service={lead.service} />
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={13} aria-hidden />
                      {lead.entreprise}
                      {lead.siren ? ` · SIREN ${lead.siren}` : ""}
                    </span>
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-accent"
                    >
                      <Mail size={13} aria-hidden />
                      {lead.email}
                    </a>
                  </p>

                  {/* The message is the point of the row, so it is shown, not
                      summarised behind a link. Long ones are clamped. */}
                  {lead.message ? (
                    <p className="mt-3 line-clamp-3 border-l-2 border-border pl-3 text-sm whitespace-pre-line text-foreground">
                      {lead.message}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      Aucun message — seulement une demande de rappel.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* Absolute, not relative: a message list is read for when
                      something arrived, and "à l'instant" stops being true the
                      moment you look away. */}
                  <p className="text-right text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(lead.createdAt)}
                  </p>

                  {/* Answered or not is the entire workflow on this page, so it
                      is one click here rather than a trip to the detail view. */}
                  <button
                    type="button"
                    onClick={() =>
                      setStatus(lead.id, lead.status === "repondu" ? "nouveau" : "repondu")
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                      lead.status === "repondu"
                        ? "border-border text-muted-foreground hover:bg-secondary"
                        : "border-success/40 text-success hover:bg-success/10",
                    )}
                  >
                    <Check size={13} aria-hidden />
                    {lead.status === "repondu"
                      ? "Marquer non répondu"
                      : "Marquer répondu"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={pageData.page}
        pageCount={pageData.pageCount}
        total={pageData.total}
        from={pageData.from}
        to={pageData.to}
        noun="message"
        onChange={setPage}
      />
    </div>
  );
}
