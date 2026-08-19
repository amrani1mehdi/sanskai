import type { NextConfig } from "next";

/**
 * The Laravel backend serves the Filament admin panel. Rather than sending
 * people to a second port, the paths it owns are proxied through this app so
 * the whole product lives on one origin — /admin sits alongside the site.
 *
 * Point BACKEND_URL at the deployed Laravel host in production.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

/** Paths Laravel owns: the panel, Filament's assets, and uploaded files. */
const BACKEND_PATHS = [
  "/admin",
  "/filament",
  "/js/filament",
  "/css/filament",
  "/fonts/filament",
  "/storage",
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },

  // The panel's security headers are set by Laravel middleware, not here —
  // `headers()` does not apply to externally rewritten routes.
  async rewrites() {
    return [
      ...BACKEND_PATHS.flatMap((path) => [
        { source: path, destination: `${BACKEND_URL}${path}` },
        {
          source: `${path}/:slug*`,
          destination: `${BACKEND_URL}${path}/:slug*`,
        },
      ]),

      /*
       * Livewire serves its script and update endpoint under a per-app hashed
       * prefix (livewire-0f634529/…), so this matches the shape rather than a
       * fixed path — the hash changes with the app key.
       */
      {
        source: "/:livewire(livewire-[^/]+)/:slug*",
        destination: `${BACKEND_URL}/:livewire/:slug*`,
      },
    ];
  },
};

export default nextConfig;
