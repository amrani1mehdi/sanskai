"use client";

/**
 * The gear beside the admin avatar: profile, add a responsable, sign out.
 *
 * The menu closes on Escape, on outside click and after any action, so it never
 * strands the rail in an open state on mobile.
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, UserPlus, UserRound, X } from "lucide-react";
import { CURRENT_ADMIN } from "@/lib/crm/config";
import { useCrm } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type Panel = "profil" | "responsable" | null;

export function AccountMenu({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { owners, leads } = useCrm();

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
              setPanel("responsable");
              setOpen(false);
            }}
            className={item}
          >
            <UserPlus size={15} /> Ajouter un responsable
          </button>

          <div className="my-1.5 border-t border-sidebar-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
              router.push("/");
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
        ownerCount={owners.length}
        leadCount={leads.length}
      />
      <AddOwnerPanel open={panel === "responsable"} onClose={() => setPanel(null)} />
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
  ownerCount,
  leadCount,
}: {
  open: boolean;
  onClose: () => void;
  ownerCount: number;
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
        <Row label="Responsables" value={`${ownerCount}`} />
      </dl>

      {/* Honest about what this screen is until authentication exists. */}
      <p className="mt-5 rounded-lg border border-border bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
        Le CRM n&apos;a pas encore d&apos;authentification : ce profil est celui de
        l&apos;administrateur unique. Les identifiants et la gestion des accès
        viendront avec la connexion.
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

const EMPTY_FORM = {
  name: "",
  role: "",
  username: "",
  password: "",
  confirm: "",
};

type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>;

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function AddOwnerPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createOwner, owners, usernameTaken } = useCrm();
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [added, setAdded] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setAdded(null);
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};

    if (values.name.trim() === "") next.name = "Le nom est obligatoire.";

    const username = values.username.trim();
    if (username === "") {
      next.username = "Le nom d'utilisateur est obligatoire.";
    } else if (username.length < 3) {
      next.username = "Au moins 3 caractères.";
    } else if (!USERNAME_PATTERN.test(username)) {
      next.username = "Lettres, chiffres, point, tiret et underscore uniquement.";
    } else if (usernameTaken(username)) {
      next.username = "Ce nom d'utilisateur est déjà pris.";
    }

    if (values.password.length < 8) {
      next.password = "Au moins 8 caractères.";
    }
    if (values.confirm !== values.password) {
      next.confirm = "Les mots de passe ne correspondent pas.";
    }

    return next;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const owner = createOwner(values.name, values.role, values.username);
    if (!owner) return;

    setAdded(owner.name);
    setValues(EMPTY_FORM);
  };

  const close = () => {
    setValues(EMPTY_FORM);
    setErrors({});
    setAdded(null);
    onClose();
  };

  return (
    <Sheet open={open} title="Ajouter un responsable" onClose={close}>
      <p className="mb-5 text-sm text-muted-foreground">
        Le responsable devient assignable sur chaque lead, et apparaît dans les
        filtres et la charge par responsable.
      </p>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          id="owner-name"
          label="Nom complet *"
          value={values.name}
          onChange={set("name")}
          placeholder="Camille Rousseau"
          error={errors.name}
        />

        <Field
          id="owner-role"
          label="Fonction"
          value={values.role}
          onChange={set("role")}
          placeholder="Chargée de financement"
        />

        <Field
          id="owner-username"
          label="Nom d'utilisateur *"
          value={values.username}
          onChange={set("username")}
          placeholder="c.rousseau"
          autoComplete="username"
          error={errors.username}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="owner-password"
            label="Mot de passe *"
            type="password"
            value={values.password}
            onChange={set("password")}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            error={errors.password}
          />
          <Field
            id="owner-confirm"
            label="Confirmation *"
            type="password"
            value={values.confirm}
            onChange={set("confirm")}
            autoComplete="new-password"
            error={errors.confirm}
          />
        </div>

        {/* Being straight about where the secret goes — nowhere, for now. */}
        <p className="rounded-lg border border-border bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Le mot de passe est vérifié puis <strong>non conservé</strong> : le CRM
          n&apos;a pas encore de back end, et un navigateur n&apos;est pas un endroit
          où stocker un identifiant. Le compte est créé avec la mention « accès à
          configurer », et le mot de passe sera réellement défini à la mise en place
          de l&apos;authentification.
        </p>

        {added ? (
          <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
            {added} a été ajouté à l&apos;équipe.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Fermer
          </button>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Ajouter
          </button>
        </div>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Équipe ({owners.length})
        </h3>
        <ul className="space-y-2">
          {owners.map((owner) => (
            <li key={owner.id} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                {owner.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {owner.name}
                  {owner.username ? (
                    <span className="text-muted-foreground"> · {owner.username}</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{owner.role}</p>
              </div>
              {owner.accessPending ? (
                <span className="shrink-0 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  Accès à configurer
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
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
