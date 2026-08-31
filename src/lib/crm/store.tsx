"use client";

/**
 * The CRM's data, from the API.
 *
 * One module-level store rather than state per component: the sidebar, the
 * table and the dashboard all read the same list, so they share a single fetch
 * instead of issuing one each.
 *
 * A mutation writes to the API first and reloads second. Updating the local
 * copy optimistically would let the board show a status the server rejected —
 * on a dossier that decides whether someone gets financed, the screen should
 * only ever show what was actually recorded.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as api from "./api";
import { isMessage } from "./config";
import type { Lead, LeadStatus } from "./types";

type Snapshot = {
  leads: Lead[];
  /** False until the first response lands, so views can show a skeleton. */
  hydrated: boolean;
  error: string | null;
  /** When the list last came back from the API. Drives the live indicator. */
  syncedAt: string | null;
};

const EMPTY: Snapshot = {
  leads: [],
  hydrated: false,
  error: null,
  syncedAt: null,
};

let snapshot: Snapshot = EMPTY;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(next: Snapshot) {
  snapshot = next;
  emit();
}

/** Latched once a 401 has sent us to the form, so it happens exactly once. */
let redirecting = false;

/** Sends an expired session back to the form rather than showing an empty board. */
function handle(error: unknown): string {
  if (error instanceof api.ApiError && error.status === 401) {
    /* Stop asking before navigating. The poll fires every fifteen seconds and
       on every focus, so an expired session produces a 401 on each tick — and
       each one used to start another navigation, reloading the page for as
       long as the tab stayed open. */
    stopPolling();

    /* Already on the form — including the reload this would itself cause — so
       there is nowhere to send them. Without this the assign() below re-enters
       the login page over and over. */
    const atLogin = window.location.pathname.startsWith("/admin/login");

    if (!redirecting && !atLogin) {
      redirecting = true;
      /* A hard navigation on purpose: the session is gone, and a client-side
         push would carry the stale store into the login page. This is module
         scope, so there is no router to reach for anyway. */
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/admin/login");
    }

    return "Session expirée.";
  }

  return error instanceof api.ApiError
    ? error.message
    : "Impossible de joindre le CRM.";
}

