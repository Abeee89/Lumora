/**
 * The appearance setting (A-15) shared by the server render and the browser form. It is a
 * plain cookie, not HttpOnly: the appearance form applies a change immediately and the
 * server reads the same value to render the first paint in the right theme.
 */
export const THEME_COOKIE = "lumora_theme";
export const THEME_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type Theme = "light" | "dark" | "system";

export const themeLabels: Readonly<Record<Theme, string>> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function resolveTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}