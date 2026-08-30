"use client";

/**
 * Client-side CRM store — leads and responsables.
 *
 * There is no backend in this repo yet, so both live in a module-level store
 * mirrored to localStorage: status changes, notes, assignments, deletions and
 * newly added responsables all survive a refresh, which is enough to work the
 * board like the real thing.
 *
 * `useSyncExternalStore` does the reading: the server snapshot is the seed, the
 * client snapshot is whatever localStorage holds, and React reconciles the two
 * after hydration on its own. Every mutation also appends to the lead's
 * activity trail, so swapping this file for API calls later keeps the same
 * surface.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { CURRENT_ADMIN, OWNERS, STAGES, STAGE_BY_ID } from "./config";
import { SEED_LEADS } from "./data";
import type { Activity, ActivityKind, Lead, LeadStatus, Owner } from "./types";

/** v3 stores responsables alongside the leads. */
const STORAGE_KEY = "sansekai-crm-v3";

let leads: Lead[] = SEED_LEADS;
let owners: Owner[] = OWNERS;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Runs once when the module first evaluates in the browser, before any render.
 * Hydration still renders the seed — React compares snapshots afterwards and
 * re-renders if storage held something else.
 */
function restore() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored) as { leads?: Lead[]; owners?: Owner[] };

    if (Array.isArray(parsed.leads)) {
      // A status the config no longer knows would crash every STAGE_BY_ID
      // lookup, so anything unrecognised falls back to the first stage.
      leads = parsed.leads.map((lead) =>
        STAGE_BY_ID[lead.status] ? lead : { ...lead, status: STAGES[0].id },
      );
    }
    if (Array.isArray(parsed.owners) && parsed.owners.length > 0) {
      owners = parsed.owners;
    }
  } catch {
    // Private browsing, cleared storage, or a stale shape — the seed stands.
  }
}

if (typeof window !== "undefined") restore();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ leads, owners }));
  } catch {
    // Storage full or unavailable; the session still works in memory.
  }
}

function commitLeads(next: Lead[]) {
  leads = next;
  persist();
  emit();
}

