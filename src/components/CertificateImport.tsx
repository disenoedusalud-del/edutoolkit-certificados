"use client";

import { useState } from "react";
import { Upload, FileXls, CheckCircle, XCircle, Download, X, BookOpen } from "phosphor-react";
import { toast } from "@/lib/toast";

interface ImportResults {
  success: number;
  errors: Array<{ row: number; error: string }>;
  coursesCreated: string[];
}

interface CertificateImportProps {
  onClose?: () => void;
}

export default function CertificateImport({ onClose }: CertificateImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/certificates/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar error más detallado
        const errorMessage = data.error || data.details || "Error al importar";
        throw new Error(errorMessage);
      }

      setResults(data.results);

      // Mostrar mensaje de éxito con detalles
      if (data.results.errors.length > 0) {
        toast.success(
          `${data.message}. ${data.results.errors.length} fila(s) con errores. Revisa los detalles abajo.`
        );
      } else {
        toast.success(data.message);
        // Recargar la página después de 2 segundos solo si no hay errores
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error en importación:", error);
      toast.error(error.message || "Error al importar certificados");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const filename = format === 'xlsx' ? 'plantilla_certificados.xlsx' : 'plantilla_certificados.csv';
    const link = document.createElement("a");
    link.href = `/templates/${filename}`;
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-theme-secondary rounded-xl shadow p-6 border border-theme mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">
          Importar Certificados desde Excel/CSV
        </h2>
        <button
          onClick={() => {
            setFile(null);
            setResults(null);
            if (onClose) onClose();
          }}
          className="p-1 hover:bg-theme-tertiary rounded transition-colors"
        >
          <X size={20} className="text-text-secondary" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Seleccionar archivo (.xlsx o .csv)
          </label>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="px-4 py-2 bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary transition-colors cursor-pointer border border-theme flex items-center gap-2"
            >
              <FileXls size={18} weight="bold" />
              {file ? file.name : "Seleccionar archivo"}
            </label>
            <button
              onClick={handleImport}
              disabled={!file || uploading}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={18} weight="bold" />
                  Importar
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => downloadTemplate('xlsx')}
            className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 transition-colors"
          >
            <Download size={16} weight="bold" />
            Descargar Plantilla Excel (.xlsx)
          </button>
          <button
            onClick={() => downloadTemplate('csv')}
            className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-theme-tertiary transition-colors"
          >
            <Download size={16} />
            Versión CSV
          </button>
        </div>

        {results && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} weight="bold" />
              <span className="font-medium">
                {results.success} certificados importados exitosamente
              </span>
            </div>
            {results.coursesCreated.length > 0 && (
              <div className="text-sm text-text-secondary">
                <strong>Cursos nuevos creados:</strong>{" "}
                {results.coursesCreated.join(", ")}
              </div>
            )}
            {results.errors.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle size={20} weight="bold" />
                  <span className="font-medium">
                    {results.errors.length} errores encontrados
                  </span>
                </div>
                <div className="bg-theme-tertiary rounded p-3 max-h-40 overflow-y-auto border border-theme">
                  {results.errors.map((err, idx) => (
                    <div key={idx} className="text-xs text-text-secondary mb-1">
                      <strong>Fila {err.row}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <BookOpen size={18} />
            Estructura Recomendada del Archivo
          </h3>
          <div className="overflow-x-auto border border-theme rounded-lg">
            <table className="min-w-full text-[11px] bg-theme-tertiary">
              <thead>
                <tr className="bg-theme-secondary text-text-secondary border-b border-theme">
                  <th className="px-3 py-2 text-left font-bold">Columna</th>
                  <th className="px-3 py-2 text-left font-bold">Estado</th>
                  <th className="px-3 py-2 text-left font-bold">Descripción / Valores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                <tr>
                  <td className="px-3 py-2 font-mono font-bold text-blue-600">Nombre Completo</td>
                  <td className="px-3 py-2"><span className="text-red-500 font-bold text-[10px] uppercase">Requerido</span></td>
                  <td className="px-3 py-2">Nombre completo del participante</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold text-blue-600">ID del Curso</td>
                  <td className="px-3 py-2"><span className="text-red-500 font-bold text-[10px] uppercase">Requerido</span></td>
                  <td className="px-3 py-2">Código único del curso (ej: LM-1-2025). Lo encuentras en Administración de Cursos.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold">Identificación</td>
                  <td className="px-3 py-2 text-text-tertiary">Opcional</td>
                  <td className="px-3 py-2">DNI, RTN, Pasaporte, etc.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold">Email</td>
                  <td className="px-3 py-2 text-text-tertiary">Opcional</td>
                  <td className="px-3 py-2">Correo electrónico para envíos masivos</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold">Teléfono</td>
                  <td className="px-3 py-2 text-text-tertiary">Opcional</td>
                  <td className="px-3 py-2">Número de WhatsApp (ej: 50499001122)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold">Ubicación Física</td>
                  <td className="px-3 py-2 text-text-tertiary">Opcional</td>
                  <td className="px-3 py-2">Ej: Tomo 1, Caja 24, Fila B</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold">Estado</td>
                  <td className="px-3 py-2 text-text-tertiary">Opcional</td>
                  <td className="px-3 py-2">en_archivo, entregado, digital_enviado</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono font-bold">Origen</td>
                  <td className="px-3 py-2 text-text-tertiary">Opcional</td>
                  <td className="px-3 py-2">nuevo, historico</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-text-tertiary italic">
            * El sistema ignorará mayúsculas/minúsculas y espacios extras en los encabezados.
          </p>
        </div>
      </div>
    </div>
  );
}

