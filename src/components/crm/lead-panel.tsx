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

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Eye,
  FileText,
  MessageSquarePlus,
  StickyNote,
  Trash2,
  Upload,
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
import type {
  ActivityKind,
  DocumentKind,
  Lead,
  LeadDocument,
  LeadStatus,
} from "@/lib/crm/types";
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
  const { setStatus, setContacted, editLead, addNote, removeLead } = useCrm();
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
      className="admin-panel flex h-full w-full flex-col border-l border-border bg-background text-foreground"
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-secondary font-display text-sm font-bold text-foreground">
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
        {/*
         * Everything is edited here, in place.
         *
         * There is no "modify" mode and no full page behind this any more. A
         * panel that shows a field and then sends you somewhere else to change
         * it is asking you to read the same value twice, and the second screen
         * is where the two drift apart. Fields save when they lose focus, and
         * only if they actually changed.
         */}
        <section className="grid grid-cols-2 gap-3">
          <div>
            <Label>Statut</Label>
            <select
              value={lead.status}
              onChange={(event) =>
                setStatus(lead.id, event.target.value as LeadStatus)
              }
              aria-label="Changer le statut"
              className={selectClass}
            >
              {/* Only what this lead's service allows — the API refuses the
                  rest, so offering them would be a trap. */}
              {stagesFor(lead.service).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Contacté</Label>
            <select
              value={lead.contactedAt === null ? "non" : "oui"}
              onChange={(event) =>
                setContacted(lead.id, event.target.value === "oui")
              }
              aria-label="Marquer comme contacté"
              className={selectClass}
            >
              <option value="non">Non</option>
              <option value="oui">Oui</option>
            </select>
            {lead.contactedAt ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(lead.contactedAt)}
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <Label>Identité</Label>
          <div className="grid grid-cols-2 gap-2">
            <EditableField
              key={`prenom:${lead.prenom}`}
              id="panel-prenom"
              label="Prénom"
              value={lead.prenom}
              onSave={(next) => editLead(lead.id, { prenom: next ?? "" })}
            />
            <EditableField
              key={`nom:${lead.nom}`}
              id="panel-nom"
              label="Nom"
              value={lead.nom}
              onSave={(next) => editLead(lead.id, { nom: next ?? "" })}
            />
          </div>

          <div className="mt-2 space-y-2">
            <EditableField
              key={`email:${lead.email}`}
              id="panel-email"
              type="email"
              label="Email"
              value={lead.email}
              onSave={(next) => editLead(lead.id, { email: next ?? "" })}
            />
            <EditableField
              key={`telephone:${lead.telephone ?? ""}`}
              id="panel-telephone"
              type="tel"
              label="Téléphone"
              value={lead.telephone ?? ""}
              onSave={(next) => editLead(lead.id, { telephone: next })}
            />
          </div>
        </section>

        <section>
          <Label>Entreprise</Label>
          <div className="space-y-2">
            <EditableField
              key={`entreprise:${lead.entreprise}`}
              id="panel-entreprise"
              label="Entreprise"
              value={lead.entreprise}
              onSave={(next) => editLead(lead.id, { entreprise: next ?? "" })}
            />
            <EditableField
              key={`siren:${lead.siren ?? ""}`}
              id="panel-siren"
              label="SIREN"
              value={lead.siren ?? ""}
              onSave={(next) => editLead(lead.id, { siren: next })}
            />
            <EditableField
              key={`adresse:${lead.adresse ?? ""}`}
              id="panel-adresse"
              label="Adresse"
              value={lead.adresse ?? ""}
              onSave={(next) => editLead(lead.id, { adresse: next })}
            />
            <div className="grid grid-cols-[6rem_1fr] gap-2">
              <EditableField
                key={`cp:${lead.codePostal ?? ""}`}
                id="panel-code-postal"
                label="Code postal"
                value={lead.codePostal ?? ""}
                onSave={(next) => editLead(lead.id, { codePostal: next })}
              />
              <EditableField
                key={`ville:${lead.ville ?? ""}`}
                id="panel-ville"
                label="Ville"
                value={lead.ville ?? ""}
                onSave={(next) => editLead(lead.id, { ville: next })}
              />
            </div>
          </div>
        </section>

        <section>
          <Label>Origine</Label>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} service={lead.service} />
            <span className="border border-border px-2.5 py-1 text-xs text-muted-foreground">
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

        <section>
          <Label>Message</Label>
          <EditableText
            key={`message:${lead.message ?? ""}`}
            id="panel-message"
            placeholder="Aucun message transmis."
            value={lead.message ?? ""}
            onSave={(next) => editLead(lead.id, { message: next })}
          />
        </section>

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

          {/* Pieces arrive after the form as often as with it — a Kbis emailed
              the next morning — and until now there was nowhere to put one. */}
          <DocumentUpload leadId={lead.id} />
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
            /* The whole trail, not the first six.
               It was capped because the full record was a click away; the panel
               is the record now, so a cap would just hide history with nowhere
               left to go and see it. The section scrolls with the panel. */
            <ul className="space-y-2.5">
              {visible.map((entry) => (
                <li key={entry.id} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-accent"
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


/*
 * Every control in the panel looks like a control.
 *
 * The editable fields started borderless, on the idea that a value you can
 * click is tidier than a box — but on the ink ground that made them
 * indistinguishable from the read-only text beside them, and nothing on the
 * panel said which parts could be changed. A field is a box.
 */
const fieldClass =
  "w-full border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground";

/** The two dropdowns at the top of the panel share the same shape. */
const selectClass = fieldClass;

/**
 * A field that is the value and the editor at once.
 *
 * Saves on blur, and only when it actually changed — the API writes an activity
 * entry for every correction, so a field that reported itself on every focus
 * would bury the real ones. An emptied box is sent as null, which is a genuine
 * change and distinct from a field left alone.
 *
 * Seeded once at mount. The panel keys each one on the lead's current value, so
 * a change arriving from elsewhere remounts it with the new value rather than
 * fighting whatever is being typed.
 */
function EditableField({
  id,
  label: text,
  value,
  onSave,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onSave: (next: string | null) => void;
  type?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div>
      {/*
       * A label above every field, not a placeholder inside it.
       *
       * A placeholder is gone the moment the field has a value, which is most
       * of the time here — the panel opens on a lead that is already filled in,
       * so "Hugo" and "Bernard" sat in two boxes with nothing saying which was
       * the surname, and a phone number was just a number.
       */}
      <label
        htmlFor={id}
        className="mb-1 block text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
      >
        {text}
      </label>
      <input
        id={id}
        type={type}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = draft.trim();
          if (next === value.trim()) return;
          onSave(next === "" ? null : next);
        }}
        onKeyDown={(event) => {
          // Enter commits, Escape abandons — both without leaving the panel.
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
        className={fieldClass}
      />
    </div>
  );
}

/** The same, for the message — which is the one field worth several lines. */
function EditableText({
  id,
  value,
  onSave,
  placeholder,
}: {
  id: string;
  value: string;
  onSave: (next: string | null) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <textarea
      id={id}
      rows={3}
      value={draft}
      placeholder={placeholder}
      aria-label="Message"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next === value.trim()) return;
        onSave(next === "" ? null : next);
      }}
      className={cn(fieldClass, "resize-y whitespace-pre-line")}
    />
  );
}

