/**
 * The back-office address a signed-out visitor was on their way to.
 *
 * A layout is never told the URL it renders under, so the gate in front of
 * /admin cannot see where it is sending someone away from. The proxy can: it
 * copies the address into this header, and the gate reads it back to pass on
 * to the login page. That is what lets the button in a lead notification
 * email land on that lead after signing in, rather than on the bare board.
 */
export const ADMIN_URL_HEADER = "x-admin-url";

/** Where the back office starts when there is nowhere better to go. */
export const ADMIN_HOME = "/admin";

/**
 * `next` if it is somewhere inside the back office, the board otherwise.
 *
 * `next` arrives in a query string anyone can write, so it is held to a path
 * under /admin and nothing else. Accepting whatever it names would make the
 * login page an open redirect — `//evil.example` is a path to a browser — and
 * pointing it back at the login page would only loop.
 */
export function returnTo(next: string | null | undefined): string {
  if (!next || !/^\/admin(\/|\?|$)/.test(next) || next.includes("\\")) {
    return ADMIN_HOME;
  }

  if (next === "/admin/login" || next.startsWith("/admin/login?")) {
    return ADMIN_HOME;
  }

  return next;
}
