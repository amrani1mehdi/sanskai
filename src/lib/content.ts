/**
 * Every string rendered by the landing page lives here.
 *
 * The admin panel that comes next will replace this module with the same
 * shape loaded from the database, so components stay untouched — keep the
 * types stable and read from `siteContent` only.
 */

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

export type Registry = { country: string; name: string; href: string };

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  rating: number;
};

export const siteContent = {
  meta: {
    title: "Sansekai Solution | SME Financing & Cash Flow",
    description:
      "Independent introducer for SME financing: working capital, cash flow, factoring and crypto-asset support across England, France, Germany, Canada and the United States.",
    url: "https://sansekaisolution.com",
  },

  brand: {
    name: "SANSEKAI",
    nameAccent: "Solution",
    logo: "/images/sansekai-logo.jpeg",
    legalName: "SANSEKAI Solution LTD",
  },

  nav: {
    links: [{ label: "Cryptocurrency", href: "/crypto-monnaie" }] as NavLink[],
    locale: { flag: "\u{1F1EC}\u{1F1E7}", code: "EN" },
    cta: { label: "Request Rapid Financing", href: "/financement" },
  },

  hero: {
    eyebrow:
      "FINANCING EXPERT · ENGLAND · FRANCE · GERMANY · CANADA · UNITED STATES",
    titleLead: "Easily access ",
    titleAccent: "financing",
    titleTrail: " for your business",
    bullets: [
      "Financing for upcoming orders and inventory",
      "Cash flow and working capital assistance",
      "Crypto-asset and investment support",
    ],
    primaryCta: { label: "Request financing", href: "/financement" },
    secondaryCta: { label: "Start with crypto", href: "/crypto-monnaie" },
    backgroundImage: "/images/hero-bg.jpg",
  },

  solutions: [
    {
      id: "cash-flow",
      icon: "trending-up",
      title: "Cash Flow Financing",
      description:
        "Working Capital Needs, Cash Flow Financing, Overdraft Facility and Factoring Available. From €2,000 to €150K.",
      cta: "Learn more",
      href: "/financement",
    },
    {
      id: "crypto",
      icon: "bitcoin",
      title: "Invest in Cryptocurrency",
      description:
        "Portfolio creation and management, buying and selling cryptocurrencies with personalised support.",
      cta: "Learn more",
      href: "/crypto-monnaie",
    },
  ] satisfies Solution[],

  trustBar: [
    { icon: "clock", title: "24h Response", subtitle: "Fast & free assessment" },
    {
      icon: "shield",
      title: "No Personal Guarantee",
      subtitle: "Your assets stay protected",
    },
    { icon: "users", title: "Expert Support", subtitle: "At every step" },
    { icon: "lock", title: "100% Confidential", subtitle: "Secured data" },
    {
      icon: "award",
      title: "London-Based",
      subtitle: "International expertise",
    },
  ] satisfies TrustItem[],

  solutionsSection: {
    titleLead: "Tailored financial ",
    titleAccent: "solutions",
    subtitle:
      "As an independent introducer, we select the best options for your project.",
  },

  crypto: {
    eyebrow: "LIVE MARKET",
    titleLead: "Live Cryptocurrency ",
    titleAccent: "Market",
    subtitle:
      "Top 250 cryptocurrencies, prices and trends in real time. Auto-refreshed every 45 seconds.",
    disclaimer:
      "Data provided by CoinGecko. For informational purposes only — not financial advice.",
    searchPlaceholder: "Search coin or ticker (e.g. BTC, Bitcoin)",
  },

  advantages: {
    eyebrow: "WHY CHOOSE US",
    titleLead: "Your success is ",
    titleAccent: "our priority",
    subtitle:
      "Sansekai Solution stands out through its client-centred approach and recognised expertise.",
    items: [
      {
        title: "Total Independence",
        description:
          "We are not affiliated with any lender. Our recommendations are 100% in your interest.",
      },
      {
        title: "Proven Partner Network",
        description:
          "Access to an international network of investment funds and financial institutions.",
      },
      {
        title: "High Success Rate",
        description:
          "Our expertise in application preparation maximises your chances of obtaining funding.",
      },
      {
        title: "Personalised Support",
        description:
          "A dedicated point of contact guides you at every stage, from initial assessment to fund release.",
      },
      {
        title: "Speed of Execution",
        description:
          "Free assessment within 24h and rapid matching with suitable partners.",
      },
      {
        title: "Complete independence",
        description:
          "We are not affiliated with any lender. Our recommendations are 100% in your best interest.",
      },
      {
        title: "Proven partner network",
        description:
          "Access to an international network of investment funds and financial institutions.",
      },
    ] satisfies Advantage[],
  },

  registries: {
    eyebrow: "COMPANY VERIFICATION",
    title: "Official Company Registries",
    subtitle: "Check official company information through national registries.",
    items: [
      { country: "France", name: "Pappers", href: "https://www.pappers.fr" },
      {
        country: "France",
        name: "Societe.com",
        href: "https://www.societe.com",
      },
      {
        country: "France",
        name: "Infogreffe",
        href: "https://www.infogreffe.fr",
      },
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
    ] satisfies Registry[],
  },

  testimonials: {
    eyebrow: "TESTIMONIALS",
    titleLead: "What our ",
    titleAccent: "clients say",
    items: [
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
    ] satisfies Testimonial[],
  },

  finalCta: {
    titleLead: "Ready to fund ",
    titleAccent: "your project?",
    subtitle:
      "Contact us now for a free, no-obligation assessment. Our team responds within 24 hours.",
    primaryCta: { label: "Request my free assessment", href: "/financement" },
    secondaryCta: {
      label: "Contact",
      href: "mailto:admin@sansekaisolution.com",
    },
  },

  footer: {
    description:
      "Sansekai Solution acts as an introducer and not a lender. We connect our clients with financial partners suited to their needs. All financing decisions are made by the relevant financial partner.",
    badge: "100% confidential · Fast & secure",
    columns: [
      {
        title: "Services",
        links: [
          { label: "Cash Flow Financing", href: "/financement" },
          { label: "Cryptocurrency", href: "/crypto-monnaie" },
        ] as NavLink[],
      },
    ],
    contact: {
      title: "Contact",
      email: "admin@sansekaisolution.com",
      instagram: {
        handle: "@sansekaisolution",
        href: "https://www.instagram.com/sansekaisolution",
      },
    },
    copyright: "© 2026 SANSEKAI Solution LTD. All rights reserved.",
  },

  cookieBanner: {
    text: "We use essential cookies for site operation. By continuing to browse, you accept the use of these cookies.",
    accept: "Accept",
    decline: "Decline",
  },
} as const;

export type SiteContent = typeof siteContent;
