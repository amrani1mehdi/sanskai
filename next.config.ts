import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Origins allowed to reach the dev server's own assets.
   *
   * `next dev` blocks cross-origin requests to `/_next/*` — the dev bundles and
   * the HMR socket — for anything but the host it was started on. Opening the
   * board from another machine on the LAN therefore loads the HTML and then
   * 403s on every script, which is what the console shows.
   *
   * This is the machine's Wi-Fi address, so a colleague on the same network can
   * be shown the CRM. It is read only by `next dev`; `next build` ignores it,
   * so nothing here reaches production.
   *
   * The address comes from DHCP — if the router hands out a different one, this
   * is the line to update (`ipconfig`, or the "Network" URL `next dev` prints
   * when it starts).
   */
  allowedDevOrigins: ["192.168.100.135"],

  /**
   * The business page moved from `/developpement-entreprise` when the offer was
   * renamed Développement Digital.
   *
   * Permanent (308), because the old address is in Google's index, in the
   * sitemap it has already submitted, and in whatever anyone has linked or
   * bookmarked. Dropping it would spend the ranking the page has earned and
   * 404 every one of those visitors.
   *
   * One entry per locale: the App Router has no built-in locale handling here,
   * so a prefix is matched only if it is written out. French is unprefixed and
   * is the first.
   */
  redirects: async () => [
    {
      source: "/developpement-entreprise",
      destination: "/developpement-digital",
      permanent: true,
    },
    {
      source: "/en/developpement-entreprise",
      destination: "/en/developpement-digital",
      permanent: true,
    },
    {
      source: "/de/developpement-entreprise",
      destination: "/de/developpement-digital",
      permanent: true,
    },
  ],
};

export default nextConfig;