export async function loadLeads(): Promise<void> {
  loading = true;

  try {
    /*
     * Signature first, list second — never the other way round.
     *
     * Taken after the list, a lead arriving in between would be inside the
     * signature but missing from the list, and the panel would consider itself
     * up to date until something else changed: the lead would simply never
     * appear. Taken first, the same race only costs one redundant refetch on
     * the next tick.
     */
    signature = await api.fetchChangeSignature().catch(() => null);

    set({
      leads: await api.fetchLeads(),
      hydrated: true,
      error: null,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    set({ ...snapshot, hydrated: true, error: handle(error) });
  } finally {
    loading = false;
  }
}

/* -------------------------------------------------------------------------- */
/* Live updates                                                                */
/*                                                                             */
/* Polling, not websockets: a lead arriving within a few seconds is what the    */
/* back office needs, and that does not justify running a second daemon on a    */
/* box already hosting nine other applications. The signature endpoint makes    */
/* the poll cheap enough that the interval can be short.                        */
/* -------------------------------------------------------------------------- */

const POLL_MS = 15_000;

/** Last known server state. `null` means "not established yet". */
let signature: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

async function checkForChanges(): Promise<void> {
  // Nothing to do for a tab nobody is looking at; `visibilitychange` catches up
  // the moment it comes back.
  if (typeof document !== "undefined" && document.hidden) return;
  if (loading) return;

  try {
    const next = await api.fetchChangeSignature();

    if (signature === null) {
      signature = next;
      return;
    }

    if (next !== signature) {
      signature = next;
      await loadLeads();
    }
  } catch (error) {
    /* An expired session should still bounce to the login form. Anything else
       is transient — the next tick retries rather than painting an error over
       a screen that is still perfectly usable. */
    if (error instanceof api.ApiError && error.status === 401) handle(error);
  }
}

const onWake = () => {
  if (typeof document === "undefined" || !document.hidden) void checkForChanges();
};

function startPolling(): void {
  if (timer !== null || typeof window === "undefined") return;
  if (redirecting || window.location.pathname.startsWith("/admin/login")) return;

  timer = setInterval(() => void checkForChanges(), POLL_MS);

  // A tab returning to the foreground should be current immediately, not after
  // up to another full interval.
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
}

function stopPolling(): void {
  if (timer === null) return;

  clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onWake);
  window.removeEventListener("focus", onWake);
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // First subscriber triggers the load; the rest ride along.
  if (!snapshot.hydrated && !loading) void loadLeads();
  startPolling();

  return () => {
    listeners.delete(listener);
    // Nothing on screen is reading the store — stop asking the server.
    if (listeners.size === 0) stopPolling();
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

/** Runs a mutation, then reloads so the screen matches the server. */
async function mutate(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    set({ ...snapshot, error: handle(error) });
    return;
  }

  await loadLeads();
}

export function useCrm() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const getLead = useCallback(
    (id: string) => current.leads.find((lead) => lead.id === id),
    [current.leads],
  );

  return useMemo(
    () => ({
      /** Everything in the CRM — service enquiries and contact messages. */
      leads: current.leads,
      /**
       * Split once here rather than in every view, because getting it wrong is
       * invisible: a message counted as a dossier just makes a number slightly
       * too big. `dossiers` is what the Leads list, the pipeline and the
       * by-service figures mean by a lead; `messages` is the contact form.
       */
      dossiers: current.leads.filter((lead) => !isMessage(lead)),
      messages: current.leads.filter(isMessage),
      hydrated: current.hydrated,
      error: current.error,
      syncedAt: current.syncedAt,
      refresh: loadLeads,
      getLead,

      setStatus: (id: string, status: LeadStatus) =>
        void mutate(() => api.updateStatus(id, status)),

      addNote: (id: string, body: string) => {
        const trimmed = body.trim();
        if (trimmed) void mutate(() => api.createNote(id, trimmed));
      },

      removeNote: (_leadId: string, noteId: string) =>
        void mutate(() => api.deleteNote(noteId)),

      removeDocument: (_leadId: string, documentId: string) =>
        void mutate(() => api.deleteDocument(documentId)),

      removeLead: (id: string) => void mutate(() => api.deleteLead(id)),

      /* A call or an email placed from the back office. The API records the
         status changes, notes and document reads on its own. */
      logContact: (id: string, kind: "appel" | "email") =>
        void api.logContact(id, kind),
    }),
    [current, getLead],
  );
}

/* -------------------------------------------------------------------------- */
/* Cross-lead listings                                                         */
/*                                                                             */
/* The Documents and Activité pages need rows the lead list does not carry —    */
/* it sends counts, not collections. They fetch their own, and re-fetch         */
/* whenever the shared store reloads, so the poll keeps them live too.          */
/* -------------------------------------------------------------------------- */

export function useCrmListing<T>(
  load: () => Promise<T[]>,
  /** Changes on every store reload, including the ones the poll triggers. */
  syncedAt: string | null,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // The loader is defined inline by callers, so it is a new function on every
  // render; the sync marker is what should actually drive a refetch. Assigned
  // in an effect rather than during render, which React forbids.
  const loader = useRef(load);

  useEffect(() => {
    loader.current = load;
  });

  useEffect(() => {
    let alive = true;

    loader
      .current()
      .then((next) => {
        if (!alive) return;
        setRows(next);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!alive) return;
        handle(error);
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [syncedAt]);

  return { rows, status };
}

/* -------------------------------------------------------------------------- */
/* One lead, in full                                                           */
/*                                                                             */
/* The list carries counts only, so the detail page fetches its own copy —      */
/* documents, notes and the whole history.                                     */
/* -------------------------------------------------------------------------- */

type Detail = { lead: Lead | null; status: "loading" | "ready" | "missing" | "error" };

const details = new Map<string, Detail>();
const detailListeners = new Map<string, Set<() => void>>();

function emitDetail(id: string) {
  for (const listener of detailListeners.get(id) ?? []) listener();
}

export async function loadLead(id: string): Promise<void> {
  try {
    details.set(id, { lead: await api.fetchLead(id), status: "ready" });
  } catch (error) {
    const missing = error instanceof api.ApiError && error.status === 404;
    if (!missing) handle(error);
    details.set(id, { lead: null, status: missing ? "missing" : "error" });
  }

  emitDetail(id);
}

const LOADING: Detail = { lead: null, status: "loading" };

export function useLead(id: string) {
  const subscribeToDetail = useCallback(
    (listener: () => void) => {
      const set = detailListeners.get(id) ?? new Set<() => void>();
      set.add(listener);
      detailListeners.set(id, set);

      if (!details.has(id)) {
        details.set(id, LOADING);
        void loadLead(id);
      }

      return () => {
        set.delete(listener);
      };
    },
    [id],
  );

  const read = useCallback(() => details.get(id) ?? LOADING, [id]);
  const detail = useSyncExternalStore(subscribeToDetail, read, () => LOADING);

  const reload = useCallback(() => {
    void loadLead(id);
  }, [id]);

  return { lead: detail.lead, status: detail.status, reload };
}
