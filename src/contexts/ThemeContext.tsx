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

  // Efecto para aplicar tema al documento
  useEffect(() => {
    // Si no está montado, o estamos en servidor, no hacemos nada con el DOM
    // Pero el estado 'theme' ya tiene un valor inicial (DEFAULT_THEME) así que es seguro.
    if (!mounted) return;

    // Aplicar tema al documento
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // IMPORTANTE: Manejar la clase 'dark' para Tailwind
    if (theme === 'dark' || theme === 'tokyo-night' || theme === 'neo-brutalism-dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Renderizamos siempre el Provider para que los hooks funcionen
  // 'mounted' solo sirve para controlar efectos del lado del cliente o evitar hidratación incorrecta visual
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {/* 
        Opcional: Si queremos evitar flash de contenido incorrecto, podemos controlar la visibilidad aquí, 
        pero para contextos es mejor proveer siempre. 
        Para evitar 'hydration mismatch' en estilos, Next.js 'suppressHydrationWarning' en html ayuda.
      */}
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

