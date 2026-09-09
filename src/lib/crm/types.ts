/**
 * CRM domain types.
 *
 * Every lead field below already exists in a form on the site — see
 * `components/site/financing-form.tsx` (demande de financement) and
 * `components/site/business-services.tsx` (Développement Digital). Nothing is
 * invented: the CRM reads back exactly what the site collects.
 */

/** The seven stages a lead moves through. Order is the pipeline order. */
/**
 * Where a lead stands.
 *
 * A service enquiry moves through the six pipeline stages. A contact message
 * uses only `nouveau` and `repondu` — "Qualifié" or "Approuvé" mean nothing on
 * a question someone asked. `STAGES_FOR` in config.ts is the per-service set.
 */
export type LeadStatus =
  | "nouveau"
  | "a_examiner"
  | "qualifie"
  | "en_cours"
  | "approuve"
  | "refuse"
  /** Contact messages only; `nouveau` is its unanswered counterpart. */
  | "repondu";

/** The three ways an enquiry reaches the CRM. `prestations` detail the second. */
export type ServiceId = "financement" | "developpement" | "contact";

/**
 * Sub-offers bundled under Développement Digital. The enquiry form is a single
 * select, so a lead asks for exactly one of these.
 */
export type PrestationId = "site_web" | "logo" | "migration_site";

/**
 * The four upload slots on the financing form, the contact form's invoices,
 * and a catch-all.
 */
export type DocumentKind =
  | "piece_identite"
  | "kbis"
  | "releve_bancaire"
  | "comptable"
  | "facture"
  | "autre";

export type LeadDocument = {
  id: string;
  /** File name as submitted by the applicant. */
  name: string;
  kind: DocumentKind;
  /** Bytes, for display only. */
  size: number;
  uploadedAt: string;
  /** Served from /public/documents — placeholders until file storage is wired. */
  url: string;
};

export type LeadNote = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

/** Anything worth keeping in the lead's history. */
export type ActivityKind =
  | "creation"
  | "statut"
  | "note"
  | "appel"
  | "email"
  | "document"
  /* A field on the fiche was corrected; the label carries before and after. */
  | "modification";

export type Activity = {
  id: string;
  kind: ActivityKind;
  /** Already-French, ready to render. */
  label: string;
  author: string;
  at: string;
};

/**
 * A lead submitted through one of the site's forms.
 *
 * Fields are optional where the originating form leaves them optional, or
 * where they only apply to one service — a développement lead has no
 * `montant`, a financement lead has no `prestations`.
 */
export type Lead = {
  id: string;
  /** Human-facing reference shown in the table and detail header. */
  reference: string;
  service: ServiceId;
  /** Développement only — the single service picked on the enquiry form. */
  prestation?: PrestationId;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  /**
   * When somebody in the back office first opened it, or null while nobody has.
   *
   * Shared by the whole team rather than held per viewer: once one
   * administrator looks, it stops being new for the other, which is the point.
   */
  seenAt: string | null;
  /** When someone actually rang them back. Null means still to do. */
  contactedAt: string | null;

  // Identity — both forms collect all four.
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;

  // Company.
  entreprise: string;
  /** Contact form only — the company identifier it asks for. */
  siren?: string;
  /**
   * Date de création, `YYYY-MM-DD`, as produced by the form's date picker.
   * Drives the six-month eligibility rule; the age itself is derived, never
   * stored, so it cannot drift out of date.
   */
  dateCreation?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;

  // Financing specifics.
  chiffreAffaire?: string;
  montant?: string;
  codeCommercial?: string;

  /** Web presence — the financing form asks yes/no, then for the detail. */
  siteWeb?: boolean;
  siteWebUrl?: string;
  reseaux?: boolean;
  reseauxOu?: string;

  message?: string;

  /**
   * Counts come back on the list; the collections only on a single lead. Read
   * these for badges and totals, and the arrays only on the detail page.
   */
  documentCount: number;
  noteCount: number;

  documents: LeadDocument[];
  notes: LeadNote[];
  activity: Activity[];
};
