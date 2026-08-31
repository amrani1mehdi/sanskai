import { forwardToCrm } from "@/lib/leads/forward";

/** The financing form's way into the CRM. Multipart, with up to four upload slots. */
export async function POST(request: Request): Promise<Response> {
  return forwardToCrm(request, "financement");
}
