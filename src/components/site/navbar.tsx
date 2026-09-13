"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { localeHref, type Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { cn } from "@/lib/utils";

/**
 * The two buttons the drawer closes on, which are one style rather than a pair
 * of them — the same arrangement the hero makes, stacked because the drawer has
 * no room to set them side by side.
 */
const drawerCta =
  "gold-gradient inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-center text-sm font-semibold text-accent-foreground shadow-[var(--shadow-gold)] transition hover:opacity-90";

/**
 * The same pair in the desktop bar, side by side. One string for both, so
 * Développement Digital cannot end up a shade or a pixel off the financing
 * button it sits beside. `whitespace-nowrap` because two buttons share the bar
 * now, and a label that wraps turns one of them into a two-line block.
 */
const barCta =
  "gold-gradient whitespace-nowrap rounded-md px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-gold)] transition-opacity hover:opacity-90";

export function Navbar({
  content,
  locale,
  alternates,
}: {
  content: SiteContent;
  locale: Locale;
  /** Per-language URLs for this page, when they are not simply this path
      re-prefixed — an article's slug differs per language. */
  alternates?: Partial<Record<Locale, string>>;
}) {
  const { brand, nav } = content;

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border/70 bg-brand-cream/90 backdrop-blur-md"
          : "bg-brand-cream",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-24 items-center justify-between">
          <Link href={localeHref(locale, "/")} className="flex items-center gap-4">
            <Image
              src={brand.logo}
              alt={`${brand.name} ${brand.nameAccent}`}
              width={72}
              height={72}
              priority
              className="h-16 w-16 rounded-md object-cover md:h-[72px] md:w-[72px]"
            />
            <span className="font-display text-xl tracking-tight sm:text-2xl md:text-[1.75rem]">
              <span className="text-foreground">{brand.name}</span>{" "}
              <span className="text-accent">{brand.nameAccent}</span>
            </span>
          </Link>

          {/* Desktop, from `lg`. With two buttons in the bar it needs about a
              thousand pixels: rendered at 800 the links ran into the brand name,
              and at 900 the name broke onto two lines. Below that the drawer
              takes over, and it already sets the same pair one above the other. */}
          <nav className="hidden items-center gap-6 lg:flex">
            {/* Développement Digital is a button at the end of the bar, so it is
                left out of the plain links here — the same place offered twice
                reads as two destinations. Matched on href, as in the drawer. */}
            {nav.links
              .filter((link) => link.href !== nav.ctaSecondary.href)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-foreground/80 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            <LanguageSwitcher locale={locale} alternates={alternates} />

            {/* The pair, side by side. Financing keeps the far edge it had. */}
            <div className="flex items-center gap-3">
              <Link href={nav.ctaSecondary.href} className={barCta}>
                {nav.ctaSecondary.label}
              </Link>
              <Link href={nav.cta.href} className={barCta}>
                {nav.cta.label}
              </Link>
            </div>
          </nav>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open ? (
        <div className="border-t border-border bg-brand-cream lg:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {/* Everything except the destination the drawer ends on: it is a
                button down there, and a link up here as well would be the same
                place offered twice. Matched on href, so the two cannot drift. */}
            {nav.links
              .filter((link) => link.href !== nav.ctaSecondary.href)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            <div className="px-2 py-3">
              <LanguageSwitcher locale={locale} alternates={alternates} />
            </div>

            {/* The hero's pair, stacked: the drawer is too narrow to sit them
                side by side. */}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href={nav.cta.href}
                onClick={() => setOpen(false)}
                className={drawerCta}
              >
                {nav.cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={nav.ctaSecondary.href}
                onClick={() => setOpen(false)}
                className={drawerCta}
              >
                {nav.ctaSecondary.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
