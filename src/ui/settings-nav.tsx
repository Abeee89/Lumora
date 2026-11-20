"use client";

import { usePathname } from "next/navigation";

/**
 * NAVIGATION-STRUCTURE section 8: a vertical list in a 220 px column at 1024 and up, a
 * horizontal tab list scrolling inside a labelled region below that.
 */
export function SettingsNav({ sections }: { sections: readonly { label: string; href: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {sections.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <a
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] whitespace-nowrap ${
                  active
                    ? "bg-primary-soft font-semibold text-on-primary-soft"
                    : "text-ink-2 hover:text-primary"
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}