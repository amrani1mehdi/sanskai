import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";
import {
  graph,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/json-ld";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { meta, brand } = getSiteContent(locale);

  return {
    metadataBase: new URL(meta.url),
    title: meta.title,
    description: meta.description,
    applicationName: brand.legalName,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.url,
      siteName: brand.legalName,
      locale,
      type: "website",
    },
    /* Link previews in Slack, WhatsApp and X. `summary_large_image` is what
       makes an article's cover the preview rather than a thumbnail beside
       three lines of text. */
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        /*
         * The three that decide how much of a page a result may show.
         * Unset, Google picks conservative defaults — a small thumbnail and a
         * short snippet — which for an article is the difference between a
         * result somebody clicks and one they scroll past. This is also what
         * assistants' crawlers read when deciding how much they may quote.
         */
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const { meta, brand, footer } = getSiteContent(locale);
  const base = meta.url.replace(/\/$/, "");

  /*
   * The organisation and the site, on every page.
   *
   * Declared once here rather than per page: they are the same two facts
   * everywhere, and an article's `publisher` reference resolves against this
   * graph. Emitting it in the layout means every route — including ones added
   * later — carries it without anyone remembering to.
   */
  const siteJsonLd = graph([
    organizationJsonLd({
      base,
      name: `${brand.name} ${brand.nameAccent}`,
      legalName: brand.legalName,
      logo: brand.logo,
      email: footer.contact.email,
      sameAs: [footer.contact.instagram.href],
    }),
    webSiteJsonLd({
      base,
      name: brand.legalName,
      description: meta.description,
      locale,
    }),
  ]);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
        {children}
      </body>
    </html>
  );
}
