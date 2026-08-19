"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import { siteContent } from "@/lib/content";
import { cn } from "@/lib/utils";

const { brand, nav } = siteContent;

export function Navbar() {
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
          <Link href="/" className="flex items-center gap-4">
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

          {/* Desktop */}
          <nav className="hidden items-center gap-6 md:flex">
            {nav.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-foreground/80 transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-foreground/70 transition-colors hover:text-accent"
              aria-label="Change language"
            >
              <Globe className="size-4" aria-hidden />
              <span aria-hidden>{nav.locale.flag}</span>
              <span className="font-medium">{nav.locale.code}</span>
            </button>

            <Link
              href={nav.cta.href}
              className="gold-gradient rounded-md px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-gold)] transition-opacity hover:opacity-90"
            >
              {nav.cta.label}
            </Link>
          </nav>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open ? (
        <div className="border-t border-border bg-brand-cream md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {nav.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2 py-3 text-left text-sm text-foreground/70"
            >
              <Globe className="size-4" aria-hidden />
              <span aria-hidden>{nav.locale.flag}</span>
              <span className="font-medium">{nav.locale.code}</span>
            </button>
            <Link
              href={nav.cta.href}
              onClick={() => setOpen(false)}
              className="gold-gradient mt-2 rounded-md px-6 py-3 text-center text-sm font-semibold text-accent-foreground"
            >
              {nav.cta.label}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
