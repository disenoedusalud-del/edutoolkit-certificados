import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { adminDb } from "@/lib/firebaseAdmin";
import * as XLSX from "xlsx";
import type { Certificate } from "@/types/Certificate";
import type { Course } from "@/types/Course";
import { logger } from "@/lib/logger";
import { getOrCreateFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";

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

// Función auxiliar para calcular el siguiente ID de certificado
async function calculateNextCertificateId(
  courseCode: string, // El ID del curso (ej: LM-2025-1 o LM)
  year: number,
  edition?: number | null
): Promise<string> {
  // LIMPIEZA PROACTIVA: Si el courseCode ya contiene el año o la edición, no los repetimos
  // Esto previene errores si el course.id ya es "LM-2025-1"
  let basePrefix = courseCode;

  // Si el prefijo ya termina en un número que parece una secuencia (ej: LM-2025-01), 
  // lo limpiamos para recalculalo
  if (basePrefix.match(/-\d{2}$/)) {
    basePrefix = basePrefix.substring(0, basePrefix.length - 3);
  }

  const prefix = basePrefix.endsWith("-") ? basePrefix : `${basePrefix}-`;

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
  const lastPart = parts[parts.length - 1]; // El último segmento es el número correlativo
  const lastNumber = parseInt(lastPart || "0", 10);
  const nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
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

    // Log crítico para depuración (siempre visible en el servidor)
    console.log("[DEBUG-IMPORT-FILE] Headers detectados:", headers);
    if (normalizedData.length > 0) {
      console.log("[DEBUG-IMPORT-FILE] Primera fila parseada:", normalizedData[0]);
    }

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

        const courseIdFromExcel = findColumn([
          "ID del Curso",
          "ID Curso",
          "Código del Curso",
          "Codigo del Curso",
          "Course ID",
          "course_id",
          "id_curso",
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

        const monthStr = findColumn([
          "Mes",
          "mes",
          "Month",
          "month",
        ]);
        const month = monthStr ? parseInt(monthStr, 10) : null;

        const editionStr = findColumn([
          "Edición",
          "edición",
          "Edicion",
          "edicion",
          "Edition",
          "edition",
        ]);
        const edition = editionStr ? parseInt(editionStr, 10) : null;

        const identification = findColumn([
          "Identificación",
          "identificación",
          "Identificacion",
          "identificacion",
          "DNI",
          "Dni",
          "Pasaporte",
          "pasaporte",
          "ID",
          "Identification",
          "identification",
        ]) || null;



        if (process.env.NODE_ENV === "development" && i === 0) {
          logger.info("Importación - Fila procesada:", {
            rowNumber,
            fullName,
            courseIdFromExcel,
            courseName,
            year
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

        // Buscar o crear curso
        let course: Course | null = null;

        if (courseIdFromExcel) {
          // PRIORIDAD 1: Buscar por ID exacto de curso (ID del documento)
          const searchId = courseIdFromExcel.trim();


          let courseDoc = await adminDb.collection("courses").doc(searchId).get();

          if (courseDoc.exists) {
            course = { id: courseDoc.id, ...courseDoc.data() } as Course;
          } else {
            // PRIORIDAD 1.5: Buscar por el campo "id" dentro de la colección
            const courseQuery = await adminDb.collection("courses")
              .where("id", "==", searchId)
              .limit(1)
              .get();

            if (!courseQuery.empty) {
              const matchedDoc = courseQuery.docs[0];
              course = { id: matchedDoc.id, ...matchedDoc.data() } as Course;
            } else {
              // PRIORIDAD 1.9: Búsqueda manual "fuzzy" (mayúsculas/minúsculas y permutaciones)
              // Listamos todos por seguridad (asumiendo que no hay miles de cursos)
              const allCoursesSnapshot = await adminDb.collection("courses").get();
              const searchIdLower = searchId.toLowerCase();
              const searchParts = searchIdLower.split("-");

              const fuzzyMatch = allCoursesSnapshot.docs.find(d => {
                const data = d.data();
                const docIdLower = d.id.toLowerCase();
                const fieldIdLower = data.id ? String(data.id).toLowerCase() : "";

                // 1. Coincidencia exacta (ignorando case)
                if (docIdLower === searchIdLower || fieldIdLower === searchIdLower) return true;

                // 2. Detectar permutación de Año y Edición (ej: LM-1-2025 vs LM-2025-1)
                if (searchParts.length >= 3) {
                  const initials = searchParts[0];
                  const p2 = searchParts[1];
                  const p3 = searchParts[2];

                  // Comprobar contra DocID
                  const docParts = docIdLower.split("-");
                  if (docParts.length >= 3 && docParts[0] === initials) {
                    if (docParts[1] === p3 && docParts[2] === p2) return true;
                  }

                  // Comprobar contra FieldID
                  const fieldParts = fieldIdLower.split("-");
                  if (fieldParts.length >= 3 && fieldParts[0] === initials) {
                    if (fieldParts[1] === p3 && fieldParts[2] === p2) return true;
                  }
                }

                // 3. Fallback: si solo tiene 2 partes pero coincide en lo básico
                if (searchParts.length === 2 && (docIdLower.startsWith(searchIdLower) || fieldIdLower.startsWith(searchIdLower))) {
                  return true;
                }

                return false;
              });

              if (fuzzyMatch) {
                course = { id: fuzzyMatch.id, ...fuzzyMatch.data() } as Course;
              } else {

                results.errors.push({
                  row: rowNumber,
                  error: `No se encontró el curso con ID: '${searchId}'. Verifica que el código coincida exactamente con el que aparece en la administración de cursos.`,
                });
                continue;
              }
            }
          }
        } else {
          // PRIORIDAD 2: Fallback a búsqueda por nombre y año
          if (!courseName || courseName.trim() === "") {
            results.errors.push({
              row: rowNumber,
              error: "Falta el 'ID del Curso' o el 'Nombre del Curso' para identificar a qué curso pertenece este certificado.",
            });
            continue;
          }

          if (isNaN(year) || year < 2000 || year > 2100) {
            results.errors.push({
              row: rowNumber,
              error: `Año inválido: '${yearStr}'. Requerido si no proporcionas el 'ID del Curso'.`,
            });
            continue;
          }

          const normalizedImportCourseName = courseName.trim().toLowerCase();
          const coursesSnapshot = await adminDb
            .collection("courses")
            .where("year", "==", year)
            .get();

          const matchingCourseDoc = coursesSnapshot.docs.find(doc =>
            doc.data().name.trim().toLowerCase() === normalizedImportCourseName
          );

          if (matchingCourseDoc) {
            const courseData = matchingCourseDoc.data();
            course = { id: matchingCourseDoc.id, ...courseData } as Course;
          } else {
            // Crear nuevo curso
            const initials = generateCourseCode(courseName);
            let courseCodeBase = edition ? `${initials}-${edition}-${year}` : `${initials}-${year}`;
            let finalCourseCode = courseCodeBase;
            let counter = 1;
            while (true) {
              const existingCourse = await adminDb.collection("courses").doc(finalCourseCode).get();
              if (!existingCourse.exists) break;
              finalCourseCode = `${courseCodeBase}-${counter}`;
              counter++;
            }

            const newCourse: Course = {
              id: finalCourseCode, // Guardar el ID también como campo para búsquedas
              name: courseName.trim(),
              courseType: (courseType as Course["courseType"]) || "Curso",
              year: year,
              month: month,
              edition: edition,
              origin: "nuevo",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await adminDb
              .collection("courses")
              .doc(finalCourseCode)
              .set(newCourse);
            course = newCourse;
            results.coursesCreated.push(courseName);
          }
        }

        // Variables finales extraídas del curso (DB o recién creado)
        const certYear = course.year;
        const certMonth = month || course.month || null;
        const certEdition = edition || course.edition || null;
        const certCourseName = course.name;
        const certCourseType = course.courseType;

        // ASEGURAR CARPETA EN DRIVE si falta (Estructura Año / Curso)
        if (!course.driveFolderId) {
          try {
            const parentFolderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID;
            if (parentFolderId) {
              // 1. Carpeta del Año
              const yearFolderResult = await getOrCreateFolderInAppsScriptDrive({
                folderName: year.toString(),
                parentFolderId,
              });

              if (yearFolderResult.ok && yearFolderResult.folderId) {
                // 2. Carpeta del Curso
                const courseFolderName = `${course.id} - ${course.name.trim()}`;
                const courseFolderResult = await getOrCreateFolderInAppsScriptDrive({
                  folderName: courseFolderName,
                  parentFolderId: yearFolderResult.folderId,
                });

                if (courseFolderResult.ok && courseFolderResult.folderId) {
                  // Actualizar en DB para que ya la tenga
                  course.driveFolderId = courseFolderResult.folderId;
                  await adminDb.collection("courses").doc(course.id).update({
                    driveFolderId: courseFolderResult.folderId
                  });
                }
              }
            }
          } catch (driveErr) {
            logger.error("Error asegurando carpeta durante importación", driveErr);
          }
        }

        // Calcular ID de certificado secuencial usando el ID del curso como base
        const finalCourseId = await calculateNextCertificateId(course.id, certYear, certEdition);

        const physicalLocation = findColumn([
          "Ubicación Física",
          "ubicacion_fisica",
          "Ubicacion Fisica",
          "Ubicación",
          "Physical Location",
          "location",
        ]) || null;

        const folioCode = findColumn([
          "Folio",
          "folio",
          "Código de Folio",
          "Codigo de Folio",
          "Folio Code",
          "folio_code",
        ]) || null;

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

        const rawOrigin = findColumn([
          "Origen",
          "origen",
          "Origin",
          "origin",
        ]).toLowerCase();
        const origin = (rawOrigin === "historico" ? "historico" : "nuevo") as "nuevo" | "historico";

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

        // VERIFICAR SI EL CERTIFICADO YA EXISTE (para evitar duplicados al re-importar)
        const certsSnapshot = await adminDb
          .collection("certificates")
          .where("fullName", "==", fullName.trim())
          .where("courseName", "==", certCourseName)
          .where("year", "==", certYear)
          .limit(1)
          .get();

        const certificateData: Omit<Certificate, "id"> = {
          fullName: fullName.trim(),
          courseName: certCourseName,
          courseId: finalCourseId,
          courseType: certCourseType,
          year: certYear,
          month: certMonth,
          edition: certEdition,
          identification: identification,
          origin: origin,
          email: email ? email.trim().toLowerCase() : null,
          phone: phone ? phone.trim() : null,
          contactSource: contactSource,
          driveFileId: null, // No sobrescribir si ya existe (ver abajo)
          deliveryStatus: deliveryStatus,
          deliveryDate: null,
          deliveredTo: null,
          physicalLocation: physicalLocation,
          folioCode: folioCode,
          emailSent: false,
          whatsappSent: false,
          marketingConsent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!certsSnapshot.empty) {
          // Existe: Actualizar (pero preservar campos críticos como driveFileId si ya tiene uno)
          const existingCert = certsSnapshot.docs[0];
          const existingData = existingCert.data() as Certificate;

          // Preservar archivos y estados si ya estaban
          if (existingData.driveFileId) certificateData.driveFileId = existingData.driveFileId;
          certificateData.createdAt = existingData.createdAt || certificateData.createdAt;

          await adminDb.collection("certificates").doc(existingCert.id).update(certificateData);
        } else {
          // No existe: Crear nuevo
          await adminDb.collection("certificates").add(certificateData);
        }
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

