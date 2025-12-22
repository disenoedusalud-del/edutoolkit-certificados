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

// Función helper para obtener el nombre del mes
const getMonthName = (monthNum: number | null | undefined): string => {
  if (!monthNum || monthNum < 1 || monthNum > 12) return "";
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[monthNum - 1];
};

interface CertificateFormProps {
  certificate?: Certificate;
  onCancel?: () => void;
  onSuccess?: () => void;
  initialCourseData?: {
    courseId: string; // ID del curso (ej: "LM")
    courseName: string;
    courseType: string;
    year: number;
    month?: number | null;
    edition?: number | null; // Número de edición del curso
    origin?: string;
  };
}

export default function CertificateForm({
  certificate,
  onCancel,
  onSuccess,
  initialCourseData,
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
    courseName: certificate?.courseName || initialCourseData?.courseName || "",
    courseId: certificate?.courseId || "",
    courseType: certificate?.courseType || initialCourseData?.courseType || "",
    year: certificate?.year || initialCourseData?.year || new Date().getFullYear(), // Se obtendrá del curso seleccionado
    month: certificate?.month || initialCourseData?.month || null, // Se obtendrá del curso seleccionado
    origin: certificate?.origin || initialCourseData?.origin || "nuevo", // Se obtendrá del curso seleccionado
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
    selectedCourseId: initialCourseData?.courseId || "", // ID del curso seleccionado del SELECT
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

        // Si hay initialCourseData, seleccionar ese curso automáticamente
        if (initialCourseData?.courseId && coursesArray.length > 0) {
          // Buscar el curso por ID (el courseId que viene es el código del curso, ej: "LM")
          const matchingCourse = coursesArray.find(
            (c: Course) => c.id === initialCourseData.courseId
          );
          if (matchingCourse) {
            // Usar el año del curso o el año pasado en initialCourseData
            const courseYear = matchingCourse.year || initialCourseData.year || new Date().getFullYear();
            // PRIORIDAD ABSOLUTA: Usar la edición de initialCourseData (viene del certificado existente en la carpeta)
            // Esta edición tiene prioridad porque viene directamente del certificado que está en esa carpeta
            // NO usar la edición del curso, solo la del certificado existente
            const courseEdition = initialCourseData.edition !== undefined && initialCourseData.edition !== null 
              ? initialCourseData.edition 
              : null; // Si no hay edición en initialCourseData, no usar edición (no usar la del curso)
            
            console.log("[CertificateForm] Generando ID desde carpeta:", {
              courseId: matchingCourse.id,
              courseCode: matchingCourse.id.split("-")[0],
              year: courseYear,
              editionFromInitial: initialCourseData.edition,
              editionFromCourse: matchingCourse.edition,
              finalEdition: courseEdition,
              note: "Usando edición de initialCourseData (certificado existente), NO del curso"
            });
            // Generar el courseId del certificado automáticamente, incluyendo la edición si existe
            generateCourseId(matchingCourse.id, courseYear, courseEdition).then((autoCourseId) => {
              setFormData((prev) => ({
                ...prev,
                selectedCourseId: matchingCourse.id, // Esto hará que el SELECT muestre el curso seleccionado
                courseName: matchingCourse.name,
                courseId: autoCourseId,
                courseType: matchingCourse.courseType || "Curso",
                year: courseYear,
                month: matchingCourse.month || initialCourseData.month || null,
                origin: matchingCourse.origin || initialCourseData.origin || "nuevo",
              }));
            });
          } else {
            // Si no se encuentra el curso, al menos prellenar con los datos que tenemos
            console.warn("Curso no encontrado en la lista:", initialCourseData.courseId);
            setFormData((prev) => ({
              ...prev,
              courseName: initialCourseData.courseName || prev.courseName,
              courseType: initialCourseData.courseType || prev.courseType,
              year: initialCourseData.year || prev.year,
              month: initialCourseData.month || prev.month,
              origin: initialCourseData.origin || prev.origin,
            }));
          }
        }
        // Si hay un certificado existente, intentar encontrar el curso correspondiente
        else if (certificate?.courseName && coursesArray.length > 0) {
          const matchingCourse = coursesArray.find(
            (c: Course) => c.name === certificate.courseName || c.id === certificate.courseId?.split("-")[0]
          );
          if (matchingCourse) {
            // Usar el año del curso si está disponible, sino usar el año del certificado
            const courseYear = matchingCourse.year || certificate.year || new Date().getFullYear();
            setFormData((prev) => ({
              ...prev,
              selectedCourseId: matchingCourse.id,
              year: courseYear, // Actualizar el año con el año del curso
              origin: matchingCourse.origin || certificate.origin || "nuevo", // Actualizar el origen con el origen del curso
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
  }, [certificate, initialCourseData]);

  const generateCourseId = async (courseCode: string, year: number, edition?: number | null): Promise<string> => {
    // Extraer solo el código base del curso (sin edición si está incluida en el ID)
    // El courseCode puede venir como "NAEF" o "NAEF-2", necesitamos solo "NAEF"
    const baseCourseCode = courseCode.split("-")[0];
    
    console.log("[generateCourseId] Generando ID:", {
      courseCode,
      baseCourseCode,
      year,
      edition,
      url: `/api/certificates/next-sequence?courseCode=${encodeURIComponent(baseCourseCode)}&year=${year}${edition ? `&edition=${edition}` : ""}`
    });
    
    // Obtener el siguiente número secuencial del servidor
    try {
      let url = `/api/certificates/next-sequence?courseCode=${encodeURIComponent(baseCourseCode)}&year=${year}`;
      if (edition !== undefined && edition !== null) {
        url += `&edition=${edition}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("[generateCourseId] Respuesta del servidor:", data);
        return data.formattedId || (edition ? `${baseCourseCode}-${edition}-${year}-01` : `${baseCourseCode}-${year}-01`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[generateCourseId] Error en respuesta:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error obteniendo siguiente número secuencial:", error);
    }
    // Fallback: usar 01 si hay error
    return edition ? `${baseCourseCode}-${edition}-${year}-01` : `${baseCourseCode}-${year}-01`;
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
        // Usar el año del curso en lugar del año del formulario
        const courseYear = selectedCourse.year || new Date().getFullYear();
        
        // Extraer edición del course.id si está incluida (formato: "NAEF-2")
        // Si el course.id tiene formato "CODIGO-EDICION", extraer la edición de ahí
        // Si no, usar course.edition
        let courseEdition: number | null = null;
        const courseIdParts = selectedCourse.id.split("-");
        if (courseIdParts.length >= 2) {
          // Verificar si la segunda parte es un número (edición)
          const possibleEdition = parseInt(courseIdParts[1], 10);
          if (!isNaN(possibleEdition) && possibleEdition > 0 && possibleEdition < 100) {
            // Es probable que sea una edición
            courseEdition = possibleEdition;
            console.log("[handleCourseSelect] Edición extraída del course.id:", courseEdition);
          }
        }
        // Si no se encontró edición en el ID, usar course.edition
        if (courseEdition === null) {
          courseEdition = selectedCourse.edition || null;
        }
        
        // Generar courseId automáticamente con el siguiente número secuencial, incluyendo edición si existe
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
      if (formData.selectedCourseId) {
        const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
        if (selectedCourse) {
          // Usar el año del curso
          const courseYear = selectedCourse.year || new Date().getFullYear();
          
          // Extraer edición del course.id si está incluida (formato: "NAEF-2")
          let courseEdition: number | null = null;
          const courseIdParts = selectedCourse.id.split("-");
          if (courseIdParts.length >= 2) {
            // Verificar si la segunda parte es un número (edición)
            const possibleEdition = parseInt(courseIdParts[1], 10);
            if (!isNaN(possibleEdition) && possibleEdition > 0 && possibleEdition < 100) {
              // Es probable que sea una edición
              courseEdition = possibleEdition;
            }
          }
          // Si no se encontró edición en el ID, usar course.edition
          if (courseEdition === null) {
            courseEdition = selectedCourse.edition || null;
          }
          
          // Generar courseId incluyendo edición si existe
          const autoCourseId = await generateCourseId(selectedCourse.id, courseYear, courseEdition);
          setFormData((prev) => ({
            ...prev,
            courseId: autoCourseId,
            courseName: selectedCourse.name, // Asegurar que el nombre del curso esté actualizado
            courseType: selectedCourse.courseType || prev.courseType || "Curso",
            year: courseYear, // Actualizar el año del formulario con el año del curso
            month: selectedCourse.month || null, // Actualizar el mes del formulario con el mes del curso
            origin: selectedCourse.origin || "nuevo", // Actualizar el origen del formulario con el origen del curso
          }));
        }
      }
    };
    // Solo actualizar si hay cursos cargados y hay un curso seleccionado
    if (courses.length > 0 && formData.selectedCourseId) {
      updateCourseId();
    }
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

    // Si hay initialCourseData, validar de forma diferente (el curso ya está predefinido)
    if (initialCourseData) {
      // Solo necesitamos que haya courseName (puede venir de formData o initialCourseData)
      const courseName = formData.courseName.trim() || initialCourseData.courseName || "";
      if (!courseName) {
        errors.courseName = "El nombre del curso es requerido";
      }
      // El courseId se generará automáticamente si falta, no es un error crítico
      // Solo validamos que tengamos los datos necesarios para generarlo
      if (!formData.courseId.trim() && !initialCourseData.courseId) {
        // No es un error crítico, se generará en handleSubmit
        console.warn("courseId no generado todavía, se generará en handleSubmit");
      }
    } else {
      // Validación normal cuando no viene de una carpeta
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
      // Mostrar errores específicos
      const errorMessages = Object.values(fieldErrors);
      if (errorMessages.length > 0) {
        toast.error(`Errores en el formulario: ${errorMessages.join(", ")}`);
      } else {
        toast.error("Por favor, corrige los errores en el formulario");
      }
      console.log("Errores de validación:", fieldErrors);
      console.log("Estado del formulario:", formData);
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

      // Asegurar que courseId, courseName y courseType estén llenos
      let finalCourseId = formData.courseId.trim();
      let finalCourseName = formData.courseName.trim();
      let finalCourseType = formData.courseType.trim();
      let finalYear = formData.year;
      let finalMonth = formData.month;
      let finalOrigin = formData.origin;
      
      // Si hay initialCourseData, usar esos datos directamente
      if (initialCourseData) {
        finalCourseName = formData.courseName.trim() || initialCourseData.courseName;
        finalCourseType = formData.courseType.trim() || initialCourseData.courseType || "Curso";
        finalYear = formData.year || initialCourseData.year || new Date().getFullYear();
        finalMonth = formData.month || initialCourseData.month || null;
        finalOrigin = formData.origin || initialCourseData.origin || "nuevo";
        
        // Si no hay courseId generado, generarlo ahora
        // Necesitamos obtener el curso completo para incluir la edición
        if (!finalCourseId) {
          const matchingCourse = courses.find((c) => c.id === initialCourseData.courseId);
          // PRIORIDAD ABSOLUTA: Usar la edición de initialCourseData (viene del certificado existente en la carpeta)
          // Esta edición tiene prioridad absoluta porque viene directamente del certificado que está en esa carpeta
          // NO usar la edición del curso, solo la del certificado existente
          const courseEdition = initialCourseData.edition !== undefined && initialCourseData.edition !== null
            ? initialCourseData.edition
            : null; // Si no hay edición en initialCourseData, no usar edición (no usar la del curso)
          
          console.log("[CertificateForm] Generando ID en handleSubmit:", {
            initialCourseData,
            matchingCourse: matchingCourse ? { id: matchingCourse.id, edition: matchingCourse.edition } : null,
            courseEdition,
            finalYear
          });
          
          if (matchingCourse) {
            finalCourseId = await generateCourseId(matchingCourse.id, finalYear, courseEdition);
          } else {
            // Si no encontramos el curso, usar la edición de initialCourseData si existe
            finalCourseId = await generateCourseId(initialCourseData.courseId, finalYear, courseEdition);
          }
        }
      } 
      // Si hay un curso seleccionado (modo normal), usar esos datos
      else if (formData.selectedCourseId && (!finalCourseId || !finalCourseName || !finalCourseType)) {
        const selectedCourse = courses.find((c) => c.id === formData.selectedCourseId);
        if (selectedCourse) {
          // Usar el año del curso
          finalYear = selectedCourse.year || new Date().getFullYear();
          // Usar el mes del curso
          finalMonth = selectedCourse.month || null;
          // Usar el origen del curso
          finalOrigin = selectedCourse.origin || "nuevo";
          if (!finalCourseId) {
            // Extraer edición del course.id si está incluida (formato: "NAEF-2")
            let courseEdition: number | null = null;
            const courseIdParts = selectedCourse.id.split("-");
            if (courseIdParts.length >= 2) {
              // Verificar si la segunda parte es un número (edición)
              const possibleEdition = parseInt(courseIdParts[1], 10);
              if (!isNaN(possibleEdition) && possibleEdition > 0 && possibleEdition < 100) {
                // Es probable que sea una edición
                courseEdition = possibleEdition;
              }
            }
            // Si no se encontró edición en el ID, usar course.edition
            if (courseEdition === null) {
              courseEdition = selectedCourse.edition || null;
            }
            // Generar courseId incluyendo edición si existe
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
        origin: finalOrigin,
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.fullName
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.email
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

        {/* Información del Curso */}
        <div className="bg-theme-secondary rounded-lg border border-theme p-6 space-y-4">
          <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-3 mb-4">
            Información del Curso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Si hay initialCourseData, mostrar información del curso sin permitir cambiarlo */}
            {initialCourseData ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Curso
                </label>
                <div className="px-4 py-3 border border-theme rounded-lg bg-theme-tertiary">
                  <div className="font-semibold text-text-primary text-base">
                    {formData.courseName || initialCourseData.courseName}
                  </div>
                  <div className="text-sm text-text-secondary mt-2 space-y-1">
                    <div>
                      <span className="font-medium">Código:</span> {initialCourseData.courseId}
                    </div>
                    <div>
                      <span className="font-medium">Año:</span> {formData.year || initialCourseData.year}
                    </div>
                    {formData.month && (
                      <div>
                        <span className="font-medium">Mes:</span> {getMonthName(formData.month)}
                      </div>
                    )}
                    {formData.courseType && (
                      <div>
                        <span className="font-medium">Tipo:</span> {formData.courseType}
                      </div>
                    )}
                    {formData.courseId && (
                      <div className="mt-2 pt-2 border-t border-theme">
                        <span className="font-medium">ID del Certificado:</span>{" "}
                        <span className="font-mono text-text-primary">{formData.courseId}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  El curso está predefinido por la carpeta seleccionada
                </p>
                {/* Campo oculto para mantener el selectedCourseId */}
                <input type="hidden" value={formData.selectedCourseId || initialCourseData.courseId} />
              </div>
            ) : (
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
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.courseName
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
            )}
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
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
            />
            <p className="text-xs text-text-secondary mt-1">
              Puedes pegar el ID del archivo o la URL completa de Google Drive. El sistema extraerá automáticamente el ID al guardar.
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

