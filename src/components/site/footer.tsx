import Image from "next/image";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { localeHref, type Locale } from "@/lib/i18n/config";

/** lucide-react no longer ships brand marks, so this one is inline. */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer({
  content,
  locale,
}: {
  content: SiteContent;
  locale: Locale;
}) {
  const { brand, footer } = content;

  return (
    <footer className="bg-secondary">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand + disclaimer */}
          <div className="lg:col-span-2">
            <Link href={localeHref(locale, "/")} className="flex items-center gap-3">
              <Image
                src={brand.logo}
                alt={`${brand.name} ${brand.nameAccent}`}
                width={32}
                height={32}
                className="size-8 rounded object-cover"
              />
              <span className="font-display text-base">
                <span className="text-foreground">{brand.name}</span>{" "}
                <span className="text-accent">{brand.nameAccent}</span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              {footer.description}
            </p>

            <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              {footer.badge}
            </p>
          </div>

          {/* Link columns */}
          {footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-display text-sm text-foreground">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div>
            <h2 className="font-display text-sm text-foreground">
              {footer.contact.title}
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={`mailto:${footer.contact.email}`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent"
                >
                  <Mail className="size-4" aria-hidden />
                  {footer.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={footer.contact.instagram.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent"
                >
                  <InstagramIcon className="size-4" />
                  {footer.contact.instagram.handle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border py-6">
          <p className="text-center text-xs text-muted-foreground">
            {footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
