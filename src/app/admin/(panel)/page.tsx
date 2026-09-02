import { redirect } from "next/navigation";

/**
 * There is one screen in the back office, and this is not it.
 *
 * /admin used to be Aperçu — counts, a status breakdown and a monthly chart.
 * It answered questions nobody was asking twice a day, and every one of them
 * was a click from the board anyway, so the section was removed rather than
 * redesigned. The URL stays: it is what the login redirects to and what people
 * have bookmarked.
 */
export default function AdminPage() {
  redirect("/admin/leads");
}
