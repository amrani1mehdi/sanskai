"use client";

/**
 * QR codes — one for the site, one for the client sheet handed out at trade
 * shows.
 *
 * They go on flyers, stands and business cards, so each has to open the right
 * page on a phone with nothing typed. Nothing is stored — a code is a function of
 * its URL, so it is drawn fresh on every visit and always matches the page it
 * names.
 *
 * Deliberately two and not one per form. The site's own forms are reached from
 * the site; the only form worth a code of its own is the one that starts on
 * paper, at a stand, with nobody near a keyboard.
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, ExternalLink } from "lucide-react";
import { SERVICE_BY_ID } from "@/lib/crm/config";
import { QR_BASE_URL } from "@/lib/site-url";

type Target = {
  id: string;
  label: string;
  description: string;
  /** Path on the public site. */
  path: string;
};

const TARGETS: Target[] = [
  {
    id: "site",
    label: "Site web",
    description: "Ouvre la page d'accueil",
    path: "/",
  },
  {
    id: "fiche-client",
    label: "Fiche client",
    description: "Ouvre la fiche client / prospect du salon",
    /* From the CRM config's `source`, the same field the lead panel prints as
       "depuis /…", so if the page moves its code moves with it. The page is the
       form, so there is no anchor to jump to. */
    path: SERVICE_BY_ID.salon.source,
  },
];

/*
 * Black on white and error correction at Q: a printed code gets folded,
 * scuffed and photographed at an angle, and Q still reads with a quarter of it
 * damaged. The URLs are short enough that the extra redundancy costs nothing in
 * legibility.
 */
const OPTIONS = {
  errorCorrectionLevel: "Q",
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
} as const;

/** Large enough to print sharp at several centimetres. */
const PNG_WIDTH = 1200;

export function QrWorkspace() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3.5 lg:px-6">
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">
            QR codes
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Un code pour le site et un pour la fiche client du salon. Ils pointent
            vers{" "}
            <span className="font-mono">{QR_BASE_URL.replace(/^https?:\/\//, "")}</span>.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        <ul className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {TARGETS.map((target) => (
            <QrCard key={target.id} target={target} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function QrCard({ target }: { target: Target }) {
  const url = `${QR_BASE_URL}${target.path}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    QRCode.toString(url, { type: "svg", ...OPTIONS })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const filename = `qr-sansekai-${target.id}`;

  /* Drawn at download time rather than kept in state: a 1200px PNG as a data
     URL is a few hundred kilobytes per card, held for a click that may never
     come. */
  const downloadPng = async () => {
    const dataUrl = await QRCode.toDataURL(url, { width: PNG_WIDTH, ...OPTIONS });
    save(dataUrl, `${filename}.png`);
  };

  const downloadSvg = () => {
    if (!svg) return;

    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    save(href, `${filename}.svg`);
    // Released after the click has been handed to the browser, not before.
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  };

  return (
    <li className="flex flex-col border border-border bg-card">
      <div className="border-b border-border bg-white p-6">
        {svg ? (
          /* The markup is the library's output for a URL defined in this file,
             never anything a visitor typed, so it is safe to insert as is. */
          <div
            role="img"
            aria-label={`QR code : ${target.label}`}
            className="mx-auto aspect-square w-full max-w-[220px] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center text-center text-xs text-muted-foreground">
            {failed ? "Impossible de générer ce code." : "Génération…"}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-base font-bold text-foreground">
          {target.label}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{target.description}</p>
        {/* The exact address the code carries, so it can be checked by eye
            before a thousand copies are printed with it. */}
        <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">
          {url}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <button
            type="button"
            onClick={() => void downloadPng()}
            disabled={failed}
            aria-label={`Télécharger le QR code ${target.label} en PNG`}
            className="inline-flex items-center gap-1.5 bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} aria-hidden /> PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            disabled={!svg}
            aria-label={`Télécharger le QR code ${target.label} en SVG, pour l'impression`}
            className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} aria-hidden /> SVG
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ExternalLink size={14} aria-hidden /> Ouvrir
          </a>
        </div>
      </div>
    </li>
  );
}

/** Hands a file to the browser's download, from a data or blob URL. */
function save(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}
