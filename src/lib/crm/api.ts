import type {
  Activity,
  ActivityKind,
  Lead,
  LeadDocument,
  LeadNote,
  LeadStatus,
  PrestationId,
  ServiceId,
} from "./types";

/**
 * The CRM API, as the browser sees it.
 *
 * Every call goes to `/api/crm/...` on this origin, which proxies to Laravel
 * with the bearer token from the httpOnly cookie. Nothing here knows the API's
 * address or holds a credential.
 */

/** Thrown with the API's own status and message, so callers can react to both. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/crm/${path}`, { cache: "no-store", ...init });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? "Le CRM a renvoyé une erreur.",
      response.status,
      payload?.errors ?? {},
    );
  }

  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* Mapping                                                                     */
/*                                                                             */
/* The API deliberately names its fields after the website's own form fields,   */
/* so this is a thin translation: ids become strings, and the few names that    */
/* differ are lined up here rather than in every component.                     */
/* -------------------------------------------------------------------------- */

type ApiDocument = {
  id: number;
  kind: LeadDocument["kind"];
  name: string;
  size: number;
  uploadedAt: string;
};

type ApiNote = { id: number; author: string; body: string; createdAt: string };

type ApiActivity = {
  id: number;
  kind: ActivityKind;
  label: string;
  actor: string;
  at: string;
};

type ApiLead = {
  id: number;
  reference: string;
  service: ServiceId;
  prestation: PrestationId | null;
  status: LeadStatus;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  entreprise: string;
  siren: string | null;
  dateCreation: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  chiffreAffaire?: string;
  montant?: string;
  codeCommercial?: string | null;
  siteWeb?: boolean | null;
  siteWebUrl?: string | null;
  reseaux?: boolean | null;
  reseauxOu?: string | null;
  message: string | null;
  documentCount?: number;
  noteCount?: number;
  documents?: ApiDocument[];
  notes?: ApiNote[];
  activities?: ApiActivity[];
  createdAt: string;
  updatedAt: string;
};

function toDocument(document: ApiDocument): LeadDocument {
  return {
    id: String(document.id),
    name: document.name,
    kind: document.kind,
    size: document.size,
    uploadedAt: document.uploadedAt,
    // Through the proxy, so the download carries the session's own credentials.
    url: `/api/crm/documents/${document.id}/download`,
  };
}

function toNote(note: ApiNote): LeadNote {
  return {
    id: String(note.id),
    author: note.author,
    body: note.body,
    createdAt: note.createdAt,
  };
}

function toActivity(activity: ApiActivity): Activity {
  return {
    id: String(activity.id),
    kind: activity.kind,
    label: activity.label,
    author: activity.actor,
    at: activity.at,
  };
}

export function toLead(lead: ApiLead): Lead {
  return {
    id: String(lead.id),
    reference: lead.reference,
    service: lead.service,
    prestation: lead.prestation ?? undefined,
    status: lead.status,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,

    nom: lead.nom,
    prenom: lead.prenom,
    email: lead.email,
    telephone: lead.telephone ?? undefined,

    entreprise: lead.entreprise,
    siren: lead.siren ?? undefined,
    dateCreation: lead.dateCreation ?? undefined,
    adresse: lead.adresse ?? undefined,
    codePostal: lead.codePostal ?? undefined,
    ville: lead.ville ?? undefined,

    chiffreAffaire: lead.chiffreAffaire,
    montant: lead.montant,
    codeCommercial: lead.codeCommercial ?? undefined,

    siteWeb: lead.siteWeb ?? undefined,
    siteWebUrl: lead.siteWebUrl ?? undefined,
    reseaux: lead.reseaux ?? undefined,
    reseauxOu: lead.reseauxOu ?? undefined,

    message: lead.message ?? undefined,

    /* The list endpoint sends counts rather than the collections themselves, so
       a table of fifty leads stays one query. Detail sends the real thing. */
    documentCount: lead.documentCount ?? lead.documents?.length ?? 0,
    noteCount: lead.noteCount ?? lead.notes?.length ?? 0,

    documents: (lead.documents ?? []).map(toDocument),
    notes: (lead.notes ?? []).map(toNote),
    activity: (lead.activities ?? []).map(toActivity),
  };
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                   */
/* -------------------------------------------------------------------------- */

/** Every lead, following pagination so the board and filters see the full set. */
export async function fetchLeads(): Promise<Lead[]> {
  const leads: Lead[] = [];
  let page = 1;

  for (;;) {
    const payload = await call<{
      data: ApiLead[];
      meta?: { current_page: number; last_page: number };
    }>(`leads?perPage=100&page=${page}`);

    leads.push(...payload.data.map(toLead));

    const meta = payload.meta;
    if (!meta || meta.current_page >= meta.last_page) break;
    page += 1;
  }

  return leads;
}

export async function fetchLead(id: string): Promise<Lead> {
  const payload = await call<{ data: ApiLead }>(`leads/${id}`);

  return toLead(payload.data);
}

export async function updateStatus(id: string, status: LeadStatus): Promise<Lead> {
  const payload = await call<{ data: ApiLead }>(`leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  return toLead(payload.data);
}

export async function deleteLead(id: string): Promise<void> {
  await call<void>(`leads/${id}`, { method: "DELETE" });
}

export async function createNote(leadId: string, body: string): Promise<void> {
  await call<void>(`leads/${leadId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  await call<void>(`notes/${noteId}`, { method: "DELETE" });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await call<void>(`documents/${documentId}`, { method: "DELETE" });
}

/**
 * Notes that the admin rang or emailed the applicant. Only the kind travels —
 * the API composes the label from the lead's own contact details.
 */
export async function logContact(
  leadId: string,
  kind: "appel" | "email",
): Promise<void> {
  await call<void>(`leads/${leadId}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
}

/**
 * Changes the administrator's password.
 *
 * The current one is required, so a stolen session cannot lock the owner out of
 * their own account. On success the API revokes every other token but keeps
 * this one, so the admin stays signed in here and is signed out everywhere else.
 */
export async function changePassword(
  currentPassword: string,
  password: string,
  confirmation: string,
): Promise<void> {
  await call<void>("auth/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword,
      password,
      // Laravel's `confirmed` rule looks for this exact snake_case name.
      password_confirmation: confirmation,
    }),
  });
}

/** Ends the session: revokes the token at the API and drops the cookie. */
export async function signOut(): Promise<void> {
  await fetch("/api/crm/session", { method: "DELETE" });
}
