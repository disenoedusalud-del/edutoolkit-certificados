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
    edition: course?.edition || null,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (course) {
      // Modo edición: cargar datos del curso
      setFormData({
        name: course.name,
        id: course.id,
        courseType: course.courseType || "Curso",
        edition: course.edition || null,
      });
    } else {
      // Modo creación: limpiar formulario
      setFormData({
        name: "",
        id: "",
        courseType: "Curso",
        edition: null,
      });
    }
    setError(null);
    setFieldErrors({});
  }, [course]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "El nombre del curso es requerido";
    }

    if (!formData.id.trim()) {
      errors.id = "El código del curso es requerido";
    } else {
      // Validar formato: solo letras mayúsculas, 1-20 caracteres
      const codeRegex = /^[A-Z]{1,20}$/;
      if (!codeRegex.test(formData.id.trim())) {
        errors.id =
          "El código debe tener 1-20 letras mayúsculas (A-Z), sin espacios ni números";
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
        edition: formData.edition || null,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {course ? "Editar Curso" : "Agregar Curso Nuevo"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del Curso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (fieldErrors.name) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.name;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.name
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300"
              }`}
              placeholder="Ej: Lactancia Materna"
            />
            {fieldErrors.name && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código Corto (1-20 letras) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.id}
              onChange={(e) => {
                // Convertir automáticamente a mayúsculas y eliminar espacios
                const value = e.target.value.toUpperCase().replace(/\s/g, "");
                setFormData({ ...formData, id: value });
                if (fieldErrors.id) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.id;
                    return newErrors;
                  });
                }
              }}
              maxLength={20}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                fieldErrors.id
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300"
              }`}
              placeholder="Ej: LM, ND, ECG, LACMAT"
            />
            {fieldErrors.id && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.id}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Solo letras mayúsculas (A-Z), sin espacios ni números. Mínimo 1, máximo 20 caracteres.
            </p>
            {course && formData.id.trim().toUpperCase() !== course.id && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ⚠️ Advertencia: Cambiar el código actualizará automáticamente todos los certificados relacionados.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de Curso <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.courseType}
              onChange={(e) => {
                setFormData({ ...formData, courseType: e.target.value as Course["courseType"] });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Curso">Curso</option>
              <option value="Diplomado">Diplomado</option>
              <option value="Webinar">Webinar</option>
              <option value="Taller">Taller</option>
              <option value="Seminario">Seminario</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona el tipo de curso que se aplicará a todos los certificados de este curso.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Edición (opcional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.edition || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? null : parseInt(e.target.value);
                setFormData({ ...formData, edition: value });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 1, 2, 3, 4..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Número de edición del curso (opcional). Ej: 1 para primera edición, 2 para segunda, etc.
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

