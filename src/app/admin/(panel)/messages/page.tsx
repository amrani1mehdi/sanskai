import { redirect } from "next/navigation";

/** Folded into the Leads board — the pipeline and the contact messages are two
    views of it now, not separate pages. */
export default function RetiredPage() {
  redirect("/admin/leads");
}
