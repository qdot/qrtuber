import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "qrtuber.webrtc.theme";

const THEME_LABELS = {
  system: "System",
  light: "Light",
  dark: "Dark"
} as const;

type ThemeMode = keyof typeof THEME_LABELS;
type ResolvedTheme = Exclude<ThemeMode, "system">;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredThemeMode(): ThemeMode {
  try {
    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(storedMode) ? storedMode : "system";
  } catch {
    return "system";
  }
}

function persistThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures; the in-memory selection still applies.
  }
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolvedTheme = resolveTheme(mode);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(readStoredThemeMode())
  );

  useEffect(() => {
    setResolvedTheme(applyTheme(mode));

    if (mode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setResolvedTheme(applyTheme(mode));
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, [mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    persistThemeMode(nextMode);
    setModeState(nextMode);
  }, []);

  return {
    mode,
    resolvedTheme,
    setMode
  };
}

export function ThemeControl() {
  const { mode, resolvedTheme, setMode } = useThemeMode();

  return (
    <label className="theme-control" title={`Using ${resolvedTheme} theme`}>
      <span>Theme</span>
      <select
        aria-label="Theme"
        onChange={(event) => setMode(event.currentTarget.value as ThemeMode)}
        value={mode}
      >
        {Object.entries(THEME_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
