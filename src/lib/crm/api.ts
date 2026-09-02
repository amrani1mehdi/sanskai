import type {
  Activity,
  ActivityKind,
  DocumentKind,
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
  seenAt: string | null;
  contactedAt: string | null;
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
    seenAt: lead.seenAt ?? null,
    contactedAt: lead.contactedAt ?? null,
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

/**
 * A fingerprint of the CRM's state, for polling.
 *
 * Three aggregates over one table, so asking every few seconds costs the same
 * whether there are thirteen leads or thirteen thousand. The panel compares
 * this and only re-downloads the list when it moves.
 */
export async function fetchChangeSignature(): Promise<string> {
  const payload = await call<{
    data: {
      count: number;
      unseen: number;
      latestId: number | null;
      updatedAt: string | null;
    };
  }>("changes");

  const { count, unseen, latestId, updatedAt } = payload.data;

  /* `unseen` belongs in the fingerprint: the other administrator opening a
     lead changes nothing else about the row, and the badge here has to clear
     when it does. */
  return `${count}:${unseen}:${latestId ?? "-"}:${updatedAt ?? "-"}`;
}

/** Marks one lead seen for the whole back office. */
export async function markLeadSeen(id: string): Promise<void> {
  await call(`leads/${id}/seen`, { method: "POST" });
}

/** Clears every outstanding arrival, for everybody. */
export async function markAllLeadsSeen(): Promise<void> {
  await call("leads/seen", { method: "POST" });
}

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

/* --------------------------------------------------------------------------
 * Cross-lead listings
 *
 * The Documents and Activité pages need every document and every entry across
 * all leads. They cannot read them off the lead list: `GET /v1/leads` returns
 * `documentCount` and `noteCount` rather than the collections themselves, so a
 * table of fifty leads stays one query. These are the endpoints that carry the
 * rows, and each one names the lead it belongs to.
 * -------------------------------------------------------------------------- */

/** A document with the dossier it came from. */
export type DocumentRow = { document: LeadDocument; lead: DocumentLead };

export type DocumentLead = {
  id: string;
  reference: string;
  entreprise: string;
  service: ServiceId;
};

type ApiCrossDocument = ApiDocument & {
  leadId: number;
  lead?: { id: number; reference: string; entreprise: string; service: ServiceId };
};

/** Follows pagination, so the page filters over the whole set rather than page one. */
async function collect<TApi, TOut>(
  path: string,
  map: (row: TApi) => TOut,
): Promise<TOut[]> {
  const out: TOut[] = [];
  let page = 1;

  for (;;) {
    const payload = await call<{
      data: TApi[];
      meta?: { current_page: number; last_page: number };
    }>(`${path}${path.includes("?") ? "&" : "?"}perPage=100&page=${page}`);

    out.push(...payload.data.map(map));

    const meta = payload.meta;
    if (!meta || meta.current_page >= meta.last_page) break;
    page += 1;
  }

  return out;
}

export function fetchAllDocuments(): Promise<DocumentRow[]> {
  return collect<ApiCrossDocument, DocumentRow>("documents", (row) => ({
    document: toDocument(row),
    lead: {
      id: String(row.lead?.id ?? row.leadId),
      reference: row.lead?.reference ?? "—",
      entreprise: row.lead?.entreprise ?? "—",
      service: row.lead?.service ?? "financement",
    },
  }));
}

/** An activity entry with the dossier it belongs to. */
export type ActivityRow = {
  activity: Activity;
  lead: { id: string; reference: string; entreprise: string };
};

type ApiCrossActivity = ApiActivity & {
  leadId: number;
  lead?: { id: number; reference: string; entreprise: string };
};

export function fetchAllActivities(): Promise<ActivityRow[]> {
  return collect<ApiCrossActivity, ActivityRow>("activities", (row) => ({
    activity: toActivity(row),
    lead: {
      id: String(row.lead?.id ?? row.leadId),
      reference: row.lead?.reference ?? "—",
      entreprise: row.lead?.entreprise ?? "—",
    },
  }));
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

/** The fields the back office may correct on an existing lead. */
export type LeadEdits = Partial<{
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  entreprise: string;
  siren: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  message: string | null;
}>;

/**
 * Corrects a lead's own details.
 *
 * Only the changed fields are sent. The API records every one in the lead's
 * history with its previous value, so a correction is visible rather than
 * silent — send the whole form every time and the trail fills with noise.
 */
export async function updateLead(id: string, edits: LeadEdits): Promise<Lead> {
  const payload = await call<{ data: ApiLead }>(`leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edits),
  });

  return toLead(payload.data);
}

/**
 * Marks a lead contacted, or puts it back in the queue.
 *
 * The board keeps a lead highlighted until this is true, so it is the flag that
 * takes a card out of the "still to call" pile. The API stores the moment, not
 * the boolean, and keeps the first one.
 */
export async function setContacted(id: string, contacted: boolean): Promise<Lead> {
  const payload = await call<{ data: ApiLead }>(`leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacted }),
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

/**
 * Adds a piece to an existing lead.
 *
 * The endpoint has been there since the beginning and nothing ever called it:
 * documents could only arrive with the original submission, so a Kbis sent by
 * email afterwards had nowhere to go. Multipart, and deliberately no
 * `Content-Type` header — fetch sets the boundary, and naming it by hand makes
 * the file unreadable at the other end.
 */
export async function uploadDocument(
  leadId: string,
  kind: DocumentKind,
  file: File,
): Promise<void> {
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", file);

  await call<void>(`leads/${leadId}/documents`, { method: "POST", body });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await call<void>(`documents/${documentId}`, { method: "DELETE" });
}

/* -------------------------------------------------------------------------- */
/* Administrators                                                              */
/* -------------------------------------------------------------------------- */

export type Admin = {
  id: string;
  name: string;
  email: string;
  initials: string;
};

type ApiAdmin = { id: number; name: string; email: string; initials: string };

const toAdmin = (admin: ApiAdmin): Admin => ({ ...admin, id: String(admin.id) });

/** Everyone who can sign in to the back office. */
export async function fetchAdmins(): Promise<Admin[]> {
  const payload = await call<{ data: ApiAdmin[] }>("admins");

  return payload.data.map(toAdmin);
}

/**
 * Adds someone to the back office.
 *
 * The password is set here and has to reach them some other way — there is no
 * invitation email in this application to send it through. They can change it
 * from their own account menu afterwards.
 */
export async function createAdmin(
  name: string,
  email: string,
  password: string,
  confirmation: string,
): Promise<Admin> {
  const payload = await call<{ data: ApiAdmin }>("admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      // Laravel's `confirmed` rule looks for this exact snake_case name.
      password_confirmation: confirmation,
    }),
  });

  return toAdmin(payload.data);
}

export async function deleteAdmin(id: string): Promise<void> {
  await call<void>(`admins/${id}`, { method: "DELETE" });
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
