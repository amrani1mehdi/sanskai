"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The gate in front of the back office.
 *
 * Credentials are posted to a route handler on this origin, which exchanges
 * them with the CRM for a token and keeps it in an httpOnly cookie — the
 * password never reaches the API from the browser directly, and the token never
 * reaches the browser at all.
 *
 * `next` is where to go once signed in — already checked by the page to be an
 * address inside the back office.
 */
export function LoginForm({ next = "/admin" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/crm/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.message ?? "Identifiants invalides.");
        setPending(false);
        return;
      }

      // refresh() first, so the guard re-evaluates with the cookie just set.
      router.refresh();
      router.replace(next);
    } catch {
      setError("Le CRM est injoignable. Vérifiez que l'API est démarrée.");
      setPending(false);
    }
  };

  /*
   * Focus is carried by the border going to full ink plus a ring of the same
   * colour — a square 2px edge, since there is no radius for a glow to follow.
   * A tinted halo would be the only soft shape on the screen.
   */
  const field =
    "w-full border border-input bg-card px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground";

  const label = "mb-2 block text-xs font-medium text-foreground";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="email" className={label}>
          Adresse email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@sansekaisolution.com"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="password" className={label}>
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(field, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            // The state is announced rather than implied by the icon alone.
            aria-label={
              visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            aria-pressed={visible}
            className="absolute top-px right-px bottom-px px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-3.5 py-3 text-[13px] text-danger"
        >
          <TriangleAlert size={15} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground transition-opacity",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          pending ? "cursor-not-allowed opacity-55" : "hover:opacity-90",
        )}
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
