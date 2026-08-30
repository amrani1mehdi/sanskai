/**
 * Aggregations behind the dashboard.
 *
 * Pure functions over the lead list — no formatting, no React — so the figures
 * can be reused by an export or an API route later without dragging the UI
 * along.
 */

import { PRESTATIONS, SERVICES, STAGES } from "./config";
import type { Lead, LeadStatus, Owner, PrestationId, ServiceId } from "./types";

/** The forms collect amounts as free text ("48 000 €", "75000"). */
export function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export type Slice<Id> = {
  id: Id;
  label: string;
  count: number;
  /** 0-1, against the largest slice in the same set. */
  ratio: number;
};

function withRatios<Id>(rows: Omit<Slice<Id>, "ratio">[]): Slice<Id>[] {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return rows.map((row) => ({ ...row, ratio: row.count / max }));
}

export function byStatus(leads: Lead[]): Slice<LeadStatus>[] {
  return withRatios(
    STAGES.map((stage) => ({
      id: stage.id,
      label: stage.label,
      count: leads.filter((lead) => lead.status === stage.id).length,
    })),
  );
}

export function byService(leads: Lead[]): Slice<ServiceId>[] {
  return withRatios(
    SERVICES.map((service) => ({
      id: service.id,
      label: service.label,
      count: leads.filter((lead) => lead.service === service.id).length,
    })),
  );
}

/** One sub-service per lead, so these counts sum to the Développement total. */
export function byPrestation(leads: Lead[]): Slice<PrestationId>[] {
  return withRatios(
    PRESTATIONS.map((prestation) => ({
      id: prestation.id,
      label: prestation.label,
      count: leads.filter((lead) => lead.prestation === prestation.id).length,
    })),
  );
}

/** Owners plus an "unassigned" row, which is the one that needs watching. */
export function byOwner(leads: Lead[], owners: Owner[]): Slice<string>[] {
  return withRatios([
    ...owners.map((owner) => ({
      id: owner.id,
      label: owner.name,
      count: leads.filter((lead) => lead.ownerId === owner.id).length,
    })),
    {
      id: "non_assigne",
      label: "Non assignés",
      count: leads.filter((lead) => lead.ownerId === null).length,
    },
  ]);
}

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short" });

/**
 * Leads received per month, ending on the most recent lead rather than on
 * `now` — deterministic, so the server and client render the same bars.
 */
export function monthlyIntake(leads: Lead[], months = 6) {
  const latest = leads.reduce(
    (max, lead) => Math.max(max, new Date(lead.createdAt).getTime()),
    0,
  );
  const end = latest ? new Date(latest) : new Date();

  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - 1 - index), 1),
    );
    return {
      key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
      label: MONTH.format(date).replace(".", ""),
      year: date.getUTCFullYear(),
      count: 0,
    };
  });

  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const lead of leads) {
    const date = new Date(lead.createdAt);
    const bucket = index.get(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
    if (bucket) bucket.count += 1;
  }

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return buckets.map((bucket) => ({ ...bucket, ratio: bucket.count / max }));
}

export function headline(leads: Lead[]) {
  const count = (status: LeadStatus) =>
    leads.filter((lead) => lead.status === status).length;

  const approuve = count("approuve");
  const traites = approuve + count("refuse");

  const financement = leads.filter((lead) => lead.service === "financement");

  return {
    total: leads.length,
    nouveaux: count("nouveau"),
    enCours: count("en_cours"),
    approuve,
    /** Share of decided files that were won — null while nothing is decided. */
    tauxReussite: traites === 0 ? null : Math.round((approuve / traites) * 100),
    montantDemande: financement.reduce(
      (sum, lead) => sum + parseAmount(lead.montant),
      0,
    ),
    montantApprouve: financement
      .filter((lead) => lead.status === "approuve")
      .reduce((sum, lead) => sum + parseAmount(lead.montant), 0),
    aTraiter: count("nouveau") + count("a_examiner"),
    nonAssignes: leads.filter((lead) => lead.ownerId === null).length,
  };
}
