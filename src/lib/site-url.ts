/**
 * The public address of the site, with no trailing slash.
 *
 * What the site calls itself from the outside: the metadata base that
 * canonical URLs and share links are built on.
 *
 * `NEXT_PUBLIC_SITE_URL` overrides it. It is read at build time, so it has to be
 * set where the site is built, not only where it runs.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sansekaisolution.com"
).replace(/\/+$/, "");

/**
 * Where the back office's QR codes send a scan.
 *
 * Deliberately not `SITE_URL`. The domain still serves the previous site — every
 * path on it returns that site's home page — so a code built on it opens the
 * wrong site, and never the form it is printed beside. The Vercel address is
 * where this site actually runs.
 *
 * A printed code cannot be updated, so this address has to keep resolving for
 * as long as the flyers are in circulation: renaming or removing the Vercel
 * project would break every one of them.
 */
export const QR_BASE_URL = "https://sansekai-solution-theta.vercel.app";
