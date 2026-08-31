import { apiBaseUrl, clearToken, getToken, setToken } from "@/lib/crm/session";

/**
 * Sign in and out.
 *
 * The password is posted here and exchanged with Laravel for a token that is
 * stored in an httpOnly cookie — neither the password nor the token is ever
 * held in client JavaScript.
 */
export async function POST(request: Request): Promise<Response> {
  let body: { login?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Requête invalide." }, { status: 400 });
  }

  const login = body.login?.trim() ?? "";
  const password = body.password ?? "";

  if (login === "" || password === "") {
    return Response.json(
      { message: "Identifiant et mot de passe requis." },
      { status: 422 },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ login, password, deviceName: "back-office" }),
      cache: "no-store",
    });
  } catch {
    // The API being down is an operational problem, not a bad password, and
    // saying so saves someone retyping a correct one.
    return Response.json(
      { message: "Le CRM est injoignable. Vérifiez que l'API est démarrée." },
      { status: 503 },
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return Response.json(
      {
        message:
          payload?.errors?.login?.[0] ??
          payload?.message ??
          "Identifiants invalides.",
      },
      { status: response.status === 429 ? 429 : 401 },
    );
  }

  await setToken(payload.data.token);

  return Response.json({ data: { user: payload.data.user } });
}

/** Revokes the token at the API, then drops the cookie either way. */
export async function DELETE(): Promise<Response> {
  const token = await getToken();

  if (token) {
    await fetch(`${apiBaseUrl()}/v1/auth/token`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    }).catch(() => {
      // The local session ends regardless; a stranded token expires on its own.
    });
  }

  await clearToken();

  return new Response(null, { status: 204 });
}
