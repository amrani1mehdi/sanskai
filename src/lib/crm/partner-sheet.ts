/**
 * A partner's onboarding form, laid out as the back office reads it.
 *
 * The board's side panel and the lead page both show a partner lead, in
 * different markup. They share this so the two cannot disagree about which
 * answers appear and under which label — the way `salon-sheet` does for the
 * trade-show sheet.
 *
 * Only what the columns do not already hold. The cabinet, the name and the
 * phone are the lead's own fields, shown and edited like any other lead's.
 */

import type { Lead } from "@/lib/crm/types";
import type { SheetRow } from "@/lib/crm/salon-sheet";

/** "Indépendant" or "Salarié", from the form's one yes/no question. */
function status(independant: boolean | null | undefined): string | undefined {
  if (independant === true) return "Indépendant";
  if (independant === false) return "Salarié";

  return undefined;
}

export function partnerSheet(lead: Lead) {
  /* A trade-show sheet's details share the field; only a partner's carry
     `emailFacturation`. */
  const details =
    lead.details && "emailFacturation" in lead.details ? lead.details : undefined;

  return {
    statut: [{ label: "Statut", value: status(details?.independant) }] satisfies SheetRow[],

    emails: [
      /* The contract address is the lead's own email: it is the one the
         partner is written to, so it is the one the CRM files them under. */
      { label: "E-mail des contrats", value: lead.email },
      { label: "E-mail de facturation", value: details?.emailFacturation ?? undefined },
    ] satisfies SheetRow[],
  };
}
