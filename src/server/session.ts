import { cookies } from "next/headers";

import * as auth from "@/modules/auth/public";
import { THEME_COOKIE, resolveTheme, type Theme } from "@/ui/theme";
import { container, sessionCookieName } from "./container";

export async function currentTheme(): Promise<Theme> {
  const store = await cookies();
  return resolveTheme(store.get(THEME_COOKIE)?.value);
}

/**
 * The caller's identity for a server component, or `null` when the cookie is missing,
 * expired or revoked. Rendering never throws on a stale cookie: the page decides what to do.
 */
export async function currentSession(): Promise<auth.SessionIdentity | null> {
  const c = container();
  const store = await cookies();
  const token = store.get(sessionCookieName(c.secureCookies))?.value;
  if (token === undefined) return null;
  try {
    return await auth.currentIdentity(c.database, c.authDeps, token);
  } catch {
    return null;
  }
}