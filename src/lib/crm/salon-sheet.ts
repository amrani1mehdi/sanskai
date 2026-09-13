/**
 * A trade-show client sheet, laid out as the back office reads it.
 *
 * The board's side panel and the lead page both show a salon lead, in different
 * markup. They share this so the two cannot disagree about what a sheet says:
 * which answers appear, under which label, and how a ticked "Autre" reads.
 */

import { formatAmount } from "@/lib/crm/format";
import type { Lead } from "@/lib/crm/types";
import {
  ANCIENNETES,
  BESOINS,
  DELAIS,
  MOTIFS,
  labelOf,
  type Option,
} from "@/lib/leads/salon";

export type SheetRow = { label: string; value?: string };

/** Ticked boxes as one line, with "Autre" carrying what was written beside it. */
function ticked(
  options: Option[],
  values: string[] | undefined,
  other: string | null | undefined,
): string | undefined {
  if (!values || values.length === 0) return undefined;

  return values
    .map((value) =>
      value === "autre" && other ? `Autre : ${other}` : labelOf(options, value),
    )
    .join(", ");
}

const text = (value: string | null | undefined) => value ?? undefined;

export function salonSheet(lead: Lead) {
  const details = lead.details;
  const wantsFinancing = details?.besoins.includes("financement") ?? false;

  return {
    entreprise: [
      { label: "Secteur / activité", value: text(details?.secteur) },
      /* No city: it has a column, and both views show it with the address
         fields already. Listing it here would put it on screen twice. */
      { label: "Site web", value: lead.siteWebUrl },
      { label: "E-mail de l'entreprise", value: text(details?.emailEntreprise) },
      {
        label: "Ancienneté",
        value: details?.anciennete ? labelOf(ANCIENNETES, details.anciennete) : undefined,
      },
      { label: "Salariés", value: text(details?.salaries) },
    ] satisfies SheetRow[],

    contact: [
      { label: "Fonction", value: text(details?.fonction) },
      { label: "Fixe", value: text(details?.telephoneFixe) },
    ] satisfies SheetRow[],

    besoins: ticked(BESOINS, details?.besoins, details?.besoinAutre),

    /* Null rather than a block of blanks when financing was not a need: the
       sheet only asks these questions when it was. */
    financement: wantsFinancing
      ? ([
          {
            label: "Montant souhaité",
            value: lead.montant ? formatAmount(lead.montant) : undefined,
          },
          { label: "Motif", value: ticked(MOTIFS, details?.motifs, details?.motifAutre) },
          {
            label: "Délai",
            value: details?.delai ? labelOf(DELAIS, details.delai) : undefined,
          },
        ] satisfies SheetRow[])
      : null,
  };
}
