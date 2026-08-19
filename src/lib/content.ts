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
import type { Locale } from "@/lib/i18n/config";

export type NavLink = { label: string; href: string };

export type Solution = {
  id: string;
  icon: "trending-up" | "bitcoin";
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

export type CryptoCard = {
  icon: "wallet" | "chart" | "trade";
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

/** The interview block is hardcoded in French on the live site. */
const INTERVIEW = {
  badge: "Interview",
  title: "Interview / Analyse crypto",
  description:
    "Découvrez une analyse autour du Bitcoin et de son utilisation, dans le cadre de notre contenu d'information sur les crypto-actifs.",
  videoId: "1ekyt9e3WYQ",
  disclaimer:
    "Contenu informatif uniquement. Ceci ne constitue pas un conseil en investissement.",
};

/**
 * Strings this rebuild needs that the live site has no equivalent for — the
 * "All" chart range is unavailable on CoinGecko's free tier, which the live
 * site simply renders as an empty chart.
 */
const EXTRA: Record<Locale, { chartUnavailable: string }> = {
  en: {
    chartUnavailable: "This range isn't available on the current CoinGecko plan.",
  },
  fr: {
    chartUnavailable:
      "Cette période n'est pas disponible avec l'offre CoinGecko actuelle.",
  },
  de: {
    chartUnavailable:
      "Dieser Zeitraum ist im aktuellen CoinGecko-Tarif nicht verfügbar.",
  },
};

/** Turns the live site's "• one\n• two" bullet blob into a list. */
function toBullets(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[•\s]+/, "").trim())
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
      links: [{ label: t.nav.crypto, href: "/crypto-monnaie" }] as NavLink[],
      cta: { label: t.nav.requestFinancing, href: "/financement" },
    },

    hero: {
      eyebrow: t.hero.badge,
      titleLead: `${t.hero.title1} `,
      titleAccent: t.hero.titleHighlight,
      titleTrail: ` ${t.hero.title2}`,
      bullets: toBullets(t.hero.subtitle),
      primaryCta: { label: t.hero.ctaFinancing, href: "/financement" },
      secondaryCta: { label: t.hero.ctaCrypto, href: "/crypto-monnaie" },
      backgroundImage: "/images/hero-bg.jpg",
    },

    solutions: [
      {
        id: "cash-flow",
        icon: "trending-up",
        title: t.services.cashflow.title,
        description: t.services.cashflow.desc,
        cta: t.services.cashflow.cta,
        href: "/financement",
      },
      {
        id: "crypto",
        icon: "bitcoin",
        title: t.services.invest.title,
        description: t.services.invest.desc,
        cta: t.services.invest.cta,
        href: "/crypto-monnaie",
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

    crypto: {
      eyebrow: t.cryptoMarket.label,
      /** Rendered whole, as on the live site — the title has no accent split. */
      title: t.cryptoMarket.title,
      subtitle: t.cryptoMarket.subtitle,
      disclaimer: t.cryptoMarket.disclaimer,
      searchPlaceholder: t.cryptoMarket.searchPlaceholder,
      updated: t.cryptoMarket.updated,
      noResults: t.cryptoMarket.noResults,
      error: t.cryptoMarket.error,
      pageInfo: t.cryptoMarket.pageInfo,
      columns: [
        "#",
        t.cryptoMarket.col.name,
        t.cryptoMarket.col.price,
        "24H",
        "7D",
        t.cryptoMarket.col.marketCap,
        t.cryptoMarket.col.volume,
        t.cryptoMarket.col.supply,
        t.cryptoMarket.col.last7d,
      ],

      /** Row detail modal. */
      detail: {
        marketCap: t.cryptoMarket.marketCap,
        volume24h: t.cryptoMarket.volume24h,
        supply: t.cryptoMarket.supply,
        rank: t.cryptoMarket.rank,
        about: t.cryptoMarket.about,
        chartUnavailable: EXTRA[locale].chartUnavailable,
      },
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
      primaryCta: { label: t.cta.primary, href: "/financement" },
      secondaryCta: {
        label: t.nav.contact,
        href: "mailto:admin@sansekaisolution.com",
      },
    },

    footer: {
      description: t.footer.disclaimer,
      badge: t.footer.confidential,
      columns: [
        {
          title: t.footer.services,
          links: [
            { label: t.nav.cashflow, href: "/financement" },
            { label: t.nav.crypto, href: "/crypto-monnaie" },
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

    /** /crypto-monnaie — cryptocurrency page. */
    cryptoPage: {
      meta: t.meta.crypto,
      badge: t.cryptoPage.badge,
      title: t.cryptoPage.title,
      subtitle: t.cryptoPage.subtitle,
      heroDesc: t.cryptoPage.heroDesc,
      interview: INTERVIEW,
      explainer: t.cryptoPage.explainer,
      benefits: [
        t.cryptoPage.benefit1,
        t.cryptoPage.benefit2,
        t.cryptoPage.benefit3,
      ],
      cards: [
        {
          icon: "wallet",
          title: t.cryptoPage.wallet,
          description: t.cryptoPage.walletDesc,
        },
        {
          icon: "chart",
          title: t.cryptoPage.management,
          description: t.cryptoPage.managementDesc,
        },
        {
          icon: "trade",
          title: t.cryptoPage.trading,
          description: t.cryptoPage.tradingDesc,
        },
      ] satisfies CryptoCard[],
      formTitle: t.cryptoPage.formTitle,
      formDesc: t.cryptoPage.formDesc,
    },

    cookieBanner: {
      text: t.gdpr.bannerText,
      accept: t.gdpr.accept,
      decline: t.gdpr.decline,
    },
  };
}

export type SiteContent = ReturnType<typeof getSiteContent>;
