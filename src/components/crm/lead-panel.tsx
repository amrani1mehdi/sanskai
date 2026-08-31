"use client";

/**
 * The selected lead, beside the board.
 *
 * Quick context and the actions worth taking without leaving the workspace.
 * Deliberately not the whole dossier: documents, the full activity trail and
 * every submitted field live on the detail page, one click away. Anything
 * shown twice is a thing that can disagree with itself.
 *
 * The list endpoint carries counts rather than collections, so the notes and
 * the recent trail are fetched for the selected lead only — the board stays one
 * request however many cards are on it.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Mail,
  MapPin,
  Eye,
  FileText,
  MessageSquarePlus,
  Phone,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { DocumentViewer } from "@/components/crm/document-viewer";
import { StatusBadge } from "@/components/crm/status-badge";
import { DOCUMENT_LABELS, SERVICE_BY_ID, stagesFor } from "@/lib/crm/config";
import {
  formatAmount,
  formatDateTime,
  formatFileSize,
  initialsOf,
} from "@/lib/crm/format";
import { useCrm, useLead } from "@/lib/crm/store";
import type { ActivityKind, Lead, LeadDocument, LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

type KindFilter = ActivityKind | "tous";

/** `assignation` is omitted: nothing is assigned, so no lead ever has one. */
const ACTIVITY_FILTERS: { id: ActivityKind; label: string }[] = [
  { id: "statut", label: "Statuts" },
  { id: "note", label: "Notes" },
  { id: "appel", label: "Appels" },
  { id: "email", label: "Emails" },
  { id: "document", label: "Documents" },
  { id: "creation", label: "Création" },
];

