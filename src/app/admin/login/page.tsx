import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/crm/login-form";
import { isSignedIn } from "@/lib/crm/session";

export const metadata: Metadata = {
  title: "Connexion — CRM Sansekai",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in: no reason to show the form again.
  if (await isSignedIn()) redirect("/admin");

  return (
    <div className="crm-theme flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/images/sansekai-logo.jpeg"
            alt="Sansekai Solution"
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-lg object-cover"
          />
          <h1 className="mt-4 font-display text-xl font-bold text-foreground">
            Back office
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous pour accéder aux leads.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accès réservé à l&apos;administrateur du CRM.
        </p>
      </div>
    </div>
  );
}
