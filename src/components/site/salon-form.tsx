"use client";

/**
 * The trade-show client sheet, as a form.
 *
 * The same four blocks as the paper "fiche client / prospect" handed out at
 * stands — company, contact, main need, and financing when that is the need — in
 * the same order, so someone who has held the paper one recognises this, and a
 * member of staff filling it in beside them can follow. In French it uses the
 * paper's own words; in English and German it says the same thing.
 *
 * Built for a phone first: the page is opened by a QR code, standing up, in a
 * noisy hall. Choices are large tap targets rather than small boxes, and the
 * financing block stays out of the way until financing is ticked.
 */

import { useRef, useState } from "react";
import { CircleCheck, Loader2, Send, TriangleAlert } from "lucide-react";
import { Block, Choices, Field } from "@/components/site/form-fields";
import type { SiteContent } from "@/lib/content";
import { translateApiErrors } from "@/lib/leads/errors";
import type { SalonOptions } from "@/lib/leads/salon";
import type { SalonCopy } from "@/lib/leads/salon-copy";
import { announceArrival, submissionUrl } from "@/lib/leads/submit";
import {
  checkEmail,
  checkPhone,
  checkRequired,
  collect,
  isEmail,
  isPhone,
} from "@/lib/leads/validate";

const EMPTY = {
  entreprise: "",
  secteur: "",
  siteWebUrl: "",
  ville: "",
  emailEntreprise: "",
  salaries: "",
  nomDirigeant: "",
  fonction: "",
  mobile: "",
  fixe: "",
  email: "",
  besoinAutre: "",
  montant: "",
  motifAutre: "",
};

type TextKey = keyof typeof EMPTY;

