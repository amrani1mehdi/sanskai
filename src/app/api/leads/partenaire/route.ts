import { forwardToCrm } from "@/lib/leads/forward";

/**
 * The partner onboarding form's way into the CRM, when the browser is not
 * posting to the API direct. Multipart, with its five document slots.
 */
export async function POST(request: Request): Promise<Response> {
  return forwardToCrm(request, "partenaire");
}
