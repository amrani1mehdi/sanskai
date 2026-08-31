"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LogIn, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The gate in front of the back office.
 *
 * Credentials are posted to a route handler on this origin, which exchanges
 * them with the CRM for a token and keeps it in an httpOnly cookie — the
 * password never reaches the API from the browser directly, and the token never
 * reaches the browser at all.
 */
export function LoginForm() {
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
      router.replace("/admin");
    } catch {
      setError("Le CRM est injoignable. Vérifiez que l'API est démarrée.");
      setPending(false);
    }
  };

  const field =
    "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-foreground">
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
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-medium text-foreground"
        >
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
            className={cn(field, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            // The state is announced rather than implied by the icon alone.
            aria-label={
              visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            aria-pressed={visible}
            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity",
          pending ? "cursor-not-allowed opacity-60" : "hover:opacity-90",
        )}
      >
        <LogIn size={16} />
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