export function SalonForm({
  form,
  copy,
  options,
}: {
  /** The site's shared form strings — validation and API errors, in the visitor's language. */
  form: SiteContent["form"];
  copy: SalonCopy["form"];
  options: SalonOptions;
}) {
  const [values, setValues] = useState(EMPTY);
  const [anciennete, setAnciennete] = useState("");
  const [besoins, setBesoins] = useState<string[]>([]);
  const [motifs, setMotifs] = useState<string[]>([]);
  const [delai, setDelai] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const financement = besoins.includes("financement");
  const { blocks, fields } = copy;

  /** A field's message goes as soon as it is edited, not on the next submit. */
  const clear = (key: string) =>
    setFieldErrors((current) => {
      if (current[key] === undefined) return current;

      const next = { ...current };
      delete next[key];

      return next;
    });

  const set = (key: TextKey) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    clear(key);
    setError(null);
  };

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  /**
   * The API reports a rejected tick box against an indexed key — `besoins.0` —
   * so the group's own name is not enough to find it.
   */
  const errorFor = (key: string): string | undefined =>
    fieldErrors[key] ??
    Object.entries(fieldErrors).find(([name]) => name.startsWith(`${key}.`))?.[1];

  const reset = () => {
    setValues(EMPTY);
    setAnciennete("");
    setBesoins([]);
    setMotifs([]);
    setDelai("");
    setFieldErrors({});
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    const otherNeed = besoins.includes("autre");
    const otherMotif = financement && motifs.includes("autre");

    /*
     * Checked here rather than left to the browser's own `required`, whose
     * message comes out in the language the browser was installed in. The API
     * checks everything again; this only saves a round trip.
     */
    const invalid = collect({
      entreprise: checkRequired(values.entreprise, form),
      emailEntreprise:
        values.emailEntreprise.trim() !== "" && !isEmail(values.emailEntreprise)
          ? form.invalidEmail
          : undefined,
      nomDirigeant: checkRequired(values.nomDirigeant, form),
      mobile: checkPhone(values.mobile, form),
      fixe:
        values.fixe.trim() !== "" && !isPhone(values.fixe) ? form.invalidPhone : undefined,
      email: checkEmail(values.email, form),
      besoins: besoins.length === 0 ? copy.needRequired : undefined,
      besoinAutre: otherNeed ? checkRequired(values.besoinAutre, form) : undefined,
      motifAutre: otherMotif ? checkRequired(values.motifAutre, form) : undefined,
    });

    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      setError(form.checkFields);
      return;
    }

    /* Blank answers are left out rather than sent empty, so they do not land in
       the CRM as empty strings. The financing block goes only when financing is
       ticked: answers typed into it before it was unticked are not sent. */
    const text = (key: TextKey) => {
      const value = values[key].trim();

      return value === "" ? {} : { [key]: value };
    };

    const body = {
      ...text("entreprise"),
      ...text("secteur"),
      ...text("siteWebUrl"),
      ...text("ville"),
      ...text("emailEntreprise"),
      ...(anciennete ? { anciennete } : {}),
      ...text("salaries"),
      ...text("nomDirigeant"),
      ...text("fonction"),
      ...text("mobile"),
      ...text("fixe"),
      ...text("email"),
      besoins,
      ...(otherNeed ? text("besoinAutre") : {}),
      ...(financement
        ? {
            ...text("montant"),
            motifs,
            ...(otherMotif ? text("motifAutre") : {}),
            ...(delai ? { delai } : {}),
          }
        : {}),
    };

    setSending(true);
    setError(null);
    setFieldErrors({});

    let response: Response;

    try {
      response = await fetch(submissionUrl("salon"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Laravel answers a browser with HTML unless asked otherwise.
          Accept: "application/json",
        },
        body: JSON.stringify(body),
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

    reset();
    setSending(false);
    setSent(true);
    /* The confirmation is shorter than the form it replaces; without this a
       phone is left scrolled past it, looking at the footer. */
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          {/* At a stand one phone often goes round several visitors. */}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {copy.another}
          </button>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="bg-card rounded-2xl p-6 sm:p-8 md:p-10 card-elevated border border-border space-y-10"
        >
          <Block number={1} title={blocks.company}>
            <Field
              label={fields.company}
              value={values.entreprise}
              onChange={set("entreprise")}
              error={errorFor("entreprise")}
              autoComplete="organization"
            />
            <Field
              label={fields.sector}
              value={values.secteur}
              onChange={set("secteur")}
              error={errorFor("secteur")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={fields.website}
                value={values.siteWebUrl}
                onChange={set("siteWebUrl")}
                error={errorFor("siteWebUrl")}
                inputMode="url"
                placeholder={fields.websitePlaceholder}
              />
              <Field
                label={fields.city}
                value={values.ville}
                onChange={set("ville")}
                error={errorFor("ville")}
                autoComplete="address-level2"
              />
            </div>
            <Field
              label={fields.companyEmail}
              type="email"
              value={values.emailEntreprise}
              onChange={set("emailEntreprise")}
              error={errorFor("emailEntreprise")}
            />
            <Choices
              legend={fields.companyAge}
              name="anciennete"
              type="radio"
              options={options.anciennetes}
              isChecked={(value) => anciennete === value}
              onChange={(value) => {
                setAnciennete(value);
                clear("anciennete");
              }}
              error={errorFor("anciennete")}
            />
            <Field
              label={fields.employees}
              value={values.salaries}
              onChange={set("salaries")}
              error={errorFor("salaries")}
              inputMode="numeric"
              className="sm:max-w-[12rem]"
            />
          </Block>

          <Block number={2} title={blocks.contact}>
            <Field
              label={fields.manager}
              value={values.nomDirigeant}
              onChange={set("nomDirigeant")}
              error={errorFor("nomDirigeant")}
              autoComplete="name"
            />
            <Field
              label={fields.role}
              value={values.fonction}
              onChange={set("fonction")}
              error={errorFor("fonction")}
              autoComplete="organization-title"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={fields.mobile}
                type="tel"
                value={values.mobile}
                onChange={set("mobile")}
                error={errorFor("mobile")}
                autoComplete="tel"
              />
              <Field
                label={fields.landline}
                type="tel"
                value={values.fixe}
                onChange={set("fixe")}
                error={errorFor("fixe")}
              />
            </div>
            <Field
              label={fields.email}
              type="email"
              value={values.email}
              onChange={set("email")}
              error={errorFor("email")}
              autoComplete="email"
            />
          </Block>

          <Block number={3} title={blocks.need}>
            <Choices
              legend={fields.needs}
              name="besoins"
              type="checkbox"
              options={options.besoins}
              isChecked={(value) => besoins.includes(value)}
              onChange={(value) => {
                setBesoins((current) => toggle(current, value));
                clear("besoins");
              }}
              error={errorFor("besoins")}
            />
            {besoins.includes("autre") ? (
              <Field
                label={fields.otherNeed}
                value={values.besoinAutre}
                onChange={set("besoinAutre")}
                error={errorFor("besoinAutre")}
              />
            ) : null}
          </Block>

          {financement ? (
            <Block title={blocks.financing}>
              <Field
                label={fields.amount}
                value={values.montant}
                onChange={set("montant")}
                error={errorFor("montant")}
                inputMode="decimal"
                className="sm:max-w-xs"
              />
              <Choices
                legend={fields.purpose}
                name="motifs"
                type="checkbox"
                options={options.motifs}
                isChecked={(value) => motifs.includes(value)}
                onChange={(value) => {
                  setMotifs((current) => toggle(current, value));
                  clear("motifs");
                }}
                error={errorFor("motifs")}
              />
              {motifs.includes("autre") ? (
                <Field
                  label={fields.otherPurpose}
                  value={values.motifAutre}
                  onChange={set("motifAutre")}
                  error={errorFor("motifAutre")}
                />
              ) : null}
              <Choices
                legend={fields.timeframe}
                name="delai"
                type="radio"
                options={options.delais}
                isChecked={(value) => delai === value}
                onChange={(value) => {
                  setDelai(value);
                  clear("delai");
                }}
                error={errorFor("delai")}
              />
            </Block>
          ) : null}

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
