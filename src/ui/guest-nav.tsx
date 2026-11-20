"use client";

import { usePathname } from "next/navigation";

/**
 * NAVIGATION-STRUCTURE section 10: the guest header offers exactly two choices, and the
 * current page's own link is omitted (no "Log in" on `/login`).
 */
export function GuestNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="ml-auto flex items-center gap-4 text-sm">
      {pathname !== "/login" && (
        <a href="/login" className="inline-flex min-h-11 items-center text-ink-2 hover:text-primary">
          Log in
        </a>
      )}
      {pathname !== "/signup" && (
        <a
          href="/signup"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover"
        >
          Create account
        </a>
      )}
    </nav>
  );
}