/**
 * Where a form with attachments posts.
 *
 * The dossier forms send files, and a dossier of four documents is routinely
 * larger than the 4.5 MB a request body may be on this Vercel plan. Vercel
 * rejects it at the edge with a 413 before the route handler runs, so nothing
 * the handler does can rescue it — the bytes have to skip that hop entirely and
 * go to the API direct, which accepts the full 10 MB a slot allows.
 *
 * `NEXT_PUBLIC_CRM_API_URL` is therefore public where `CRM_API_URL` is not.
 * That is a smaller concession than it looks: these submission endpoints take
 * no credential by design, they only ever write, and the API's own rate limit
 * is the guard — the address was hidden for tidiness, not as a defence.
 *
 * Without it set, submissions fall back through the route handler, which is
 * correct everywhere the payload fits and is what local development uses.
 */
const PUBLIC_API = process.env.NEXT_PUBLIC_CRM_API_URL?.replace(/\/+$/, "");

export type LeadEndpoint =
  | "financement"
  | "developpement"
  | "contact"
  | "salon"
  | "partenaire";

/** True when the browser posts to the API itself rather than through this app. */
export function postsDirect(): boolean {
  return Boolean(PUBLIC_API);
}

export function submissionUrl(endpoint: LeadEndpoint): string {
  return PUBLIC_API
    ? `${PUBLIC_API}/v1/website/leads/${endpoint}`
    : `/api/leads/${endpoint}`;
}

/**
 * Tells the open back-office panels that a lead just landed.
 *
 * `forwardToCrm` does this on the server for anything it proxies. A direct
 * submission never touches this server, so the panels would learn about it on
 * their next poll — up to a minute of a board that looks idle while a dossier
 * is sitting in it. This is the same announcement, asked for from the browser.
 *
 * Deliberately unawaited and never thrown from: the visitor's confirmation does
 * not depend on whether an administrator happened to be watching.
 */
export function announceArrival(): void {
  if (!postsDirect()) return;

  void fetch("/api/leads/announce", { method: "POST" }).catch(() => {});
}
