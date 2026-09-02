"use client";

/**
 * Back-office chrome: one ink bar across the top, and the board underneath.
 *
 * It was a 256px rail down the left, which made sense while there were two
 * destinations. There is one now — the board — and a navigation rail listing a
 * single item is not navigation, it is a sixth of the screen spent on a link to
 * the page you are already on. The identity, the sync state, the arrivals bell
 * and the account menu are the only things that were ever really in it, and
 * they fit in a bar.
 *
 * The width that buys goes straight to the board, which is six columns wide and
 * was the thing being squeezed.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { AccountMenu } from "@/components/crm/account-menu";
import { SansekaiMark } from "@/components/crm/sansekai-mark";
import { CURRENT_ADMIN } from "@/lib/crm/config";
import { formatTime } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { syncedAt, unseen } = useCrm();

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
       being browsed in — the root <html lang> follows the visitor's cookie. */
    <div lang="fr" className="admin-theme flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-4 bg-foreground px-4 py-2.5 text-background lg:px-6">
        <Link
          href="/admin/leads"
          aria-label="Espace admin Sansekai Solution"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
        >
          <SansekaiMark className="w-6 shrink-0 text-background" />
          <span className="font-display text-[13px] font-bold tracking-[0.16em]">
            SANSEKAI
          </span>
          <span
            className="hidden font-mono text-[10px] tracking-[0.18em] text-background/55 uppercase sm:inline"
            aria-hidden
          >
            Espace admin
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <LiveIndicator syncedAt={syncedAt} />

          <Link
            href="/"
            className="hidden items-center gap-1.5 px-2 py-1.5 text-xs text-background/65 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background sm:inline-flex"
          >
            Retour au site <ArrowUpRight size={13} aria-hidden />
          </Link>

          {/* A square, because nothing here is round. Initials rather than a
              photograph: there is one administrator and no avatar to load. */}
          <span className="flex items-center gap-2 border-l border-background/15 py-1 pl-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-background text-[11px] font-bold text-foreground">
              AS
            </span>
            <span className="hidden text-xs font-medium lg:inline">
              {CURRENT_ADMIN}
            </span>
            <AccountMenu />
          </span>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
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
    <p className="hidden items-center gap-2 font-mono text-[11px] text-background/55 md:flex">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {/* Stilled for anyone who asked the OS to reduce motion. */}
        <span className="absolute inline-flex h-full w-full animate-ping bg-background opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-1.5 w-1.5 bg-background" />
      </span>
      En direct · {formatTime(syncedAt)}
    </p>
  );
}
