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
import type { DocumentKind, Lead, LeadStatus } from "./types";

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

export async function loadLeads(knownSignature?: string): Promise<void> {
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
     *
     * The live stream supplies one it read before sending the event, which is
     * earlier still and so keeps the same guarantee — one round trip cheaper,
     * on the path where latency is the entire point.
     */
    signature =
      knownSignature ?? (await api.fetchChangeSignature().catch(() => null));

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
/* The server tells us, over an event stream held open by `/api/crm/live`.      */
/*                                                                             */
/* This was a fifteen-second poll, and polling is the wrong shape for a         */
/* notification. Every submission passes through this site's server on its way  */
/* to the API, so that server knows a lead exists the instant it is created —   */
/* waiting to be asked threw that away and made the arrival up to fifteen       */
/* seconds late. Worse in the case that matters most: a browser clamps          */
/* `setInterval` in a hidden tab to about once a minute, and the count in the   */
/* tab title is there precisely for the window nobody is looking at, so the     */
/* notification was slowest exactly when it was the only thing doing any work.  */
/*                                                                             */
/* Still no websockets and still no second daemon: the stream is one HTTP       */
/* response held open by the Next server that is already running.               */
/* -------------------------------------------------------------------------- */

/** Fallback cadence when the stream is not up — a browser that refused it, or
    a connection still reconnecting. */
const POLL_MS = 15_000;

/** Fallback cadence while the stream is up. Long, because it is now only there
    to catch a wire that died without ever reporting an error. */
const BACKUP_POLL_MS = 60_000;

/** Last known server state. `null` means "not established yet". */
let signature: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let stream: EventSource | null = null;
/** Whether the event stream is currently carrying arrivals. */
let streaming = false;

async function checkForChanges(): Promise<void> {
  /*
   * Runs whether or not the tab is in front — an arrival pushed down the stream
   * has to move the title of a window sitting behind three others, which is the
   * whole reason the count is in the title.
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

/** (Re)arms the fallback timer at whatever cadence the stream's state calls for. */
function armFallbackPoll(): void {
  if (typeof window === "undefined") return;

  if (timer !== null) clearInterval(timer);

  timer = setInterval(
    () => void checkForChanges(),
    streaming ? BACKUP_POLL_MS : POLL_MS,
  );
}

/** The fingerprint the server attached, or `null` if it could not read one. */
function signatureFrom(event: Event): string | null {
  try {
    const { signature: value } = JSON.parse((event as MessageEvent<string>).data);

    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Opens the event stream.
 *
 * `EventSource` reconnects by itself — it honours the `retry:` the server sends
 * and keeps trying across a dropped wifi or a restarted server — so there is no
 * reconnection logic here. All this has to do is notice which state it is in,
 * so the fallback poll can speed up while the wire is down and get out of the
 * way once it is back.
 */
function startStream(): void {
  if (stream !== null || typeof window === "undefined") return;
  if (typeof EventSource === "undefined") return;

  stream = new EventSource("/api/crm/live");

  stream.addEventListener("ready", () => {
    streaming = true;
    armFallbackPoll();
    /* The wire may have come up after a gap — a laptop lid, a redeploy. Ask
       once now rather than trusting that nothing happened while it was down. */
    void checkForChanges();
  });

  /* Something moved: a lead was just submitted through the site, or the server's
     own sweep saw the CRM change under it. */
  stream.addEventListener("leads", (event) => {
    const next = signatureFrom(event);

    /* Already holding this exact state — the sweep reporting a change this
       panel caused itself, for instance. Nothing to fetch. */
    if (next !== null && next === signature) return;

    /* Straight to the list. The server sent the fingerprint precisely so this
       does not have to go and ask for one first. */
    void loadLeads(next ?? undefined);
  });

  stream.onerror = () => {
    /* Fires on every disconnect, including the ones it is about to recover from
       on its own. Nothing to tear down — just go back to asking more often
       until `ready` says the wire is carrying again. */
    if (!streaming) return;

    streaming = false;
    armFallbackPoll();
  };
}

function startPolling(): void {
  if (timer !== null || typeof window === "undefined") return;
  if (redirecting || window.location.pathname.startsWith("/admin/login")) return;

  armFallbackPoll();
  startStream();

  // A tab returning to the foreground should be current immediately, not after
  // up to another full interval.
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
}

function stopPolling(): void {
  if (timer === null) return;

  clearInterval(timer);
  timer = null;

  stream?.close();
  stream = null;
  streaming = false;

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

      /*
       * Marks a lead contacted, or puts it back in the queue.
       *
       * Optimistic for the same reason a drag is: this is what takes the amber
       * off a card, and a highlight that lingers for a round trip after you
       * said you had called reads as the click not registering. `loadLeads`
       * follows and replaces the guessed timestamp with the server's.
       */
      /*
       * Corrects the lead's own fields.
       *
       * Not optimistic, unlike the drag and the contacted flag: those are one
       * value each and obviously reversible, whereas this is a form of them at
       * once and the API may reject any one. Waiting means the panel never
       * shows a corrected address the server refused to store.
       */
      editLead: (id: string, edits: api.LeadEdits) =>
        void mutate(() => api.updateLead(id, edits)),

      setContacted: (id: string, contacted: boolean) => {
        const stamp = contacted ? new Date().toISOString() : null;

        set({
          ...snapshot,
          error: null,
          leads: snapshot.leads.map((lead) =>
            lead.id === id ? { ...lead, contactedAt: stamp } : lead,
          ),
        });

        void mutate(() => api.setContacted(id, contacted));
      },

      addNote: (id: string, body: string) => {
        const trimmed = body.trim();
        if (trimmed) void mutate(() => api.createNote(id, trimmed));
      },

      removeNote: (_leadId: string, noteId: string) =>
        void mutate(() => api.deleteNote(noteId)),

      /** Adds a piece to a lead that already exists — a Kbis sent in later. */
      addDocument: (id: string, kind: DocumentKind, file: File) =>
        void mutate(() => api.uploadDocument(id, kind, file)),

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
