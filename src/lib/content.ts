/**
 * Every string rendered by the site, assembled per locale.
 *
 * The live site keeps its copy in a flat i18next dictionary; this module
 * reshapes that dictionary (`@/lib/i18n/translations`) into the structure the
 * components read. Components take the result as a `content` prop rather than
 * importing it, so one request renders one language.
 *
 * The admin panel that comes next can replace `translations` with the same
 * shape loaded from the database — keep the types stable.
 */

import { translations } from "@/lib/i18n/translations";
import { getBlogCopy } from "@/lib/blog/copy";
import { localeHref, type Locale } from "@/lib/i18n/config";

export type NavLink = { label: string; href: string };

export type Solution = {
  id: string;
  icon: "trending-up" | "rocket";
  title: string;
  description: string;
  cta: string;
  href: string;
};

export type TrustItem = {
  icon: "clock" | "shield" | "users" | "lock" | "award";
  title: string;
  subtitle: string;
};

export type Advantage = { title: string; description: string };

export type BusinessService = {
  icon: "website" | "logo" | "migration";
  title: string;
  description: string;
  /** What the service actually covers, listed on the card. */
  features: readonly string[];
};

export type ExpertiseItem = {
  icon: "chart" | "globe" | "shield" | "cpu";
  title: string;
  description: string;
};

export type Registry = { country: string; name: string; href: string };

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  rating: number;
};

/** Company registries — names and URLs, so they read the same in every locale. */
const REGISTRIES: Registry[] = [
  { country: "France", name: "Pappers", href: "https://www.pappers.fr" },
  { country: "France", name: "Societe.com", href: "https://www.societe.com" },
  { country: "France", name: "Infogreffe", href: "https://www.infogreffe.fr" },
  {
    country: "United Kingdom",
    name: "Companies House",
    href: "https://find-and-update.company-information.service.gov.uk",
  },
  {
    country: "Germany",
    name: "Unternehmensregister",
    href: "https://www.unternehmensregister.de",
  },
];

/** Client quotes are left in French on the live site, in every language. */
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Grâce à Sansekai Solution, j’ai obtenu un financement de 250 000 € en moins de 3 semaines. Leur accompagnement a été exceptionnel du début à la fin.",
    author: "Sophie L.",
    role: "Fondatrice, startup tech",
    rating: 5,
  },
  {
    quote:
      "Un service professionnel et rassurant. Ils ont trouvé la solution parfaite pour optimiser notre trésorerie. Je recommande sans hésiter.",
    author: "Marc D.",
    role: "Gérant, PME industrielle",
    rating: 5,
  },
  {
    quote:
      "L’équipe m’a guidée étape par étape. Résultat : 80 000 € débloqués rapidement avec des conditions très avantageuses. Merci Sansekai !",
    author: "Amina K.",
    role: "Entrepreneure, e-commerce",
    rating: 5,
  },
];

/** Turns the live site's "• one\n• two" bullet blob into a list. */
function toBullets(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[•\s]+/, "").trim())
    .filter(Boolean);
}

