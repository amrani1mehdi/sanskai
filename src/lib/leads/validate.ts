/**
 * What the forms check before they post.
 *
 * The API validates everything again — it has to, since nothing stops a caller
 * skipping the browser — but a round trip to Lyon to be told a field is empty is
 * a poor way to find out. These run first, in the visitor's own language, and
 * are deliberately the looser of the two: the server's answer is the one that
 * decides, and a form that refuses what the API would have accepted is worse
 * than one that lets it through.
 */

export type ValidationStrings = {
  required: string;
  invalidEmail: string;
  invalidPhone: string;
};

/**
 * Close enough to be useful, far from RFC 5322 — which is unenforceable in a
 * regular expression and rejects addresses that work. The API applies
 * `email:rfc`; this only catches what is obviously not an address at all.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Digits, and the punctuation people separate them with: `+33 6 42 18 77 03`,
 * `06.42.18.77.03`, `(0)6-42-18-77-03`. The count is what actually decides —
 * seven digits at the low end for the shortest national numbers, fifteen at the
 * high end because E.164 allows no more.
 */
const PHONE_SHAPE = /^\+?[\d\s.()-]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function isPhone(value: string): boolean {
  const trimmed = value.trim();

  if (!PHONE_SHAPE.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "").length;

  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

/** A field's message, or undefined when it passes. */
export function checkRequired(
  value: string,
  strings: ValidationStrings,
): string | undefined {
  return value.trim() === "" ? strings.required : undefined;
}

export function checkEmail(
  value: string,
  strings: ValidationStrings,
): string | undefined {
  if (value.trim() === "") return strings.required;

  return isEmail(value) ? undefined : strings.invalidEmail;
}

export function checkPhone(
  value: string,
  strings: ValidationStrings,
): string | undefined {
  if (value.trim() === "") return strings.required;

  return isPhone(value) ? undefined : strings.invalidPhone;
}

/**
 * Drops the fields that passed, so an empty result means the form is good.
 */
export function collect(
  checks: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(checks).filter((entry): entry is [string, string] =>
      entry[1] !== undefined,
    ),
  );
}
