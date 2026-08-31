/**
 * Turns the CRM's validation messages into the visitor's language.
 *
 * The API answers in English — it ships no translations and runs under
 * `APP_LOCALE=en` — apart from the two eligibility rules, which carry their own
 * French wording. A German visitor would otherwise read English grammar around
 * French field names, so the message is matched to the rule that produced it and
 * the site's own copy is shown instead.
 *
 * Matching on wording rather than on a code is a compromise the API's shape
 * forces: a 422 says what went wrong in prose, not which rule failed. The
 * patterns below are anchored on Laravel's own templates, which change only
 * between major versions. Anything unrecognised falls through unchanged, so a
 * new rule shows an English message rather than no message at all.
 */

export type ErrorStrings = {
  required: string;
  invalidEmail: string;
  invalidChoice: string;
  tooLong: string;
  invalidDate: string;
  tooManyFiles: string;
  fileWrongType: string;
  fileTooLarge: string;
  ineligibleBody: string;
  ineligibleRevenueBody: string;
};

/**
 * Ordered: the first match wins, so the specific patterns come before the
 * general ones. "must not be greater than …" alone would claim both the file
 * size and the text length, and "is required" would swallow `required_if`.
 */
const RULES: [RegExp, keyof ErrorStrings][] = [
  // The app's own two rules, already French, restated in the visitor's language.
  [/au moins \d+ mois/i, "ineligibleBody"],
  [/affaires mensuel/i, "ineligibleRevenueBody"],

  [/must be a file of type/i, "fileWrongType"],
  [/greater than \d+ kilobytes/i, "fileTooLarge"],
  [/more than \d+ items/i, "tooManyFiles"],
  [/valid email address/i, "invalidEmail"],
  [/must match the format|must be a date/i, "invalidDate"],
  [/greater than \d+ characters/i, "tooLong"],
  [/is invalid/i, "invalidChoice"],
  [/is required/i, "required"],
];

/** The site's wording for an API message, or the message itself if unknown. */
export function translateApiError(message: string, strings: ErrorStrings): string {
  for (const [pattern, key] of RULES) {
    if (pattern.test(message)) return strings[key];
  }

  return message;
}

/**
 * Translates every message in a 422 payload, keyed as the API keyed them.
 *
 * Only the first message per field is kept: the field shows one line, and the
 * first is the one the applicant has to act on — a badly formatted date is
 * worth saying before the eligibility verdict computed from it.
 */
export function translateApiErrors(
  errors: Record<string, string[]>,
  strings: ErrorStrings,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      translateApiError(messages[0], strings),
    ]),
  );
}
