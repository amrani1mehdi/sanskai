"use client";

/**
 * The partner onboarding form: the documents and addresses Sansekai needs from
 * a cabinet to start working together.
 *
 * Three blocks — who is sending, the documents, the two e-mail addresses — in
 * the order Sansekai wrote them, plus the identity the CRM files a lead under,
 * which the list of documents alone did not name.
 *
 * One question decides one slot: an employee sends their employer's
 * certificate, someone independent has no employer to ask. Answering "yes"
 * hides that slot and drops whatever was put in it, so a file chosen before the
 * answer changed is not sent beside an answer that contradicts it.
 */

import { useId, useRef, useState } from "react";
import { CircleCheck, Loader2, Send, TriangleAlert } from "lucide-react";
import { Block, Choices, Field } from "@/components/site/form-fields";
import { FileUpload } from "@/components/ui/file-upload";
import type { SiteContent } from "@/lib/content";
import { translateApiErrors } from "@/lib/leads/errors";
import type { PartnerCopy } from "@/lib/leads/partner-copy";
import { announceArrival, submissionUrl } from "@/lib/leads/submit";
import {
  checkEmail,
  checkPhone,
  checkRequired,
  collect,
} from "@/lib/leads/validate";

const EMPTY = {
  entreprise: "",
  nom: "",
  prenom: "",
  telephone: "",
  emailContrat: "",
  emailFacturation: "",
};

type TextKey = keyof typeof EMPTY;

/** Named as the API names the fields, so its 422 lands on the right slot. */
type Slot =
  | "kbis"
  | "attestationEmployeur"
  | "pieceIdentite"
  | "attestationHebergement"
  | "rib";

const NO_UPLOADS: Record<Slot, File[]> = {
  kbis: [],
  attestationEmployeur: [],
  pieceIdentite: [],
  attestationHebergement: [],
  rib: [],
};

/** "1" independent, "0" employee, "" not answered yet. */
type Independent = "" | "1" | "0";

