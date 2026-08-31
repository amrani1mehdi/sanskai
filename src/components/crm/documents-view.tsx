"use client";

/**
 * Every document submitted through the site, across all leads.
 *
 * The per-lead Documents panel answers "what did this applicant send?"; this
 * page answers the other question — "which dossiers are still missing a KBIS?"
 * Each row stays tied to the lead it came from.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Paperclip,
  Search,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Pagination, paginate } from "@/components/crm/pagination";
import { DOCUMENT_LABELS, SERVICE_BY_ID } from "@/lib/crm/config";
import { formatFileSize, formatShortDate } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import type { DocumentKind, Lead, LeadDocument } from "@/lib/crm/types";

type Row = { document: LeadDocument; lead: Lead };
type KindFilter = DocumentKind | "tous";

const PAGE_SIZE = 12;

const selectClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function DocumentsView() {
  const { leads, removeDocument } = useCrm();

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("tous");
  const [pending, setPending] = useState<Row | null>(null);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const all: Row[] = leads.flatMap((lead) =>
      lead.documents.map((document) => ({ document, lead })),
    );

    const needle = query.trim().toLowerCase();

    return all
      .filter((row) => {
        if (kind !== "tous" && row.document.kind !== kind) return false;
        if (!needle) return true;
        return [
          row.document.name,
          DOCUMENT_LABELS[row.document.kind],
          row.lead.entreprise,
          row.lead.reference,
          `${row.lead.prenom} ${row.lead.nom}`,
        ].some((field) => field.toLowerCase().includes(needle));
      })
      .sort(
        (a, b) =>
          new Date(b.document.uploadedAt).getTime() -
          new Date(a.document.uploadedAt).getTime(),
      );
  }, [leads, query, kind]);

  const totalSize = rows.reduce((sum, row) => sum + row.document.size, 0);
  const pageData = paginate(rows, page, PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes les pièces transmises par les leads, rattachées à leur dossier.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
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
              placeholder="Rechercher un fichier, une entreprise, une référence…"
              className="w-full rounded-lg border border-border bg-background py-2.5 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <select
            aria-label="Filtrer par type de document"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as KindFilter);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="tous">Tous les types</option>
            {(Object.keys(DOCUMENT_LABELS) as DocumentKind[]).map((value) => (
              <option key={value} value={value}>
                {DOCUMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {rows.length} document{rows.length > 1 ? "s" : ""} · {formatFileSize(totalSize)}
      </p>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Paperclip size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-display font-bold text-foreground">Aucun document</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucune pièce ne correspond à ces critères.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {pageData.rows.map(({ document, lead }) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <FileText size={18} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {DOCUMENT_LABELS[document.kind]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {document.name} · {formatFileSize(document.size)} · reçu le{" "}
                  {formatShortDate(document.uploadedAt)}
                </p>
              </div>

              <Link
                href={`/admin/leads/${lead.id}`}
                className="min-w-0 text-right sm:w-56"
              >
                <span className="block truncate text-sm text-foreground hover:text-accent">
                  {lead.entreprise}
                </span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {lead.reference} · {SERVICE_BY_ID[lead.service].shortLabel}
                </span>
              </Link>

              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <ExternalLink size={13} /> Consulter
                </a>
                <a
                  href={document.url}
                  download={document.name}
                  className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label={`Télécharger ${document.name}`}
                >
                  <Download size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => setPending({ document, lead })}
                  className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                  aria-label={`Supprimer ${document.name}`}
                >
                  <Trash2 size={14} />
                </button>
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
        noun="document"
        onChange={setPage}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer ce document ?"
        description={`« ${pending?.document.name ?? ""} » sera définitivement retiré du dossier ${
          pending?.lead.reference ?? ""
        }. Cette action est irréversible.`}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) removeDocument(pending.lead.id, pending.document.id);
          setPending(null);
        }}
      />
    </div>
  );
}
