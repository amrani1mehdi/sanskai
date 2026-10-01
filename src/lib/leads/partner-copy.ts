import type { Locale } from "@/lib/i18n/config";

/**
 * The partner page's and form's copy, in the three languages the site serves.
 *
 * Kept out of `@/lib/i18n/translations` for the reason the blog's and the
 * client sheet's copy are: that file is a transcript of the live site's i18next
 * bundle, and none of this is in it. The French is the wording Sansekai sent
 * for the page; the English and German say the same thing.
 *
 * Yes and no, the file hint and the validation messages are the site's shared
 * form strings, read from `content.form`, so they are not repeated here.
 */

export type PartnerCopy = {
  metaTitle: string;
  metaDescription: string;
  /** The header and footer link to the page. */
  navLabel: string;
  title: string;
  intro: string;
  form: {
    blocks: { identity: string; documents: string; emails: string };
    fields: {
      cabinet: string;
      lastName: string;
      firstName: string;
      phone: string;
      kbis: string;
      independent: string;
      employerCertificate: string;
      identityCard: string;
      housingCertificate: string;
      rib: string;
      contractEmail: string;
      billingEmail: string;
      emailPlaceholder: string;
    };
    upload: {
      /** The drop zone's own text. */
      choose: string;
      /** Once the recto is in, the identity slot asks for the verso. */
      addBack: string;
      /** The tag on a slot that must be filled. */
      required: string;
    };
    fileRequired: string;
    choiceRequired: string;
    submit: string;
    sentTitle: string;
    sentBody: string;
  };
};

const COPY: Record<Locale, PartnerCopy> = {
  fr: {
    metaTitle: "Devenir partenaire | Sansekai Solution",
    metaDescription:
      "Cabinets partenaires de Sansekai Solution : transmettez en quelques minutes les documents et informations nécessaires au lancement de notre collaboration.",
    navLabel: "Devenir partenaire",
    title: "Récupération de vos documents",
    intro:
      "Dans le cadre du lancement de la collaboration entre votre cabinet & SANSEKAI SOLUTION, nous avons besoin de récupérer quelques documents et informations clés :",
    form: {
      blocks: {
        identity: "Vos informations",
        documents: "Vos documents (PDF, JPG ou PNG)",
        emails: "Vos adresses e-mail importantes",
      },
      fields: {
        cabinet: "Nom du cabinet *",
        lastName: "Nom *",
        firstName: "Prénom *",
        phone: "Téléphone *",
        kbis: "Extrait de Kbis *",
        independent: "Êtes-vous indépendant ? *",
        employerCertificate: "Salarié : Attestation d'employeur *",
        identityCard: "Carte d'identité recto/verso (1 ou 2 documents) *",
        housingCertificate: "Attestation d'hébergement *",
        rib: "RIB *",
        contractEmail: "Adresse e-mail à faire figurer sur les contrats *",
        billingEmail: "Adresse e-mail de facturation *",
        emailPlaceholder: "john.doe@gmail.com",
      },
      upload: {
        choose: "Cliquez pour choisir un fichier ou glissez-le ici",
        addBack: "Ajouter le verso",
        required: "Obligatoire",
      },
      fileRequired: "Ajoutez ce document.",
      choiceRequired: "Choisissez Oui ou Non.",
      submit: "Envoyer",
      sentTitle: "Merci, vos documents ont bien été envoyés",
      sentBody:
        "Notre équipe revient vers vous rapidement pour la suite de notre collaboration.",
    },
  },
  en: {
    metaTitle: "Become a partner | Sansekai Solution",
    metaDescription:
      "Sansekai Solution partner firms: send the documents and information needed to launch our collaboration in just a few minutes.",
    navLabel: "Become a partner",
    title: "Submitting your documents",
    intro:
      "As part of launching the collaboration between your firm & SANSEKAI SOLUTION, we need to collect a few key documents and details:",
    form: {
      blocks: {
        identity: "Your details",
        documents: "Your documents (PDF, JPG or PNG)",
        emails: "Your important email addresses",
      },
      fields: {
        cabinet: "Firm name *",
        lastName: "Last name *",
        firstName: "First name *",
        phone: "Phone *",
        kbis: "Kbis extract (company registration) *",
        independent: "Are you self-employed? *",
        employerCertificate: "Employee: certificate of employment *",
        identityCard: "ID card, front and back (1 or 2 documents) *",
        housingCertificate: "Certificate of accommodation *",
        rib: "Bank details (RIB) *",
        contractEmail: "Email address to appear on contracts *",
        billingEmail: "Billing email address *",
        emailPlaceholder: "john.doe@gmail.com",
      },
      upload: {
        choose: "Click to choose a file or drag it here",
        addBack: "Add the back side",
        required: "Required",
      },
      fileRequired: "Add this document.",
      choiceRequired: "Choose Yes or No.",
      submit: "Send",
      sentTitle: "Thank you, your documents have been sent",
      sentBody: "Our team will be in touch shortly about the next steps of our collaboration.",
    },
  },
  de: {
    metaTitle: "Partner werden | Sansekai Solution",
    metaDescription:
      "Partnerkanzleien von Sansekai Solution: Übermitteln Sie in wenigen Minuten die Unterlagen und Angaben für den Start unserer Zusammenarbeit.",
    navLabel: "Partner werden",
    title: "Übermittlung Ihrer Unterlagen",
    intro:
      "Im Rahmen des Starts der Zusammenarbeit zwischen Ihrer Kanzlei & SANSEKAI SOLUTION benötigen wir einige wichtige Unterlagen und Angaben:",
    form: {
      blocks: {
        identity: "Ihre Angaben",
        documents: "Ihre Unterlagen (PDF, JPG oder PNG)",
        emails: "Ihre wichtigen E-Mail-Adressen",
      },
      fields: {
        cabinet: "Name der Kanzlei *",
        lastName: "Nachname *",
        firstName: "Vorname *",
        phone: "Telefon *",
        kbis: "Kbis-Auszug (Handelsregisterauszug) *",
        independent: "Sind Sie selbstständig? *",
        employerCertificate: "Angestellt: Arbeitgeberbescheinigung *",
        identityCard: "Personalausweis Vorder- und Rückseite (1 oder 2 Dokumente) *",
        housingCertificate: "Unterkunftsbescheinigung *",
        rib: "Bankverbindung (RIB) *",
        contractEmail: "E-Mail-Adresse für die Verträge *",
        billingEmail: "E-Mail-Adresse für die Rechnungsstellung *",
        emailPlaceholder: "john.doe@gmail.com",
      },
      upload: {
        choose: "Klicken Sie, um eine Datei auszuwählen, oder ziehen Sie sie hierher",
        addBack: "Rückseite hinzufügen",
        required: "Pflichtfeld",
      },
      fileRequired: "Bitte fügen Sie dieses Dokument hinzu.",
      choiceRequired: "Bitte wählen Sie Ja oder Nein.",
      submit: "Senden",
      sentTitle: "Vielen Dank, Ihre Unterlagen wurden gesendet",
      sentBody:
        "Unser Team meldet sich in Kürze zu den nächsten Schritten unserer Zusammenarbeit.",
    },
  },
};

export function getPartnerCopy(locale: Locale): PartnerCopy {
  return COPY[locale];
}
