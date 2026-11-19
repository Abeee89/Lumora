import { FocusHeadingOnNavigate } from "./focus-heading";
import { primaryNav, visibleNav } from "./nav";

/**
 * The signed-out shell. NAVIGATION-STRUCTURE.md section 3 defines the signed-in sidebar,
 * rail and tab bar; none of their destinations exist yet, so the shell renders the
 * wordmark, the skip link and the content column only.
 *
 * The wordmark is not a link: `/` has no route before M02, and A11Y-BASE plus
 * NAVIGATION-STRUCTURE rule 2 forbid a destination that does not work.
 *
 * `main` and each page h1 take `tabIndex={-1}` so the skip link and the navigation focus
 * move have a focusable target (A11Y-BASE).
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const items = visibleNav(primaryNav);

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
          <span className="text-xl font-bold tracking-tight text-primary">Lumora</span>
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