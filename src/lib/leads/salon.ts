/**
 * The choices on the trade-show client sheet.
 *
 * One list for the public form that asks and the back office that reads the
 * answer back, so a value can never be offered under one label and shown under
 * another. The values are the API's: `StoreSalonLeadRequest` refuses anything
 * else, and the same value arrives whichever language the sheet was filled in.
 *
 * The French labels are the paper sheet's own wording. The back office reads in
 * French, so the plain exports below are the French lists; the public form asks
 * for its visitor's language through `salonOptions`.
 */

import type { Locale } from "@/lib/i18n/config";

export type Option = { value: string; label: string };

type Choice = { value: string; label: Record<Locale, string> };

const ANCIENNETE_CHOICES: Choice[] = [
  { value: "moins_6_mois", label: { fr: "< 6 mois", en: "< 6 months", de: "< 6 Monate" } },
  { value: "1_3_ans", label: { fr: "1–3 ans", en: "1–3 years", de: "1–3 Jahre" } },
  { value: "3_5_ans", label: { fr: "3–5 ans", en: "3–5 years", de: "3–5 Jahre" } },
  { value: "5_10_ans", label: { fr: "5–10 ans", en: "5–10 years", de: "5–10 Jahre" } },
  { value: "plus_10_ans", label: { fr: "+10 ans", en: "10+ years", de: "10+ Jahre" } },
];

const BESOIN_CHOICES: Choice[] = [
  {
    value: "financement",
    label: {
      fr: "Financement / Trésorerie",
      en: "Financing / Cash flow",
      de: "Finanzierung / Liquidität",
    },
  },
  {
    value: "site_web",
    label: {
      fr: "Création / Refonte site web",
      en: "Website creation / redesign",
      de: "Website-Erstellung / Relaunch",
    },
  },
  { value: "migration", label: { fr: "Migration", en: "Migration", de: "Migration" } },
  {
    value: "developpement_commercial",
    label: {
      fr: "Développement commercial",
      en: "Business development",
      de: "Vertriebsentwicklung",
    },
  },
  { value: "autre", label: { fr: "Autre", en: "Other", de: "Sonstiges" } },
];

const MOTIF_CHOICES: Choice[] = [
  { value: "tresorerie", label: { fr: "Trésorerie", en: "Cash flow", de: "Liquidität" } },
  { value: "developpement", label: { fr: "Développement", en: "Growth", de: "Wachstum" } },
  { value: "materiel", label: { fr: "Matériel", en: "Equipment", de: "Ausrüstung" } },
  { value: "stock", label: { fr: "Stock", en: "Inventory", de: "Lagerbestand" } },
  { value: "recrutement", label: { fr: "Recrutement", en: "Hiring", de: "Personalgewinnung" } },
  { value: "investissement", label: { fr: "Investissement", en: "Investment", de: "Investition" } },
  { value: "autre", label: { fr: "Autre", en: "Other", de: "Sonstiges" } },
];

const DELAI_CHOICES: Choice[] = [
  { value: "urgent", label: { fr: "Urgent", en: "Urgent", de: "Dringend" } },
  { value: "moins_1_mois", label: { fr: "< 1 mois", en: "< 1 month", de: "< 1 Monat" } },
  { value: "1_3_mois", label: { fr: "1–3 mois", en: "1–3 months", de: "1–3 Monate" } },
  { value: "plus_3_mois", label: { fr: "+3 mois", en: "3+ months", de: "3+ Monate" } },
];

const inLocale = (choices: Choice[], locale: Locale): Option[] =>
  choices.map((choice) => ({ value: choice.value, label: choice.label[locale] }));

/** Every list on the sheet, labelled in the visitor's language. */
export function salonOptions(locale: Locale) {
  return {
    anciennetes: inLocale(ANCIENNETE_CHOICES, locale),
    besoins: inLocale(BESOIN_CHOICES, locale),
    motifs: inLocale(MOTIF_CHOICES, locale),
    delais: inLocale(DELAI_CHOICES, locale),
  };
}

export type SalonOptions = ReturnType<typeof salonOptions>;

/* The back office's lists, in French. */
export const ANCIENNETES = inLocale(ANCIENNETE_CHOICES, "fr");
export const BESOINS = inLocale(BESOIN_CHOICES, "fr");
export const MOTIFS = inLocale(MOTIF_CHOICES, "fr");
export const DELAIS = inLocale(DELAI_CHOICES, "fr");

/**
 * The label for a stored value — or the value itself, so a choice retired from
 * the sheet still reads as something rather than as nothing.
 */
export function labelOf(options: Option[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
