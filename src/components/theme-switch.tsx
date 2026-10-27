"use client";

import { useSyncExternalStore } from "react";
import { IconAuto, IconMoon, IconSun } from "@/components/icons";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// The <html data-theme> attribute is the single source of truth: the server sets
// it from the cookie, and every switch on the page reads and writes it, so they
// always agree without a round trip.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function currentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "system";
}

function useTheme(serverTheme: Theme): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => serverTheme);
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

const OPTIONS: { value: Theme; label: string; Icon: typeof IconSun }[] = [
  { value: "light", label: "Light", Icon: IconSun },
  { value: "dark", label: "Dark", Icon: IconMoon },
  { value: "system", label: "Auto", Icon: IconAuto },
];

/** Light | Dark | Auto. "Auto" follows the phone or computer setting. */
export function ThemeSwitch({ initial, labels = false, className }: { initial: Theme; labels?: boolean; className?: string }) {
  const theme = useTheme(initial);
  return (
    <div role="group" aria-label="Appearance" className={cn("inline-flex shrink-0 rounded-full border border-line bg-surface p-[3px]", className)}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={labels ? undefined : `${label} mode`}
          title={`${label}${value === "system" ? " (follows your device)" : ""}`}
          onClick={() => applyTheme(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full py-1.5 text-[11px] leading-none tracking-[0.08em] transition-colors",
            labels ? "px-3" : "px-2.5",
            theme === value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
          )}
        >
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.6} />
          {labels && label}
        </button>
      ))}
    </div>
  );
}

/** One-tap light/dark switch for headers. The icon is picked by CSS, so it is right before hydration too. */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const theme = currentTheme();
        const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        applyTheme(dark ? "light" : "dark");
      }}
      aria-label="Switch light or dark mode"
      title="Light / dark"
      className={cn("grid h-10 w-10 place-items-center", className)}
    >
      <IconMoon className="theme-icon-light h-5 w-5" />
      <IconSun className="theme-icon-dark h-5 w-5" />
    </button>
  );
}
