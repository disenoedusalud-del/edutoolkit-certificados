"use client";

import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { Moon, Sun, Palette, PaintBrush } from "phosphor-react";
import { useState, useRef, useEffect } from "react";

const themes: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "tokyo-night", label: "Tokyo Night", icon: Moon },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "solarized-light", label: "Solarized Light", icon: Sun },
  { value: "neo-brutalism", label: "Neo Brutalism", icon: PaintBrush },
  { value: "neo-brutalism-dark", label: "Neo Brutalism Dark", icon: Moon },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const currentTheme = themes.find((t) => t.value === theme);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary text-text-primary hover:bg-theme-tertiary transition-colors border border-theme"
        aria-label="Cambiar tema"
      >
        {currentTheme && <currentTheme.icon size={18} weight="fill" />}
        <span className="text-sm font-medium">{currentTheme?.label || "Tema"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-theme-secondary rounded-lg shadow-lg border border-theme z-50 overflow-hidden">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isActive = theme === themeOption.value;
            
            return (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-theme-tertiary transition-colors ${
                  isActive
                    ? "bg-accent/20 text-accent"
                    : "text-text-primary"
                }`}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
                <span className="text-sm font-medium">{themeOption.label}</span>
                {isActive && (
                  <span className="ml-auto text-accent">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

