import { redirect } from "next/navigation";

/** The leads table folded into the CRM board — one place to manage leads
    rather than two views of the same list. Individual leads still have their
    own page at /admin/leads/[id]. */
export default function LeadsPage() {
  redirect("/admin/crm");
}