/**
 * Adds a piece to a lead that already exists.
 *
 * Two steps, in the order the question is actually asked: what kind of document
 * is it, then which file. Naming the slot first means the file picker is the
 * last thing you touch and the upload starts the moment it closes — no third
 * click on a "send" button that could only ever do one thing.
 *
 * The kind matters: the panel groups pieces by what they are, and the financing
 * dossier is assessed on having the right ones, so a file filed as "Autre"
 * is a piece nobody can find.
 */
function DocumentUpload({ leadId }: { leadId: string }) {
  const { addDocument } = useCrm();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("kbis");

  return (
    /*
     * `relative` is load-bearing.
     *
     * The file input below is `sr-only`, which is `position: absolute`. With no
     * positioned ancestor its containing block is the page itself, so it was
     * laid out at its static position in *document* coordinates — about 1165px
     * down, well past the panel's scroll container, which it escaped entirely.
     * That stretched the root's scrollable area and let the whole admin screen
     * scroll away, leaving a band of empty page under it.
     */
    <div className="relative mt-3 border-t border-border pt-3">
      <Label>Ajouter une pièce</Label>
      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as DocumentKind)}
          aria-label="Type de pièce"
          className={cn(fieldClass, "flex-1")}
        >
          {Object.entries(DOCUMENT_LABELS).map(([id, text]) => (
            <option key={id} value={id}>
              {text}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex shrink-0 items-center gap-1.5 bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Upload size={14} aria-hidden /> Choisir
        </button>
      </div>

      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label="Fichier à joindre"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) addDocument(leadId, kind, file);
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = "";
        }}
      />

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        PDF, image ou document — 10 Mo maximum.
      </p>
    </div>
  );
}
