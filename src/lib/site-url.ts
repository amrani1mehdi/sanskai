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
 * The domain, now that it serves this site: `sansekaisolution.com/fiche-client`
 * is what a stand's flyer should say, and it outlives any hosting move.
 *
 * Written out rather than read from `SITE_URL`. A printed code cannot be
 * updated, so its address must not change with an environment variable — and
 * the domain has to stay renewed for as long as flyers are in circulation.
 *
 * Codes printed before the switch point at sansekai-solution-theta.vercel.app,
 * which still serves the site: renaming or removing the Vercel project would
 * break those.
 */
export const QR_BASE_URL = "https://sansekaisolution.com";
