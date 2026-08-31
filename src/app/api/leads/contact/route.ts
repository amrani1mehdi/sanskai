import { forwardToCrm } from "@/lib/leads/forward";

/** The contact form's way into the CRM. Multipart, since it carries invoices. */
export async function POST(request: Request): Promise<Response> {
  return forwardToCrm(request, "contact");
}
