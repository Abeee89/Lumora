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
  // NAVIGATION-STRUCTURE section 2: A-6 Plan list is a Calendar tab and has no item of
  // its own, so this entry carries it until M09 ships `/calendar` and the tab strip.
  { group: "Plan", label: "Calendar", href: "/plan" },
  { group: "Plan", label: "To-dos", href: "/todos" },
  { group: "Plan", label: "Exams", href: "/exams" },
  { group: "Library", label: "Subjects", href: "/subjects" },
  { group: "Library", label: "Notes", href: "/notes" },
  { group: "Review", label: "Sessions", href: "/sessions" },
  { group: "Review", label: "Statistics", href: "/statistics" },
  { group: "Settings", label: "Settings", href: "/settings/profile" },
];

/** NAVIGATION-STRUCTURE section 8. Sections appear only once their route is shipped. */
export const settingsSections: readonly { label: string; href: string }[] = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Study", href: "/settings/study" },
  { label: "Appearance", href: "/settings/appearance" },
  { label: "Security", href: "/settings/security" },
  { label: "Data", href: "/settings/data" },
];

export type ShippedRoutes = Readonly<Record<string, true>>;

/**
 * Routes that exist in this build. M02 adds the public pages and the three settings
 * sections that belong to profile, appearance and security; M03 adds Subjects and the
 * subject detail page. Keep this in step with `src/app`.
 */
export const shippedRoutes: ShippedRoutes = {
  "/": true,
  "/signup": true,
  "/login": true,
  "/forgot-password": true,
  "/reset-password": true,
  "/welcome": true,
  "/settings/profile": true,
  "/settings/appearance": true,
  "/settings/security": true,
  "/subjects": true,
  "/exams": true,
  "/plan": true,
};

export function visibleNav(
  items: readonly NavItem[],
  shipped: ShippedRoutes = shippedRoutes,
): readonly NavItem[] {
  return items.filter((item) => shipped[item.href] === true);
}

export function visibleSettingsSections(
  shipped: ShippedRoutes = shippedRoutes,
): readonly { label: string; href: string }[] {
  return settingsSections.filter((section) => shipped[section.href] === true);
}

export function isShipped(href: string, shipped: ShippedRoutes = shippedRoutes): boolean {
  return shipped[href] === true;
}