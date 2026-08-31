import "server-only";

import { apiBaseUrl } from "@/lib/crm/session";

/**
 * Forwards a website submission to the CRM.
 *
 * The `/v1/website/*` endpoints are guarded by a shared key rather than a
 * signed-in user, so the key is held on this side: one shipped to the browser is
 * one anybody can lift out of the network tab and use to write leads directly.
 *
 * The body is forwarded untouched. Multipart carries its own boundary, so the
 * content type is copied rather than set, and uploads stream through without
 * being re-encoded. Laravel's response is passed back with its status intact so
 * a form can show the API's own 422 against the field that failed.
 */
export async function forwardToCrm(
  request: Request,
  endpoint: "financement" | "developpement",
): Promise<Response> {
  const headers: HeadersInit = { Accept: "application/json" };

  const key = process.env.CRM_API_KEY;

  // Left unset in local development, where the API accepts unsigned calls; in
  // production its absence is what the API's own 401 will report.
  if (key) headers["X-Api-Key"] = key;

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
    // enquirer did wrong. 503 tells the form to say so and keep their answers.
    return new Response(null, { status: 503 });
  }

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
