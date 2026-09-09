"use client";

/**
 * Adding a lead by hand.
 *
 * The company takes enquiries by phone and at meetings, and until now those had
 * to be typed into the public website to get into the CRM at all. This is the
 * same three forms, from the inside.
 *
 * Built field-for-field off the site's own components — `financing-form.tsx`,
 * `financing-form.tsx` and the enquiry block in `business-services.tsx` — in
 * their order, including the upload slots and the two yes/no questions the
 * financing form asks. It posts to the same endpoints they do, so a lead
 * entered here is validated by exactly the rules that validate a lead entered
 * by an applicant: one definition of a valid dossier, not two that drift.
 *
 * The column the button was pressed in supplies the starting status, applied as
 * a second call — the public endpoints all create at "Nouveau", which is right
 * for the website and should stay that way.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { PRESTATIONS, SERVICES, CONTACT } from "@/lib/crm/config";
import { isCompanyAgeEligible, isRevenueEligible } from "@/lib/eligibility";
import { useCrm } from "@/lib/crm/store";
import type { LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/** Which of the site's forms is being filled in. */
type Shape = "financement" | "developpement" | "contact";
type YesNo = "yes" | "no";

const SHAPES: { id: Shape; label: string; hint: string }[] = [
  {
    id: "financement",
    label: SERVICES[0].shortLabel,
    hint: "Le formulaire complet de la page Financement, pièces comprises.",
  },
  {
    id: "developpement",
    label: SERVICES[1].shortLabel,
    hint: "L'encart Développement Digital — une prestation par demande.",
  },
  {
    id: CONTACT.id as Shape,
    label: CONTACT.shortLabel,
    hint: "Le formulaire de contact, avec ses factures.",
  },
];

/*
 * The upload slots, exactly as the site names them.
 *
 * `field` is what the API expects; the two that take several files send it with
 * brackets, which is what the site does and what Laravel reads back as an array.
 */
const FINANCING_UPLOADS = {
  pieceIdentite: { field: "pieceIdentite", multiple: false },
  kbis: { field: "kbis", multiple: false },
  relevesBancaires: { field: "relevesBancaires", multiple: false },
  documentsComptables: { field: "documentsComptables[]", multiple: true },
} as const;

type UploadSlot = keyof typeof FINANCING_UPLOADS | "factures";

const NO_FILES: Record<UploadSlot, File[]> = {
  pieceIdentite: [],
  kbis: [],
  relevesBancaires: [],
  documentsComptables: [],
  factures: [],
};

/* The upload component takes its wording as props, because on the site it is
   translated. The back office is French-only, so these are fixed here. */
const UPLOAD_TEXT = {
  optionalLabel: "facultatif",
  hint: "PDF, image ou document — 10 Mo maximum.",
  removeLabel: "Retirer le fichier",
  tooLargeMessage: "Ce fichier dépasse la taille maximale.",
  wrongTypeMessage: "Ce type de fichier n'est pas accepté.",
  addMoreLabel: "Ajouter un autre fichier",
};

const field =
  "w-full border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground";
const label = "mb-1.5 block text-xs font-medium text-foreground";

const EMPTY = {
  nom: "",
  prenom: "",
  nomComplet: "",
  email: "",
  telephone: "",
  entreprise: "",
  siren: "",
  dateCreation: "",
  adresse: "",
  codePostal: "",
  ville: "",
  siteWeb: "no" as YesNo,
  siteWebUrl: "",
  reseaux: "no" as YesNo,
  reseauxOu: "",
  chiffreAffaire: "",
  montant: "",
  codeCommercial: "",
  prestation: PRESTATIONS[0].id as string,
  message: "",
};

