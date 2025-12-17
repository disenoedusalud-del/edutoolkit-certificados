"use client";

import { useState } from "react";
import { Gear } from "phosphor-react";
import ThemeSelector from "@/components/ThemeSelector";

export function ThemeSettingsButton() {
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowThemeSettings(!showThemeSettings)}
        className="px-3 py-2 bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary transition-colors flex items-center gap-2 border border-theme"
        title="Ajustes de tema"
      >
        <Gear size={18} weight="bold" />
        <span className="hidden sm:inline">Tema</span>
      </button>
      {showThemeSettings && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowThemeSettings(false)}
          />
          <div className="absolute top-12 right-0 bg-theme-secondary border border-theme rounded-lg shadow-xl p-4 z-50 min-w-[200px]">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Apariencia</h3>
              <ThemeSelector />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

