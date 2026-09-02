import "server-only";

/**
 * The back office's notice board, inside this process.
 *
 * Every public submission reaches the CRM through `forwardToCrm` on this
 * server, which means this process learns that a lead exists at the moment it
 * is created — before the visitor has even seen their confirmation. Announcing
 * it here lets the open panels hear about it on the same tick instead of
 * finding out on their next poll, which is the difference between the tab
 * reading "(1)" now and reading it up to a minute from now.
 *
 * A `Set` of callbacks rather than a queue or a broker: the only subscribers
 * are the SSE streams held open by administrators who are signed in right now,
 * there are rarely more than two of them, and an announcement nobody is around
 * to hear is one nobody needed. Anything that has to survive a restart is
 * already in the database, and `/v1/changes` is how a panel catches up.
 *
 * Held on `globalThis` because dev-mode hot reloading re-evaluates modules:
 * without it an edit would leave the route handler publishing into one `Set`
 * while the open streams were still listening to another, and arrivals would
 * silently stop being delivered until the next full restart.
 */

type Listener = () => void;

const store = globalThis as typeof globalThis & {
  __sansekaiLeadListeners?: Set<Listener>;
};

const listeners: Set<Listener> = (store.__sansekaiLeadListeners ??= new Set());

/** A lead just landed. Tells every panel currently listening. */
export function publishLeadArrival(): void {
  for (const listener of listeners) {
    /* One stream that has already gone away must not stop the others being
       told — a closed controller throws on enqueue, and that is the stream's
       problem to clean up, not this loop's. */
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

/** Listens until the returned function is called. */
export function onLeadArrival(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
