import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/crm/admin-shell";
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
  if (!(await isSignedIn())) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}
