import { redirect } from "next/navigation";

/** Contact messages are a board inside the CRM now, with their own two
    stages — answered and not. */
export default function MessagesPage() {
  redirect("/admin/crm");
}
