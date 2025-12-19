"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "tokyo-night" | "dark" | "light" | "solarized-light" | "neo-brutalism" | "neo-brutalism-dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "edutoolkit-theme";
const DEFAULT_THEME: Theme = "tokyo-night";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cargar tema guardado o usar default
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (savedTheme && ["tokyo-night", "dark", "light", "solarized-light", "neo-brutalism", "neo-brutalism-dark"].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      // Detectar preferencia del sistema si es de noche/día
      const hour = new Date().getHours();
      const isNight = hour >= 20 || hour < 6;
      const isDay = hour >= 6 && hour < 20;
      
      if (isNight) {
        setThemeState("tokyo-night");
      } else if (isDay) {
        setThemeState("solarized-light");
      } else {
        setThemeState(DEFAULT_THEME);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Aplicar tema al documento
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