export function PartnerForm({
  form,
  copy,
}: {
  /** The site's shared form strings — yes/no, file hints, validation and API errors. */
  form: SiteContent["form"];
  copy: PartnerCopy["form"];
}) {
  const [values, setValues] = useState(EMPTY);
  const [independant, setIndependant] = useState<Independent>("");
  const [uploads, setUploads] = useState<Record<Slot, File[]>>(NO_UPLOADS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const employee = independant === "0";
  const { blocks, fields } = copy;

  /** A field's message goes as soon as it is edited, not on the next submit. */
  const clear = (key: string) =>
    setFieldErrors((current) => {
      const stale = Object.keys(current).filter(
        (name) => name === key || name.startsWith(`${key}.`),
      );
      if (stale.length === 0) return current;

      const next = { ...current };
      for (const name of stale) delete next[name];

      return next;
    });

  const set = (key: TextKey) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    clear(key);
    setError(null);
  };

  const setUpload = (slot: Slot) => (files: File[]) => {
    setUploads((current) => ({ ...current, [slot]: files }));
    clear(slot);
    setError(null);
  };

  /**
   * The API reports a file inside the identity slot against an indexed key —
   * `pieceIdentite.0` — so the slot's own name is not enough to find it.
   */
  const errorFor = (key: string): string | undefined =>
    fieldErrors[key] ??
    Object.entries(fieldErrors).find(([name]) => name.startsWith(`${key}.`))?.[1];

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    /*
     * Checked here rather than left to the browser's own `required`, whose
     * message comes out in the language the browser was installed in. The API
     * checks everything again; this only saves sending five documents to be
     * told a phone number is missing.
     */
    const invalid = collect({
      entreprise: checkRequired(values.entreprise, form),
      nom: checkRequired(values.nom, form),
      prenom: checkRequired(values.prenom, form),
      telephone: checkPhone(values.telephone, form),
      independant: independant === "" ? copy.choiceRequired : undefined,
      emailContrat: checkEmail(values.emailContrat, form),
      emailFacturation: checkEmail(values.emailFacturation, form),
    });

    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      setError(form.checkFields);
      return;
    }

    const body = new FormData();

    for (const key of Object.keys(EMPTY) as TextKey[]) {
      body.set(key, values[key].trim());
    }
    // The API reads it as a boolean; multipart carries everything as text.
    body.set("independant", independant);

    /*
     * Every document is optional: a cabinet that applies without its Kbis is a
     * partner to chase the file from, not a form to refuse. Each slot is sent
     * only when it holds one — an empty slot is absent from the request rather
     * than present and carrying the string "undefined".
     */
    if (uploads.kbis[0]) body.set("kbis", uploads.kbis[0]);
    // Recto and verso, or both sides in one file.
    for (const file of uploads.pieceIdentite) {
      body.append("pieceIdentite[]", file);
    }
    if (employee && uploads.attestationEmployeur[0]) {
      body.set("attestationEmployeur", uploads.attestationEmployeur[0]);
    }
    if (uploads.attestationHebergement[0]) {
      body.set("attestationHebergement", uploads.attestationHebergement[0]);
    }
    if (uploads.rib[0]) body.set("rib", uploads.rib[0]);

    setSending(true);
    setError(null);
    setFieldErrors({});

    let response: Response;

    try {
      response = await fetch(submissionUrl("partenaire"), {
        method: "POST",
        body,
        // Laravel answers a browser with HTML unless asked otherwise, and the
        // field errors below are read off the JSON.
        headers: { Accept: "application/json" },
      });
    } catch {
      setError(form.errorUnavailable);
      setSending(false);
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);

      if (response.status === 422 && payload?.errors) {
        setFieldErrors(translateApiErrors(payload.errors, form));
      }

      setError(
        response.status === 429
          ? form.errorRateLimit
          : response.status === 503
            ? form.errorUnavailable
            : response.status === 422
              ? form.checkFields
              : (payload?.message ?? form.errorGeneric),
      );
      setSending(false);
      return;
    }

    // Posted straight to the API, so this server never saw it land.
    announceArrival();

    setValues(EMPTY);
    setIndependant("");
    setUploads(NO_UPLOADS);
    setSending(false);
    setSent(true);
    /* The confirmation is shorter than the form it replaces; without this a
       phone is left scrolled past it, looking at the footer. */
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const slot = (name: Slot, label: string, multiple = false) => (
    <DocumentSlot
      label={label}
      files={uploads[name]}
      onChange={setUpload(name)}
      error={errorFor(name)}
      form={form}
      copy={copy}
      multiple={multiple}
    />
  );

  return (
    <div ref={top} className="scroll-mt-28">
      {sent ? (
        <div
          role="status"
          className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border text-center"
        >
          <CircleCheck size={44} className="mx-auto text-accent" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-bold text-card-foreground">
            {copy.sentTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.sentBody}</p>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="bg-card rounded-2xl p-6 sm:p-8 md:p-10 card-elevated border border-border space-y-10"
        >
          <Block number={1} title={blocks.identity}>
            <Field
              label={fields.cabinet}
              value={values.entreprise}
              onChange={set("entreprise")}
              error={errorFor("entreprise")}
              autoComplete="organization"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={fields.lastName}
                value={values.nom}
                onChange={set("nom")}
                error={errorFor("nom")}
                autoComplete="family-name"
              />
              <Field
                label={fields.firstName}
                value={values.prenom}
                onChange={set("prenom")}
                error={errorFor("prenom")}
                autoComplete="given-name"
              />
            </div>
            <Field
              label={fields.phone}
              type="tel"
              value={values.telephone}
              onChange={set("telephone")}
              error={errorFor("telephone")}
              autoComplete="tel"
              className="sm:max-w-xs"
            />
          </Block>

          <Block number={2} title={blocks.documents}>
            {slot("kbis", fields.kbis)}

            <Choices
              legend={fields.independent}
              name="independant"
              type="radio"
              options={[
                { value: "1", label: form.yes },
                { value: "0", label: form.no },
              ]}
              isChecked={(value) => independant === value}
              onChange={(value) => {
                setIndependant(value as Independent);
                clear("independant");
                if (value === "1") setUpload("attestationEmployeur")([]);
              }}
              error={errorFor("independant")}
            />
            {employee ? slot("attestationEmployeur", fields.employerCertificate) : null}

            {slot("pieceIdentite", fields.identityCard, true)}
            {slot("attestationHebergement", fields.housingCertificate)}
            {slot("rib", fields.rib)}
          </Block>

          <Block number={3} title={blocks.emails}>
            <Field
              label={fields.contractEmail}
              type="email"
              value={values.emailContrat}
              onChange={set("emailContrat")}
              error={errorFor("emailContrat")}
              autoComplete="email"
              placeholder={fields.emailPlaceholder}
            />
            <Field
              label={fields.billingEmail}
              type="email"
              value={values.emailFacturation}
              onChange={set("emailFacturation")}
              error={errorFor("emailFacturation")}
              placeholder={fields.emailPlaceholder}
            />
          </Block>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={sending}
              className="w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {form.sending}
                </>
              ) : (
                <>
                  {copy.submit} <Send size={16} />
                </>
              )}
            </button>

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive"
              >
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * One document: its name above, the drop zone under it.
 *
 * Every zone says the same thing — choose a file, or drop one — so the name is
 * what tells them apart, and it is handed to the zone for screen readers too.
 * The identity slot takes a second file for the verso.
 */
function DocumentSlot({
  label,
  files,
  onChange,
  error,
  form,
  copy,
  multiple,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
  form: SiteContent["form"];
  copy: PartnerCopy["form"];
  multiple: boolean;
}) {
  const id = useId();

  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="text-xs font-medium text-foreground mb-1.5">
        {label}
      </p>
      <FileUpload
        label={copy.upload.choose}
        accessibleName={label.replace(/\s*\*$/, "")}
        optionalLabel={copy.upload.optional}
        hint={form.fileHint}
        removeLabel={form.removeFile}
        tooLargeMessage={form.fileTooLarge}
        wrongTypeMessage={form.fileWrongType}
        files={files}
        onChange={onChange}
        serverError={error}
        multiple={multiple}
        addMoreLabel={multiple ? copy.upload.addBack : undefined}
        maxFiles={multiple ? 2 : undefined}
      />
    </div>
  );
}
