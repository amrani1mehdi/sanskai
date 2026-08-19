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

    /** Row detail modal. */
    detail: {
      marketCap: "Market Cap",
      volume24h: "24h Volume",
      supply: "Circulating Supply",
      rank: "Rank",
      about: "About",
      chartUnavailable:
        "This range isn't available on the current CoinGecko plan.",
    },
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

  /** Shared form field labels — the live site reuses these across pages. */
  form: {
    lastName: "Last name *",
    firstName: "First name *",
    phone: "Phone *",
    email: "Email *",
    company: "Company name *",
    address: "Company address",
    postalCode: "Postal code *",
    city: "City *",
    revenue: "Monthly turnover *",
    amount: "Amount requested *",
    commercialCode: "Commercial Code",
    message: "Message",
    submit: "Send",
    sent: "Message sent ✓",
    treasuryRequest: "Treasury financing request",
    service: "Which service do you need?",
    selectService: "Select a service",
    walletCreation: "Wallet creation",
    walletManagement: "Portfolio management",
    buySell: "Buy/Sell",
    experience: "Cryptocurrency experience level *",
    selectLevel: "Select",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    objective: "What is your main objective",
    fillForm: "Fill in the form below",
  },

  common: {
    confidential: "100% confidential",
    response24h: "24h response",
    secure: "Fast & secure",
  },

  /** /financement — cash flow financing page. */
  financing: {
    meta: {
      title: "Business Financing for SMEs | Sansekai Solution",
      description:
        "Tailored business financing for SMEs from €2k to €3M: working capital, cash flow, stock and equipment funding with independent advisory.",
    },
    badge: "Financing",
    title: "Cash Flow Financing",
    subtitle:
      "Working Capital Needs · Cash Flow Financing · Overdraft Facility · Factoring Available",
    heroDesc:
      "From €2,000 to €150K, SANSEKAI Solution helps you find the right financial partners and supports you at every step with a personalised approach.",
    formTitle: "Request for Rapid Financing",
    formSubtitle:
      "Fill out this form and our team will contact you within 24 hours.",
    benefits: [
      "Access up to €150K to develop your projects",
      "Get validation within 24h after document review",
      "No personal guarantee required: your private assets stay protected",
      "Tailored support to find the right financial partner",
    ],
    reqTitle: "Eligibility Requirements",
    requirements: [
      "Business active for at least 3 months",
      "Monthly turnover above €5,000",
    ],
    faqTitle: "Frequently Asked Questions",
    faqs: [
      {
        question: "What types of cash flow financing do you offer?",
        answer:
          "We offer Working Capital Needs solutions, Cash Flow Financing, Overdraft Facilities and Factoring. Each solution is tailored to your business profile.",
      },
      {
        question: "How long does it take to obtain financing?",
        answer:
          "After receiving your complete application, we conduct a 24h assessment. Matching with the right financial partner takes 48 to 72 hours.",
      },
      {
        question: "Is a personal guarantee required?",
        answer:
          "No personal guarantee is required. Your private assets remain protected. Financing is based on your business activity and financial health.",
      },
    ],
  },

  /** /crypto-monnaie — cryptocurrency page. */
  cryptoPage: {
    meta: {
      title: "Crypto Investment Guidance | Sansekai Solution",
      description:
        "Sansekai Solution provides careful crypto investment guidance as part of wider business finance and investment support for entrepreneurs and SMEs.",
    },
    badge: "Cryptocurrency",
    title: "CRYPTOCURRENCY",
    subtitle: "SANSEKAI: Your gateway to crypto",
    heroDesc: `Our crypto solutions in brief:
• Wallet creation
• Portfolio management
• Buying & selling`,

    /** The interview block is hardcoded in French on the live site. */
    interview: {
      badge: "Interview",
      title: "Interview / Analyse crypto",
      description:
        "Découvrez une analyse autour du Bitcoin et de son utilisation, dans le cadre de notre contenu d'information sur les crypto-actifs.",
      videoId: "1ekyt9e3WYQ",
      disclaimer:
        "Contenu informatif uniquement. Ceci ne constitue pas un conseil en investissement.",
    },

    explainer:
      "The cryptocurrency market offers unique opportunities for diversification and growth. Whether you're a beginner or a seasoned investor, our team supports you with a personalised and secure approach.",
    benefits: [
      "Access to a secure and regulated platform",
      "Personalised support at every step",
      "Strategies tailored to your investor profile",
    ],
    cards: [
      {
        icon: "wallet",
        title: "Wallet Creation",
        description: "Setup and creation of your wallet on leading platforms.",
      },
      {
        icon: "chart",
        title: "Portfolio Management",
        description:
          "Personalised and secure management of your cryptocurrency portfolio to optimise your investments.",
      },
      {
        icon: "trade",
        title: "Buy/Sell",
        description:
          "Benefit from personalised assistance to buy and sell your cryptocurrencies with confidence.",
      },
    ] as CryptoCard[],
    formTitle: "Your crypto adventure starts here!",
    formDesc:
      "Want to create and manage a portfolio with assistance for buying and selling — SANSEKAI supports you at every step.",
  },

  cookieBanner: {
    text: "We use essential cookies for site operation. By continuing to browse, you accept the use of these cookies.",
    accept: "Accept",
    decline: "Decline",
  },
} as const;

export type SiteContent = typeof siteContent;
