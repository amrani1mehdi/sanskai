import { publishLeadArrival } from "@/lib/crm/live-hub";

/**
 * A lead landed somewhere this server did not see.
 *
 * The dossier forms post their files straight to the API, because a request
 * body larger than 4.5 MB never reaches a route handler on this plan. That
 * skips `forwardToCrm`, and with it the announcement that puts an arrival in
 * front of an administrator who is looking at the board right now.
 *
 * So the browser asks for that announcement here instead. It carries no body
 * and says nothing about the lead: every panel reloads its own list from the
 * API, which is the only thing that knows what actually arrived.
 *
 * Unauthenticated, like the submission endpoints it accompanies. The worst a
 * caller can do is make open panels refetch a list they are entitled to see,
 * which is what they already do on a timer.
 */
export async function POST(): Promise<Response> {
  publishLeadArrival();

  return new Response(null, { status: 204 });
}
