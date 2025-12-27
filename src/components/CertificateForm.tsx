"use client";

import { useState, FormEvent, useEffect } from "react";
import { Certificate } from "@/types/Certificate";
import { Course } from "@/types/Course";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "./LoadingSpinner";
import { extractDriveFileId } from "@/lib/driveUtils";
import CourseModal from "./CourseModal";
import { Plus, FolderOpen, Upload, FilePdf } from "phosphor-react";

interface CertificateFormProps {
  certificate?: Certificate;
  onCancel?: () => void;
  onSuccess?: () => void;
  initialCourseId?: string;
  initialCourseName?: string;
}

export default function CertificateForm({
  certificate,
  onCancel,
  onSuccess,
  initialCourseId,
  initialCourseName,
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
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    setUploadingFile(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      // Determinar nombre del archivo
      // Idealmente: {ID_CURSO}-{NOMBRE}.pdf para mantener orden
      const filename = formData.courseId
        ? `${formData.courseId}_${formData.fullName.replace(/\s+/g, "_")}.pdf`
        : file.name;

      uploadData.append("fileName", filename);

      if (formData.driveFileId) {
        uploadData.append("oldFileId", formData.driveFileId);
      }

      let targetFolderId = "";

      // Buscar el curso seleccionado
      const selectedCourse = courses.find(c => c.id === formData.selectedCourseId);

      if (selectedCourse) {
        if (selectedCourse.driveFolderId) {
          targetFolderId = selectedCourse.driveFolderId;
        } else {
          // Si el curso no tiene carpeta, intentar crearla automáticamente
          try {
            console.log("[UPLOAD] Curso sin carpeta, intentando crearla...");
            const ensureRes = await fetch(`/api/courses/${encodeURIComponent(selectedCourse.id)}/ensure-folder`, { method: "POST" });
            const ensureData = await ensureRes.json();

            if (ensureRes.ok && ensureData.folderId) {
              targetFolderId = ensureData.folderId;
              // Actualizar el estado local de cursos para que la próxima vez ya la tenga
              setCourses(prev => prev.map(c => c.id === selectedCourse.id ? { ...c, driveFolderId: ensureData.folderId } : c));
              console.log("[UPLOAD] Carpeta creada y vinculada:", targetFolderId);
            }
          } catch (ensureErr) {
            console.error("[UPLOAD] Error intentando asegurar carpeta:", ensureErr);
          }
        }
      }

      if (targetFolderId) {
        uploadData.append("folderId", targetFolderId);
      } else {
        // Fallback: usar carpeta raíz o avisar
        const confirm = window.confirm(
          "No pudimos encontrar o crear una carpeta específica para este curso en Drive. " +
          "El archivo se subirá a la carpeta raíz del sistema. ¿Deseas continuar?"
        );
        if (!confirm) {
          setUploadingFile(false);
          e.target.value = "";
          return;
        }
      }

      const res = await fetch("/api/upload", { method: "POST", body: uploadData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        driveFileId: data.fileId
      }));

      toast.success(
        targetFolderId
          ? "Archivo subido correctamente a la carpeta del curso"
          : "Archivo subido correctamente (carpeta raíz)"
      );

    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Error al subir archivo");
    } finally {
      setUploadingFile(false);
      // Limpiar el input para permitir subir el mismo archivo de nuevo si falla
      e.target.value = "";
    }
  };

  const [formData, setFormData] = useState({
    fullName: certificate?.fullName || "",
    courseName: certificate?.courseName || initialCourseName || "",
    courseId: certificate?.courseId || "",
    courseType: certificate?.courseType || "",
    year: certificate?.year || new Date().getFullYear(), // Se obtendrá del curso seleccionado
    month: certificate?.month || null, // Se obtendrá del curso seleccionado
    origin: certificate?.origin || "nuevo", // Se obtendrá del curso seleccionado
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
    selectedCourseId: initialCourseId || "", // ID del curso seleccionado del SELECT
  });

  // Función helper para extraer el prefijo base del curso (sin año ni edición)
  const extractCoursePrefix = (courseId: string): string => {
    // Estrategia Robust: Buscar el patrón de año "-YYYY"
    // Esto maneja IDs como "CURSO-AVANZADO-2024" extrayendo "CURSO-AVANZADO"
    // y no solo "CURSO" como haría un split por guión simple.
    const yearMatch = courseId.match(/^(.*?)(?:-\d{4})/);
    if (yearMatch && yearMatch[1]) {
      return yearMatch[1];
    }

    // Fallback: Si no hay patrón de año claro, intentar ser inteligente.
    // Si el ID termina en un año o secuencia, intentamos limpiarlo.
    // Pero si no estamos seguros, mejor devolvemos el ID completo para no romper códigos sin año.
    // Sin embargo, para evitar el bug de "ID-ID-YEAR-SEQ", si detectamos que el ID ya parece tener
    // un año y secuencia concatenados, intentamos limpiar.

    return courseId;
  };

  const generateCourseId = async (courseId: string, year: number, edition: number | null = null): Promise<string> => {
    // Extraer solo el prefijo base del curso (sin año ni edición)
    const courseCode = extractCoursePrefix(courseId);

    // Obtener el siguiente número secuencial del servidor
    try {
      let url = `/api/certificates/next-sequence?courseCode=${encodeURIComponent(courseCode)}&year=${year}`;
      if (edition !== null && edition !== undefined) {
        url += `&edition=${edition}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.formattedId || (edition ? `${courseCode}-${edition}-${year}-01` : `${courseCode}-${year}-01`);
      }
    } catch (error) {
      console.error("Error obteniendo siguiente número secuencial:", error);
    }
    // Fallback: usar 01 si hay error
    return edition ? `${courseCode}-${edition}-${year}-01` : `${courseCode}-${year}-01`;
  };

  // Cargar cursos activos
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await fetch("/api/courses?status=active");

        // La API puede devolver un array directo o un objeto con paginación
        const data = await res.json();

        // Asegurar que siempre sea un array
        // Si viene con paginación, extraer el array de data.data
        let coursesArray: Course[] = [];
        if (Array.isArray(data)) {
          coursesArray = data;
        } else if (data && Array.isArray(data.data)) {
          coursesArray = data.data;
        } else if (data && Array.isArray(data.courses)) {
          coursesArray = data.courses;
        }

        console.log("Cursos cargados:", coursesArray.length, coursesArray);
        setCourses(coursesArray);

        // Lógica de pre-llenado
        if (certificate?.courseName && coursesArray.length > 0) {
          // Caso 1: Editando un certificado existente
          const matchingCourse = coursesArray.find(
            (c: Course) => c.name === certificate.courseName || c.id === certificate.courseId?.split("-")[0]
          );
          if (matchingCourse) {
            const courseYear = matchingCourse.year || certificate.year || new Date().getFullYear();
            setFormData((prev) => ({
              ...prev,
              selectedCourseId: matchingCourse.id,
              year: courseYear,
              origin: matchingCourse.origin || certificate.origin || "nuevo",
            }));
          }
        } else if (initialCourseId && coursesArray.length > 0) {
          // Caso 2: Creando nuevo certificado desde un curso específico (botón "+")
          // Intentar buscar por ID exacto primero
          let matchingCourse = coursesArray.find((c: Course) => c.id === initialCourseId);

          // Si no se encuentra, intentar buscar por coincidencia parcial (por si el ID viene como prefijo)
          if (!matchingCourse) {
            matchingCourse = coursesArray.find((c: Course) =>
              initialCourseId.startsWith(c.id) || c.id.startsWith(initialCourseId)
            );
          }

          if (matchingCourse) {
            const courseYear = matchingCourse.year || new Date().getFullYear();
            const courseEdition = matchingCourse.edition || null;

            // Generar el ID usando la función que extrae el prefijo base
            const autoId = await generateCourseId(matchingCourse.id, courseYear, courseEdition);

            setFormData((prev) => ({
              ...prev,
              selectedCourseId: matchingCourse!.id,
              courseName: matchingCourse!.name,
              courseId: autoId, // ID único generado
              courseType: matchingCourse!.courseType || "Curso",
              year: matchingCourse!.year,
              month: matchingCourse!.month || null,
              origin: matchingCourse!.origin || "nuevo",
            }));
          } else {
            // Si no se encuentra el curso, mostrar un warning pero permitir continuar
            console.warn("No se encontró el curso con ID:", initialCourseId);
            toast.warning(`No se encontró el curso "${initialCourseId}". Por favor, selecciona un curso manualmente.`);
          }
        }
      } catch (error) {
        console.error("Error loading courses:", error);
        toast.error("Error al cargar los cursos. Por favor, recarga la página.");
        // Asegurar que courses sea un array vacío en caso de error
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, [certificate, initialCourseId]); // Agregar initialCourseId a las dependencias

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
        // Usar el año del curso en lugar del año del formulario
        const courseYear = selectedCourse.year || new Date().getFullYear();
        const courseEdition = selectedCourse.edition || null;
        // Generar courseId automáticamente con el siguiente número secuencial
        // Incluir la edición si existe
        const autoCourseId = await generateCourseId(selectedCourse.id, courseYear, courseEdition);
        setFormData((prev) => ({
          ...prev,
          selectedCourseId: courseId,
          courseName: selectedCourse.name,
          courseId: autoCourseId,
          courseType: selectedCourse.courseType || "Curso", // Usar el courseType del curso
          year: courseYear, // Usar el año del curso
          month: selectedCourse.month || null, // Usar el mes del curso
          origin: selectedCourse.origin || "nuevo", // Usar el origen del curso
        }));
      }
    }
  };

  // Actualizar courseId y courseType cuando cambia el curso
  // El año ahora viene del curso, no del formulario
  useEffect(() => {
    const updateCourseId = async () => {
      // Si tenemos initialCourseId, evitamos que este efecto sobrescriba el ID que acabamos de generar
      // correctamente en el useEffect de carga inicial.
      // Sin embargo, si el usuario cambia el curso manualmente (si pudiera), necesitaríamos actualizar.
      // Como el selector está oculto/deshabilitado cuando hay initialCourseId, este efecto podría ser redundante o dañino si recalcula mal.
      // Pero para ser seguros y consistentes, mejor arreglamos la lógica de cálculo aquí para que coincida.

      if (formData.selectedCourseId) {
        const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
        if (selectedCourse) {
          // Usar el año del curso
          const courseYear = selectedCourse.year || new Date().getFullYear();
          const courseEdition = selectedCourse.edition || null;

          // Solo regenerar si el ID actual no coincide con lo esperado o está vacío, 
          // para evitar sobrescribir el ID único generado en el primer useEffect si ya es correcto.
          // Pero es difícil saber si es "correcto". 
          // Simplemente generamos uno nuevo CORRECTAMENTE pasando la edición.
          const autoCourseId = await generateCourseId(selectedCourse.id, courseYear, courseEdition);

          // Solo actualizamos si cambiamos de curso o si no tenemos ID
          // Para evitar un loop infinito o regeneración innecesaria, podríamos comparar.
          // Pero setFormData ya hace merge shallow.

          setFormData((prev) => {
            // Si el ID ya fue establecido por el initialCourseId logic (primer useEffect) y coincide con el curso,
            // tal vez debamos respetarlo. Pero el primer useEffect corre UNA VEZ. 
            // Este corre cuando selectedCourseId cambia.
            // Al montar con initialCourseId, selectedCourseId cambia de "" a ID. Este efecto corre.
            // Sobrescribirá el ID del primer useEffect.
            // Por eso es CRÍTICO que este efecto genere el ID correctamente (con edición).
            return {
              ...prev,
              courseId: autoCourseId,
              courseType: selectedCourse.courseType || prev.courseType || "Curso",
              year: courseYear,
              month: selectedCourse.month || null,
              origin: selectedCourse.origin || "nuevo",
            };
          });
        }
      }
    };
    updateCourseId();
  }, [formData.selectedCourseId, courses]);

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
      let finalYear = formData.year;
      let finalMonth = formData.month;

      let finalOrigin = formData.origin;

      if (formData.selectedCourseId && (!finalCourseId || !finalCourseName || !finalCourseType)) {
        const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
        if (selectedCourse) {
          // Usar el año del curso
          finalYear = selectedCourse.year || new Date().getFullYear();
          // Usar el mes del curso
          finalMonth = selectedCourse.month || null;
          // Usar el origen del curso
          finalOrigin = selectedCourse.origin || "nuevo";
          const courseEdition = selectedCourse.edition || null;

          if (!finalCourseId) {
            finalCourseId = await generateCourseId(selectedCourse.id, finalYear, courseEdition);
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
        year: finalYear,
        month: finalMonth,
        origin: finalOrigin === "historico" ? "historico" : "nuevo",
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

  // Obtener el curso seleccionado para mostrar en el encabezado
  const selectedCourse = formData.selectedCourseId
    ? courses.find((c) => c.id === formData.selectedCourseId)
    : null;

  // Construir el texto del encabezado
  const getHeaderText = () => {
    if (selectedCourse) {
      const parts = [
        selectedCourse.name,
        selectedCourse.year?.toString() || new Date().getFullYear().toString()
      ];

      if (selectedCourse.edition) {
        parts.push(`Edición ${selectedCourse.edition}`);
      }

      return parts.join(" ");
    }

    // Si no hay curso seleccionado pero hay un certificado, intentar mostrar info del certificado
    if (certificate && certificate.courseName) {
      const parts = [certificate.courseName];
      if (certificate.year) {
        parts.push(certificate.year.toString());
      }
      return parts.join(" ");
    }

    return "Nuevo Certificado";
  };

  return (
    <>
      {/* Encabezado con información del curso */}
      {(selectedCourse || (certificate && certificate.courseName)) && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 mb-6 shadow-lg">
          <h2 className="text-xl font-bold">
            {getHeaderText()}
          </h2>
          {certificate && (
            <p className="text-blue-100 text-sm mt-1">
              Editando certificado: {certificate.fullName}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Información Personal */}
          <div className="bg-theme-secondary rounded-lg border border-theme p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-3 mb-4">
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.fullName
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-theme"
                    }`}
                />
                {fieldErrors.fullName && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.email
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-theme"
                    }`}
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                />
              </div>
            </div>
          </div>

          {/* Información del Curso Pre-seleccionado */}
          {initialCourseId && (
            <div className="bg-theme-tertiary rounded-lg border border-theme p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-3 mb-4 flex items-center gap-2">
                <FolderOpen size={24} className="text-accent" />
                Información del Curso
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-theme-secondary rounded border border-theme">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-secondary uppercase mb-1">Agregando a:</p>
                    <p className="text-base font-bold text-text-primary">{formData.courseName || "Cargando curso..."}</p>
                    {formData.selectedCourseId && (
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-text-secondary">
                        <span>ID: <span className="font-mono text-text-primary">{formData.selectedCourseId}</span></span>
                        {formData.year && <span>Año: <span className="text-text-primary">{formData.year}</span></span>}
                        {formData.month && <span>Mes: <span className="text-text-primary">{formData.month}</span></span>}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-secondary italic">
                  * Los datos del curso se han completado automáticamente según la carpeta seleccionada.
                </p>
              </div>
            </div>
          )}

          {/* Información del Curso - Ocultar si ya viene pre-seleccionado */}
          {!initialCourseId && (
            <div className="bg-theme-secondary rounded-lg border border-theme p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-3 mb-4">
                Información del Curso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
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
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.courseName
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-theme"
                        } ${loadingCourses ? "bg-theme-tertiary cursor-not-allowed" : ""}`}
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
                      <p className="text-xs text-text-secondary">
                        Curso seleccionado: <span className="font-medium text-text-primary">{formData.courseName}</span>
                      </p>
                      {formData.courseType && (
                        <p className="text-xs text-text-secondary">
                          Tipo: <span className="font-medium text-text-primary">{formData.courseType}</span>
                        </p>
                      )}
                      {formData.courseId && (
                        <p className="text-xs text-text-secondary">
                          ID generado: <span className="font-mono font-medium text-text-primary">{formData.courseId}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Estado de Entrega - Solo al editar */}
          {certificate && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
                Estado de Entrega
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
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
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                  >
                    <option value="en_archivo">En archivo</option>
                    <option value="listo_para_entrega">Listo para entrega</option>
                    <option value="entregado">Entregado</option>
                    <option value="digital_enviado">Digital enviado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Entregado a
                  </label>
                  <input
                    type="text"
                    value={formData.deliveredTo}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveredTo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Información de Archivo */}
          <div className="bg-theme-secondary rounded-lg border border-theme p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-3 mb-4">
              Información de Archivo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Ubicación Física
                </label>
                <input
                  type="text"
                  value={formData.physicalLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, physicalLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                  placeholder="Ej: Caja 1 / 2019 / LACMAT-2019-01"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Ubicación física del certificado en archivo
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Código de Folio
                </label>
                <input
                  type="text"
                  value={formData.folioCode}
                  onChange={(e) =>
                    setFormData({ ...formData, folioCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                  placeholder="Ej: FOLIO-001"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Código de folio o referencia interna del certificado
                </p>
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="bg-theme-secondary rounded-lg border border-theme p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-3 mb-4">
              Información Adicional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
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
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                >
                  <option value="ninguno">Ninguno</option>
                  <option value="inscripcion">Inscripción</option>
                  <option value="retiro_presencial">Retiro Presencial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  ID de Archivo en Drive (o subir PDF)
                </label>

                <div className="mb-3">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="cert-upload"
                    disabled={uploadingFile}
                  />
                  <label
                    htmlFor="cert-upload"
                    className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingFile
                      ? "bg-theme-tertiary border-theme cursor-wait"
                      : "border-blue-300 hover:border-blue-500 hover:bg-blue-50"
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {uploadingFile ? (
                        <>
                          <LoadingSpinner size={24} className="text-blue-500" />
                          <span className="text-sm text-blue-600 font-medium">Subiendo archivo a Drive...</span>
                          <span className="text-xs text-text-secondary">Por favor espera</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-blue-600">
                            <Upload size={20} weight="bold" />
                            <span className="font-medium">
                              {formData.driveFileId ? "Reemplazar Certificado PDF" : "Subir Certificado PDF"}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary text-center">
                            {formData.driveFileId
                              ? "Al subir uno nuevo, se reemplazará el ID actual"
                              : "Se subirá automáticamente a la carpeta del curso en Drive"}
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formData.driveFileId || ""}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        driveFileId: e.target.value
                      });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value) {
                        const extractedId = extractDriveFileId(value);
                        if (extractedId && extractedId !== value) {
                          setFormData({ ...formData, driveFileId: extractedId });
                          toast.info("ID de Drive extraído de la URL");
                        }
                      }
                    }}
                    placeholder="ID o URL de Google Drive (o usa el botón de subir arriba)"
                    className="w-full px-3 py-2 pl-9 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                  />
                  <FilePdf size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Puedes subir el archivo usando el botón de arriba O pegar el ID/URL manualmente.
                </p>
              </div>
              <div className="md:col-span-2 space-y-3 pt-2">
                <h4 className="text-sm font-medium text-text-secondary">Notificaciones y Consentimientos</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.emailSent}
                      onChange={(e) =>
                        setFormData({ ...formData, emailSent: e.target.checked })
                      }
                      className="w-4 h-4 text-accent border-theme rounded focus:ring-accent"
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
                      className="w-4 h-4 text-accent border-theme rounded focus:ring-accent"
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
                      className="w-4 h-4 text-accent border-theme rounded focus:ring-accent"
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
              className="px-4 py-2 text-text-primary bg-theme-tertiary rounded-lg hover:bg-theme-secondary transition-colors border border-theme"
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
      </form >
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
      )
      }
    </>
  );
}

