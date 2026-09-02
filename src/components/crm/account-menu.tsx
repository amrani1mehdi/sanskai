"use client";

/**
 * The gear beside the admin avatar: profile, change password, sign out.
 *
 * Manages the signed-in account, and who else has one. The CRM started with
 * a single shared login; each administrator has their own now, which is what
 * makes the name stamped on a note or a status change mean anything.
 *
 * The menu closes on Escape, on outside click and after any action.
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  KeyRound,
  LogOut,
  Settings,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import {
  ApiError,
  changePassword,
  createAdmin,
  fetchAdmins,
  signOut,
  type Admin,
} from "@/lib/crm/api";
import { CURRENT_ADMIN } from "@/lib/crm/config";
import { useCrm } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type Panel = "profil" | "motDePasse" | "admins" | null;

export function AccountMenu() {
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
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu du compte"
        /* Sits on the ink bar, so its idle and hover inks are the bar's, not
           the canvas's. */
        className={cn(
          "p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background",
          open
            ? "bg-background text-foreground"
            : "text-background/65 hover:bg-background/10 hover:text-background",
        )}
      >
        <Settings size={16} />
      </button>

      {open ? (
        /* Downwards: the bar it hangs from is at the top of the screen now, and
           a menu opening up from it would leave the page. */
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-56 border border-border bg-card p-1 shadow-[0_8px_24px_-12px_rgba(24,24,27,0.35)]"
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

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPanel("admins");
              setOpen(false);
            }}
            className={item}
          >
            <UserRoundPlus size={15} /> Administrateurs
          </button>

          <div className="my-1.5 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
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
      <AdminsPanel open={panel === "admins"} onClose={() => setPanel(null)} />
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
        <span className="flex h-14 w-14 items-center justify-center bg-accent font-display text-lg font-bold text-accent-foreground">
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

      <p className="mt-5 border border-border bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Chaque administrateur a son propre compte, identifié par son adresse
        email — les notes, les changements de statut et les appels sont
        enregistrés à son nom. Les comptes se gèrent depuis
        « Administrateurs » ; le mot de passe se change depuis ce menu.
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

/** The same field as the sign-in form, so the two never drift apart. */
const inputClass =
  "w-full border border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground";

const EMPTY = { current: "", next: "", confirm: "" };

type Errors = Partial<Record<keyof typeof EMPTY, string>>;

function PasswordPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    /* Checked here so the obvious mistakes are caught without a round trip.
       The API applies the same rules again — this is a courtesy, not the gate. */
    const found: Errors = {};
    if (values.current === "") found.current = "Le mot de passe actuel est requis.";
    if (values.next.length < 8) found.next = "Au moins 8 caractères.";
    if (values.confirm !== values.next) {
      found.confirm = "Les mots de passe ne correspondent pas.";
    }

    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);

    try {
      await changePassword(values.current, values.next, values.confirm);
      setValues(EMPTY);
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError) {
        // Laravel reports per field; show each message where it applies and
        // fall back to the summary when it names a field we do not render.
        setErrors({
          current: error.errors.currentPassword?.[0],
          next: error.errors.password?.[0],
          confirm:
            error.errors.password_confirmation?.[0] ??
            (error.errors.currentPassword || error.errors.password
              ? undefined
              : error.message),
        });
      } else {
        setErrors({ current: "Le CRM est injoignable." });
      }
    } finally {
      setPending(false);
    }
  };

  const close = () => {
    setValues(EMPTY);
    setErrors({});
    setDone(false);
    onClose();
  };

  return (
    <Sheet open={open} title="Changer le mot de passe" onClose={close}>
      {done ? (
        <div className="space-y-5">
          <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Mot de passe mis à jour. Les autres sessions ouvertes ont été
            déconnectées ; celle-ci reste active.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : (
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
            disabled={pending}
            className={cn(
              "rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity",
              pending ? "cursor-not-allowed opacity-60" : "hover:opacity-90",
            )}
          >
            {pending ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </div>
      </form>
      )}
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

const NEW_ADMIN = { name: "", email: "", password: "", confirm: "" };

type AdminErrors = Partial<Record<keyof typeof NEW_ADMIN, string>>;

/**
 * Adding somebody to the back office.
 *
 * The CRM ran on one shared account, which meant a second person got in by
 * being handed the first one's password — and the trail on every lead then said
 * "Sansekai Admin" whoever had actually done the work. Notes, status moves and
 * calls are all stamped with who did them, and that is only worth anything if
 * people have their own accounts.
 *
 * The list is shown above the form on purpose: without it this is a hole you
 * drop accounts into, and you would find out you had added the same colleague
 * twice from a uniqueness error.
 */
function AdminsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [values, setValues] = useState(NEW_ADMIN);
  const [errors, setErrors] = useState<AdminErrors>({});
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  /* Loaded when the sheet opens rather than with the panel: nobody visits this
     often, and the board should not pay for a request it will not render. */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void fetchAdmins()
      .then((list) => {
        if (!cancelled) setAdmins(list);
      })
      .catch(() => {
        if (!cancelled) setAdmins([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const set = (key: keyof typeof NEW_ADMIN) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    /* The obvious mistakes, caught without a round trip. The API applies the
       same rules again — this is a courtesy, not the gate. */
    const found: AdminErrors = {};
    if (values.name.trim() === "") found.name = "Le nom est requis.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) found.email = "Adresse email invalide.";
    if (values.password.length < 8) found.password = "Au moins 8 caractères.";
    if (values.confirm !== values.password) {
      found.confirm = "Les mots de passe ne correspondent pas.";
    }

    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);

    try {
      const created = await createAdmin(
        values.name.trim(),
        values.email.trim(),
        values.password,
        values.confirm,
      );

      setAdmins((current) => [...(current ?? []), created]);
      setValues(NEW_ADMIN);
      setAdded(created.name);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          name: error.errors.name?.[0],
          email: error.errors.email?.[0],
          password: error.errors.password?.[0],
          confirm: error.errors.password_confirmation?.[0],
        });
        if (Object.keys(error.errors).length === 0) {
          setErrors({ email: error.message });
        }
      } else {
        setErrors({ email: "Le CRM est injoignable." });
      }
    } finally {
      setPending(false);
    }
  };

  const close = () => {
    setValues(NEW_ADMIN);
    setErrors({});
    setAdded(null);
    onClose();
  };

  return (
    <Sheet open={open} title="Administrateurs" onClose={close}>
      <section>
        <p className="mb-2 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Comptes existants
        </p>

        {admins === null ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-secondary text-[11px] font-bold text-foreground">
                  {admin.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {admin.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {admin.email}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submit} className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Ajouter un administrateur
        </p>

        <div className="space-y-3">
          <AdminField
            id="admin-name"
            label="Nom"
            value={values.name}
            onChange={set("name")}
            error={errors.name}
          />
          <AdminField
            id="admin-email"
            label="Adresse email"
            type="email"
            autoComplete="off"
            value={values.email}
            onChange={set("email")}
            error={errors.email}
          />
          <AdminField
            id="admin-password"
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
            error={errors.password}
          />
          <AdminField
            id="admin-confirm"
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={set("confirm")}
            error={errors.confirm}
          />
        </div>

        {added ? (
          <p className="mt-4 border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Compte créé pour {added}. Communiquez-lui son mot de passe : il
            n&apos;est envoyé nulle part, et il pourra le changer depuis son
            propre menu.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Fermer
          </button>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity",
              pending ? "cursor-not-allowed opacity-55" : "hover:opacity-90",
            )}
          >
            {pending ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function AdminField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
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
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, error && "border-danger focus:border-danger")}
      />
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
