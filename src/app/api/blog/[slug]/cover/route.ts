import { apiBaseUrl } from "@/lib/crm/session";

/**
 * An article's cover image.
 *
 * Public — it is the picture at the top of a published article, and the
 * endpoint behind it only serves published ones. It exists so the browser
 * loads covers from this origin instead of from the CRM: the API's address is
 * server-side everywhere else in this application, and an <img src> pointing
 * straight at it would be the one place that leaked it.
 *
 * The upstream 404s a draft's cover, and that 404 is passed through — an
 * unpublished article has no picture as far as the public site is concerned.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/blog/[slug]/cover">,
) {
  const { slug } = await context.params;

  const response = await fetch(
    `${apiBaseUrl()}/v1/website/blog/${encodeURIComponent(slug)}/cover`,
    // The upstream sets its own cache headers; this hop should not add one.
    { cache: "no-store" },
  );

  if (!response.ok) {
    return new Response(null, { status: response.status });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      /* Carried through rather than re-invented, so the browser caches the
         picture for the day the API asked for. */
      "Cache-Control":
        response.headers.get("cache-control") ?? "public, max-age=86400",
    },
  });
}