/** Splits a copy block into its paragraphs, blank lines discarded. */
function toParagraphs(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getSiteContent(locale: Locale) {
  const t = translations[locale];
  const year = new Date().getFullYear();

  return {
    meta: {
      ...t.meta.home,
      url: "https://sansekaisolution.com",
    },

    brand: {
      name: "SANSEKAI",
      nameAccent: "Solution",
      logo: "/images/sansekai-logo.jpeg",
      legalName: "SANSEKAI Solution LTD",
    },

    nav: {
      links: [
        { label: t.nav.business, href: localeHref(locale, "/developpement-digital") },
        /* The blog. Its label comes from `@/lib/blog/copy` rather than from
           `t`, because the articles section postdates the i18next bundle this
           file reshapes and adding to that bundle would break the one thing it
           is good for — being diffable against the live site's. */
        { label: getBlogCopy(locale).navLabel, href: localeHref(locale, "/blog") },
      ] as NavLink[],
      cta: { label: t.nav.requestFinancing, href: localeHref(locale, "/financement") },
      /* The same destination as the business link above. The drawer promotes it
         out of the list and sets it under the financing button; the desktop bar
         has room to keep it a link. */
      ctaSecondary: {
        label: t.nav.business,
        href: localeHref(locale, "/developpement-digital"),
      },
    },

    hero: {
      eyebrow: t.hero.badge,
      titleLead: `${t.hero.title1} `,
      titleAccent: t.hero.titleHighlight,
      titleTrail: ` ${t.hero.title2}`,
      bullets: toBullets(t.hero.subtitle),
      primaryCta: { label: t.hero.ctaFinancing, href: localeHref(locale, "/financement") },
      secondaryCta: {
        label: t.nav.business,
        href: localeHref(locale, "/developpement-digital"),
      },
      backgroundImage: "/images/hero-bg.jpg",
    },

    solutions: [
      {
        id: "cash-flow",
        icon: "trending-up",
        title: t.services.cashflow.title,
        description: t.services.cashflow.desc,
        cta: t.services.cashflow.cta,
        href: localeHref(locale, "/financement"),
      },
      {
        id: "business",
        icon: "rocket",
        title: t.services.business.title,
        description: t.services.business.desc,
        cta: t.services.business.cta,
        href: localeHref(locale, "/developpement-digital"),
      },
    ] satisfies Solution[],

    trustBar: [
      {
        icon: "clock",
        title: t.trust.response24h,
        subtitle: t.trust.response24hSub,
      },
      {
        icon: "shield",
        title: t.trust.noGuarantee,
        subtitle: t.trust.noGuaranteeSub,
      },
      {
        icon: "users",
        title: t.trust.expertSupport,
        subtitle: t.trust.expertSupportSub,
      },
      {
        icon: "lock",
        title: t.trust.confidential,
        subtitle: t.trust.confidentialSub,
      },
      { icon: "award", title: t.trust.london, subtitle: t.trust.londonSub },
    ] satisfies TrustItem[],

    solutionsSection: {
      titleLead: `${t.services.sectionTitle} `,
      titleAccent: t.services.sectionTitleHighlight,
      subtitle: t.services.sectionDesc,
    },


    advantages: {
      eyebrow: t.whyUs.sectionLabel,
      titleLead: `${t.whyUs.sectionTitle} `,
      titleAccent: t.whyUs.sectionTitleHighlight,
      subtitle: t.whyUs.sectionDesc,
      items: [
        { title: t.whyUs.independence, description: t.whyUs.independenceDesc },
        { title: t.whyUs.network, description: t.whyUs.networkDesc },
        { title: t.whyUs.successRate, description: t.whyUs.successRateDesc },
        { title: t.whyUs.personalized, description: t.whyUs.personalizedDesc },
        { title: t.whyUs.speed, description: t.whyUs.speedDesc },
        {
          title: t.whyUs.independenceAlt,
          description: t.whyUs.independenceAltDesc,
        },
        { title: t.whyUs.networkAlt, description: t.whyUs.networkAltDesc },
      ] satisfies Advantage[],
    },

    registries: {
      eyebrow: t.registries.label,
      title: t.registries.title,
      subtitle: t.registries.desc,
      items: REGISTRIES,
    },

    testimonials: {
      eyebrow: t.reviews.sectionLabel,
      titleLead: `${t.reviews.sectionTitle} `,
      titleAccent: t.reviews.sectionTitleHighlight,
      items: TESTIMONIALS,
    },

    finalCta: {
      titleLead: `${t.cta.title} `,
      titleAccent: t.cta.titleHighlight,
      subtitle: t.cta.desc,
      primaryCta: { label: t.cta.primary, href: localeHref(locale, "/financement") },
      secondaryCta: {
        label: t.nav.contact,
        href: localeHref(locale, "/contact"),
      },
    },

    footer: {
      description: t.footer.disclaimer,
      badge: t.footer.confidential,
      columns: [
        {
          title: t.footer.services,
          links: [
            { label: t.nav.cashflow, href: localeHref(locale, "/financement") },
            { label: t.nav.business, href: localeHref(locale, "/developpement-digital") },
            { label: getBlogCopy(locale).navLabel, href: localeHref(locale, "/blog") },
          ] as NavLink[],
        },
      ],
      contact: {
        title: t.footer.contact,
        email: "admin@sansekaisolution.com",
        instagram: {
          handle: "@sansekaisolution",
          href: "https://www.instagram.com/sansekaisolution",
        },
      },
      copyright: t.footer.copyright.replace("{{year}}", String(year)),
    },

    /** Shared form field labels — the live site reuses these across pages. */
    form: t.form,

    common: t.common,

    /** /financement — cash flow financing page. */
    financing: {
      meta: t.meta.financing,
      badge: t.cashflowPage.badge,
      title: t.cashflowPage.title,
      subtitle: t.cashflowPage.subtitle,
      heroDesc: t.cashflowPage.heroDesc,
      formTitle: t.cashflowPage.formTitle,
      formSubtitle: t.cashflowPage.formSubtitle,
      benefits: [
        t.cashflowPage.benefit1,
        t.cashflowPage.benefit2,
        t.cashflowPage.benefit3,
        t.cashflowPage.benefit4,
      ],
      reqTitle: t.cashflowPage.reqTitle,
      requirements: [t.cashflowPage.req1, t.cashflowPage.req2],
      faqTitle: t.cashflowPage.faqTitle,
      faqs: [
        { question: t.cashflowPage.faq1q, answer: t.cashflowPage.faq1a },
        { question: t.cashflowPage.faq2q, answer: t.cashflowPage.faq2a },
        { question: t.cashflowPage.faq3q, answer: t.cashflowPage.faq3a },
      ],
    },

    /** /developpement-digital — business development page. */
    businessDevelopment: {
      meta: t.meta.business,
      badge: t.businessPage.badge,
      title: t.businessPage.title,
      subtitle: t.businessPage.subtitle,
      /* One value, one paragraph per line — the same shape the hero reads its
         bullets from, so a second paragraph is a newline rather than a key. */
      desc: toParagraphs(t.businessPage.desc),
      services: [
        {
          icon: "website",
          title: t.businessPage.websiteTitle,
          description: t.businessPage.websiteDesc,
          features: t.businessPage.websiteFeatures,
        },
        {
          icon: "logo",
          title: t.businessPage.logoTitle,
          description: t.businessPage.logoDesc,
          features: t.businessPage.logoFeatures,
        },
        {
          icon: "migration",
          title: t.businessPage.migrationTitle,
          description: t.businessPage.migrationDesc,
          features: t.businessPage.migrationFeatures,
        },
      ] satisfies BusinessService[],
      requestService: t.businessPage.requestService,
      form: {
        title: t.businessPage.formTitle,
        description: t.businessPage.formDesc,
      },
    },


    /** /expertise — expertise page. */
    expertise: {
      meta: t.meta.expertise,
      badge: t.expertisePage.badge,
      title: t.expertisePage.title,
      subtitle: t.expertisePage.subtitle,
      desc: t.expertisePage.desc,
      items: [
        {
          icon: "chart",
          title: t.expertisePage.exp1,
          description: t.expertisePage.exp1Desc,
        },
        {
          icon: "globe",
          title: t.expertisePage.exp2,
          description: t.expertisePage.exp2Desc,
        },
        {
          icon: "shield",
          title: t.expertisePage.exp3,
          description: t.expertisePage.exp3Desc,
        },
        {
          icon: "cpu",
          title: t.expertisePage.exp4,
          description: t.expertisePage.exp4Desc,
        },
      ] satisfies ExpertiseItem[],
    },

    /** /contact — contact page. */
    contact: {
      meta: t.meta.contact,
      badge: t.contactPage.title,
      title: t.contactPage.subtitle,
      desc: t.contactPage.desc,
      formTitle: t.contactPage.formTitle,
      formDesc: t.contactPage.formDesc,
      fields: {
        company: t.contactPage.fieldCompany,
        siren: t.contactPage.fieldSiren,
        fullName: t.contactPage.fieldFullName,
        email: t.contactPage.fieldEmail,
        message: t.contactPage.fieldMessage,
        upload: t.contactPage.fieldUpload,
      },
      uploadHint: "PDF, max 10MB",
      submit: t.contactPage.submit,
      sending: t.contactPage.sending,
      success: t.contactPage.success,
      successDesc: t.contactPage.successDesc,
      error: t.contactPage.error,
      email: "admin@sansekaisolution.com",
    },

    /** The live site's 404 is hardcoded English, with no nav or footer. */
    notFound: {
      title: "404",
      message: "Oops! Page not found",
      cta: "Return to Home",
    },

    cookieBanner: {
      text: t.gdpr.bannerText,
      accept: t.gdpr.accept,
      decline: t.gdpr.decline,
    },
  };
}

export type SiteContent = ReturnType<typeof getSiteContent>;
