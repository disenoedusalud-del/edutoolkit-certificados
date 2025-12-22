import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { adminDb } from "@/lib/firebaseAdmin";
import * as XLSX from "xlsx";
import type { Certificate } from "@/types/Certificate";
import type { Course } from "@/types/Course";
import { logger } from "@/lib/logger";

// Función auxiliar para generar código de curso
function generateCourseCode(courseName: string): string {
  // Extraer iniciales o usar primeras letras
  const words = courseName.trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .substring(0, 4);
  }
  return courseName.substring(0, 4).toUpperCase().replace(/\s/g, "");
}

// Función auxiliar para calcular el siguiente courseId
async function calculateNextCourseId(
  courseCode: string,
  year: number
): Promise<string> {
  const prefix = `${courseCode}-${year}-`;
  const snapshot = await adminDb
    .collection("certificates")
    .where("courseId", ">=", prefix)
    .where("courseId", "<=", prefix + "\uf8ff")
    .orderBy("courseId", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return `${prefix}01`;
  }

  const lastCourseId = snapshot.docs[0].data().courseId as string;
  const parts = lastCourseId.split("-");
  const lastNumber = parseInt(parts[2] || "0", 10);
  const nextNumber = lastNumber + 1;
  return `${prefix}${String(nextNumber).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (usar HEAVY porque es una operación costosa)
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.HEAVY);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // Solo EDITOR o superior puede importar
    await requireRole("EDITOR");

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
      "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
    ];

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const isValidType =
      validTypes.includes(file.type) ||
      ["xlsx", "xls", "csv"].includes(fileExtension || "");

    if (!isValidType) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no válido. Use Excel (.xlsx, .xls) o CSV (.csv)",
        },
        { status: 400 }
      );
    }

    // Leer archivo
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Para CSV, detectar automáticamente el separador (coma o punto y coma)
    let workbook: XLSX.WorkBook;
    if (fileExtension === "csv") {
      const text = buffer.toString("utf-8");
      // Detectar si usa punto y coma o coma como separador
      const hasSemicolon = text.split("\n")[0]?.includes(";");
      const csvOptions: XLSX.ParsingOptions = {
        type: "string",
        FS: hasSemicolon ? ";" : ",",
      };
      workbook = XLSX.read(text, csvOptions);
    } else {
      workbook = XLSX.read(buffer, { type: "buffer" });
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer con header: 1 para obtener como array de arrays primero
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: "", // Valor por defecto para celdas vacías
      raw: false, // Convertir números a strings para mejor manejo
      header: 1, // Obtener como array de arrays
    }) as any[][];
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío o no tiene datos válidos" },
        { status: 400 }
      );
    }
    
    // La primera fila son los headers
    const headers = (rawData[0] as any[]) || [];
    const rows = rawData.slice(1) as any[][];
    
    // Convertir a objetos con nombres de columnas (preservando los nombres originales con paréntesis)
    const normalizedData = rows.map((row) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        if (header !== undefined && header !== null) {
          const headerKey = String(header).trim();
          obj[headerKey] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : "";
        }
      });
      return obj;
    });
    
    // Log para debug (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      logger.info("Importación - Headers detectados:", { headers });
      if (normalizedData.length > 0) {
        logger.info("Importación - Primera fila de datos:", { firstRow: normalizedData[0] });
      }
    }

    if (normalizedData.length === 0) {
      return NextResponse.json(
        { error: "El archivo no tiene filas de datos (solo encabezados)" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>,
      coursesCreated: [] as string[],
    };

    // Procesar cada fila
    for (let i = 0; i < normalizedData.length; i++) {
      const row = normalizedData[i] as any;
      const rowNumber = i + 2; // +2 porque la fila 1 es el header

      try {
        // Función auxiliar para normalizar nombres de columnas
        // Busca variaciones con/sin paréntesis, espacios, mayúsculas/minúsculas
        const findColumn = (variants: string[]): string => {
          // Primero, intentar búsqueda normalizada en todas las claves del row
          for (const key in row) {
            const normalizedKey = key
              .toLowerCase()
              .replace(/\s*\([^)]*\)/g, "") // Eliminar paréntesis y su contenido
              .replace(/\s+/g, " ") // Normalizar espacios
              .replace(/[^\w\s]/g, "") // Eliminar caracteres especiales
              .trim();
            
            for (const variant of variants) {
              const normalizedVariant = variant
                .toLowerCase()
                .replace(/\s*\([^)]*\)/g, "")
                .replace(/\s+/g, " ")
                .replace(/[^\w\s]/g, "")
                .trim();
              
              if (normalizedKey === normalizedVariant) {
                const value = String(row[key] || "").trim();
                // Retornar incluso si está vacío, para que la validación lo maneje
                return value;
              }
            }
          }
          
          // Si no se encontró con normalización, buscar coincidencia exacta
          for (const variant of variants) {
            if (row[variant] !== undefined && row[variant] !== null) {
              const value = String(row[variant]).trim();
              return value;
            }
          }
          
          return "";
        };

        // Normalizar nombres de columnas (aceptar múltiples variantes con/sin paréntesis)
        const fullName = findColumn([
          "Nombre Completo",
          "nombre_completo",
          "Nombre",
          "nombre",
          "Full Name",
          "full_name",
        ]);

        const courseName = findColumn([
          "Nombre del Curso",
          "nombre_del_curso",
          "Curso",
          "curso",
          "Course Name",
          "course_name",
        ]);

        const yearStr = findColumn([
          "Año",
          "año",
          "Year",
          "year",
          "Ano",
          "ano",
        ]) || new Date().getFullYear().toString();

        const year = parseInt(yearStr.toString(), 10);

        const courseType = findColumn([
          "Tipo de Curso",
          "tipo_de_curso",
          "Tipo",
          "tipo",
          "Course Type",
          "course_type",
        ]) || "Curso";

        // Log para debug (solo en desarrollo)
        if (process.env.NODE_ENV === "development" && i === 0) {
          logger.info("Importación - Fila procesada:", { 
            rowNumber, 
            rowKeys: Object.keys(row),
            rowValues: row 
          });
        }

        if (!fullName || fullName.trim() === "") {
          results.errors.push({
            row: rowNumber,
            error: "Falta el campo requerido: 'Nombre Completo'. Columnas encontradas: " + Object.keys(row).join(", "),
            data: row,
          });
          continue;
        }

        if (!courseName || courseName.trim() === "") {
          // Mostrar información de debug útil
          const availableColumns = Object.keys(row).join(", ");
          const rowValues = Object.values(row).join(", ");
          results.errors.push({
            row: rowNumber,
            error: `Falta el campo requerido: 'Nombre del Curso'. Columnas encontradas en esta fila: [${availableColumns}]. Valores: [${rowValues}]`,
            data: row,
          });
          continue;
        }

        if (isNaN(year) || year < 2000 || year > 2100) {
          results.errors.push({
            row: rowNumber,
            error: `Año inválido: '${yearStr}'. Debe ser un número entre 2000 y 2100`,
          });
          continue;
        }

        // Buscar o crear curso
        let course: Course | null = null;
        const coursesSnapshot = await adminDb
          .collection("courses")
          .where("name", "==", courseName.trim())
          .where("year", "==", year)
          .limit(1)
          .get();

        if (!coursesSnapshot.empty) {
          // Curso existe
          const courseDoc = coursesSnapshot.docs[0];
          course = { id: courseDoc.id, ...courseDoc.data() } as Course;
        } else {
          // Crear nuevo curso
          const courseCode = generateCourseCode(courseName);
          
          // Verificar que el código no exista ya
          let finalCourseCode = courseCode;
          let counter = 1;
          while (true) {
            const existingCourse = await adminDb
              .collection("courses")
              .doc(finalCourseCode)
              .get();
            
            if (!existingCourse.exists) {
              break;
            }
            finalCourseCode = `${courseCode}${counter}`;
            counter++;
          }

          const newCourse: Omit<Course, "id"> = {
            name: courseName.trim(),
            courseType: (courseType as Course["courseType"]) || "Curso",
            year: year,
            origin: "nuevo",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await adminDb
            .collection("courses")
            .doc(finalCourseCode)
            .set(newCourse);
          course = { id: finalCourseCode, ...newCourse };
          results.coursesCreated.push(courseName);
        }

        // Calcular courseId secuencial
        const finalCourseId = await calculateNextCourseId(course.id, year);

        // Normalizar campos opcionales
        const email = findColumn([
          "Email",
          "email",
          "Correo",
          "correo",
        ]) || null;

        const phone = findColumn([
          "Teléfono",
          "telefono",
          "Tel",
          "tel",
          "Phone",
          "phone",
        ]) || null;

        const origin = (findColumn([
          "Origen",
          "origen",
          "Origin",
          "origin",
        ]) || "nuevo") as "nuevo" | "historico";

        const contactSource = (findColumn([
          "Fuente de Contacto",
          "fuente_de_contacto",
          "Contact Source",
          "contact_source",
        ]) || "ninguno") as Certificate["contactSource"];

        const deliveryStatus = (findColumn([
          "Estado",
          "estado",
          "Status",
          "status",
          "Estado de Entrega",
          "estado_de_entrega",
        ]) || "en_archivo") as Certificate["deliveryStatus"];

        // Crear certificado
        const certificateData: Omit<Certificate, "id"> = {
          fullName: fullName.trim(),
          courseName: course.name,
          courseId: finalCourseId,
          courseType: course.courseType,
          year: year,
          month: course.month || null, // Copiar el mes del curso
          origin: origin,
          email: email ? email.trim().toLowerCase() : null,
          phone: phone ? phone.trim() : null,
          contactSource: contactSource,
          driveFileId: null,
          deliveryStatus: deliveryStatus,
          deliveryDate: null,
          deliveredTo: null,
          physicalLocation: null,
          folioCode: null,
          emailSent: false,
          whatsappSent: false,
          marketingConsent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await adminDb.collection("certificates").add(certificateData);
        results.success++;
      } catch (error: any) {
        logger.error("Error procesando fila de importación", {
          row: rowNumber,
          error: error.message,
        });
        results.errors.push({
          row: rowNumber,
          error: error.message || "Error desconocido al procesar esta fila",
        });
      }
    }

    return NextResponse.json({
      message: `Importación completada: ${results.success} certificados creados`,
      results,
    });
  } catch (error: any) {
    logger.error("Error en importación de certificados", {
      error: error.message,
    });
    return NextResponse.json(
      {
        error: "Error al procesar la importación",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

