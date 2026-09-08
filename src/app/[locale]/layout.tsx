import { notFound } from "next/navigation";
import { parseLocale } from "@/lib/i18n/server";

/**
 * The localised tree.
 *
 * Its only job is the gate: `[locale]` matches any string, so without this
 * `/xx/financement` renders the French page at an address that means nothing —
 * and a crawler that finds such a URL will happily index it as a fourth copy of
 * the site.
 *
 * Everything else about the language is handled where it belongs: the pages
 * read `params.locale`, and `<html lang>` is set by the root layout from the
 * header the proxy attaches.
 */
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!parseLocale(locale)) notFound();

  return <>{children}</>;
}
