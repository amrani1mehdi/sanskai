import type { Locale } from "@/lib/i18n/config";

/**
 * The client sheet's page and form copy, in the three languages the site serves.
 *
 * Kept out of `@/lib/i18n/translations` for the reason the blog's copy is: that
 * file is a transcript of the live site's i18next bundle, and none of this is in
 * it. The French is the paper sheet's own wording; the English and German say
 * the same thing for visitors at a stand who do not read French.
 *
 * The choice labels — company age, needs, purpose, timeframe — live with their
 * values in `@/lib/leads/salon`, where the back office reads them too.
 */

export type SalonCopy = {
  metaTitle: string;
  metaDescription: string;
  /** The event's own name, so it is not translated. */
  badge: string;
  title: string;
  subtitle: string;
  intro: string;
  form: {
    blocks: { company: string; contact: string; need: string; financing: string };
    fields: {
      company: string;
      sector: string;
      website: string;
      websitePlaceholder: string;
      city: string;
      companyEmail: string;
      companyAge: string;
      employees: string;
      manager: string;
      role: string;
      mobile: string;
      landline: string;
      email: string;
      needs: string;
      otherNeed: string;
      amount: string;
      purpose: string;
      otherPurpose: string;
      timeframe: string;
    };
    needRequired: string;
    submit: string;
    sentTitle: string;
    sentBody: string;
    another: string;
  };
};

const COPY: Record<Locale, SalonCopy> = {
  fr: {
    metaTitle: "Fiche client | Sansekai Solution",
    metaDescription:
      "Fiche client Sansekai Solution : présentez votre entreprise et votre besoin, notre équipe vous recontacte sous 24 heures.",
    badge: "Salon SME",
    title: "Fiche client",
    subtitle: "Accompagnement des TPE-PME-PMI · Trésorerie & solutions de financement",
    intro:
      "Quelques minutes suffisent : présentez votre entreprise et votre besoin, notre équipe vous recontacte sous 24 heures.",
    form: {
      blocks: {
        company: "Entreprise",
        contact: "Contact",
        need: "Besoin principal",
        financing: "Si besoin de financement",
      },
      fields: {
        company: "Nom de l'entreprise *",
        sector: "Secteur / activité",
        website: "Site web",
        websitePlaceholder: "www.votre-site.fr",
        city: "Ville / localisation",
        companyEmail: "E-mail de l'entreprise",
        companyAge: "Ancienneté",
        employees: "Salariés",
        manager: "Nom du dirigeant *",
        role: "Fonction",
        mobile: "Mobile *",
        landline: "Fixe",
        email: "E-mail *",
        needs: "Cochez tout ce qui s'applique *",
        otherNeed: "Autre besoin *",
        amount: "Montant souhaité (€)",
        purpose: "Motif",
        otherPurpose: "Autre motif *",
        timeframe: "Délai",
      },
      needRequired: "Cochez au moins un besoin.",
      submit: "Envoyer ma fiche",
      sentTitle: "Merci, votre fiche est bien envoyée",
      sentBody: "Notre équipe revient vers vous sous 24 heures.",
      another: "Remplir une nouvelle fiche",
    },
  },
  en: {
    metaTitle: "Client form | Sansekai Solution",
    metaDescription:
      "Sansekai Solution client form: tell us about your business and what you need, and our team will get back to you within 24 hours.",
    badge: "Salon SME",
    title: "Client form",
    subtitle: "Supporting small and mid-sized businesses · Cash flow & financing solutions",
    intro:
      "It only takes a few minutes: tell us about your business and what you need, and our team will get back to you within 24 hours.",
    form: {
      blocks: {
        company: "Company",
        contact: "Contact",
        need: "Main need",
        financing: "If you need financing",
      },
      fields: {
        company: "Company name *",
        sector: "Industry / activity",
        website: "Website",
        websitePlaceholder: "www.your-website.com",
        city: "City / location",
        companyEmail: "Company email",
        companyAge: "Company age",
        employees: "Employees",
        manager: "Manager's name *",
        role: "Role",
        mobile: "Mobile *",
        landline: "Landline",
        email: "Email *",
        needs: "Tick all that apply *",
        otherNeed: "Other need *",
        amount: "Amount required (€)",
        purpose: "Purpose",
        otherPurpose: "Other purpose *",
        timeframe: "Timeframe",
      },
      needRequired: "Tick at least one need.",
      submit: "Send my form",
      sentTitle: "Thank you, your form has been sent",
      sentBody: "Our team will get back to you within 24 hours.",
      another: "Fill in another form",
    },
  },
  de: {
    metaTitle: "Kundenformular | Sansekai Solution",
    metaDescription:
      "Kundenformular von Sansekai Solution: Stellen Sie Ihr Unternehmen und Ihren Bedarf vor – unser Team meldet sich innerhalb von 24 Stunden.",
    badge: "Salon SME",
    title: "Kundenformular",
    subtitle:
      "Begleitung kleiner und mittlerer Unternehmen · Liquidität & Finanzierungslösungen",
    intro:
      "Es dauert nur wenige Minuten: Stellen Sie Ihr Unternehmen und Ihren Bedarf vor, und unser Team meldet sich innerhalb von 24 Stunden bei Ihnen.",
    form: {
      blocks: {
        company: "Unternehmen",
        contact: "Kontakt",
        need: "Hauptbedarf",
        financing: "Bei Finanzierungsbedarf",
      },
      fields: {
        company: "Name des Unternehmens *",
        sector: "Branche / Tätigkeit",
        website: "Website",
        websitePlaceholder: "www.ihre-website.de",
        city: "Stadt / Standort",
        companyEmail: "E-Mail des Unternehmens",
        companyAge: "Unternehmensalter",
        employees: "Mitarbeitende",
        manager: "Name der Geschäftsführung *",
        role: "Funktion",
        mobile: "Mobil *",
        landline: "Festnetz",
        email: "E-Mail *",
        needs: "Bitte alles Zutreffende ankreuzen *",
        otherNeed: "Anderer Bedarf *",
        amount: "Gewünschter Betrag (€)",
        purpose: "Zweck",
        otherPurpose: "Anderer Zweck *",
        timeframe: "Zeitrahmen",
      },
      needRequired: "Bitte kreuzen Sie mindestens einen Bedarf an.",
      submit: "Formular senden",
      sentTitle: "Vielen Dank, Ihr Formular wurde gesendet",
      sentBody: "Unser Team meldet sich innerhalb von 24 Stunden bei Ihnen.",
      another: "Weiteres Formular ausfüllen",
    },
  },
};

export function getSalonCopy(locale: Locale): SalonCopy {
  return COPY[locale];
}
