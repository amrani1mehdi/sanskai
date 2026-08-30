/**
 * Cash flow financing eligibility rules.
 *
 * Kept here rather than inline in the form so the threshold has one owner. The
 * requirement text shown on the page still lives in the translations, so if
 * this number changes, that copy has to change with it.
 */

/** Months of trading history required to apply. Meeting it exactly is enough. */
export const MIN_COMPANY_AGE_MONTHS = 6;

/** Monthly revenue floor, in euros. Meeting it exactly is enough. */
export const MIN_MONTHLY_REVENUE = 7000;

/**
 * `date` shifted by `months`, clamped to the end of the target month.
 *
 * Plain month arithmetic overflows — 31 March minus six months is 31 September,
 * which rolls forward to 1 October and would move the cut-off by a day.
 */
function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const lastDayOfTarget = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(date.getDate(), lastDayOfTarget));
}

/**
 * Whether a company founded on `createdAt` has at least the minimum trading
 * history, matching the "At least 6 months" wording on the page.
 *
 * Compared against a cut-off date rather than a count of whole months: a
 * company six months and one day old has more than six months of history, but
 * rounding down to whole months would call it six.
 */
export function isCompanyAgeEligible(
  createdAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!createdAt) return false;

  const date = parseDateInput(createdAt);
  if (!date) return false;

  const cutoff = addMonths(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    -MIN_COMPANY_AGE_MONTHS,
  );

  // On or before the cut-off, so reaching exactly six months qualifies.
  return date.getTime() <= cutoff.getTime();
}

/**
 * Reads a money amount typed by a human, in any of the site's locales.
 *
 * People write the same figure as "7000", "7,000", "7 000", "7.000" or
 * "€7,000.50", and the thousands and decimal separators swap between English,
 * French and German. Returns null when nothing numeric can be read.
 */
export function parseAmount(value: string): number | null {
  // Drop currency symbols, spaces (including the non-breaking ones French
  // uses for thousands) and anything else that is not part of the number.
  const cleaned = value.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalised: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: whichever comes last is the decimal separator.
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalised = cleaned
      .split(thousands)
      .join("")
      .replace(decimal, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? "," : ".";
    const [head, ...rest] = cleaned.split(separator);
    const tail = rest.join("");

    /*
     * A single separator is ambiguous: "7.000" is seven thousand in German and
     * seven in English. Exactly three trailing digits reads as thousands,
     * which is the common case here; anything else is a decimal.
     */
    normalised = rest.length > 1 || tail.length === 3 ? head + tail : `${head}.${tail}`;
  } else {
    normalised = cleaned;
  }

  const amount = Number.parseFloat(normalised);

  return Number.isFinite(amount) ? amount : null;
}

/** Whether the typed monthly revenue meets the floor. */
export function isRevenueEligible(value: string | null | undefined): boolean {
  if (!value) return false;

  const amount = parseAmount(value);
  if (amount === null) return false;

  return amount >= MIN_MONTHLY_REVENUE;
}

/**
 * Parses the `YYYY-MM-DD` value the date field holds, as a local date.
 *
 * `new Date('2020-01-31')` is parsed as UTC midnight, which lands on the
 * previous day west of Greenwich and would shift the age by a day.
 */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // Rejects impossible dates that would otherwise roll over, e.g. 31 February.
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

/** `YYYY-MM-DD` for a Date, in local time rather than UTC. */
export function toDateInput(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}
