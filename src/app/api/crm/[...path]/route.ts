import { apiBaseUrl, getToken } from "@/lib/crm/session";

/**
 * One proxy for every authenticated CRM call.
 *
 * The browser talks to this route; this route talks to Laravel with the bearer
 * token from the httpOnly cookie. That keeps the token server-side, and means
 * the front end never needs to know the API's address or hold a credential.
 *
 * Responses are passed through unchanged — including the status code, so the
 * caller sees Laravel's own 422 with its per-field messages rather than a
 * flattened error.
 */
async function proxy(request: Request, path: string[]): Promise<Response> {
  const token = await getToken();

  if (!token) {
    return Response.json({ message: "Session expirée." }, { status: 401 });
  }

  const query = new URL(request.url).search;
  const target = `${apiBaseUrl()}/v1/${path.join("/")}${query}`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  // Forward the body untouched for writes; multipart keeps its own boundary,
  // so the content type is copied rather than set.
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  // A download streams straight back with its own headers.
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition":
          response.headers.get("content-disposition") ?? "attachment",
      },
    });
  }

  return new Response(response.status === 204 ? null : await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request, context: RouteContext<"/api/crm/[...path]">) {
  const { path } = await context.params;

  return proxy(request, path);
}

export async function POST(request: Request, context: RouteContext<"/api/crm/[...path]">) {
  const { path } = await context.params;

  return proxy(request, path);
}

export async function PATCH(request: Request, context: RouteContext<"/api/crm/[...path]">) {
  const { path } = await context.params;

  return proxy(request, path);
}

export async function DELETE(request: Request, context: RouteContext<"/api/crm/[...path]">) {
  const { path } = await context.params;

  return proxy(request, path);
}
