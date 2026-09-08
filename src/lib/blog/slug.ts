/**
 * A title turned into a URL.
 *
 * This mirrors Laravel's `Str::slug`, which is what the API applies when the
 * editor sends no slug of its own. Two implementations of the same rule is not
 * ideal, but the alternative is worse: the author would type a title and see
 * nothing until after saving, then find the address is not what they assumed.
 *
 * The API remains the authority — it is what resolves collisions, by suffixing
 * `-2` — so a disagreement here shows up as the saved slug differing slightly
 * from the preview, never as a broken URL.
 */
export function slugify(input: string): string {
  return (
    input
      // German sharp s has no decomposed form and would otherwise be dropped.
      .replace(/ß/g, "ss")
      .normalize("NFD")
      /* Strip the accents NFD just split off, so "trésorerie" becomes
         "tresorerie" rather than "trsorerie" — which is what dropping the
         whole character would give. */
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Laravel spells "@" out rather than dropping it.
      .replace(/@/g, "-at-")
      /*
       * Punctuation is REMOVED, not turned into a separator — then whitespace
       * becomes the separator. The order is what makes "l'écart" come out as
       * "lecart" the way `Str::slug` does, rather than "l-ecart": collapsing
       * everything non-alphanumeric in one pass splits the word at the
       * apostrophe, which is the one place these two implementations were
       * disagreeing.
       */
      .replace(/[^a-z0-9\s-]+/g, "")
      .replace(/[-\s]+/g, "-")
      .replace(/^-+|-+$/g, "")
      /* The column is 180 characters. Trim any separator the cut leaves
         dangling, so a truncated slug never ends in a dash. */
      .slice(0, 180)
      .replace(/-+$/g, "")
  );
}
