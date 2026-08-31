"use client";

/**
 * Back-office chrome: a deep slate rail against the light working canvas. The
 * rail carries its own ink set (see `.crm-theme` in globals.css) because
 * nothing that reads on the light side reads on the dark one.
 *
 * Two destinations only: Dashboard to understand, CRM to manage. Each row is
 * a mark, a label and an optional count.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, LayoutGrid, Menu, PieChart, X } from "lucide-react";
import { AccountMenu } from "@/components/crm/account-menu";
import { CURRENT_ADMIN } from "@/lib/crm/config";
import { formatTime } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { leads, syncedAt } = useCrm();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  /*
   * Two destinations, and that is the whole navigation.
   *
   * Understand, then manage. Everything the sidebar used to carry — the
   * per-service rows, the sub-service rows, Documents, Activité, Messages —
   * was CRM detail sitting in the navigation, which meant filtering happened
   * in two places and the rail grew a row for every new service. Those are
   * filters and summaries now, inside the two screens that own them.
   */
  const destinations = [
    { href: "/admin", label: "Tableau de bord", icon: PieChart, exact: true },
    { href: "/admin/crm", label: "CRM", icon: LayoutGrid, count: leads.length },
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

        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <LiveIndicator syncedAt={syncedAt} />

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
  icon?: typeof PieChart;
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

/**
 * Says the panel is live, and when it last heard from the CRM.
 *
 * Without it the polling is invisible: leads appear on their own and nobody
 * knows whether the screen is current or stale, which is exactly the doubt a
 * manual refresh button exists to answer.
 */
function LiveIndicator({ syncedAt }: { syncedAt: string | null }) {
  if (!syncedAt) return null;

  /* The clock time, not "à l'instant".

     The panel re-syncs every fifteen seconds, so a relative label said
     "à l'instant" essentially always — true, and completely uninformative.
     The hour tells you at a glance whether the screen is current. */
  return (
    <p className="mb-2 flex items-center gap-2 px-3 text-[11px] text-sidebar-muted">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {/* Stilled for anyone who asked the OS to reduce motion. */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      En direct · {formatTime(syncedAt)}
    </p>
  );
}
