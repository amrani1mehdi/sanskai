"use client";

/**
 * The CRM's data, from the API.
 *
 * One module-level store rather than state per component: the sidebar, the
 * table and the dashboard all read the same list, so they share a single fetch
 * instead of issuing one each.
 *
 * A mutation writes to the API first and reloads second, so the screen only
 * ever shows what was actually recorded. The one exception is dragging a card
 * between stages, which lands optimistically and rolls back if the server
 * refuses — see `moveLead`. A card that does not move when you drop it reads
 * as broken, and the rollback is what makes showing it early safe.
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
  /** Ids that arrived since this session started and have not been looked at. */
  unseen: string[];
};

const EMPTY: Snapshot = {
  leads: [],
  hydrated: false,
  error: null,
  syncedAt: null,
  unseen: [],
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

/**
 * Drops the session, then shows the form.
 *
 * Clearing the cookie is the part that matters. The server's guard asks only
 * whether the cookie is present, not whether the token behind it still works,
 * so a token the API has stopped accepting leaves the two pages throwing the
 * visitor between them: the login page sees a cookie and forwards to the panel,
 * the panel calls the API, gets a 401, and sends them back. Removing the cookie
 * is what ends that — and it is the honest thing to do anyway, since a session
 * the API refuses is not a session.
 */
async function signOut(): Promise<void> {
  // The route clears the cookie whether or not the API can be reached, so a
  // CRM that is down still lets someone out of the panel.
  await fetch("/api/crm/session", { method: "DELETE" }).catch(() => {});

  if (window.location.pathname.startsWith("/admin/login")) {
    // Already on the form: the cookie is gone now, so a reload is enough to
    // stop the server bouncing them back to the panel.
    window.location.reload();
    return;
  }

  /* A hard navigation on purpose: the session is gone, and a client-side push
     would carry the stale store into the login page. This is module scope, so
     there is no router to reach for anyway. */
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/admin/login");
}

/** Sends an expired session back to the form rather than showing an empty board. */
function handle(error: unknown): string {
  if (error instanceof api.ApiError && error.status === 401) {
    /* Stop asking before navigating. The poll fires every fifteen seconds and
       on every focus, so an expired session produces a 401 on each tick — and
       each one used to start another navigation, reloading the page for as
       long as the tab stayed open. */
    stopPolling();

    if (!redirecting) {
      redirecting = true;
      void signOut();
    }

    return "Session expirée.";
  }

  return error instanceof api.ApiError
    ? error.message
    : "Impossible de joindre le CRM.";
}

/* -------------------------------------------------------------------------- */
/* New arrivals                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Which arrivals nobody has looked at yet.
 *
 * Read from the server, not from this browser. The marker used to live in
 * localStorage, which was right while there was one administrator and wrong the
 * moment there were two: each carried a private idea of what was new, so the
 * same lead was announced to both and chased by both. `seenAt` is one column on
 * the lead, so one of them opening it clears it for the other.
 */
function unseenAfter(leads: Lead[]): string[] {
  return leads.filter((lead) => lead.seenAt === null).map((lead) => lead.id);
}

/**
 * Acknowledges arrivals — all of them, or one.
 *
 * Optimistic locally so the badge clears under the click, then written to the
 * server and reloaded: the other administrator's next poll picks the change up,
 * which is the whole reason this moved off the browser.
 */
function acknowledge(ids: string[]): void {
  if (ids.length === 0) return;

  set({
    ...snapshot,
    unseen: snapshot.unseen.filter((id) => !ids.includes(id)),
  });

  const written =
    ids.length === snapshot.leads.filter((lead) => lead.seenAt === null).length
      ? api.markAllLeadsSeen()
      : Promise.all(ids.map((id) => api.markLeadSeen(id))).then(() => undefined);

  void written
    .then(() => loadLeads())
    .catch((error: unknown) => {
      // Put the badge back rather than leave it cleared against a server that
      // never agreed.
      if (error instanceof api.ApiError && error.status === 401) handle(error);
      else void loadLeads();
    });
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

    const leads = await api.fetchLeads();

    set({
      leads,
      hydrated: true,
      error: null,
      syncedAt: new Date().toISOString(),
      unseen: unseenAfter(leads),
    });

    /*
     * Anything on screen showing one lead in full follows the list.
     *
     * The detail cache is filled once, when a lead is opened. Without this a
     * drag refreshed the board and left the panel beside it rendering the
     * status it was opened with — the same lead disagreeing with itself on one
     * screen. Every path that reloads the list comes through here, so a
     * mutation and a poll both keep the open panel current.
     *
     * Only leads with a live subscriber: the cache keeps every lead ever
     * opened, and refetching all of them on every poll would grow into a
     * request storm as somebody works through the board.
     */
    for (const [id, subscribers] of detailListeners) {
      if (subscribers.size > 0) void loadLead(id);
    }
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
  /*
   * Deliberately keeps going while the tab is hidden.
   *
   * The unread count is written into the tab title precisely so a lead reaches
   * someone whose CRM is behind three other windows — which is the only state
   * this poll used to skip. Stopping there meant the count could not move until
   * you looked, and looking is what it was supposed to save you.
   *
   * Browsers clamp timers in a background tab to about once a minute and may
   * freeze one that has been hidden for several, so the title can lag by that
   * much. `onWake` still fires the moment the tab is focused, so the worst case
   * is the count arriving when you return rather than a minute earlier.
   */
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

/** Focus or a tab coming forward: be current now, not on the next tick. */
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

/**
 * Moves a lead to another stage, on screen first.
 *
 * The only optimistic write in here, and it earns the exception: a card has to
 * land where it was dropped, or the board feels broken. Everything else waits
 * for the server.
 *
 * What makes it safe is the rollback. The objection to optimistic updates is
 * that the screen ends up showing a status the server rejected — on a dossier
 * that decides whether someone gets financed, that is not acceptable. A failed
 * call puts the board back exactly as it was and says why, so the wrong value
 * is never what you are left looking at.
 */
async function moveLead(id: string, status: LeadStatus): Promise<void> {
  const before = snapshot.leads;

  set({
    ...snapshot,
    error: null,
    leads: before.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
  });

  /* Acting on a lead is reading it: once you have moved it, it is no longer
     something that just turned up unnoticed. */
  acknowledge([id]);

  try {
    await api.updateStatus(id, status);
  } catch (error) {
    // Back to exactly what was on screen before the drag.
    set({ ...snapshot, leads: before, error: handle(error) });
    return;
  }

  // Reconcile: the server also stamped `updated_at` and wrote the trail entry.
  await loadLeads();
}

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

      /** Leads that arrived while this session has been open, still unread. */
      unseen: current.leads.filter((lead) => current.unseen.includes(lead.id)),
      /** Marks every arrival read. */
      markAllSeen: () => acknowledge(snapshot.unseen),
      /** Marks one read, for dismissing a single notification. */
      markSeen: (id: string) => acknowledge([id]),

      refresh: loadLeads,
      getLead,

      setStatus: (id: string, status: LeadStatus) => void moveLead(id, status),

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
