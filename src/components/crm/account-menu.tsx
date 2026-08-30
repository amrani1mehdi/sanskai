"use client";

/**
 * The gear beside the admin avatar: profile, change password, sign out.
 *
 * The CRM has one administrator — there are no responsables and nothing is
 * assigned — so this menu manages that single account and nothing else.
 *
 * The menu closes on Escape, on outside click and after any action, so it never
 * strands the rail in an open state on mobile.
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut, Settings, UserRound, X } from "lucide-react";
import { signOut } from "@/lib/crm/api";
import { CURRENT_ADMIN } from "@/lib/crm/config";
import { useCrm } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type Panel = "profil" | "motDePasse" | null;

export function AccountMenu({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { leads } = useCrm();

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground";

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu du compte"
        className={cn(
          "rounded-lg p-2 transition-colors",
          open
            ? "bg-sidebar-active text-sidebar-accent"
            : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
        )}
      >
        <Settings size={16} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-50 mb-2 w-56 rounded-xl border border-sidebar-border bg-sidebar p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPanel("profil");
              setOpen(false);
            }}
            className={item}
          >
            <UserRound size={15} /> Voir le profil
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPanel("motDePasse");
              setOpen(false);
            }}
            className={item}
          >
            <KeyRound size={15} /> Changer le mot de passe
          </button>

          <div className="my-1.5 border-t border-sidebar-border" />

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              onNavigate();
              await signOut();
              router.refresh();
              router.replace("/admin/login");
            }}
            className={cn(item, "hover:bg-danger/20")}
          >
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      ) : null}

      <ProfilePanel
        open={panel === "profil"}
        onClose={() => setPanel(null)}
        leadCount={leads.length}
      />
      <PasswordPanel open={panel === "motDePasse"} onClose={() => setPanel(null)} />
    </div>
  );
}

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-foreground backdrop:bg-foreground/50"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={17} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}

function ProfilePanel({
  open,
  onClose,
  leadCount,
}: {
  open: boolean;
  onClose: () => void;
  leadCount: number;
}) {
  return (
    <Sheet open={open} title="Profil" onClose={onClose}>
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground">
          AS
        </span>
        <div>
          <p className="font-display text-base font-bold text-foreground">
            {CURRENT_ADMIN}
          </p>
          <p className="text-sm text-muted-foreground">Administrateur</p>
        </div>
      </div>

      <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
        <Row label="Rôle" value="Accès complet au back office" />
        <Row label="Leads suivis" value={`${leadCount}`} />
      </dl>

      <p className="mt-5 rounded-lg border border-border bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Le CRM fonctionne avec un compte administrateur unique. Le nom
        d&apos;utilisateur et le mot de passe initial sont fournis avec
        l&apos;installation ; le mot de passe se change ensuite depuis ce menu.
      </p>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30";

const EMPTY = { current: "", next: "", confirm: "" };

type Errors = Partial<Record<keyof typeof EMPTY, string>>;

function PasswordPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  const set = (key: keyof typeof EMPTY) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found: Errors = {};
    if (values.current === "") found.current = "Le mot de passe actuel est requis.";
    if (values.next.length < 8) found.next = "Au moins 8 caractères.";
    if (values.confirm !== values.next) {
      found.confirm = "Les mots de passe ne correspondent pas.";
    }

    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    /* Deliberately not wired to anything here: changing a password is the API's
       job (PATCH /v1/auth/password), and a browser store is no place to hold or
       verify one. The form validates, then says where the change happens. */
    setErrors({
      current:
        "Le changement de mot de passe passe par l'API du CRM, qui n'est pas encore branchée sur ce tableau de bord.",
    });
  };

  const close = () => {
    setValues(EMPTY);
    setErrors({});
    onClose();
  };

  return (
    <Sheet open={open} title="Changer le mot de passe" onClose={close}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          id="current-password"
          label="Mot de passe actuel *"
          value={values.current}
          onChange={set("current")}
          error={errors.current}
        />
        <Field
          id="next-password"
          label="Nouveau mot de passe *"
          value={values.next}
          onChange={set("next")}
          placeholder="8 caractères minimum"
          error={errors.next}
        />
        <Field
          id="confirm-password"
          label="Confirmation *"
          value={values.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
        />

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Mettre à jour
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={id === "current-password" ? "current-password" : "new-password"}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, error && "border-danger focus:border-danger")}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
