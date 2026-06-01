"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("suivan-theme") as Theme) || "light";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("suivan-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (typeof window === "undefined") {
    return <ThemeContext.Provider value={{ theme: "light", toggle: () => {} }}>{children}</ThemeContext.Provider>;
  }

  if (!mounted) return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
