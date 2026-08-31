"use client";

import { useState } from "react";
import { MessageSquarePlus, StickyNote, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { formatDateTime } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import type { Lead, LeadNote } from "@/lib/crm/types";

export function NotesPanel({ lead }: { lead: Lead }) {
  const { addNote, removeNote } = useCrm();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<LeadNote | null>(null);

  const notes = [...lead.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addNote(lead.id, draft);
    setDraft("");
  };

  return (
    <section id="notes" className="rounded-xl border border-border bg-card p-6 scroll-mt-6">
      <div className="mb-5 flex items-center gap-2">
        <StickyNote size={16} className="text-accent" />
        <h2 className="font-display text-base font-bold text-foreground">
          Notes internes
        </h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {lead.notes.length}
        </span>
      </div>

      <form onSubmit={submit} className="mb-6">
        <label htmlFor="note" className="mb-1.5 block text-xs font-medium text-foreground">
          Ajouter une note
        </label>
        <textarea
          id="note"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Compte rendu d'appel, pièce manquante, prochaine étape…"
          className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={draft.trim() === ""}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageSquarePlus size={15} /> Enregistrer la note
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune note pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold text-foreground">
                  {note.author}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(note.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setPending(note)}
                  className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Supprimer cette note"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer cette note ?"
        description="La note sera définitivement retirée du dossier. L'historique gardera trace de la suppression."
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) removeNote(lead.id, pending.id);
          setPending(null);
        }}
      />
    </section>
  );
}
