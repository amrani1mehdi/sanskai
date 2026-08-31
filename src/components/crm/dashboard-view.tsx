"use client";

/**
 * Tableau de bord — the numbers an admin wants before opening any single lead.
 *
 * Charts are plain HTML bars rather than a charting library: every series is
 * direct-labelled, which is also what lets the sub-service palette ship (its
 * third slot sits just under 3:1 on this cream surface, so the labels are the
 * required relief, not decoration).
 */

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Inbox, Layers, TrendingUp, Wallet } from "lucide-react";
import {
  PRESTATION_BY_ID,
  SERVICE_BY_ID,
  STAGE_BY_ID,
} from "@/lib/crm/config";
import { formatDateTime } from "@/lib/crm/format";
import {
  byPrestation,
  byService,
  byStatus,
  headline,
  monthlyIntake,
} from "@/lib/crm/stats";
import { fetchAllActivities } from "@/lib/crm/api";
import { useCrm, useCrmListing } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function DashboardView() {
  /* Every figure here is about service enquiries. Counting contact messages
     among them would make the headline totals disagree with the by-service
     breakdown, which cannot include something that is not a service. */
  const { dossiers: leads, messages, syncedAt } = useCrm();

  /* The lead list carries counts, not the trail, so the feed fetches its own
     rows and re-fetches whenever the store reloads — the poll keeps it live. */
  const { rows: activity, status: activityStatus } = useCrmListing(
    fetchAllActivities,
    syncedAt,
  );

  const stats = useMemo(() => headline(leads), [leads]);
  const statuses = useMemo(() => byStatus(leads), [leads]);
  const services = useMemo(() => byService(leads), [leads]);
  const prestations = useMemo(() => byPrestation(leads), [leads]);
  const months = useMemo(() => monthlyIntake(leads), [leads]);

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d&apos;ensemble des demandes de service reçues depuis le site.
          {messages.length > 0 ? (
            <>
              {" "}
              <Link href="/admin/crm" className="text-accent hover:underline">
                {messages.length} message{messages.length > 1 ? "s" : ""} de contact
              </Link>{" "}
              {messages.length > 1 ? "sont comptés" : "est compté"} à part.
            </>
          ) : null}
        </p>
      </header>

      {/* Chiffres clés */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Inbox}
          label="Leads à traiter"
          value={String(stats.aTraiter)}
          hint={`sur ${stats.total} au total`}
        />
        <StatTile
          icon={TrendingUp}
          label="Taux de réussite"
          value={stats.tauxReussite === null ? "—" : `${stats.tauxReussite} %`}
          hint={`${stats.approuve} dossier${stats.approuve > 1 ? "s" : ""} approuvé${
            stats.approuve > 1 ? "s" : ""
          }`}
        />
        <StatTile
          icon={Wallet}
          label="Montant demandé"
          value={EUROS.format(stats.montantDemande)}
          hint={`dont ${EUROS.format(stats.montantApprouve)} approuvé`}
        />
        <StatTile
          icon={Layers}
          label="Total des leads"
          value={String(stats.total)}
          hint="toutes demandes confondues"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Statuts — palette de statut, pas catégorielle */}
        <Panel
          title="Répartition par statut"
          subtitle="Position des dossiers dans le pipeline"
        >
          <ul className="space-y-3">
            {statuses.map((slice) => (
              <BarRow
                key={slice.id}
                label={slice.label}
                count={slice.count}
                ratio={slice.ratio}
                bar={STAGE_BY_ID[slice.id].dot}
                href="/admin/crm"
              />
            ))}
          </ul>
        </Panel>

        {/* Évolution — série unique, pas de légende */}
        <Panel
          title="Demandes reçues par mois"
          subtitle="Six derniers mois d'activité"
        >
          <div className="flex h-52 items-end gap-2">
            {months.map((month) => (
              <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {month.count > 0 ? month.count : ""}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    title={`${month.label} : ${month.count} lead${
                      month.count > 1 ? "s" : ""
                    }`}
                    style={{ height: `${Math.max(month.ratio * 100, 2)}%` }}
                    className="w-full rounded-t-[4px] bg-accent transition-opacity hover:opacity-80"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{month.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        {/* Services et sous-services */}
        <Panel title="Services" subtitle="Origine des demandes">
          <ul className="space-y-3">
            {services.map((slice) => (
              <BarRow
                key={slice.id}
                label={slice.label}
                count={slice.count}
                ratio={slice.ratio}
                bar="bg-accent"
                href="/admin/crm"
              />
            ))}
          </ul>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sous-services · {SERVICE_BY_ID.developpement.label}
            </h3>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Un lead peut demander plusieurs prestations : ces totaux se recoupent.
            </p>
            <ul className="space-y-3">
              {prestations.map((slice) => (
                <BarRow
                  key={slice.id}
                  label={slice.label}
                  count={slice.count}
                  ratio={slice.ratio}
                  bar={PRESTATION_BY_ID[slice.id].bar}
                  href="/admin/crm"
                />
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {/* What moved lately.

          This used to be the five most recent leads — the same rows the CRM
          board already shows, one screen away. The dashboard is for
          understanding, so it carries what happened rather than a second copy
          of the list you manage elsewhere. */}
      <section className="mt-6 rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Activité récente
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ce qui a bougé sur les dossiers, le plus récent en premier
            </p>
          </div>
          <Link
            href="/admin/crm"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Ouvrir le CRM <ArrowRight size={14} />
          </Link>
        </header>

        {activityStatus === "loading" ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Chargement de l&apos;activité…
          </p>
        ) : activity.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Rien ne s&apos;est encore produit sur les dossiers.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.slice(0, 8).map(({ activity: entry, lead }) => (
              <li key={entry.id} className="flex items-start gap-3 px-6 py-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-mono hover:text-accent"
                    >
                      {lead.reference}
                    </Link>
                    {" · "}
                    {lead.entreprise}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-accent" />
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      <p className="mt-0.5 mb-5 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </section>
  );
}

/** Thin bar, 4px rounded data-end, count direct-labelled at the row head. */
function BarRow({
  label,
  count,
  ratio,
  bar,
  href,
}: {
  label: string;
  count: number;
  ratio: number;
  bar: string;
  href: string;
}) {
  return (
    <li>
      <Link href={href} className="group block">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-foreground group-hover:text-accent">
            {label}
          </span>
          <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
            {count}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-[4px] bg-secondary">
          <div
            style={{ width: `${ratio * 100}%` }}
            className={cn(
              "h-full rounded-[4px] transition-opacity group-hover:opacity-80",
              bar,
            )}
          />
        </div>
      </Link>
    </li>
  );
}

