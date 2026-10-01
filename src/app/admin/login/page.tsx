import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/crm/login-form";
import { SansekaiMark } from "@/components/crm/sansekai-mark";
import { returnTo } from "@/lib/crm/return-to";
import { isSignedIn } from "@/lib/crm/session";

export const metadata: Metadata = {
  title: "Connexion — CRM Sansekai",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  /* Set by the gate when it turned someone away from a particular page. */
  const { next } = await searchParams;
  const destination = returnTo(typeof next === "string" ? next : null);

  // Already signed in: no reason to show the form again.
  if (await isSignedIn()) redirect(destination);

  return (
    <div className="admin-theme flex min-h-screen justify-center bg-background px-6 py-16 sm:items-center sm:py-12">
      {/*
       * Flush left on a narrow column rather than centred.
       *
       * This is a form in a working tool, not a splash: left alignment gives
       * the labels, fields and button one edge to sit on, and the eye tracks
       * straight down it. Centring would put every line on a different start.
       */}
      <main className="w-full max-w-[360px]">
        <div aria-label="Sansekai Solution">
          {/* Big enough that the bars read as the mark. Small, they are three
              even-looking lines — a menu icon. The uneven widths are what tell
              them apart, and they need the size to be seen. */}
          <SansekaiMark className="w-[68px] text-foreground" />

          {/* The lockup's own proportions: the name set wide, the qualifier
              smaller and wider still beneath it. */}
          <p className="mt-6 font-display text-[19px] leading-none font-bold tracking-[0.2em] text-foreground">
            SANSEKAI
          </p>
          <p className="mt-2 font-display text-[10px] leading-none font-semibold tracking-[0.42em] text-muted-foreground">
            SOLUTION
          </p>
        </div>

        <hr className="mt-8 border-t border-border" />

        <h1 className="mt-8 font-mono text-[11px] tracking-[0.18em] text-foreground uppercase">
          Espace admin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour accéder aux leads.
        </p>

        <div className="mt-7">
          <LoginForm next={destination} />
        </div>

        <hr className="mt-10 border-t border-border" />

        {/* Not mono: it is a sentence, and monospacing a line of French with
            accents in it reads as code rather than as a note. The eyebrow is
            the one place the mono face earns its keep. */}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Accès réservé à l&apos;administrateur du CRM.
        </p>
      </main>
    </div>
  );
}
