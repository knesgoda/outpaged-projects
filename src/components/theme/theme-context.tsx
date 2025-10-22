import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "light" | "dark" | "system" | "outpaged-light" | "outpaged-dark";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (value: ThemeName) => void;
  resolvedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: ThemeName): "light" | "dark" {
  if (theme === "system") return getSystemTheme();
  if (theme === "outpaged-dark") return "dark";
  if (theme === "outpaged-light") return "light";
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem("outpaged.theme");
    if (saved === "light" || saved === "dark" || saved === "system" || saved === "outpaged-light" || saved === "outpaged-dark") {
      return saved as ThemeName;
    }
    return "system";
  });

  const systemTheme = useMemo(() => getSystemTheme(), []);
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  // Apply data-theme to html element using semantic tokens
  useEffect(() => {
    const html = document.documentElement;
    const mode = resolvedTheme;
    const token = mode === "dark" ? "outpaged-dark" : "outpaged-light";

    html.setAttribute("data-theme", token);
    html.classList.toggle("dark", mode === "dark");

    // Persist preference only when not system
    if (theme !== "system") {
      window.localStorage.setItem("outpaged.theme", theme);
    } else {
      window.localStorage.removeItem("outpaged.theme");
    }
  }, [theme, resolvedTheme]);

  // Listen to system changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const html = document.documentElement;
      const mode = mql.matches ? "dark" : "light";
      const token = mode === "dark" ? "outpaged-dark" : "outpaged-light";
      html.setAttribute("data-theme", token);
      html.classList.toggle("dark", mode === "dark");
    };
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [theme]);

  const setTheme = (value: ThemeName) => {
    setThemeState(value);
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
