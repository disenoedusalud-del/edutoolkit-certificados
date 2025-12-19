"use client";

import { useState, useEffect } from "react";
import { Course } from "@/types/Course";
import CourseModal from "@/components/CourseModal";
import { toast } from "@/lib/toast";
import { LoadingSpinner, LoadingSkeleton } from "@/components/LoadingSpinner";
import { Pencil, Archive, Plus, CheckCircle, XCircle, ArrowLeft, Trash } from "phosphor-react";
import Link from "next/link";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses");
      const data = await res.json();
      // Asegurar que siempre sea un array
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Error al cargar los cursos");
      setCourses([]); // Asegurar que sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role || null);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
    }
  };

  const filteredCourses = Array.isArray(courses)
    ? courses.filter((course) => {
        if (filter === "all") return true;
        return course.status === filter;
      })
    : [];

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setShowModal(true);
  };

  const handleArchive = async (course: Course) => {
    if (
      !confirm(
        `¿Estás seguro de archivar el curso "${course.name}"? Ya no aparecerá en el selector de cursos.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (response.ok) {
        toast.success("Curso archivado correctamente");
        await loadCourses();
      } else {
        toast.error("Error al archivar el curso");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al archivar el curso");
    }
  };

  const handleRestore = async (course: Course) => {
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (response.ok) {
        toast.success("Curso restaurado correctamente");
        await loadCourses();
      } else {
        toast.error("Error al restaurar el curso");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al restaurar el curso");
    }
  };

  const handleDelete = async (course: Course) => {
    try {
      // Obtener conteo de certificados
      const courseRes = await fetch(`/api/courses/${course.id}?includeCertificateCount=true`);
      let certificateCount = 0;
      
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        certificateCount = courseData.certificateCount || 0;
      }

      // Mostrar advertencia
      const message = certificateCount > 0
        ? `¿Estás seguro de ELIMINAR el curso "${course.name}"?\n\n⚠️ ADVERTENCIA: Se eliminarán ${certificateCount} certificado(s) asociado(s) a este curso. Esta acción NO se puede deshacer.`
        : `¿Estás seguro de ELIMINAR el curso "${course.name}"?\n\nEsta acción NO se puede deshacer.`;

      if (!confirm(message)) {
        return;
      }

      // Confirmación adicional si hay certificados
      if (certificateCount > 0) {
        const secondConfirm = confirm(
          `ÚLTIMA CONFIRMACIÓN:\n\nSe eliminarán ${certificateCount} certificado(s) permanentemente.\n\n¿Estás completamente seguro?`
        );
        if (!secondConfirm) {
          return;
        }
      }

      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        const deletedCount = data.deletedCertificates || 0;
        
        if (deletedCount > 0) {
          toast.success(`Curso eliminado. ${deletedCount} certificado(s) también fueron eliminados.`);
        } else {
          toast.success("Curso eliminado correctamente");
        }
        await loadCourses();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Error al eliminar el curso");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar el curso");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCourse(null);
  };

  const handleModalSuccess = async () => {
    await loadCourses();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary p-8">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <LoadingSpinner size={32} className="text-accent" />
          <p className="text-text-secondary text-sm">Cargando cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-theme-primary p-8">
      <div className="mb-4">
        <Link
          href="/admin/certificados"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} weight="bold" />
          <span>Volver a Certificados</span>
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Administración de Cursos
        </h1>
        <button
          onClick={() => {
            setEditingCourse(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 border border-theme btn-primary"
        >
          <Plus size={18} weight="bold" />
          Agregar Curso Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === "all"
              ? "bg-accent text-white border border-theme"
              : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary border border-theme"
          }`}
        >
          Todos ({Array.isArray(courses) ? courses.length : 0})
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === "active"
              ? "bg-green-600 text-white border border-theme"
              : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary border border-theme"
          }`}
        >
          Activos ({Array.isArray(courses) ? courses.filter((c) => c.status === "active").length : 0})
        </button>
        <button
          onClick={() => setFilter("archived")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === "archived"
              ? "bg-gray-600 text-white border border-theme"
              : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary border border-theme"
          }`}
        >
          Archivados ({Array.isArray(courses) ? courses.filter((c) => c.status === "archived").length : 0})
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-theme-secondary rounded-xl shadow border border-theme overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No hay cursos {filter !== "all" && filter === "active" ? "activos" : filter === "archived" ? "archivados" : ""}.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-theme-secondary text-text-secondary uppercase text-xs border-b-2 border-border-color">
              <tr>
                <th className="px-0 py-3 w-[12px]"></th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre del Curso</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha Creación</th>
                <th className="px-4 py-3 text-left w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCourses.map((course) => (
                <tr
                  key={course.id}
                  className="bg-theme-secondary hover:bg-theme-tertiary transition-colors"
                >
                  {/* Barra izquierda de color - solo visible en neo-brutalism */}
                  <td className="px-0 py-0 w-[10px] barra-indicador"></td>
                  <td className="px-4 py-3 font-mono font-semibold text-text-primary">
                    {course.id}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                      {course.name}
                      {course.edition && (
                      <span className="ml-2 text-xs text-text-secondary">(Ed. {course.edition})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {course.courseType || "Curso"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {course.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle size={14} weight="fill" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        <XCircle size={14} weight="fill" />
                        Archivado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString("es-ES")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar curso"
                      >
                        <Pencil size={18} weight="bold" />
                      </button>
                      {course.status === "active" ? (
                        <button
                          onClick={() => handleArchive(course)}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          title="Archivar curso"
                        >
                          <Archive size={18} weight="bold" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(course)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Restaurar curso"
                        >
                          <CheckCircle size={18} weight="bold" />
                        </button>
                      )}
                      {userRole === "MASTER_ADMIN" && (
                        <button
                          onClick={() => handleDelete(course)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar curso permanentemente"
                        >
                          <Trash size={18} weight="bold" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CourseModal
          course={editingCourse}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </main>
  );
}

