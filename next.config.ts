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
};

export default nextConfig;
