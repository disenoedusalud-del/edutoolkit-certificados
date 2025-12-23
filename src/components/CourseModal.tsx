"use client";

import { useState, FormEvent, useEffect } from "react";
import { Course } from "@/types/Course";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "./LoadingSpinner";
import { X } from "phosphor-react";

interface CourseModalProps {
  course?: Course | null;
  onClose: () => void;
  onSuccess: (newCourseId?: string) => void;
}

export default function CourseModal({
  course,
  onClose,
  onSuccess,
}: CourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: course?.name || "",
    id: course?.id || "",
    courseType: course?.courseType || "Curso",
    year: course?.year || new Date().getFullYear(),
    month: course?.month || null,
    edition: course?.edition || null,
    origin: course?.origin || "nuevo",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (course) {
      // Modo edición: cargar datos del curso
      setFormData({
        name: course.name,
        id: course.id,
        courseType: course.courseType || "Curso",
        year: course.year || new Date().getFullYear(),
        month: course.month || null,
        edition: course.edition || null,
        origin: course.origin || "nuevo",
      });
    } else {
      // Modo creación: limpiar formulario
      setFormData({
        name: "",
        id: "",
        courseType: "Curso",
        year: new Date().getFullYear(),
        month: null,
        edition: null,
        origin: "nuevo",
      });
    }
    setError(null);
    setFieldErrors({});
  }, [course]);

  const generateAutoId = (name: string, year: number, edition: number | null) => {
    // Palabras a ignorar en el acrónimo
    const stopWords = ["de", "del", "la", "el", "los", "las", "en", "y", "para", "por", "con", "un", "una"];

    const initials = name
      .trim()
      .split(/\s+/) // Dividir por espacios
      .filter((word) => word.length > 0 && !stopWords.includes(word.toLowerCase())) // Ignorar palabras cortas/conectores
      .map((word) => word.charAt(0)) // Tomar primera letra
      .join("")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") // Solo letras y números
      .substring(0, 8); // Máximo 8 caracteres para el prefijo

    let newId = "";
    if (initials.length > 0) {
      newId = `${initials}-${year}`;
    } else if (name.length > 0) {
      newId = `${name.charAt(0).toUpperCase()}-${year}`;
    }

    if (edition && newId) {
      newId += `-${edition}`;
    }

    return newId;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "El nombre del curso es requerido";
    }

    if (!formData.id.trim()) {
      errors.id = "El código del curso es requerido";
    } else {
      // Validar formato: letras mayúsculas, números y guiones, 1-20 caracteres
      const codeRegex = /^[A-Z0-9\-]{1,20}$/;
      if (!codeRegex.test(formData.id.trim())) {
        errors.id =
          "El código debe tener 1-20 caracteres (letras mayúsculas, números y guiones), sin espacios";
      }
    }

    // Validar que si hay mes, también haya edición
    if (formData.month !== null && formData.month !== undefined) {
      if (formData.edition === null || formData.edition === undefined) {
        errors.edition = "Si se especifica un mes, también debe especificarse una edición";
      }
    }

    // Validar mes si está presente
    if (formData.month !== null && formData.month !== undefined) {
      const monthNum = typeof formData.month === "number" ? formData.month : parseInt(String(formData.month));
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        errors.month = "El mes debe ser un número entre 1 y 12";
      }
    }

    // Validar edición si está presente
    if (formData.edition !== null && formData.edition !== undefined) {
      if (typeof formData.edition !== "number" || formData.edition < 1) {
        errors.edition = "La edición debe ser un número mayor a 0";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      toast.error("Por favor, corrige los errores en el formulario");
      return;
    }

    setLoading(true);

    try {
      const url = course
        ? `/api/courses/${course.id}`
        : "/api/courses";
      const method = course ? "PUT" : "POST";

      const payload: any = {
        name: formData.name.trim(),
        courseType: formData.courseType,
        year: formData.year,
        month: formData.month || null,
        edition: formData.edition || null,
        origin: formData.origin,
      };

      // Si es un curso nuevo, incluir id
      if (!course) {
        payload.id = formData.id.trim().toUpperCase();
      }

      // Si es edición y el código cambió, incluir newId para actualizar
      if (course && formData.id.trim().toUpperCase() !== course.id) {
        payload.newId = formData.id.trim().toUpperCase();
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al guardar el curso");
      }

      const result = await response.json();

      toast.success(
        course
          ? "Curso actualizado correctamente"
          : "Curso creado correctamente"
      );

      // Pasar el ID del curso creado (o el actualizado si cambió el código)
      const courseId = result.id || formData.id.trim().toUpperCase();

      // Llamar a onSuccess primero para que recargue los cursos
      await onSuccess(course ? undefined : courseId);

      // Cerrar el modal después de que se complete la recarga
      onClose();
    } catch (err: any) {
      console.error("Error saving course:", err);
      const errorMessage = err.message || "Error al guardar el curso";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
      <div className="bg-theme-secondary rounded-xl shadow-lg p-6 w-full max-w-md mx-4 border border-theme my-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">
            {course ? "Editar Curso" : "Agregar Curso Nuevo"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">


          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nombre del Curso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData((prev) => {
                  const updated = { ...prev, name: newName };
                  if (!course) {
                    updated.id = generateAutoId(updated.name, updated.year, updated.edition);
                  }
                  return updated;
                });

                if (fieldErrors.name) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-theme"
                }`}
              placeholder="Ej: Lactancia Materna"
            />
            {fieldErrors.name && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>



          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Tipo de Curso <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.courseType}
              onChange={(e) => {
                setFormData({ ...formData, courseType: e.target.value as Course["courseType"] });
              }}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
            >
              <option value="Curso">Curso</option>
              <option value="Diplomado">Diplomado</option>
              <option value="Webinar">Webinar</option>
              <option value="Taller">Taller</option>
              <option value="Seminario">Seminario</option>
              <option value="Congreso">Congreso</option>
              <option value="Simposio">Simposio</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Año {course && <span className="text-xs text-orange-600 font-normal">(No editable)</span>}
            </label>
            <input
              type="number"
              required
              min="2000"
              max={new Date().getFullYear() + 1}
              value={formData.year}
              disabled={!!course}
              onChange={(e) => {
                const newYear = parseInt(e.target.value) || new Date().getFullYear();
                setFormData((prev) => {
                  const updated = { ...prev, year: newYear };
                  if (!course) {
                    updated.id = generateAutoId(updated.name, updated.year, updated.edition);
                  }
                  return updated;
                });
              }}
              className={`w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary ${course ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                }`}
              placeholder="Ej: 2025"
            />
            <p className="text-xs text-text-secondary mt-1">
              {course
                ? "El año no se puede editar para mantener la integridad con la carpeta de archivos en Drive."
                : "Año del curso. Se usará para generar los IDs y la estructura de carpetas."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Mes {formData.month ? <span className="text-red-500">*</span> : "(opcional)"} {course && formData.month && <span className="text-xs text-orange-600 font-normal">(No editable)</span>}
            </label>
            <select
              value={formData.month || ""}
              disabled={!!course && formData.month !== null}
              onChange={(e) => {
                const value = e.target.value === "" ? null : parseInt(e.target.value);
                setFormData({ ...formData, month: value });
                // Si se elimina el mes, también eliminar la edición
                if (value === null && formData.edition !== null) {
                  setFormData((prev) => ({ ...prev, month: null, edition: null }));
                }
                // Limpiar error de edición si se elimina el mes
                if (value === null && fieldErrors.edition) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.edition;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary ${fieldErrors.month
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-theme"
                } ${course && formData.month !== null ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
            >
              <option value="">Seleccionar mes...</option>
              {/* Opciones de meses */}
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
            {fieldErrors.month && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.month}</p>
            )}
            <p className="text-xs text-text-secondary mt-1">
              {course && formData.month
                ? "El mes define la estructura y no se puede editar."
                : "Mes del curso (opcional)."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Edición {formData.month ? <span className="text-red-500">*</span> : "(opcional)"}
            </label>
            <input
              type="number"
              min="1"
              required={formData.month !== null && formData.month !== undefined}
              value={formData.edition || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : parseInt(e.target.value);
                setFormData((prev) => {
                  const updated = { ...prev, edition: value };
                  if (!course) {
                    updated.id = generateAutoId(updated.name, updated.year, updated.edition);
                  }
                  return updated;
                });
                // Limpiar error si se completa
                if (value !== null && fieldErrors.edition) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.edition;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary ${fieldErrors.edition
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-theme"
                }`}
              placeholder="Ej: 1, 2, 3, 4..."
            />
            {fieldErrors.edition && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.edition}</p>
            )}
            <p className="text-xs text-text-secondary mt-1">
              Número de edición del curso. {formData.month ? "Requerido cuando se especifica un mes." : "Opcional. Ej: 1 para primera edición, 2 para segunda, etc."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Origen <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.origin}
              onChange={(e) => {
                setFormData({ ...formData, origin: e.target.value as "historico" | "nuevo" });
              }}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
            >
              <option value="nuevo">Nuevo</option>
              <option value="historico">Histórico</option>
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Indica si el curso es nuevo o histórico. Los certificados heredarán este origen.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Código Corto (ID) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => {
                  // Forzar mayúsculas y caracteres permitidos
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
                  setFormData((prev) => ({ ...prev, id: value }));
                }}
                maxLength={20}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider ${fieldErrors.id
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-theme"
                  }`}
                placeholder="Ej: LM-2025"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Único para cada curso. Se usa en los certificados. (Ej: LM-2025)
            </p>
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && <LoadingSpinner size={18} className="text-white" />}
              {loading
                ? "Guardando..."
                : course
                  ? "Actualizar"
                  : "Crear"}{" "}
              Curso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

