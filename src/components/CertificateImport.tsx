"use client";

import { useState } from "react";
import { Upload, FileXls, CheckCircle, XCircle, Download, X } from "phosphor-react";
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

  const downloadTemplate = () => {
    // Descargar la plantilla desde la carpeta public
    const link = document.createElement("a");
    link.href = "/templates/plantilla_importacion_certificados.csv";
    link.download = "plantilla_importacion_certificados.csv";
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
            Seleccionar archivo
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

        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="text-sm text-accent hover:text-accent-hover flex items-center gap-1"
          >
            <Download size={16} />
            Descargar plantilla CSV
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

        <div className="mt-4 p-3 bg-theme-tertiary rounded border border-theme">
          <p className="text-xs text-text-secondary mb-2">
            <strong>Formato requerido:</strong> El archivo debe tener estas columnas:
          </p>
          <ul className="text-xs text-text-secondary list-disc list-inside space-y-1">
            <li>
              <strong>Nombre Completo</strong> (requerido) - Nombre del participante
            </li>
            <li>
              <strong>Nombre del Curso</strong> (requerido) - Si el curso no existe, se creará automáticamente
            </li>
            <li>
              <strong>Tipo de Curso</strong> (requerido si es nuevo) - Curso, Diplomado, Webinar, Taller, Seminario
            </li>
            <li>
              <strong>Año</strong> (requerido) - Año del certificado (2000-2100)
            </li>
            <li>
              <strong>Email</strong> (opcional) - Email del participante
            </li>
            <li>
              <strong>Teléfono</strong> (opcional) - Teléfono del participante
            </li>
            <li>
              <strong>Origen</strong> (opcional) - "nuevo" o "historico" (default: "nuevo")
            </li>
            <li>
              <strong>Estado</strong> (opcional) - Estado de entrega (default: "en_archivo")
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

