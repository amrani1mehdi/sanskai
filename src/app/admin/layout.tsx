import type { Metadata } from "next";
import { AdminShell } from "@/components/crm/admin-shell";

export const metadata: Metadata = {
  title: "CRM — Sansekai Solution",
  description: "Gestion des leads soumis depuis le site.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
