import "server-only";

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
  endpoint: "financement" | "developpement" | "contact",
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

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