export function LeadForm({
  open,
  status,
  statusLabel,
  onClose,
}: {
  open: boolean;
  /** The column the button was pressed in — where the lead should land. */
  status: LeadStatus;
  statusLabel: string;
  onClose: () => void;
}) {
  const { refresh } = useCrm();
  const dialog = useRef<HTMLDialogElement>(null);

  const [shape, setShape] = useState<Shape>("financement");
  const [values, setValues] = useState(EMPTY);
  const [files, setFiles] = useState<Record<UploadSlot, File[]>>(NO_FILES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const setFile = (slot: UploadSlot) => (next: File[]) =>
    setFiles((current) => ({ ...current, [slot]: next }));

  /* Answering "no" clears the follow-up, so a detail typed before the answer
     changed is not submitted alongside one contradicting it. */
  const answer =
    (key: "siteWeb" | "reseaux", detail: "siteWebUrl" | "reseauxOu") =>
    (value: YesNo) =>
      setValues((current) => ({
        ...current,
        [key]: value,
        ...(value === "no" ? { [detail]: "" } : {}),
      }));

  /*
   * The same two eligibility gates the site shows, for the same reason: the API
   * re-runs them and refuses, so a dossier that cannot be accepted should say
   * so while it is being typed rather than after it is submitted.
   */
  const ageIneligible =
    shape === "financement" &&
    values.dateCreation !== "" &&
    !isCompanyAgeEligible(values.dateCreation);

  const revenueIneligible =
    shape === "financement" &&
    values.chiffreAffaire.trim() !== "" &&
    /\d/.test(values.chiffreAffaire) &&
    !isRevenueEligible(values.chiffreAffaire);

  const ineligible = ageIneligible || revenueIneligible;

  /* A rejected file inside an array slot is reported against an indexed key —
     `documentsComptables.0` — so the slot's own name never matches it. */
  const uploadError = (name: string): string | undefined =>
    errors[name] ??
    Object.entries(errors).find(([key]) => key.startsWith(`${name}.`))?.[1];

  const shown = useMemo(() => SHAPES.find((one) => one.id === shape)!, [shape]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ineligible || pending) return;

    setPending(true);
    setErrors({});
    setFailure(null);

    const body = new FormData();
    const put = (key: string, value: string) => {
      if (value.trim() !== "") body.set(key, value.trim());
    };

    if (shape === "financement") {
      body.set("nom", values.nom);
      body.set("prenom", values.prenom);
      body.set("telephone", values.telephone);
      body.set("email", values.email);
      body.set("entreprise", values.entreprise);
      body.set("dateCreation", values.dateCreation);
      body.set("codePostal", values.codePostal);
      body.set("ville", values.ville);
      body.set("chiffreAffaire", values.chiffreAffaire);
      body.set("montant", values.montant);

      // The API reads these as booleans; multipart carries everything as text.
      body.set("siteWeb", values.siteWeb === "yes" ? "1" : "0");
      body.set("reseaux", values.reseaux === "yes" ? "1" : "0");
      if (values.siteWeb === "yes") put("siteWebUrl", values.siteWebUrl);
      if (values.reseaux === "yes") put("reseauxOu", values.reseauxOu);

      put("adresse", values.adresse);
      put("codeCommercial", values.codeCommercial);
      put("message", values.message);

      for (const slot of Object.keys(FINANCING_UPLOADS) as (keyof typeof FINANCING_UPLOADS)[]) {
        const { field: name, multiple } = FINANCING_UPLOADS[slot];

        if (multiple) {
          for (const file of files[slot]) body.append(name, file);
        } else if (files[slot][0]) {
          body.set(name, files[slot][0]);
        }
      }
    } else if (shape === "developpement") {
      // The only one of the three the site sends as JSON, and the only one
      // with no uploads.
      body.set("service", values.prestation);
      body.set("nom", values.nom);
      body.set("prenom", values.prenom);
      body.set("email", values.email);
      body.set("telephone", values.telephone);
      body.set("entreprise", values.entreprise);
      put("message", values.message);
    } else {
      body.set("entreprise", values.entreprise);
      body.set("nomComplet", values.nomComplet);
      body.set("email", values.email);
      put("siren", values.siren);
      put("telephone", values.telephone);
      put("message", values.message);
      for (const invoice of files.factures) body.append("factures[]", invoice);
    }

    try {
      const response = await fetch(`/api/leads/${shape}`, {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        /* Laravel answers a rejected form with a field-by-field map. Showing it
           against the inputs is the difference between "corrigez le formulaire"
           and knowing which line is wrong. */
        const fields = payload?.errors as
          | Record<string, string[] | string>
          | undefined;

        if (fields) {
          setErrors(
            Object.fromEntries(
              Object.entries(fields).map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            ),
          );
        }

        setFailure(
          response.status === 429
            ? "Trop de demandes d'affilée. Réessayez dans un instant."
            : response.status === 422
              ? "Corrigez les champs signalés ci-dessous."
              : (payload?.message ?? "Le lead n'a pas pu être enregistré."),
        );
        setPending(false);
        return;
      }

      /*
       * Skipped when the stage cannot apply: a contact message has only "Non
       * répondu" and "Répondu", so one added from the "Qualifié" column is
       * being asked for a stage that does not exist for it. The API refuses it
       * correctly; there is no reason to make the request and let it. A failure
       * is not worth blocking on either — the lead exists and can be dragged.
       */
      const id = payload?.data?.id;
      const reachable =
        shape === "contact"
          ? status === "nouveau" || status === "repondu"
          : status !== "repondu";

      if (id && reachable && status !== "nouveau") {
        await fetch(`/api/crm/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }).catch(() => undefined);
      }

      await refresh();
      onClose();
    } catch {
      setFailure("Le CRM est injoignable. Vérifiez que l'API est démarrée.");
      setPending(false);
    }
  };

  const upload = (slot: UploadSlot, text: string, name: string, multiple = false) => (
    <FileUpload
      label={text}
      files={files[slot]}
      onChange={setFile(slot)}
      serverError={uploadError(name)}
      multiple={multiple}
      maxFiles={multiple ? 20 : undefined}
      optionalLabel={UPLOAD_TEXT.optionalLabel}
      hint={UPLOAD_TEXT.hint}
      removeLabel={UPLOAD_TEXT.removeLabel}
      tooLargeMessage={UPLOAD_TEXT.tooLargeMessage}
      wrongTypeMessage={UPLOAD_TEXT.wrongTypeMessage}
      addMoreLabel={UPLOAD_TEXT.addMoreLabel}
    />
  );

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
      /*
       * Same inverted palette as the lead panel, for the same reason: the two
       * are the places you type into, and they should not disagree about what
       * a field looks like.
       *
       * The backdrop is a literal rather than a token — it sits behind the
       * dialog over the light board, so it wants the ink either way, and
       * inside this scope `--foreground` is the near-white.
       */
      className="admin-panel m-auto w-[min(46rem,calc(100vw-2rem))] border border-border bg-background p-0 text-foreground backdrop:bg-[rgba(9,9,11,0.7)]"
    >
      <form onSubmit={submit}>
        <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-5 py-3 text-foreground">
          <div>
            <h2 className="font-display text-sm font-bold tracking-[0.14em] uppercase">
              Nouveau lead
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              Arrive dans « {statusLabel} »
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X size={17} />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5 scrollbar-brand">
          <fieldset>
            <legend className={label}>Type de demande</legend>
            <div className="flex flex-wrap border border-border">
              {SHAPES.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => {
                    setShape(one.id);
                    setErrors({});
                  }}
                  aria-pressed={shape === one.id}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                    shape === one.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {one.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{shown.hint}</p>
          </fieldset>

          {/* ---------------------------------------------------------------
              Financement — the site's order, uploads interleaved with the
              fields they back up.
              --------------------------------------------------------------- */}
          {shape === "financement" ? (
            <>
              <Pair>
                <Field id="nom" label="Nom" value={values.nom} onChange={set("nom")} error={errors.nom} required />
                <Field id="prenom" label="Prénom" value={values.prenom} onChange={set("prenom")} error={errors.prenom} required />
              </Pair>

              {upload("pieceIdentite", "Pièce d'identité", "pieceIdentite")}

              <Pair>
                <Field id="telephone" label="Téléphone" type="tel" value={values.telephone} onChange={set("telephone")} error={errors.telephone} required />
                <Field id="email" label="Email" type="email" value={values.email} onChange={set("email")} error={errors.email} required />
              </Pair>

              <Field id="entreprise" label="Entreprise" value={values.entreprise} onChange={set("entreprise")} error={errors.entreprise} required />

              {upload("kbis", "Kbis / justificatif d'immatriculation", "kbis")}

              <div>
                <Field
                  id="dateCreation"
                  label="Date de création de l'entreprise"
                  type="date"
                  value={values.dateCreation}
                  onChange={set("dateCreation")}
                  error={errors.dateCreation}
                  invalid={ageIneligible}
                  required
                />
                {ageIneligible ? (
                  <Ineligible>
                    L&apos;entreprise doit avoir au moins six mois d&apos;existence
                    pour que le dossier soit recevable.
                  </Ineligible>
                ) : null}
              </div>

              <Field id="adresse" label="Adresse" value={values.adresse} onChange={set("adresse")} error={errors.adresse} />

              <Pair>
                <Field id="codePostal" label="Code postal" value={values.codePostal} onChange={set("codePostal")} error={errors.codePostal} required />
                <Field id="ville" label="Ville" value={values.ville} onChange={set("ville")} error={errors.ville} required />
              </Pair>

              <YesNo
                legend="L'entreprise a-t-elle un site web ?"
                value={values.siteWeb}
                onChange={answer("siteWeb", "siteWebUrl")}
              />
              {values.siteWeb === "yes" ? (
                <Field id="siteWebUrl" label="Adresse du site" type="url" placeholder="https://" value={values.siteWebUrl} onChange={set("siteWebUrl")} error={errors.siteWebUrl} required />
              ) : null}

              <YesNo
                legend="Est-elle présente sur les réseaux sociaux ?"
                value={values.reseaux}
                onChange={answer("reseaux", "reseauxOu")}
              />
              {values.reseaux === "yes" ? (
                <Field id="reseauxOu" label="Sur quels réseaux ?" value={values.reseauxOu} onChange={set("reseauxOu")} error={errors.reseauxOu} required />
              ) : null}

              <div>
                <Pair>
                  <Field id="chiffreAffaire" label="Chiffre d'affaires" inputMode="decimal" placeholder="120000" value={values.chiffreAffaire} onChange={set("chiffreAffaire")} error={errors.chiffreAffaire} invalid={revenueIneligible} required />
                  <Field id="montant" label="Montant demandé" inputMode="decimal" placeholder="50000" value={values.montant} onChange={set("montant")} error={errors.montant} required />
                </Pair>
                {revenueIneligible ? (
                  <Ineligible>
                    Le chiffre d&apos;affaires déclaré est en dessous du seuil
                    de recevabilité.
                  </Ineligible>
                ) : null}
              </div>

              {upload("relevesBancaires", "Relevés bancaires des 6 derniers mois", "relevesBancaires")}
              {upload("documentsComptables", "Informations financières / comptables", "documentsComptables", true)}

              <Field id="codeCommercial" label="Code commercial" value={values.codeCommercial} onChange={set("codeCommercial")} error={errors.codeCommercial} />
            </>
          ) : null}

          {/* ---------------------------------------------------------------
              Développement — the enquiry block, no uploads.
              --------------------------------------------------------------- */}
          {shape === "developpement" ? (
            <>
              <div>
                <label htmlFor="prestation" className={label}>
                  Prestation souhaitée
                </label>
                <select
                  id="prestation"
                  value={values.prestation}
                  onChange={(event) => set("prestation")(event.target.value)}
                  className={field}
                >
                  {PRESTATIONS.map((one) => (
                    <option key={one.id} value={one.id}>
                      {one.label}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.service} />
              </div>

              <Pair>
                <Field id="nom" label="Nom" value={values.nom} onChange={set("nom")} error={errors.nom} required />
                <Field id="prenom" label="Prénom" value={values.prenom} onChange={set("prenom")} error={errors.prenom} required />
              </Pair>
              <Pair>
                <Field id="email" label="Email" type="email" value={values.email} onChange={set("email")} error={errors.email} required />
                <Field id="telephone" label="Téléphone" type="tel" value={values.telephone} onChange={set("telephone")} error={errors.telephone} required />
              </Pair>
              <Field id="entreprise" label="Entreprise" value={values.entreprise} onChange={set("entreprise")} error={errors.entreprise} required />
            </>
          ) : null}

          {/* ---------------------------------------------------------------
              Contact — company, SIREN, name, email, invoices.
              --------------------------------------------------------------- */}
          {shape === "contact" ? (
            <>
              <Field id="entreprise" label="Entreprise" value={values.entreprise} onChange={set("entreprise")} error={errors.entreprise} required />
              {/* Required on the site even though the API allows it empty. */}
              <Field id="siren" label="SIREN" value={values.siren} onChange={set("siren")} error={errors.siren} required />
              <Field id="nomComplet" label="Nom complet" value={values.nomComplet} onChange={set("nomComplet")} error={errors.nomComplet} required />
              <Pair>
                <Field id="email" label="Email" type="email" value={values.email} onChange={set("email")} error={errors.email} required />
                {/* Not on the site's form, but an enquiry taken over the phone
                    obviously has a number, and the API accepts one. */}
                <Field id="telephone" label="Téléphone" type="tel" value={values.telephone} onChange={set("telephone")} error={errors.telephone} />
              </Pair>

              {upload("factures", "Factures", "factures", true)}
            </>
          ) : null}

          <div>
            <label htmlFor="message" className={label}>
              Message
              <span className="ml-1 font-normal text-muted-foreground">
                (facultatif)
              </span>
            </label>
            <textarea
              id="message"
              rows={3}
              value={values.message}
              onChange={(event) => set("message")(event.target.value)}
              placeholder="Ce que la personne a demandé."
              className={cn(field, "resize-y")}
            />
            <FieldError message={errors.message} />
          </div>

          {failure ? (
            <p
              role="alert"
              className="flex items-start gap-2.5 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-3.5 py-3 text-[13px] text-danger"
            >
              <TriangleAlert size={15} className="mt-px shrink-0" aria-hidden />
              {failure}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending || ineligible}
            className={cn(
              "flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity",
              pending || ineligible
                ? "cursor-not-allowed opacity-55"
                : "hover:opacity-90",
            )}
          >
            {pending ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden />
                Enregistrement…
              </>
            ) : (
              "Enregistrer le lead"
            )}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

/** Two fields side by side above `sm`, stacked below it. */
function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Ineligible({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-2 border border-danger/25 border-l-2 border-l-danger bg-danger/[0.06] px-3 py-2 text-[11px] leading-relaxed text-danger">
      <TriangleAlert size={13} className="mt-px shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p role="alert" className="mt-1 text-[11px] text-danger">
      {message}
    </p>
  );
}

function YesNo({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: "yes" | "no";
  onChange: (value: "yes" | "no") => void;
}) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      <div className="flex border border-border">
        {(
          [
            ["no", "Non"],
            ["yes", "Oui"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={value === id}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium transition-colors",
              value === id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Field({
  id,
  label: text,
  value,
  onChange,
  error,
  type = "text",
  required,
  placeholder,
  inputMode,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "decimal" | "url" | "tel";
  invalid?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
        {required ? null : (
          <span className="ml-1 font-normal text-muted-foreground">
            (facultatif)
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={invalid || error !== undefined || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          field,
          (error || invalid) && "border-danger focus:border-danger focus:ring-danger",
        )}
      />
      <FieldError message={error} />
    </div>
  );
}
