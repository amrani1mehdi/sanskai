import { forwardToCrm } from "@/lib/leads/forward";

/**
 * The trade-show client sheet's way into the CRM, when the browser is not
 * posting to the API direct. JSON, no uploads.
 */
export async function POST(request: Request): Promise<Response> {
  return forwardToCrm(request, "salon");
}
