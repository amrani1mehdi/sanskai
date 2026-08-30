/**
 * Cash flow financing eligibility rules.
 *
 * Kept here rather than inline in the form so the threshold has one owner. The
 * requirement text shown on the page still lives in the translations, so if
 * this number changes, that copy has to change with it.
 */

/** A company must have been trading longer than this to apply. */
export const MIN_COMPANY_AGE_MONTHS = 6;

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
 * Whether a company founded on `createdAt` has been trading for strictly more
 * than the minimum.
 *
 * Compared against a cut-off date rather than a count of whole months: a
 * company six months and one day old is older than six months, but rounding
 * down to whole months would call it six and reject it.
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

  // Strictly before the cut-off: reaching exactly six months is not enough.
  return date.getTime() < cutoff.getTime();
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