export function LeadPanel({
  lead: summary,
  focus,
  onClose,
}: {
  lead: Lead;
  /** Which section to bring into view — set by the card that opened it. */
  focus?: "documents";
  onClose: () => void;
}) {
  const { setStatus, addNote, removeLead, logContact } = useCrm();
  /* The board's copy has counts only; this one has the notes and the trail. */
  const { lead: full } = useLead(summary.id);

  /*
   * Detail for the collections, the board's copy for the fields it carries.
   *
   * A mutation reloads the list first and the open detail immediately after,
   * so for one round trip the two disagree. Taking status and timestamps from
   * the list means dragging a card flips the panel's status as the card lands,
   * rather than a beat later — and `summary` is never staler than `full` for
   * the fields both hold.
   */
  const lead = full
    ? { ...full, status: summary.status, updatedAt: summary.updatedAt }
    : summary;

  const [note, setNote] = useState("");
  const [kind, setKind] = useState<KindFilter>("tous");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [viewing, setViewing] = useState<LeadDocument | null>(null);
  const documentsRef = useRef<HTMLElement>(null);

  const visible =
    kind === "tous"
      ? lead.activity
      : lead.activity.filter((entry) => entry.kind === kind);

  const service = SERVICE_BY_ID[lead.service];
  const phone = lead.telephone?.replace(/\s/g, "");

  /* Opened from the paperclip on a card, so the pieces should be what you are
     looking at — not four sections down a panel you have not scrolled. Waits
     for the detail fetch, since the list carries a count and not the files. */
  const documentsLoaded = lead.documents.length > 0;

  useEffect(() => {
    if (focus !== "documents" || !documentsLoaded) return;

    documentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus, documentsLoaded, summary.id]);

  return (
    <aside
      aria-label={`Aperçu de ${lead.prenom} ${lead.nom}`}
      className="flex h-full w-full flex-col border-l border-border bg-card"
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-foreground">
          {initialsOf(lead.prenom, lead.nom)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold text-accent">
            {lead.reference}
          </p>
          <h2 className="truncate font-display text-base font-bold text-foreground">
            {lead.prenom} {lead.nom}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Building2 size={12} className="shrink-0" aria-hidden />
            {lead.entreprise}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={17} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 scrollbar-brand">
        {/* The primary action, given the most weight on the panel. */}
        <Link
          href={`/admin/leads/${lead.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          Voir la fiche complète <ArrowRight size={15} />
        </Link>

        <section>
          <Label>Statut</Label>
          <select
            value={lead.status}
            onChange={(event) =>
              setStatus(lead.id, event.target.value as LeadStatus)
            }
            aria-label="Changer le statut"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            {/* Only what this lead's service allows — the API refuses the rest,
                so offering them would be a trap. */}
            {stagesFor(lead.service).map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </section>

        <section>
          <Label>Contact</Label>
          <div className="space-y-1.5">
            <a
              href={`mailto:${lead.email}?subject=${encodeURIComponent(
                `Votre demande ${lead.reference} — Sansekai Solution`,
              )}`}
              onClick={() => logContact(lead.id, "email")}
              className="flex items-center gap-2 text-sm break-all text-foreground hover:text-accent"
            >
              <Mail size={14} className="shrink-0 text-muted-foreground" aria-hidden />
              {lead.email}
            </a>

            {phone ? (
              <a
                href={`tel:${phone}`}
                onClick={() => logContact(lead.id, "appel")}
                className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
              >
                <Phone size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                {lead.telephone}
              </a>
            ) : null}

            {lead.ville ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin size={14} className="shrink-0" aria-hidden />
                {[lead.codePostal, lead.ville].filter(Boolean).join(" ")}
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Ouvrir un email ou appeler consigne l&apos;action dans l&apos;historique.
          </p>
        </section>

        <section>
          <Label>Origine</Label>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} service={lead.service} />
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {service.shortLabel}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {service.source}
            </span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Reçu le" value={formatDateTime(lead.createdAt)} />
            <Row label="Mise à jour" value={formatDateTime(lead.updatedAt)} />
            {lead.service === "financement" ? (
              <Row label="Montant demandé" value={formatAmount(lead.montant)} />
            ) : null}
            {lead.siren ? <Row label="SIREN" value={lead.siren} /> : null}
          </dl>
        </section>

        {lead.message ? (
          <section>
            <Label>Message</Label>
            <p className="line-clamp-4 rounded-lg border-l-2 border-border bg-secondary/40 py-2 pl-3 text-sm whitespace-pre-line text-foreground">
              {lead.message}
            </p>
          </section>
        ) : null}

        <section ref={documentsRef} className="scroll-mt-4">
          <Label>
            Pièces jointes
            <span className="ml-1.5 font-normal text-muted-foreground">
              {lead.documentCount}
            </span>
          </Label>

          {lead.documentCount === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pièce transmise.</p>
          ) : lead.documents.length === 0 ? (
            /* The board's copy carries a count, not the files; the detail fetch
               is what fills this in a moment. */
            <p className="text-sm text-muted-foreground">Chargement des pièces…</p>
          ) : (
            <ul className="space-y-1.5">
              {lead.documents.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => setViewing(document)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-secondary"
                  >
                    <FileText
                      size={15}
                      className="shrink-0 text-accent"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {DOCUMENT_LABELS[document.kind]}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {document.name} · {formatFileSize(document.size)}
                      </span>
                    </span>
                    <Eye size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <Label>Ajouter une note</Label>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (note.trim() === "") return;
              addNote(lead.id, note);
              setNote("");
            }}
          >
            <textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ce qui s'est dit, ce qui reste à faire…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              disabled={note.trim() === ""}
              className={cn(
                "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors",
                note.trim() === ""
                  ? "cursor-not-allowed text-muted-foreground"
                  : "text-foreground hover:bg-secondary",
              )}
            >
              <MessageSquarePlus size={15} /> Enregistrer la note
            </button>
          </form>

          {lead.notes.length > 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <StickyNote size={12} aria-hidden />
              {lead.notes.length} note{lead.notes.length > 1 ? "s" : ""} sur la fiche
            </p>
          ) : null}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label>
              Activité
              <span className="ml-1.5 font-normal text-muted-foreground">
                {lead.activity.length}
              </span>
            </Label>

            {/* Scoped to this lead, not the whole CRM. The feed on the Aperçu
                answers "what moved today"; this answers "what happened on this
                dossier", which is the question you have with a card open. */}
            {lead.activity.length > 0 ? (
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as KindFilter)}
                aria-label="Filtrer l'activité de ce lead"
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="tous">Tout</option>
                {ACTIVITY_FILTERS.map((one) => (
                  <option key={one.id} value={one.id}>
                    {one.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {lead.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien pour l&apos;instant.</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun évènement de ce type sur ce dossier.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {visible.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{entry.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.at)} · {entry.author}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {visible.length > 6 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {visible.length - 6} évènement{visible.length - 6 > 1 ? "s" : ""} de plus
              sur la fiche.
            </p>
          ) : null}
        </section>

        <section className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={15} /> Supprimer le lead
          </button>
        </section>
      </div>

      <DocumentViewer
        document={viewing}
        caption={lead.reference}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="Supprimer ce lead ?"
        description={`Le dossier ${lead.reference} de ${lead.prenom} ${lead.nom} (${lead.entreprise}) sera définitivement supprimé, avec ses documents, ses notes et son historique. Cette action est irréversible.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          removeLead(lead.id);
          onClose();
        }}
      />
    </aside>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}
