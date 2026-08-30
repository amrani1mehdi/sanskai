"use client";

/**
 * One feed of everything that happened across every lead, newest first.
 *
 * The per-lead timeline shows one dossier's history; this is the team view —
 * what moved today, who moved it, and which files it touched.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FileText,
  History,
  Mail,
  Phone,
  Sparkles,
  StickyNote,
  Waypoints,
} from "lucide-react";
import { Pagination, paginate } from "@/components/crm/pagination";
import { formatDateTime } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import type { Activity, ActivityKind, Lead } from "@/lib/crm/types";

const ICONS: Record<ActivityKind, typeof History> = {
  creation: Sparkles,
  statut: Waypoints,
  note: StickyNote,
  appel: Phone,
  email: Mail,
  document: FileText,
};

const KIND_LABELS: Record<ActivityKind, string> = {
  creation: "Nouvelles demandes",
  statut: "Changements de statut",
  note: "Notes internes",
  appel: "Appels",
  email: "Emails",
  document: "Documents",
};

const DAY = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

type Entry = { activity: Activity; lead: Lead };
type KindFilter = ActivityKind | "tous";

const PAGE_SIZE = 25;

export function ActivityView() {
  const { leads } = useCrm();
  const [kind, setKind] = useState<KindFilter>("tous");
  const [page, setPage] = useState(1);

  const entries = useMemo(
    () =>
      leads
        .flatMap((lead) => lead.activity.map((activity) => ({ activity, lead })))
        .filter((entry) => kind === "tous" || entry.activity.kind === kind)
        .sort(
          (a, b) =>
            new Date(b.activity.at).getTime() - new Date(a.activity.at).getTime(),
        ),
    [leads, kind],
  );

  const pageData = paginate(entries, page, PAGE_SIZE);

  // Group the page into days so a busy afternoon reads as one block.
  const days = useMemo(() => {
    const grouped: { key: string; label: string; entries: Entry[] }[] = [];

    for (const entry of pageData.rows) {
      const date = new Date(entry.activity.at);
      const key = date.toISOString().slice(0, 10);
      const last = grouped.at(-1);

      if (last && last.key === key) last.entries.push(entry);
      else grouped.push({ key, label: DAY.format(date), entries: [entry] });
    }

    return grouped;
  }, [pageData.rows]);

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Activité
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historique des actions menées sur l&apos;ensemble des dossiers.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Tout"
          active={kind === "tous"}
          onClick={() => {
            setKind("tous");
            setPage(1);
          }}
        />
        {(Object.keys(KIND_LABELS) as ActivityKind[]).map((value) => (
          <FilterChip
            key={value}
            label={KIND_LABELS[value]}
            active={kind === value}
            onClick={() => {
              setKind(value);
              setPage(1);
            }}
          />
        ))}
      </div>

      <div className="mt-4 space-y-6">
        {days.map((day) => (
          <section key={day.key} className="rounded-xl border border-border bg-card">
            <h2 className="border-b border-border px-6 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {day.label}
            </h2>

            <ul className="divide-y divide-border">
              {day.entries.map(({ activity, lead }) => {
                const Icon = ICONS[activity.kind];

                return (
                  <li key={activity.id}>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-secondary/40"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent">
                        <Icon size={14} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground">
                          {activity.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {lead.entreprise} ·{" "}
                          <span className="font-mono">{lead.reference}</span> ·{" "}
                          {activity.author}
                        </span>
                      </span>

                      <span
                        title={formatDateTime(activity.at)}
                        className="shrink-0 text-xs whitespace-nowrap text-muted-foreground"
                      >
                        {TIME.format(new Date(activity.at))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <History size={28} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-display font-bold text-foreground">Aucune activité</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun évènement de ce type pour l&apos;instant.
            </p>
          </div>
        ) : null}
      </div>

      <Pagination
        page={pageData.page}
        pageCount={pageData.pageCount}
        total={pageData.total}
        from={pageData.from}
        to={pageData.to}
        noun="évènement"
        onChange={setPage}
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-accent bg-accent/10 px-3.5 py-1.5 text-sm font-medium text-accent"
          : "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}
