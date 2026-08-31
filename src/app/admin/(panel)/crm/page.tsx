import { redirect } from "next/navigation";

/** Briefly lived here before the section was named Leads. */
export default function CrmPage() {
  redirect("/admin/leads");
}
