"use client";

/**
 * Back-office chrome: a navigation rail on the left, the section beside it.
 *
 * This was a rail once, then a single top bar. The bar was right for as long as
 * the back office had one destination — a navigation list of one item is not
 * navigation, it is a sixth of the screen spent linking to the page you are
 * already on. Articles is a second destination, and a real one: it is written
 * in a different frame of mind from the board, on its own schedule, and moving
 * between the two should be a click rather than a URL you have to remember.
 *
 * So the rail is back, and deliberately narrower than the 256px it used to be.
 * The board is six columns wide and is still the thing being squeezed; 13rem
 * holds both labels and their counts without taking a column back off it.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Newspaper, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/crm/account-menu";
import { SansekaiMark } from "@/components/crm/sansekai-mark";
import { CURRENT_ADMIN } from "@/lib/crm/config";
import { formatTime } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

/** The sections of the back office. */
const SECTIONS = [
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/blog", label: "Articles", icon: Newspaper },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { syncedAt, unseen } = useCrm();
  const pathname = usePathname();

  /* The rail is permanent from `lg` up and a drawer below it. The open state
     lives here rather than in the rail so the drawer can be closed from the
     scrim and the links alike — a drawer left open over the page you just
     asked for is the classic mobile-menu bug.

     Closed by the links themselves rather than by watching the pathname: an
     effect that set state on every navigation would cascade a second render
     through the whole back office to change a boolean that only matters on
     one breakpoint. */
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  /*
   * The count in the browser tab.
   *
   * The bell only helps while you are looking at the CRM, and the whole point
   * of a lead arriving is that usually you are not. A tab reading "(2) Espace
   * admin" carries it to a window sitting behind three others — the one place
   * a notification has to reach to be worth having.
   *
   * Set here rather than in the workspace so it holds on every admin page, and
   * put back on the way out so the title does not follow you to the public site.
   */
  useEffect(() => {
    const base = "Espace admin — Sansekai Solution";

    document.title = unseen.length > 0 ? `(${unseen.length}) ${base}` : base;

    return () => {
      document.title = base;
    };
  }, [unseen.length]);

  return (
    /* The back office is French-only, whatever language the public site is
       being browsed in — the root <html lang> follows the visitor's cookie.

       `fixed inset-0` rather than `h-screen` because the root <body> is a flex
       column: anything appended to it — the dev overlay, a browser extension —
       becomes a sibling flex item and pushes the document past 100vh, which
       shows up as a second scrollbar outside the one the page content owns.
       Out of flow, the shell fills the viewport and cannot be pushed. */
    <div
      lang="fr"
      className="admin-theme fixed inset-0 flex overflow-hidden bg-background"
    >
      {/* The scrim, under the drawer and over the page. Mobile only: from `lg`
          the rail is part of the layout and nothing sits on top of anything. */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
        />
      )}

      <Rail
        pathname={pathname}
        unseenCount={unseen.length}
        syncedAt={syncedAt}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Below `lg` the rail is hidden, so the identity and the account menu
            need somewhere to live — and the drawer needs something to open it. */}
        <header className="flex shrink-0 items-center gap-3 bg-foreground px-4 py-2.5 text-background lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Ouvrir le menu"
            className="-ml-1 flex h-8 w-8 items-center justify-center text-background/80 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            <Menu size={18} aria-hidden />
          </button>

          <SansekaiMark className="w-5 shrink-0 text-background" />
          <span className="font-display text-[13px] font-bold tracking-[0.16em]">
            SANSEKAI
          </span>

          <span className="ml-auto flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-background text-[11px] font-bold text-foreground">
              AS
            </span>
            <AccountMenu />
          </span>
        </header>

        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/**
 * The rail itself.
 *
 * One element for both layouts rather than two copies of the list: below `lg`
 * it is a fixed drawer that slides in, from `lg` a static column. The whole
 * difference is in the classes, so the markup — and the focus order — stays
 * the same on both.
 */
function Rail({
  pathname,
  unseenCount,
  syncedAt,
  open,
  onClose,
}: {
  pathname: string;
  unseenCount: number;
  syncedAt: string | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[13rem] shrink-0 flex-col bg-foreground text-background transition-transform duration-200 lg:static lg:translate-x-0 motion-reduce:transition-none",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Link
          href="/admin/leads"
          aria-label="Espace admin Sansekai Solution"
          className="flex min-w-0 items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
        >
          <SansekaiMark className="w-6 shrink-0 text-background" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-display text-[13px] font-bold tracking-[0.16em]">
              SANSEKAI
            </span>
            <span
              className="font-mono text-[9px] tracking-[0.18em] text-background/55 uppercase"
              aria-hidden
            >
              Espace admin
            </span>
          </span>
        </Link>

        {/* Only in the drawer. From `lg` the rail cannot be closed, so an X
            there would be a control that does nothing. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="ml-auto flex h-7 w-7 items-center justify-center text-background/70 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background lg:hidden"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <ul className="mt-1 flex flex-col">
        {SECTIONS.map(({ href, label, icon: Icon }) => {
          /*
           * A lead's own page is `/admin/leads/[id]` and an article's is
           * `/admin/blog/[id]`, so the section stays lit while you are inside
           * it — matching on equality alone would drop the highlight the moment
           * you opened a row.
           */
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
                <Link
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 py-2.5 pr-4 pl-4 text-[13px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-background",
                  active
                    ? "bg-background/10 font-semibold text-background"
                    : "text-background/65 hover:bg-background/5 hover:text-background",
                )}
              >
                {/* A solid edge on the active row. The palette here is one ink
                    and its opacities, so position marks the open section rather
                    than a second colour. */}
                <span
                  aria-hidden
                  className={cn(
                    "-ml-4 h-5 w-[3px] shrink-0",
                    active ? "bg-background" : "bg-transparent",
                  )}
                />
                <Icon size={15} aria-hidden className="shrink-0" />
                {label}

                {/* Arrivals, on the section that has them. */}
                {href === "/admin/leads" && unseenCount > 0 && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center bg-background px-1 font-mono text-[10px] font-bold text-foreground">
                    {unseenCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-background/15 px-4 py-3">
        <LiveIndicator syncedAt={syncedAt} />

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 py-1 text-xs text-background/65 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
        >
          Retour au site <ArrowUpRight size={13} aria-hidden />
        </Link>

        {/* Hidden below `lg`, where the same controls sit in the top bar and
            would otherwise appear twice in the focus order. */}
        <span className="hidden items-center gap-2 pt-1 lg:flex">
          {/* A square, because nothing here is round. Initials rather than a
              photograph: there is no avatar in this application to load. */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-background text-[11px] font-bold text-foreground">
            AS
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {CURRENT_ADMIN}
          </span>
          <AccountMenu />
        </span>
      </div>
    </nav>
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
    <p className="flex items-center gap-2 py-1 font-mono text-[11px] text-background/55">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {/* Stilled for anyone who asked the OS to reduce motion. */}
        <span className="absolute inline-flex h-full w-full animate-ping bg-background opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-1.5 w-1.5 bg-background" />
      </span>
      En direct · {formatTime(syncedAt)}
    </p>
  );
}
