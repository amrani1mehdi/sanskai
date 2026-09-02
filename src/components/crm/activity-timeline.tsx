"use client";

import {
  FileText,
  History,
  Mail,
  Phone,
  Sparkles,
  StickyNote,
  PencilLine,
  Waypoints,
} from "lucide-react";
import { formatDateTime } from "@/lib/crm/format";
import type { ActivityKind, Lead } from "@/lib/crm/types";

const ICONS: Record<ActivityKind, typeof History> = {
  creation: Sparkles,
  statut: Waypoints,
  note: StickyNote,
  appel: Phone,
  email: Mail,
  document: FileText,
  modification: PencilLine,
};

export function ActivityTimeline({ lead }: { lead: Lead }) {
  const entries = [...lead.activity].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <History size={16} className="text-accent" />
        <h2 className="font-display text-base font-bold text-foreground">Activité</h2>
      </div>

      <ol className="relative space-y-5 border-l border-border pl-6">
        {entries.map((entry) => {
          const Icon = ICONS[entry.kind];

          return (
            <li key={entry.id} className="relative">
              <span className="absolute top-0.5 -left-[1.9rem] flex h-6 w-6 items-center justify-center border border-border bg-card text-accent">
                <Icon size={12} />
              </span>
              <p className="text-sm text-foreground">{entry.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entry.author} · {formatDateTime(entry.at)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
