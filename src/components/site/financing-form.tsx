"use client";

import { useMemo, useState } from "react";
import { Send, TriangleAlert } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";
import { isCompanyAgeEligible, isRevenueEligible } from "@/lib/eligibility";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/** Shared by every field on the live site's financing form. */
const inputClass =
  "w-full px-4 py-3.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all text-sm";

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

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

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

        <div>
          <label
            htmlFor="company-created-at"
            className="text-xs font-medium text-foreground mb-1.5 block"
          >
            {form.companyCreatedAt}
          </label>
          <DatePicker
            id="company-created-at"
            value={values.dateCreation}
            onChange={set("dateCreation")}
            locale={locale}
            placeholder={form.companyCreatedAtPlaceholder}
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
  invalid,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  inputMode?: "decimal" | "numeric" | "tel" | "email" | "text";
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
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(inputClass, invalid && "border-danger focus:border-danger")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
