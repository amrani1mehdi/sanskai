import { forwardToCrm } from "@/lib/leads/forward";

/** The contact form's way into the CRM. JSON, no uploads. */
export async function POST(request: Request): Promise<Response> {
  return forwardToCrm(request, "contact");
}
