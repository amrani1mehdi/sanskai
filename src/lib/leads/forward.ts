import "server-only";

import { publishLeadArrival } from "@/lib/crm/live-hub";
import { apiBaseUrl } from "@/lib/crm/session";

/**
 * Forwards a website submission to the CRM.
 *
 * The browser posts to a route handler on this origin, and that handler calls
 * the API. It keeps the API's address off the client — `CRM_API_URL` is read
 * server-side only — and leaves one place to attach a credential if these
 * endpoints ever take one again. They are open by design today: they only ever
 * write, so an abusive caller can create junk but cannot read anyone's file,
 * and the API's own rate limit is the guard.
 *
 * The body is forwarded untouched. Multipart carries its own boundary, so the
 * content type is copied rather than set, and uploads stream through without
 * being re-encoded. Laravel's response is passed back with its status intact so
 * a form can show the API's own 422 against the field that failed.
 */
export async function forwardToCrm(
  request: Request,
  endpoint: "financement" | "developpement" | "contact" | "salon",
): Promise<Response> {
  const headers: HeadersInit = { Accept: "application/json" };

  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}/v1/website/leads/${endpoint}`, {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    // The API being unreachable is an operational problem, not something the
    // visitor did wrong. 503 tells the form to say so and keep their answers.
    return new Response(null, { status: 503 });
  }

  /*
   * Tell the open back-office panels before answering the visitor.
   *
   * This is the moment the site knows a lead exists, and it is the only place
   * that knows it early — announcing here is what puts the arrival in the panel,
   * and the count in the browser tab, while the visitor is still reading their
   * own confirmation rather than up to a poll later.
   *
   * `publishLeadArrival` only walks a set of callbacks held by this process, so
   * it costs nothing and cannot fail the submission.
   *
   * Only on success: a 422 means the form came back with errors and no lead was
   * written, and announcing that would send every panel off to reload a list
   * that has not changed.
   */
  if (response.ok) publishLeadArrival();

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
