/**
 * NAVIGATION-STRUCTURE.md section 2: order, labels and routes are fixed by the spec.
 * Rule 2: an item is rendered only when its route is shipped and working.
 */
export interface NavItem {
  /** Group heading; `null` is the unheaded top group. */
  group: string | null;
  label: string;
  href: string;
}

export const primaryNav: readonly NavItem[] = [
  { group: null, label: "Dashboard", href: "/dashboard" },
  { group: null, label: "Timer", href: "/timer" },
  { group: "Plan", label: "Calendar", href: "/calendar" },
  { group: "Plan", label: "To-dos", href: "/todos" },
  { group: "Plan", label: "Exams", href: "/exams" },
  { group: "Library", label: "Subjects", href: "/subjects" },
  { group: "Library", label: "Notes", href: "/notes" },
  { group: "Review", label: "Sessions", href: "/sessions" },
  { group: "Review", label: "Statistics", href: "/statistics" },
  { group: "Settings", label: "Settings", href: "/settings/profile" },
];

export type ShippedRoutes = Readonly<Record<string, true>>;

/**
 * Routes that exist in this build. M01 ships no product route: the first entry
 * arrives with M02 (PU-1..PU-6). Keep this in step with `src/app`.
 */
export const shippedRoutes: ShippedRoutes = {};

export function visibleNav(
  items: readonly NavItem[],
  shipped: ShippedRoutes = shippedRoutes,
): readonly NavItem[] {
  return items.filter((item) => shipped[item.href] === true);
}