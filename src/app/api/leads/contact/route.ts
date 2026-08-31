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
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Requête invalide." }, { status: 400 });
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}/v1/website/leads/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
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
