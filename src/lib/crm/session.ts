import "server-only";

import { cookies } from "next/headers";

/**
 * The back office session.
 *
 * The CRM token lives in an httpOnly cookie and never reaches client
 * JavaScript: every call to the API goes through a route handler on this side,
 * which reads the cookie and attaches the bearer header itself. A token in
 * `localStorage` is readable by any script on the page, and this one grants full
 * access to every lead in the CRM.
 */
export const SESSION_COOKIE = "crm_token";

/** Where the Laravel API lives. Server-side only — never exposed to the browser. */
export function apiBaseUrl(): string {
  return process.env.CRM_API_URL ?? "http://localhost:8000/api";
}

export async function getToken(): Promise<string | null> {
  const store = await cookies();

  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function isSignedIn(): Promise<boolean> {
  return (await getToken()) !== null;
}

export async function setToken(token: string): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Sent over plain HTTP in local development, encrypted everywhere else.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // A working day, so an unattended browser does not stay signed in overnight.
    maxAge: 60 * 60 * 10,
  });
}

export async function clearToken(): Promise<void> {
  const store = await cookies();

  store.delete(SESSION_COOKIE);
}
