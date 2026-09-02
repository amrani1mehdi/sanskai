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
  /** Badge classes. Neutral unless the stage is an outcome. */
  badge: string;
  /** Solid colour for the status dot. */
  dot: string;
  /**
   * The column's own colour, for its head rule and the left edge of every card
   * in it.
   *
   * Distinct per stage on purpose, unlike the badges: on the board a card is
   * read at a glance and often away from its column — mid-drag, or open in the
   * panel — so it carries which stage it belongs to. A badge is read in place
   * and does not need to.
   */
  accent: string;
  /**
   * Where the stage sits in the pipeline, or `null` if it is a way out.
   *
   * A single running index across all six stages would be a lie: "Refusé" is
   * not the step after "Approuvé", it is the other exit. The board draws the
   * working stages as a progression and the two outcomes as terminals, and
   * this is what tells them apart.
   */
  step: number | null;
};

/**
 * Four steps, then two ways out.
 *
 * Each stage owns a colour, but only as a 3px edge: on the column head and down
 * the left of every card in it. Fills and badges stay neutral, so the board
 * still reads as ink on paper and "approved" and "refused" keep the only two
 * saturated blocks on it.
 *
 * The edge is what lets a card say which stage it belongs to away from its
 * column — mid-drag, or open in the panel — which position alone cannot do.
 */
export const STAGES: StageConfig[] = [
  {
    id: "nouveau",
    label: "Nouveau",
    hint: "Vient d'arriver du site",
    badge: "border-border bg-secondary text-foreground",
    dot: "bg-foreground",
    accent: "bg-stage-nouveau",
    step: 1,
  },
  {
    /* The stored value stays `a_examiner`. Only the wording changed — renaming
       the enum would mean a migration and would rewrite the history entries
       that already say "À examiner", which is what actually happened at the
       time. */
    id: "a_examiner",
    label: "Contacté",
    hint: "Le premier appel a été passé",
    badge: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
    accent: "bg-stage-examiner",
    step: 2,
  },
  {
    id: "qualifie",
    label: "Qualifié",
    hint: "Dossier recevable",
    badge: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
    accent: "bg-stage-qualifie",
    step: 3,
  },
  {
    id: "en_cours",
    label: "En cours",
    hint: "Instruction en cours",
    badge: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
    accent: "bg-stage-encours",
    step: 4,
  },
  {
    id: "approuve",
    label: "Approuvé",
    hint: "Accord donné",
    badge: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
    accent: "bg-success",
    step: null,
  },
  {
    id: "refuse",
    label: "Refusé",
    hint: "Dossier non retenu",
    badge: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
    accent: "bg-danger",
    step: null,
  },
];

/**
 * A status a contact message may still be holding.
 *
 * Messages ran a two-state track of their own — answered or not — until they
 * joined the pipeline. The rows were migrated, so this is here only so an old
 * `repondu` coming back from an API that has not been redeployed still resolves
 * to a label instead of crashing the badge. Never a column, never offered.
 */
const LEGACY_STAGES: StageConfig[] = [
  {
    id: "repondu",
    label: "Répondu",
    hint: "Message traité avant la refonte du pipeline",
    badge: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
    accent: "bg-success",
    step: null,
  },
];

/**
 * The statuses a lead of this service may hold.
 *
 * The same six whatever it came in on. The parameter stays because every call
 * site already reads a status in the context of its lead, and it is the hook to
 * hang a service-specific stage on if one ever comes back.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function stagesFor(_service: ServiceId): StageConfig[] {
  return STAGES;
}

/** Every status that can be read off a lead, including the retired one. */
export const STAGE_BY_ID = Object.fromEntries(
  [...LEGACY_STAGES, ...STAGES].map((stage) => [stage.id, stage]),
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
 * The three sub-services on the Développement d'entreprise page. The enquiry
 * form is a single select, so a lead carries exactly one.
 *
 * Neutral, like every other category: which sub-service a lead asked for is
 * written on the chip, and a colour per sub-service would compete with the two
 * that mean approved and refused.
 */
export const PRESTATIONS: PrestationConfig[] = [
  {
    id: "site_web",
    label: "Création de site Web",
    shortLabel: "Site Web",
    bar: "bg-muted-foreground",
    chip: "border-border bg-secondary text-muted-foreground",
  },
  {
    id: "logo",
    label: "Création de LOGO",
    shortLabel: "LOGO",
    bar: "bg-muted-foreground",
    chip: "border-border bg-secondary text-muted-foreground",
  },
  {
    id: "campagne_publicitaire",
    label: "Campagne publicitaire sur les réseaux",
    shortLabel: "Campagne pub",
    bar: "bg-muted-foreground",
    chip: "border-border bg-secondary text-muted-foreground",
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

/**
 * Contact messages are not a service.
 *
 * Financement and Développement are things the company sells; a contact message
 * is someone writing in. They share the `leads` table because a message still
 * has a sender, a status, notes and a trail — but they are deliberately kept
 * out of `SERVICES`, so the sidebar's Services group, the service filter, the
 * pipeline and the by-service breakdown never count them as one.
 */
export const CONTACT: ServiceConfig = {
  id: "contact",
  label: "Message de contact",
  shortLabel: "Contact",
  source: "/contact",
};

/** True for a message from the contact form, false for a service enquiry. */
export function isMessage(lead: { service: ServiceId }): boolean {
  return lead.service === CONTACT.id;
}

/**
 * Label and source lookup for any lead, contact messages included.
 *
 * Deliberately wider than `SERVICES`: that list is what the CRM offers as a
 * service, this map is how a lead of any origin renders. A detail page that
 * could not resolve a contact message would crash on it.
 */
export const SERVICE_BY_ID = Object.fromEntries(
  [...SERVICES, CONTACT].map((service) => [service.id, service]),
) as Record<ServiceId, ServiceConfig>;

/**
 * One entry per upload slot on the financing form, in the form's own order.
 *
 * Every slot is optional, and only the accounting one takes several files —
 * see `DocumentKind` in the API, which is what enforces both rules.
 */
export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  piece_identite: "Pièce d'identité",
  kbis: "Kbis / justificatif d'immatriculation",
  releve_bancaire: "Relevé bancaire des 6 derniers mois",
  comptable: "Informations financières / comptables",
  facture: "Facture",
  autre: "Autre document",
};

/** The signed-in admin. Stamped on notes and activity entries. */
export const CURRENT_ADMIN = "Admin Sansekai";
