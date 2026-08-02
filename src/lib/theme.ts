"use client";

import * as React from "react";

/**
 * Lumina theme system.
 * - "dark" = the default Lumina dark theme (black bg, gold accents)
 * - "luminary" = the exclusive Luminary theme (warm gold-tinted bg, radiant particles, unlocked when all 36 achievements complete)
 *
 * The theme is applied by toggling a `data-theme="luminary"` attribute on <html>.
 * Persisted in localStorage so it survives reloads.
 */

export type LuminaTheme = "dark" | "luminary";

const STORAGE_KEY = "lumina.theme";

/** Get the persisted theme (defaults to "dark"). */
export function getTheme(): LuminaTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "luminary" ? "luminary" : "dark";
  } catch {
    return "dark";
  }
}

/** Persist + apply the theme to <html>. */
export function setTheme(theme: LuminaTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

/** React hook that reads + sets the theme, applying it on mount. */
export function useLuminaTheme(unlocked: boolean) {
  const [theme, setThemeState] = React.useState<LuminaTheme>("dark");

  // Load persisted theme on mount
  React.useEffect(() => {
    const persisted = getTheme();
    // If luminary theme is persisted but no longer unlocked, revert to dark
    if (persisted === "luminary" && !unlocked) {
      setTheme("dark");
      setThemeState("dark");
    } else {
      setTheme(persisted);
      setThemeState(persisted);
    }
  }, [unlocked]);

  const toggle = React.useCallback(
    (next: LuminaTheme) => {
      if (next === "luminary" && !unlocked) return; // locked
      setTheme(next);
      setThemeState(next);
    },
    [unlocked]
  );

  return { theme, setTheme: toggle };
}
