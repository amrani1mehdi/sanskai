"use client";

import { useState } from "react";
import { Download, Eye, FileText, Paperclip, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { DocumentViewer } from "@/components/crm/document-viewer";
import { DOCUMENT_LABELS } from "@/lib/crm/config";
import { formatFileSize, formatShortDate } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import type { Lead, LeadDocument } from "@/lib/crm/types";

/**
 * Documents submitted with the application, kept attached to their lead.
 * Opening one is logged to the activity trail so the history shows who looked.
 */
export function DocumentsPanel({
  lead,
  onChanged,
}: {
  lead: Lead;
  onChanged?: () => void;
}) {
  const { removeDocument } = useCrm();
  const [pending, setPending] = useState<LeadDocument | null>(null);
  const [viewing, setViewing] = useState<LeadDocument | null>(null);

  return (
    <section
      id="documents"
      className="rounded-xl border border-border bg-card p-6 scroll-mt-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <Paperclip size={16} className="text-accent" />
        <h2 className="font-display text-base font-bold text-foreground">Documents</h2>
        <span className="bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {lead.documents.length}
        </span>
      </div>

      {lead.documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun document n&apos;a été transmis avec cette demande.
        </p>
      ) : (
        <ul className="space-y-2">
          {lead.documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
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

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewing(document)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Eye size={13} /> Consulter
                </button>
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
                  onClick={() => setPending(document)}
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

      <DocumentViewer
        document={viewing}
        caption={lead.reference}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer ce document ?"
        description={`« ${pending?.name ?? ""} » sera définitivement retiré du dossier ${
          lead.reference
        }. Cette action est irréversible.`}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) removeDocument(lead.id, pending.id);
          setPending(null);
          setTimeout(() => onChanged?.(), 250);
        }}
      />
    </section>
  );
}
