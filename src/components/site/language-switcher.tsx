"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { LOCALE_OPTIONS, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/lib/i18n/actions";

/**
 * Language menu, matching the live site's: globe, flag and code, with a
 * dropdown of the three locales.
 *
 * The choice is written to a cookie and the route re-rendered on the server,
 * so the new language arrives fully rendered instead of swapping in after
 * hydration. The URL is unchanged, as on the live site.
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const active =
    LOCALE_OPTIONS.find((option) => option.code === locale) ?? LOCALE_OPTIONS[1];

  const select = (next: Locale) => {
    setOpen(false);
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="menu"
        data-pending={pending ? "" : undefined}
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
              <button
                key={option.code}
                type="button"
                role="menuitem"
                onClick={() => select(option.code)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  option.code === locale
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-card-foreground hover:bg-muted"
                }`}
              >
                <span aria-hidden>{option.flag}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
