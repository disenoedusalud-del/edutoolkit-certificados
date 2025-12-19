"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Download, CaretDown } from "phosphor-react";

interface ImportExportMenuProps {
  onImportClick: () => void;
  onExportSelected?: () => void;
  onExportAll?: () => void;
  onExportByCourse?: () => void;
  getSelectedCount?: () => number;
  getHasSelected?: () => boolean;
}

export default function ImportExportMenu({
  onImportClick,
  onExportSelected,
  onExportAll,
  onExportByCourse,
  getSelectedCount,
  getHasSelected,
}: ImportExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [hasSelected, setHasSelected] = useState(false);

  // Actualizar contador de seleccionados periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (getSelectedCount) {
        setSelectedCount(getSelectedCount());
      }
      if (getHasSelected) {
        setHasSelected(getHasSelected());
      }
    }, 500); // Actualizar cada 500ms

    return () => clearInterval(interval);
  }, [getSelectedCount, getHasSelected]);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-theme-secondary text-text-primary rounded-lg hover:bg-theme-tertiary transition-colors flex items-center gap-2 border border-theme"
      >
        <Download size={18} weight="bold" />
        <span>Importar/Exportar</span>
        <CaretDown size={16} weight="bold" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-theme-secondary border border-theme rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {/* Opción Importar */}
            <button
              onClick={() => {
                onImportClick();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-text-primary hover:bg-theme-tertiary transition-colors flex items-center gap-3"
            >
              <Upload size={20} weight="bold" className="text-green-500" />
              <div className="flex flex-col">
                <span className="font-medium">Importar desde Excel</span>
                <span className="text-xs text-text-secondary">
                  Cargar certificados desde CSV/Excel
                </span>
              </div>
            </button>

            {/* Divider */}
            <div className="border-t border-theme my-1" />

            {/* Opción Exportar Seleccionados (solo si hay seleccionados) */}
            {hasSelected && onExportSelected && (
              <>
                <button
                  onClick={() => {
                    onExportSelected();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-text-primary hover:bg-theme-tertiary transition-colors flex items-center gap-3"
                >
                  <Download size={20} weight="bold" className="text-purple-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      Exportar Seleccionados ({selectedCount})
                    </span>
                    <span className="text-xs text-text-secondary">
                      Exportar solo los certificados marcados
                    </span>
                  </div>
                </button>
                <div className="border-t border-theme my-1" />
              </>
            )}

            {/* Opción Exportar por Curso */}
            {onExportByCourse && (
              <>
                <button
                  onClick={() => {
                    onExportByCourse();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-text-primary hover:bg-theme-tertiary transition-colors flex items-center gap-3"
                >
                  <Download size={20} weight="bold" className="text-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Exportar por Curso</span>
                    <span className="text-xs text-text-secondary">
                      Exportar certificados de un curso específico
                    </span>
                  </div>
                </button>
                <div className="border-t border-theme my-1" />
              </>
            )}

            {/* Opción Exportar Todos */}
            {onExportAll && (
              <button
                onClick={() => {
                  onExportAll();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-text-primary hover:bg-theme-tertiary transition-colors flex items-center gap-3"
              >
                <Download size={20} weight="bold" className="text-green-500" />
                <div className="flex flex-col">
                  <span className="font-medium">Exportar Todos</span>
                  <span className="text-xs text-text-secondary">
                    Exportar todos los certificados visibles
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

