"use client";

import { useState } from "react";
import { X, Folder, Download, MagnifyingGlass } from "phosphor-react";
import { Certificate } from "@/types/Certificate";
import { exportToCSV, downloadCSV } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";

interface CourseExportModalProps {
  groupedCerts: Record<string, Certificate[]>;
  onClose: () => void;
}

export default function CourseExportModal({
  groupedCerts,
  onClose,
}: CourseExportModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const handleExport = () => {
    if (!selectedGroup || !groupedCerts[selectedGroup]) {
      toast.error("Por favor selecciona un curso");
      return;
    }

    const certs = groupedCerts[selectedGroup];
    if (certs.length === 0) {
      toast.error("No hay certificados en este curso");
      return;
    }

    // Crear nombre de archivo basado en el curso
    const firstCert = certs[0];
    const courseCode = firstCert.courseId?.split("-")[0] || "CURSO";
    const courseName = firstCert.courseName?.replace(/[^a-zA-Z0-9]/g, "_") || "curso";
    const year = firstCert.year || new Date().getFullYear();
    const filename = `certificados_${courseCode}_${courseName}_${year}.csv`;

    const csv = exportToCSV(certs);
    downloadCSV(csv, filename);
    toast.success(`${certs.length} certificado(s) exportado(s) del curso`);
    onClose();
  };

  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar grupos vacíos Y aplicar filtro de búsqueda
  const groups = Object.keys(groupedCerts)
    .filter((key) => {
      const hasCerts = groupedCerts[key].length > 0;
      if (!hasCerts) return false;

      const certs = groupedCerts[key];
      const firstCert = certs[0];
      const courseCode = firstCert.courseId?.split("-")[0] || "SIN-CODIGO";
      const courseName = firstCert.courseName || "Sin nombre";

      const searchLower = searchTerm.toLowerCase();
      return (
        courseCode.toLowerCase().includes(searchLower) ||
        courseName.toLowerCase().includes(searchLower)
      );
    })
    .sort();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-theme-secondary border border-theme rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <Folder size={24} weight="bold" className="text-accent" />
            <h2 className="text-xl font-bold text-text-primary">
              Exportar por Curso
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors"
          >
            <X size={20} weight="bold" className="text-text-secondary" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-theme bg-theme-tertiary">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar curso por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-secondary border border-theme rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent text-text-primary"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {groups.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              No hay cursos disponibles para exportar
            </p>
          ) : (
            <div className="space-y-2">
              {groups.map((groupKey) => {
                const certs = groupedCerts[groupKey];
                const firstCert = certs[0];
                const courseCode = firstCert.courseId?.split("-")[0] || "SIN-CODIGO";
                const courseName = firstCert.courseName || "Sin nombre";
                const year = firstCert.year || "N/A";
                const count = certs.length;

                return (
                  <button
                    key={groupKey}
                    onClick={() => setSelectedGroup(groupKey)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedGroup === groupKey
                      ? "border-accent bg-accent/10"
                      : "border-theme bg-theme-tertiary hover:bg-theme-secondary"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Folder
                            size={18}
                            weight="bold"
                            className={
                              selectedGroup === groupKey
                                ? "text-accent"
                                : "text-text-secondary"
                            }
                          />
                          <span className="font-semibold text-text-primary">
                            {courseCode} - {courseName}
                          </span>
                        </div>
                        <div className="text-sm text-text-secondary">
                          Año: {year} • {count} certificado{count !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {selectedGroup === groupKey && (
                        <div className="ml-4">
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={!selectedGroup}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} weight="bold" />
            Exportar Curso Seleccionado
          </button>
        </div>
      </div>
    </div>
  );
}

