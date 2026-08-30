"use client";

import { useMemo, useState } from "react";
import { Send, TriangleAlert } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";
import { isCompanyAgeEligible, isRevenueEligible } from "@/lib/eligibility";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";

/** Shared by every field on the live site's financing form. */
const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

type YesNo = "yes" | "no";

type UploadField = "idDocument" | "kbis" | "statements" | "accounting";

const NO_UPLOADS: Record<UploadField, File[]> = {
  idDocument: [],
  kbis: [],
  statements: [],
  accounting: [],
};

const EMPTY = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  entreprise: "",
  dateCreation: "",
  adresse: "",
  codePostal: "",
  ville: "",
  // Both default to "no", so the follow-ups stay out of the way until asked for.
  siteWeb: "no" as YesNo,
  siteWebUrl: "",
  reseaux: "no" as YesNo,
  reseauxOu: "",
  chiffreAffaire: "",
  montant: "",
  codeCommercial: "",
  message: "",
};

export function FinancingForm({
  content,
  locale,
}: {
  content: SiteContent;
  locale: Locale;
}) {
  const { form } = content;

  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const [uploads, setUploads] = useState<Record<UploadField, File[]>>(NO_UPLOADS);

  const setUpload = (field: UploadField) => (files: File[]) =>
    setUploads((current) => ({ ...current, [field]: files }));

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  /**
   * Answering "no" clears the follow-up, so a detail typed before changing
   * the answer is not submitted alongside a contradicting one.
   */
  const setAnswer =
    (key: "siteWeb" | "reseaux", detail: "siteWebUrl" | "reseauxOu") =>
    (answer: YesNo) =>
      setValues((current) => ({
        ...current,
        [key]: answer,
        ...(answer === "no" ? { [detail]: "" } : {}),
      }));

  /*
   * Both notices appear as soon as the offending field is filled in, rather
   * than waiting for a submit that was never going to be accepted. Each is
   * shown against its own field so it is obvious which one to change.
   */
  const ageIneligible = useMemo(
    () => values.dateCreation !== "" && !isCompanyAgeEligible(values.dateCreation),
    [values.dateCreation],
  );

  // Only judge the revenue once it reads as a number, so the warning does not
  // flash while someone is still typing the first digit.
  const revenueIneligible = useMemo(
    () =>
      values.chiffreAffaire.trim() !== "" &&
      /\d/.test(values.chiffreAffaire) &&
      !isRevenueEligible(values.chiffreAffaire),
    [values.chiffreAffaire],
  );

  const ineligible = ageIneligible || revenueIneligible;

  // The live site posts to a Supabase edge function. There is no backend in
  // this rebuild yet, so the form mirrors the same success UX locally.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ineligible) return;

    setValues(EMPTY);
    setUploads(NO_UPLOADS);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="bg-card rounded-2xl p-8 md:p-10 card-elevated border border-border sticky top-28">
      <h3 className="font-display text-xl font-bold text-card-foreground mb-1">
        {form.treasuryRequest}
      </h3>
      <p className="text-sm text-muted-foreground mb-8">{form.fillForm}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={form.lastName} value={values.nom} onChange={set("nom")} required />
          <Field
            label={form.firstName}
            value={values.prenom}
            onChange={set("prenom")}
            required
          />
        </div>

        {/* Sits with the name fields, since it is what backs them up. */}
        <FileUpload
          label={form.uploadId}
          optionalLabel={form.optional}
          hint={form.fileHint}
          removeLabel={form.removeFile}
          tooLargeMessage={form.fileTooLarge}
          wrongTypeMessage={form.fileWrongType}
          files={uploads.idDocument}
          onChange={setUpload("idDocument")}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.phone}
            type="tel"
            value={values.telephone}
            onChange={set("telephone")}
            required
          />
          <Field
            label={form.email}
            type="email"
            value={values.email}
            onChange={set("email")}
            required
          />
        </div>

        <Field
          label={form.company}
          value={values.entreprise}
          onChange={set("entreprise")}
          required
        />

        <FileUpload
          label={form.uploadKbis}
          optionalLabel={form.optional}
          hint={form.fileHint}
          removeLabel={form.removeFile}
          tooLargeMessage={form.fileTooLarge}
          wrongTypeMessage={form.fileWrongType}
          files={uploads.kbis}
          onChange={setUpload("kbis")}
        />

        <div>
          <label
            htmlFor="company-created-at"
            className="text-xs font-medium text-foreground mb-1.5 block"
          >
            {form.companyCreatedAt}
          </label>
          <DatePicker
            id="company-created-at"
            name="dateCreation"
            value={values.dateCreation}
            onChange={set("dateCreation")}
            locale={locale}
            placeholder={form.companyCreatedAtPlaceholder}
            required
            invalid={ageIneligible}
            describedBy={ageIneligible ? "company-age-notice" : undefined}
          />

          {ageIneligible ? (
            <IneligibleNotice
              id="company-age-notice"
              title={form.ineligibleTitle}
              body={form.ineligibleBody}
            />
          ) : null}
        </div>

        <Field label={form.address} value={values.adresse} onChange={set("adresse")} />

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.postalCode}
            value={values.codePostal}
            onChange={set("codePostal")}
            required
          />
          <Field label={form.city} value={values.ville} onChange={set("ville")} required />
        </div>

        <YesNoQuestion
          name="siteWeb"
          legend={form.hasWebsite}
          yesLabel={form.yes}
          noLabel={form.no}
          value={values.siteWeb}
          onChange={setAnswer("siteWeb", "siteWebUrl")}
        />
        {values.siteWeb === "yes" ? (
          <Field
            label={form.websiteUrl}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={values.siteWebUrl}
            onChange={set("siteWebUrl")}
            required
          />
        ) : null}

        <YesNoQuestion
          name="reseaux"
          legend={form.hasSocial}
          yesLabel={form.yes}
          noLabel={form.no}
          value={values.reseaux}
          onChange={setAnswer("reseaux", "reseauxOu")}
        />
        {values.reseaux === "yes" ? (
          <Field
            label={form.socialWhere}
            value={values.reseauxOu}
            onChange={set("reseauxOu")}
            required
          />
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={form.revenue}
            value={values.chiffreAffaire}
            onChange={set("chiffreAffaire")}
            inputMode="decimal"
            invalid={revenueIneligible}
            describedBy={revenueIneligible ? "revenue-notice" : undefined}
            required
          />
          <Field
            label={form.amount}
            value={values.montant}
            onChange={set("montant")}
            inputMode="decimal"
            required
          />
        </div>

        {revenueIneligible ? (
          <IneligibleNotice
            id="revenue-notice"
            title={form.ineligibleTitle}
            body={form.ineligibleRevenueBody}
          />
        ) : null}

        {/* Six months of statements usually means six files, not one. */}
        <FileUpload
          label={form.uploadStatements}
          optionalLabel={form.optional}
          hint={form.fileHint}
          removeLabel={form.removeFile}
          tooLargeMessage={form.fileTooLarge}
          wrongTypeMessage={form.fileWrongType}
          files={uploads.statements}
          onChange={setUpload("statements")}
          multiple
          addMoreLabel={form.addAnotherFile}
        />

        {/* Accounting papers vary by request, so this one takes several too. */}
        <FileUpload
          label={form.uploadAccounting}
          optionalLabel={form.optional}
          hint={form.fileHint}
          removeLabel={form.removeFile}
          tooLargeMessage={form.fileTooLarge}
          wrongTypeMessage={form.fileWrongType}
          files={uploads.accounting}
          onChange={setUpload("accounting")}
          multiple
          addMoreLabel={form.addAnotherFile}
        />

        <Field
          label={form.commercialCode}
          value={values.codeCommercial}
          onChange={set("codeCommercial")}
        />

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            {form.message}
          </label>
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            value={values.message}
            onChange={(event) => set("message")(event.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={ineligible}
          className="w-full gold-gradient text-accent-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm mt-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sent ? (
            form.sent
          ) : (
            <>
              {form.submit} <Send size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * A yes/no answer as a pair of radios.
 *
 * The native input is hidden and the dot drawn from the site's tokens, since
 * browsers barely let you restyle a radio — but it is still a real radio in a
 * fieldset, so arrow keys move between the options and screen readers announce
 * one grouped question rather than two unrelated controls.
 */
function YesNoQuestion({
  name,
  legend,
  yesLabel,
  noLabel,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  yesLabel: string;
  noLabel: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}) {
  const options: { value: YesNo; label: string }[] = [
    { value: "yes", label: yesLabel },
    { value: "no", label: noLabel },
  ];

  return (
    <fieldset>
      <legend className="text-xs font-medium text-foreground mb-2">
        {legend}
      </legend>
      <div className="flex items-center gap-6">
        {options.map((option) => (
          <label
            key={option.value}
            className="group flex cursor-pointer items-center gap-2.5 text-sm text-foreground"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "relative size-[18px] shrink-0 rounded-full border-2 border-border bg-background transition-colors",
                "group-hover:border-accent/50",
                "peer-checked:border-accent",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
                // The dot: a pseudo-element on this sibling, so `peer-checked`
                // can reach it — a nested child would be out of its selector.
                "after:absolute after:inset-[3px] after:rounded-full after:bg-accent after:opacity-0 after:transition-opacity",
                "peer-checked:after:opacity-100",
              )}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Shown against the field that fails an eligibility rule. */
function IneligibleNotice({
  id,
  title,
  body,
}: {
  id: string;
  title: string;
  body: string;
}) {
  return (
    <div
      id={id}
      role="alert"
      className="mt-3 flex gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4"
    >
      <TriangleAlert className="size-4 shrink-0 text-danger mt-0.5" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  required,
  inputMode,
  placeholder,
  invalid,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  inputMode?: "decimal" | "numeric" | "tel" | "email" | "text" | "url";
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
      <input
        required={required}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(inputClass, invalid && "border-danger focus:border-danger")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
