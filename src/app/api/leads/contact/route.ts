import { apiBaseUrl } from "@/lib/crm/session";

/**
 * The /contact form's submission endpoint.
 *
 * The browser posts here, to this origin, and this handler forwards to the CRM.
 * That keeps the API's address off the client — `CRM_API_URL` is read
 * server-side only — and leaves one place to add a credential if the
 * submission endpoints ever take one again.
 *
 * Laravel's 422 is passed through untouched, per-field messages included, so
 * the form can show each one against the field the visitor has to change.
 */
export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";

  /*
   * The body carries invoices, so it arrives as multipart and is forwarded as
   * raw bytes with its own Content-Type — boundary and all. Parsing it into a
   * FormData and rebuilding it would work, but re-encoding a file for no reason
   * is a way to corrupt one.
   */
  const body = await request.arrayBuffer();

  if (body.byteLength === 0) {
    return Response.json({ message: "Requête invalide." }, { status: 400 });
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}/v1/website/leads/contact`, {
      method: "POST",
      headers: {
        // Copied rather than set: multipart carries its boundary in here, and
        // inventing a new one makes every attached file unreadable.
        ...(contentType ? { "Content-Type": contentType } : {}),
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    // The CRM being unreachable is an operational problem, not the visitor's
    // mistake, and saying so stops them retyping a message that was fine.
    return Response.json(
      { message: "Le service est momentanément indisponible. Réessayez plus tard." },
      { status: 503 },
    );
  }

  const payload = await response.json().catch(() => null);

  return Response.json(payload ?? {}, { status: response.status });
}
