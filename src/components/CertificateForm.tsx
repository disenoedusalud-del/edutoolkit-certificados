"use client";

import { useState, FormEvent, useEffect } from "react";
import { Certificate } from "@/types/Certificate";
import { Course } from "@/types/Course";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "./LoadingSpinner";
import { extractDriveFileId } from "@/lib/driveUtils";
import CourseModal from "./CourseModal";
import { Plus } from "phosphor-react";

interface CertificateFormProps {
  certificate?: Certificate;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function CertificateForm({
  certificate,
  onCancel,
  onSuccess,
}: CertificateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: certificate?.fullName || "",
    courseName: certificate?.courseName || "",
    courseId: certificate?.courseId || "",
    courseType: certificate?.courseType || "",
    year: certificate?.year || new Date().getFullYear(),
    origin: certificate?.origin || "nuevo",
    email: certificate?.email || "",
    phone: certificate?.phone || "",
    contactSource: certificate?.contactSource || "ninguno",
    driveFileId: certificate?.driveFileId || "",
    deliveryStatus: certificate?.deliveryStatus || "en_archivo",
    deliveryDate: certificate?.deliveryDate
      ? new Date(certificate.deliveryDate).toISOString().split("T")[0]
      : "",
    deliveredTo: certificate?.deliveredTo || "",
    physicalLocation: certificate?.physicalLocation || "",
    folioCode: certificate?.folioCode || "",
    emailSent: certificate?.emailSent || false,
    whatsappSent: certificate?.whatsappSent || false,
    marketingConsent: certificate?.marketingConsent || false,
    selectedCourseId: "", // ID del curso seleccionado del SELECT
  });

  // Cargar cursos activos
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await fetch("/api/courses?status=active");
        
        // La API ahora siempre devuelve un array, incluso en caso de error
        const data = await res.json();
        
        // Asegurar que siempre sea un array
        const coursesArray = Array.isArray(data) ? data : [];
        console.log("Cursos cargados:", coursesArray.length, coursesArray);
        setCourses(coursesArray);

        // Si hay un certificado existente, intentar encontrar el curso correspondiente
        if (certificate?.courseName && coursesArray.length > 0) {
          const matchingCourse = coursesArray.find(
            (c: Course) => c.name === certificate.courseName || c.id === certificate.courseId?.split("-")[0]
          );
          if (matchingCourse) {
            setFormData((prev) => ({
              ...prev,
              selectedCourseId: matchingCourse.id,
            }));
          }
        }
      } catch (error) {
        console.error("Error loading courses:", error);
        // Asegurar que courses sea un array vacío en caso de error
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, [certificate]);

  const generateCourseId = async (courseCode: string, year: number): Promise<string> => {
    // Obtener el siguiente número secuencial del servidor
    try {
      const response = await fetch(
        `/api/certificates/next-sequence?courseCode=${encodeURIComponent(courseCode)}&year=${year}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.formattedId || `${courseCode}-${year}-01`;
      }
    } catch (error) {
      console.error("Error obteniendo siguiente número secuencial:", error);
    }
    // Fallback: usar 01 si hay error
    return `${courseCode}-${year}-01`;
  };

  const handleCourseSelect = async (courseId: string) => {
    // Siempre actualizar el selectedCourseId primero para que el SELECT se actualice
    setFormData((prev) => ({
      ...prev,
      selectedCourseId: courseId,
    }));

    // Si hay cursos cargados, buscar y actualizar los demás campos
    if (courses.length > 0) {
      const selectedCourse = courses.find((c) => c.id === courseId);
      if (selectedCourse) {
        // Generar courseId automáticamente con el siguiente número secuencial
        const autoCourseId = await generateCourseId(selectedCourse.id, formData.year);
        setFormData((prev) => ({
          ...prev,
          selectedCourseId: courseId,
          courseName: selectedCourse.name,
          courseId: autoCourseId,
          courseType: selectedCourse.courseType || "Curso", // Usar el courseType del curso
        }));
      }
    }
  };

  // Actualizar courseId y courseType cuando cambia el año o el curso
  useEffect(() => {
    const updateCourseId = async () => {
      if (formData.selectedCourseId && formData.year) {
        const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
        if (selectedCourse) {
          const autoCourseId = await generateCourseId(selectedCourse.id, formData.year);
          setFormData((prev) => ({
            ...prev,
            courseId: autoCourseId,
            courseType: selectedCourse.courseType || prev.courseType || "Curso",
          }));
        }
      }
    };
    updateCourseId();
  }, [formData.year, formData.selectedCourseId, courses]);

  const handleCourseCreated = async (newCourseId?: string) => {
    // Recargar cursos después de crear uno nuevo
    try {
      setLoadingCourses(true);
      const res = await fetch("/api/courses?status=active");
      
      // La API ahora siempre devuelve un array
      const data = await res.json();
      
      // Asegurar que siempre sea un array
      const coursesArray = Array.isArray(data) ? data : [];
      setCourses(coursesArray);
      
      // Si se proporciona un ID, seleccionarlo automáticamente
      if (newCourseId && coursesArray.length > 0) {
        // Pequeño delay para asegurar que el estado se actualice
        setTimeout(() => {
          const newCourse = coursesArray.find((c: Course) => c.id === newCourseId);
          if (newCourse) {
            handleCourseSelect(newCourseId);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error reloading courses:", error);
      // Asegurar que courses sea un array vacío en caso de error
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "El nombre completo es requerido";
    }

    if (!formData.selectedCourseId && !formData.courseName.trim()) {
      errors.courseName = "Debes seleccionar un curso o ingresar el nombre manualmente";
    }

    // El courseId se genera automáticamente, pero validamos que exista
    // Si hay un curso seleccionado pero no hay courseId, se generará antes de enviar
    if (!formData.courseId.trim() && formData.selectedCourseId) {
      const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
      if (selectedCourse && !formData.courseName.trim()) {
        errors.courseName = "El nombre del curso es requerido";
      }
    }

    // El courseType viene del curso seleccionado, validar que exista
    if (!formData.courseType.trim() && formData.selectedCourseId) {
      const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
      if (selectedCourse && selectedCourse.courseType) {
        setFormData((prev) => ({
          ...prev,
          courseType: selectedCourse.courseType,
        }));
      }
    }

    if (!formData.year || formData.year < 2000 || formData.year > 2100) {
      errors.year = "El año debe estar entre 2000 y 2100";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "El email no es válido";
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
      const url = certificate
        ? `/api/certificates/${certificate.id}`
        : "/api/certificates";
      const method = certificate ? "PUT" : "POST";

      // Procesar campos opcionales - convertir strings vacíos a null
      const processOptionalField = (value: string | null | undefined): string | null => {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      };

      // Extraer el ID de Drive si se proporcionó una URL
      const currentDriveFileId = processOptionalField(formData.driveFileId);
      const processedDriveFileId = currentDriveFileId 
        ? extractDriveFileId(currentDriveFileId) 
        : null;

      // Asegurar que courseId, courseName y courseType estén llenos si hay un curso seleccionado
      let finalCourseId = formData.courseId.trim();
      let finalCourseName = formData.courseName.trim();
      let finalCourseType = formData.courseType.trim();
      
      if (formData.selectedCourseId && (!finalCourseId || !finalCourseName || !finalCourseType)) {
        const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
        if (selectedCourse) {
          if (!finalCourseId) {
            finalCourseId = await generateCourseId(selectedCourse.id, formData.year);
          }
          if (!finalCourseName) {
            finalCourseName = selectedCourse.name;
          }
          if (!finalCourseType) {
            finalCourseType = selectedCourse.courseType || "Curso";
          }
        }
      }

      console.log("Guardando certificado:", {
        driveFileId: {
          original: formData.driveFileId,
          processed: processedDriveFileId,
        },
        payload: {
          fullName: formData.fullName,
          courseName: finalCourseName,
          courseId: finalCourseId,
          driveFileId: processedDriveFileId,
        }
      });

      const payload = {
        fullName: formData.fullName.trim(),
        courseName: finalCourseName,
        courseId: finalCourseId,
        courseType: finalCourseType,
        year: formData.year,
        origin: formData.origin,
        // Solo enviar campos de entrega si se está editando un certificado existente
        deliveryDate: certificate ? processOptionalField(formData.deliveryDate) : null,
        email: processOptionalField(formData.email),
        phone: processOptionalField(formData.phone),
        driveFileId: processedDriveFileId,
        deliveredTo: certificate ? processOptionalField(formData.deliveredTo) : null,
        physicalLocation: processOptionalField(formData.physicalLocation),
        folioCode: processOptionalField(formData.folioCode),
        deliveryStatus: certificate ? formData.deliveryStatus : "en_archivo",
        contactSource: formData.contactSource,
        emailSent: formData.emailSent,
        whatsappSent: formData.whatsappSent,
        marketingConsent: formData.marketingConsent,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Error al guardar el certificado";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (parseError) {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      setLoading(false);
      
      toast.success(
        certificate
          ? "Certificado actualizado correctamente"
          : "Certificado creado correctamente"
      );
      
      // Si hay un callback onSuccess (para modo edición), llamarlo
      if (onSuccess && certificate) {
        // Estamos en modo edición, el componente padre manejará salir del modo edición
        onSuccess();
        return;
      }
      
      // Si es un certificado nuevo, navegar a la página de detalle
      if (!certificate) {
        try {
          router.push(`/admin/certificados/${data.id}`);
          router.refresh();
        } catch (navError) {
          console.error("Error navigating:", navError);
        }
      } else {
        // Si actualizamos desde otra vista (no desde detalle), refrescar
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error saving certificate:", err);
      const errorMessage = err.message || "Error al guardar el certificado";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
        {/* Información Personal */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            Información Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.fullName;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.fullName
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300"
              }`}
            />
            {fieldErrors.fullName && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.fullName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (fieldErrors.email) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300"
              }`}
            />
            {fieldErrors.email && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          </div>
        </div>

        {/* Información del Curso */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            Información del Curso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Curso <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={formData.selectedCourseId || ""}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    console.log("Curso seleccionado:", selectedValue, "Cursos disponibles:", courses);
                    handleCourseSelect(selectedValue);
                    if (fieldErrors.courseName) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.courseName;
                        return newErrors;
                      });
                    }
                  }}
                  disabled={loadingCourses}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.courseName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300"
                  } ${loadingCourses ? "bg-slate-100 cursor-not-allowed" : ""}`}
                >
                  <option value="">
                    {loadingCourses 
                      ? "Cargando cursos..." 
                      : courses.length === 0 
                      ? "No hay cursos disponibles. Crea uno nuevo."
                      : "Selecciona un curso"}
                  </option>
                  {Array.isArray(courses) && courses.length > 0 && courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCourseModal(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                  title="Agregar curso nuevo"
                >
                  <Plus size={18} weight="bold" />
                  Nuevo
                </button>
              </div>
              {fieldErrors.courseName && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.courseName}</p>
              )}
              {formData.selectedCourseId && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500">
                    Curso seleccionado: <span className="font-medium text-slate-700">{formData.courseName}</span>
                  </p>
                  {formData.courseType && (
                    <p className="text-xs text-slate-500">
                      Tipo: <span className="font-medium text-slate-700">{formData.courseType}</span>
                    </p>
                  )}
                  {formData.courseId && (
                    <p className="text-xs text-slate-500">
                      ID generado: <span className="font-mono font-medium text-slate-700">{formData.courseId}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Año <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => {
                  setFormData({ ...formData, year: parseInt(e.target.value) });
                  if (fieldErrors.year) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.year;
                      return newErrors;
                    });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.year
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300"
                }`}
              />
              {fieldErrors.year && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.year}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Origen
              </label>
              <select
                value={formData.origin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    origin: e.target.value as "historico" | "nuevo",
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="nuevo">Nuevo</option>
                <option value="historico">Histórico</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estado de Entrega - Solo al editar */}
        {certificate && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
              Estado de Entrega
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.deliveryStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryStatus: e.target.value as Certificate["deliveryStatus"],
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en_archivo">En archivo</option>
                  <option value="listo_para_entrega">Listo para entrega</option>
                  <option value="entregado">Entregado</option>
                  <option value="digital_enviado">Digital enviado</option>
                  <option value="anulado">Anulado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Entrega
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Entregado a
                </label>
                <input
                  type="text"
                  value={formData.deliveredTo}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveredTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Información de Archivo */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            Información de Archivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ubicación Física
            </label>
            <input
              type="text"
              value={formData.physicalLocation}
              onChange={(e) =>
                setFormData({ ...formData, physicalLocation: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Caja 1 / 2019 / LACMAT-2019-01"
            />
            <p className="text-xs text-slate-500 mt-1">
              Ubicación física del certificado en archivo
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código de Folio
            </label>
            <input
              type="text"
              value={formData.folioCode}
              onChange={(e) =>
                setFormData({ ...formData, folioCode: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: FOLIO-001"
            />
            <p className="text-xs text-slate-500 mt-1">
              Código de folio o referencia interna del certificado
            </p>
          </div>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            Información Adicional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fuente de Contacto
              </label>
              <select
                value={formData.contactSource}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactSource: e.target.value as Certificate["contactSource"],
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ninguno">Ninguno</option>
                <option value="inscripcion">Inscripción</option>
                <option value="retiro_presencial">Retiro Presencial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ID de Archivo en Drive
              </label>
            <input
              type="text"
              value={formData.driveFileId || ""}
              onChange={(e) => {
                // Permitir que el usuario escriba libremente
                setFormData({ 
                  ...formData, 
                  driveFileId: e.target.value 
                });
              }}
              onBlur={(e) => {
                // Al perder el foco, procesar y extraer el ID si es una URL
                const value = e.target.value.trim();
                if (value) {
                  const extractedId = extractDriveFileId(value);
                  if (extractedId && extractedId !== value) {
                    setFormData({ 
                      ...formData, 
                      driveFileId: extractedId 
                    });
                    toast.info("ID de Drive extraído de la URL");
                  } else if (extractedId) {
                    // Si ya es un ID válido, asegurar que se guarde
                    setFormData({ 
                      ...formData, 
                      driveFileId: extractedId 
                    });
                  }
                } else {
                  // Si está vacío, asegurar que sea null
                  setFormData({ 
                    ...formData, 
                    driveFileId: "" 
                  });
                }
              }}
              placeholder="ID o URL de Google Drive (ej: https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Puedes pegar el ID del archivo o la URL completa de Google Drive. El sistema extraerá automáticamente el ID al guardar.
            </p>
            </div>
            <div className="md:col-span-2 space-y-3 pt-2">
              <h4 className="text-sm font-medium text-slate-700">Notificaciones y Consentimientos</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.emailSent}
                    onChange={(e) =>
                      setFormData({ ...formData, emailSent: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Email enviado</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.whatsappSent}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsappSent: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">WhatsApp enviado</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.marketingConsent}
                    onChange={(e) =>
                      setFormData({ ...formData, marketingConsent: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Consentimiento de marketing</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="flex gap-4 justify-end pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && <LoadingSpinner size={18} className="text-white" />}
            {loading
              ? "Guardando..."
              : certificate
              ? "Actualizar"
              : "Crear"}{" "}
            Certificado
          </button>
        </div>
      </form>
      {showCourseModal && (
        <CourseModal
          course={null}
          onClose={async () => {
            setShowCourseModal(false);
            // Recargar cursos al cerrar el modal por si acaso
            await handleCourseCreated();
          }}
          onSuccess={async (newCourseId) => {
            await handleCourseCreated(newCourseId);
          }}
        />
      )}
    </>
  );
}

