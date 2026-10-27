// Shared by server and client components.

export type Theme = "light" | "dark" | "system";

export const THEME_COOKIE = "rivhe_theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}
