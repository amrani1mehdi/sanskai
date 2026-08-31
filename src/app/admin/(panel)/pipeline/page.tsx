import { redirect } from "next/navigation";

/** The board moved into the CRM workspace, which is the same thing plus the
    filters and the selection panel. */
export default function PipelinePage() {
  redirect("/admin/crm");
}
