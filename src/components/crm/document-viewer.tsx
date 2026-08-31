"use client";

/**
 * Reads a document without leaving the dashboard.
 *
 * The files live on a private disk, so there is no URL to open — every read
 * goes through the authenticated proxy. `?inline=1` is what makes the browser
 * render it instead of saving it: the API always says `attachment`, which is
 * right for a download link and wrong for a preview.
 *
 * PDFs and images render in place. Anything else has no viewer worth writing,
 * so it offers the download instead of showing an empty frame.
 */

import { useEffect, useRef } from "react";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { DOCUMENT_LABELS } from "@/lib/crm/config";
import { formatFileSize, formatShortDate } from "@/lib/crm/format";
import type { LeadDocument } from "@/lib/crm/types";

/** What the browser can display on its own. */
function previewable(name: string): "pdf" | "image" | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(extension)) {
    return "image";
  }

  return null;
}

export function DocumentViewer({
  document: file,
  caption,
  onClose,
}: {
  document: LeadDocument | null;
  /** The dossier it belongs to, shown under the title. */
  caption?: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (file && !element.open) element.showModal();
    else if (!file && element.open) element.close();
  }, [file]);

  const kind = file ? previewable(file.name) : null;
  const inlineUrl = file ? `${file.url}?inline=1` : "";

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      aria-label={file ? `Aperçu de ${file.name}` : undefined}
      className="m-auto h-[min(90vh,60rem)] w-[min(64rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-foreground backdrop:bg-foreground/60"
    >
      {file ? (
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-3 border-b border-border px-5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText size={17} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold">
                {DOCUMENT_LABELS[file.kind]}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {file.name} · {formatFileSize(file.size)} · reçu le{" "}
                {formatShortDate(file.uploadedAt)}
                {caption ? ` · ${caption}` : ""}
              </p>
            </div>

            <a
              href={inlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary sm:inline-flex"
            >
              <ExternalLink size={13} /> Nouvel onglet
            </a>
            <a
              href={file.url}
              download={file.name}
              className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={`Télécharger ${file.name}`}
            >
              <Download size={14} />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer l'aperçu"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={17} />
            </button>
          </header>

          <div className="min-h-0 flex-1 bg-secondary/40">
            {kind === "pdf" ? (
              <iframe
                src={inlineUrl}
                title={`Aperçu de ${file.name}`}
                className="h-full w-full border-0"
              />
            ) : kind === "image" ? (
              <div className="flex h-full items-center justify-center overflow-auto p-4">
                {/* Not next/image: the bytes come from an authenticated proxy,
                    not a URL the optimiser can fetch. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inlineUrl}
                  alt={file.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Ce type de fichier ne s&apos;affiche pas dans le navigateur.
                </p>
                <a
                  href={file.url}
                  download={file.name}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                >
                  <Download size={15} /> Télécharger {file.name}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
