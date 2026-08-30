/**
 * CRM configuration — stages and services.
 *
 * Deliberately data-driven: adding a service or a stage means adding an entry
 * here, not touching the table, the filters, or the Kanban board.
 */

import type { DocumentKind, LeadStatus, PrestationId, ServiceId } from "./types";

export type StageConfig = {
  id: LeadStatus;
  label: string;
  /** Shown under the Kanban column heading. */
  hint: string;
  /** Badge classes, built from the site's own tokens where one fits. */
  badge: string;
  /** Solid colour for the Kanban column rail and stat dots. */
  dot: string;
};

/**
 * One muted hue per stage, so a badge is readable at a glance without shouting.
 * Every colour clears 5.68:1 against a panel — see the status palette in
 * globals.css, where the tokens are defined and the measurements recorded.
 */
export const STAGES: StageConfig[] = [
  {
    id: "nouveau",
    label: "Nouveau",
    hint: "Vient d'arriver du site",
    badge: "border-stage-nouveau/30 bg-stage-nouveau/10 text-stage-nouveau",
    dot: "bg-stage-nouveau",
  },
  {
    id: "a_examiner",
    label: "À examiner",
    hint: "En attente de première lecture",
    badge: "border-stage-examiner/30 bg-stage-examiner/10 text-stage-examiner",
    dot: "bg-stage-examiner",
  },
  {
    id: "qualifie",
    label: "Qualifié",
    hint: "Dossier recevable",
    badge: "border-stage-qualifie/30 bg-stage-qualifie/10 text-stage-qualifie",
    dot: "bg-stage-qualifie",
  },
  {
    id: "en_cours",
    label: "En cours",
    hint: "Instruction en cours",
    badge: "border-stage-encours/30 bg-stage-encours/10 text-stage-encours",
    dot: "bg-stage-encours",
  },
  {
    id: "approuve",
    label: "Approuvé",
    hint: "Accord donné",
    badge: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
  },
  {
    id: "refuse",
    label: "Refusé",
    hint: "Dossier non retenu",
    badge: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
];

export const STAGE_BY_ID = Object.fromEntries(
  STAGES.map((stage) => [stage.id, stage]),
) as Record<LeadStatus, StageConfig>;

export type PrestationConfig = {
  id: PrestationId;
  label: string;
  /** Fits in a table cell or a Kanban card. */
  shortLabel: string;
  /** Categorical slot, assigned in fixed order and never cycled. */
  bar: string;
  chip: string;
};

/**
 * The four sub-services on the Développement d'entreprise page. The enquiry
 * form is a single select, so a lead carries exactly one.
 *
 * Colours are slots 1-4 of the validated categorical palette, in fixed order.
 * Four slots stay inside the gates only because every bar and chip is
 * direct-labelled — see the palette note in globals.css.
 */
export const PRESTATIONS: PrestationConfig[] = [
  {
    id: "site_web",
    label: "Création de site Web",
    shortLabel: "Site Web",
    bar: "bg-series-1",
    chip: "border-series-1/30 bg-series-1/10 text-series-1",
  },
  {
    id: "logo",
    label: "Création de LOGO",
    shortLabel: "LOGO",
    bar: "bg-series-2",
    chip: "border-series-2/30 bg-series-2/10 text-series-2",
  },
  {
    id: "campagne_publicitaire",
    label: "Campagne publicitaire sur les réseaux",
    shortLabel: "Campagne pub",
    bar: "bg-series-3",
    chip: "border-series-3/30 bg-series-3/10 text-series-3",
  },
  {
    id: "fidelite_digitale",
    label: "Fidélité digitale",
    shortLabel: "Fidélité",
    bar: "bg-series-4",
    chip: "border-series-4/40 bg-series-4/10 text-series-4",
  },
];

export const PRESTATION_BY_ID = Object.fromEntries(
  PRESTATIONS.map((prestation) => [prestation.id, prestation]),
) as Record<PrestationId, PrestationConfig>;

export type ServiceConfig = {
  id: ServiceId;
  label: string;
  /** Fits in a sidebar row or a filter chip. */
  shortLabel: string;
  /** Page the lead was submitted from. */
  source: string;
  prestations?: PrestationConfig[];
};

export const SERVICES: ServiceConfig[] = [
  {
    id: "financement",
    label: "Demande de financement",
    shortLabel: "Financement",
    source: "/financement",
  },
  {
    id: "developpement",
    label: "Développement d'entreprise",
    shortLabel: "Développement",
    source: "/developpement-entreprise",
    prestations: PRESTATIONS,
  },
];

export const SERVICE_BY_ID = Object.fromEntries(
  SERVICES.map((service) => [service.id, service]),
) as Record<ServiceId, ServiceConfig>;

/** One entry per upload slot on the financing form, in the form's own order. */
export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  piece_identite: "Pièce d'identité",
  kbis: "Kbis / justificatif d'immatriculation",
  releve_bancaire: "Relevés bancaires professionnels",
  comptable: "Documents comptables",
  autre: "Autre document",
};

/** Only the identity document is optional on the form. */
export const OPTIONAL_DOCUMENTS: DocumentKind[] = ["piece_identite", "autre"];

/** The signed-in admin. Stamped on notes and activity entries. */
export const CURRENT_ADMIN = "Admin Sansekai";
