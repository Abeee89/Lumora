import { FocusHeadingOnNavigate } from "./focus-heading";
import { GuestNav } from "./guest-nav";
import { isShipped, primaryNav, visibleNav } from "./nav";
import { SignOutButton } from "./sign-out-button";
/**
 * The shell shared by every page. NAVIGATION-STRUCTURE section 3 defines the signed-in
 * sidebar, rail and tab bar; the MVP destinations they carry arrive with M03 and later, so
 * this shell renders the wordmark, the skip link, the shipped navigation entries and the
 * content column. The guest header offers exactly the two choices of section 10.
 *
 * `main` and each page h1 take `tabIndex={-1}` so the skip link and the navigation focus
 * move have a focusable target (A11Y-BASE).
 */
export function Shell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const items = signedIn ? visibleNav(primaryNav) : [];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded focus:border focus:border-line focus:bg-surface focus:px-4 focus:text-primary"
      >
        Skip to main content
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          {isShipped("/") ? (
            <a href="/" className="text-xl font-bold tracking-tight text-primary">
              Lumora
            </a>
          ) : (
            <span className="text-xl font-bold tracking-tight text-primary">Lumora</span>
          )}

          {items.length > 0 && (
            <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-ink-2 hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          {signedIn ? (
            <div className="ml-auto">
              <SignOutButton />
            </div>
          ) : (
            <GuestNav />
          )}
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 outline-none sm:px-6 sm:py-14"
      >
        {children}
      </main>

      {/* A11Y-BASE: one global polite live region; later milestones announce into it. */}
      <div role="status" aria-live="polite" className="sr-only" />
      <FocusHeadingOnNavigate />
    </div>
  );
}