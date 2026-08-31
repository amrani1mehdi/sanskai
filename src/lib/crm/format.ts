/**
 * French display helpers for the CRM.
 *
 * The locale is pinned to fr-FR rather than taken from the site's language
 * cookie: the back office is French-only, whatever language the visitor was
 * browsing the public site in.
 */

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string) {
  return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return DATE_TIME.format(new Date(iso));
}

export function formatShortDate(iso: string) {
  return SHORT_DATE.format(new Date(iso));
}

/** "14:32". The hour on its own, beside a date that is already shown. */
export function formatTime(iso: string) {
  return TIME.format(new Date(iso));
}

/**
 * "il y a 3 jours" — computed client-side, so it never mismatches the server.
 *
 * Used sparingly. A relative label is friendly for something you are watching
 * happen and misleading for a list you come back to: it is only true at the
 * moment it renders, and "à l'instant" stays on screen long after it stopped
 * being the case. Arrival times are shown absolutely.
 */
export function formatRelative(iso: string, now: number = Date.now()) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "à l'instant";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  const months = Math.round(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.round(months / 12);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

/** The forms collect amounts as free text, so only clean numbers get styled. */
export function formatAmount(value: string | undefined) {
  if (!value) return "—";
  const digits = value.replace(/[^\d]/g, "");
  if (!digits || digits.length !== value.trim().length) return value;
  return `${new Intl.NumberFormat("fr-FR").format(Number(digits))} €`;
}

/**
 * Trading history derived from the creation date, never stored — a stored age
 * is wrong the day after it is written.
 */
export function formatCompanyAge(dateCreation: string | undefined, now = new Date()) {
  if (!dateCreation) return "Non renseigné";

  const created = new Date(`${dateCreation}T00:00:00`);
  if (Number.isNaN(created.getTime())) return "Non renseigné";

  let months =
    (now.getFullYear() - created.getFullYear()) * 12 +
    (now.getMonth() - created.getMonth());
  if (now.getDate() < created.getDate()) months -= 1;
  if (months < 0) return "Non renseigné";

  if (months < 12) return `${months} mois`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = `${years} an${years > 1 ? "s" : ""}`;

  return rest === 0 ? yearPart : `${yearPart} et ${rest} mois`;
}

/** "Oui" / "Non" / "Non renseigné" for the form's yes-no questions. */
export function formatYesNo(value: boolean | undefined) {
  if (value === undefined) return "Non renseigné";
  return value ? "Oui" : "Non";
}

export function initialsOf(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}
