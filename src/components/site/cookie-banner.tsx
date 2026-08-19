"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "@/lib/content";

const STORAGE_KEY = "sansekai.cookie-consent";

export function CookieBanner({ content }: { content: SiteContent }) {
  // `null` until the stored choice has been read; the banner stays hidden until
  // then so the server render and the first client render agree.
  const [consent, setConsent] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Reading localStorage is a subscription to an external store, so it happens
    // in a microtask rather than synchronously in the effect body.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setConsent(window.localStorage.getItem(STORAGE_KEY));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = consent === null;

  const decide = (choice: "accepted" | "declined") => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setConsent(choice);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:justify-between">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            {content.cookieBanner.text}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => decide("declined")}
              className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {content.cookieBanner.decline}
            </button>
            <button
              type="button"
              onClick={() => decide("accepted")}
              className="gold-gradient rounded-md px-4 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              {content.cookieBanner.accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
