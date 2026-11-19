"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A11Y-BASE (PAGE-SPECIFICATIONS section 2): focus moves to the h1 on navigation, so a
 * screen reader starts at the new heading instead of the window root. The first render is
 * skipped: a focus move on load would fight the skip link and the browser's own restore.
 */
export function FocusHeadingOnNavigate() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>("main h1[tabindex='-1']");
    heading?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}