function commitOwners(next: Owner[]) {
  owners = next;
  persist();
  emit();
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function activity(kind: ActivityKind, label: string): Activity {
  return {
    id: newId("act"),
    kind,
    label,
    author: CURRENT_ADMIN,
    at: new Date().toISOString(),
  };
}

/** Applies `change` to one lead and stamps `updatedAt`. */
function update(id: string, change: (lead: Lead) => Lead) {
  commitLeads(
    leads.map((lead) =>
      lead.id === id ? { ...change(lead), updatedAt: new Date().toISOString() } : lead,
    ),
  );
}

export function setLeadStatus(id: string, status: LeadStatus) {
  update(id, (lead) => {
    if (lead.status === status) return lead;
    const from = STAGE_BY_ID[lead.status].label;
    const to = STAGE_BY_ID[status].label;
    return {
      ...lead,
      status,
      activity: [...lead.activity, activity("statut", `Statut passé de ${from} à ${to}`)],
    };
  });
}

export function addLeadNote(id: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;

  update(id, (lead) => ({
    ...lead,
    notes: [
      ...lead.notes,
      {
        id: newId("note"),
        author: CURRENT_ADMIN,
        body: trimmed,
        createdAt: new Date().toISOString(),
      },
    ],
    activity: [...lead.activity, activity("note", "Note interne ajoutée")],
  }));
}

export function assignLead(id: string, ownerId: string | null) {
  update(id, (lead) => {
    if (lead.ownerId === ownerId) return lead;
    const owner = owners.find((item) => item.id === ownerId);
    const label = owner ? `Assigné à ${owner.name}` : "Responsable retiré";
    return {
      ...lead,
      ownerId,
      activity: [...lead.activity, activity("assignation", label)],
    };
  });
}

export function logLeadActivity(id: string, kind: ActivityKind, label: string) {
  update(id, (lead) => ({
    ...lead,
    activity: [...lead.activity, activity(kind, label)],
  }));
}

/** Removes one internal note. The history keeps the fact that it existed. */
export function deleteLeadNote(leadId: string, noteId: string) {
  update(leadId, (lead) => {
    if (!lead.notes.some((note) => note.id === noteId)) return lead;

    return {
      ...lead,
      notes: lead.notes.filter((note) => note.id !== noteId),
      activity: [...lead.activity, activity("note", "Note interne supprimée")],
    };
  });
}

/** Removes one document from its lead, leaving a trace in the history. */
export function deleteLeadDocument(leadId: string, documentId: string) {
  update(leadId, (lead) => {
    const document = lead.documents.find((item) => item.id === documentId);
    if (!document) return lead;

    return {
      ...lead,
      documents: lead.documents.filter((item) => item.id !== documentId),
      activity: [
        ...lead.activity,
        activity("document", `Document supprimé : ${document.name}`),
      ],
    };
  });
}

/** Removes the lead and everything attached to it. Not undoable. */
export function deleteLead(id: string) {
  commitLeads(leads.filter((lead) => lead.id !== id));
}

/** Two words give "CR"; one gives its first two letters. */
function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Adds a responsable.
 *
 * The password is deliberately NOT a parameter: it is validated in the form and
 * discarded there. Persisting a credential in localStorage would put it in
 * plain text on the machine, readable by any script on the origin, so the
 * account is created with `accessPending` and the secret is set for real
 * against the back end once one exists.
 */
export function addOwner(name: string, role: string, username: string) {
  const trimmedName = name.trim();
  const trimmedRole = role.trim();
  const trimmedUsername = username.trim();
  if (!trimmedName) return null;

  const owner: Owner = {
    id: newId("ow"),
    name: trimmedName,
    role: trimmedRole || "Responsable",
    initials: initialsFor(trimmedName),
    username: trimmedUsername || undefined,
    accessPending: true,
  };

  commitOwners([...owners, owner]);
  return owner;
}

/** Case-insensitive, so two responsables cannot share a login. */
export function isUsernameTaken(username: string) {
  const value = username.trim().toLowerCase();
  return owners.some((owner) => owner.username?.toLowerCase() === value);
}

/** Unassigns every lead the responsable held, so none is left orphaned. */
export function deleteOwner(id: string) {
  commitLeads(
    leads.map((lead) => (lead.ownerId === id ? { ...lead, ownerId: null } : lead)),
  );
  commitOwners(owners.filter((owner) => owner.id !== id));
}

const getLeads = () => leads;
const getSeedLeads = () => SEED_LEADS;
const getOwners = () => owners;
const getSeedOwners = () => OWNERS;

export function useCrm() {
  const currentLeads = useSyncExternalStore(subscribe, getLeads, getSeedLeads);
  const currentOwners = useSyncExternalStore(subscribe, getOwners, getSeedOwners);

  /** False during the server render and the hydration pass. */
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const getLead = useCallback(
    (id: string) => currentLeads.find((lead) => lead.id === id),
    [currentLeads],
  );

  const getOwner = useCallback(
    (id: string | null) =>
      id === null ? undefined : currentOwners.find((owner) => owner.id === id),
    [currentOwners],
  );

  return useMemo(
    () => ({
      leads: currentLeads,
      owners: currentOwners,
      hydrated,
      getLead,
      getOwner,
      setStatus: setLeadStatus,
      addNote: addLeadNote,
      assign: assignLead,
      logActivity: logLeadActivity,
      removeLead: deleteLead,
      removeDocument: deleteLeadDocument,
      removeNote: deleteLeadNote,
      createOwner: addOwner,
      removeOwner: deleteOwner,
      usernameTaken: isUsernameTaken,
    }),
    [currentLeads, currentOwners, hydrated, getLead, getOwner],
  );
}
