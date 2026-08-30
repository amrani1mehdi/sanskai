/**
 * CRM domain types.
 *
 * Every lead field below already exists in a form on the site — see
 * `components/site/financing-form.tsx` (demande de financement) and
 * `components/site/contact-form.tsx` (développement d'entreprise). Nothing is
 * invented: the CRM reads back exactly what the site collects.
 */

/** The seven stages a lead moves through. Order is the pipeline order. */
export type LeadStatus =
  | "nouveau"
  | "a_examiner"
  | "qualifie"
  | "en_cours"
  | "approuve"
  | "refuse";

/** The two services the site sells. `prestations` detail the second one. */
export type ServiceId = "financement" | "developpement";

/**
 * Sub-offers bundled under Développement d'entreprise. The enquiry form is a
 * single select, so a lead asks for exactly one of these.
 */
export type PrestationId = "site_web" | "logo" | "campagne_publicitaire";

/** The four upload slots on the financing form, plus a catch-all. */
export type DocumentKind =
  | "piece_identite"
  | "kbis"
  | "releve_bancaire"
  | "comptable"
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
  | "document";

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

  // Identity — both forms collect all four.
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;

  // Company.
  entreprise: string;
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
