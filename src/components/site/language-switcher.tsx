"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Globe } from "lucide-react";
import {
  LOCALE_OPTIONS,
  localeHref,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Language menu: globe, flag and code, with a dropdown of the three locales.
 *
 * Each entry is a real link to the same page in another language, because the
 * language is now part of the URL. It used to write a cookie and refresh in
 * place, which kept one address for all three translations — comfortable for a
 * visitor and invisible to everyone else, since a crawler arriving without
 * cookies only ever saw one of them.
 *
 * Links rather than buttons on purpose: a crawler follows them, which is how
 * the other two translations get discovered in the first place, and a reader
 * can open German in a new tab.
 */
export function LanguageSwitcher({
  locale,
  /**
   * Where each language lives, when it is not simply this path re-prefixed.
   *
   * An article has a different slug per language — `/blog/financer-votre-
   * croissance` and `/en/blog/funding-your-growth` are the same piece — so the
   * article page passes the mapping in. Everything else is the same path with a
   * different prefix and needs nothing.
   */
  alternates,
}: {
  locale: Locale;
  alternates?: Partial<Record<Locale, string>>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const active =
    LOCALE_OPTIONS.find((option) => option.code === locale) ?? LOCALE_OPTIONS[0];

  /* The current page with its language prefix removed, so it can be put back
     in another language. */
  const { path } = splitLocale(pathname);

  const hrefFor = (code: Locale) => alternates?.[code] ?? localeHref(code, path);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Globe size={13} className="shrink-0" aria-hidden />
        <span className="text-xs font-medium">
          <span aria-hidden>{active.flag}</span> {active.label}
        </span>
      </button>

      {open ? (
        <>
          {/* Click-away layer, as on the live site. */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            role="menu"
          >
            {LOCALE_OPTIONS.map((option) => (
              <Link
                key={option.code}
                href={hrefFor(option.code)}
                role="menuitem"
                hrefLang={option.code}
                onClick={() => setOpen(false)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  option.code === locale
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-card-foreground hover:bg-muted"
                }`}
              >
                <span aria-hidden>{option.flag}</span>
                <span>{option.label}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
