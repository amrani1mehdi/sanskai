import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/crm/admin-shell";
import { ADMIN_HOME, ADMIN_URL_HEADER, returnTo } from "@/lib/crm/return-to";
import { isSignedIn } from "@/lib/crm/session";

export const metadata: Metadata = {
  title: "Espace admin — Sansekai Solution",
  description: "Gestion des leads soumis depuis le site.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  /*
   * The gate. Checked on the server for every page under /admin, so an
   * unauthenticated request never renders the shell — a client-side check would
   * ship the whole back office to the browser and then hide it.
   */
  if (!(await isSignedIn())) {
    /* Where they were going goes with them, so signing in lands there — a
       lead opened from its notification email, not the bare board. */
    const next = returnTo((await headers()).get(ADMIN_URL_HEADER));

    redirect(
      next === ADMIN_HOME
        ? "/admin/login"
        : `/admin/login?next=${encodeURIComponent(next)}`,
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
