"use client";

/**
 * Back-office chrome: a deep slate rail against the light working canvas. The
 * rail carries its own ink set (see `.crm-theme` in globals.css) because
 * nothing that reads on the light side reads on the dark one.
 *
 * Every sidebar row — destination, service, sub-service — is the same shape:
 * a mark, a label, and an optional count for the rows that stand for a
 * collection. Views (tableau de bord, pipeline) carry no count.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  History,
  LayoutGrid,
  Menu,
  Paperclip,
  PieChart,
  Rocket,
  Users,
  X,
} from "lucide-react";
import { AccountMenu } from "@/components/crm/account-menu";
import { CURRENT_ADMIN, SERVICES } from "@/lib/crm/config";
import { useCrm } from "@/lib/crm/store";
import type { ServiceId } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const SERVICE_ICONS: Record<ServiceId, typeof Banknote> = {
  financement: Banknote,
  developpement: Rocket,
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { leads } = useCrm();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const documentCount = leads.reduce((sum, lead) => sum + lead.documents.length, 0);
  const activityCount = leads.reduce((sum, lead) => sum + lead.activity.length, 0);

  const destinations = [
    { href: "/admin", label: "Tableau de bord", icon: PieChart, exact: true },
    { href: "/admin/leads", label: "Leads", icon: Users, count: leads.length },
    { href: "/admin/pipeline", label: "Pipeline", icon: LayoutGrid },
    { href: "/admin/documents", label: "Documents", icon: Paperclip, count: documentCount },
    { href: "/admin/activite", label: "Activité", icon: History, count: activityCount },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    /* The back office is French-only, whatever language the public site is
       being browsed in — the root <html lang> follows the visitor's cookie. */
    <div lang="fr" className="crm-theme flex min-h-screen bg-background">
      {open ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={close}
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <Image
            src="/images/sansekai-logo.jpeg"
            alt="Sansekai Solution"
            width={40}
            height={40}
            className="h-10 w-10 rounded-md object-cover"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold tracking-tight">SANSEKAI</p>
            <p className="text-[11px] tracking-widest text-sidebar-muted uppercase">
              Espace admin
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-md p-1 text-sidebar-muted hover:bg-sidebar-hover lg:hidden"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            {destinations.map((item) => (
              <Row
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                count={item.count}
                active={isActive(item.href, item.exact)}
                onNavigate={close}
              />
            ))}
          </div>

          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-widest text-sidebar-muted/80 uppercase">
              Services
            </p>

            <div className="space-y-1">
              {SERVICES.map((service) => {
                const serviceLeads = leads.filter(
                  (lead) => lead.service === service.id,
                );

                return (
                  <div key={service.id} className="space-y-1">
                    <Row
                      href={`/admin/leads?service=${service.id}`}
                      icon={SERVICE_ICONS[service.id]}
                      label={service.shortLabel}
                      count={serviceLeads.length}
                      active={false}
                      onNavigate={close}
                    />

                    {/* Sous-services — un lead peut en demander plusieurs. */}
                    {service.prestations ? (
                      <div className="ml-5 space-y-1 border-l border-sidebar-border pl-2">
                        {service.prestations.map((prestation) => (
                          <Row
                            key={prestation.id}
                            href={`/admin/leads?service=${service.id}&prestation=${prestation.id}`}
                            dot={prestation.bar}
                            label={prestation.shortLabel}
                            count={
                              serviceLeads.filter(
                                (lead) => lead.prestation === prestation.id,
                              ).length
                            }
                            active={false}
                            onNavigate={close}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <Link
            href="/"
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            Retour au site <ArrowUpRight size={13} />
          </Link>

          <div className="flex items-center gap-2 px-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar">
              AS
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{CURRENT_ADMIN}</p>
              <p className="text-[11px] text-sidebar-muted">Administrateur</p>
            </div>
            <AccountMenu onNavigate={close} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-border p-2 text-foreground"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
          <span className="font-display text-sm font-bold">Espace admin</span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/** The single sidebar row shape, used by every entry in the nav. */
function Row({
  href,
  label,
  count,
  active,
  onNavigate,
  icon: Icon,
  dot,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  onNavigate: () => void;
  icon?: typeof Banknote;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        // Active rows get three cues at once — fill, gold ink, and a gold rail
        // on the left — so the current section is never ambiguous.
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-sidebar-active font-semibold text-sidebar-accent before:absolute before:top-1.5 before:bottom-1.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-sidebar-accent before:content-['']"
          : "font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
      )}
    >
      {Icon ? (
        <Icon size={17} className="shrink-0" />
      ) : (
        <span
          className={cn("ml-[3px] h-2 w-2 shrink-0 rounded-full", dot)}
          aria-hidden
        />
      )}

      <span className="min-w-0 flex-1 truncate">{label}</span>

      {count === undefined ? null : (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            active
              ? "bg-sidebar-accent/15 text-sidebar-accent"
              : "bg-sidebar-hover text-sidebar-muted",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
