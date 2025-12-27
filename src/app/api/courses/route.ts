import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateCourse, validationErrorResponse } from "@/lib/validation";
import { getOrCreateFolderInAppsScriptDrive, createFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";
import type { Query, DocumentData } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";

// Tipo para los datos de curso en la respuesta
type CourseRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  [key: string]: any;
};

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar autenticación (VIEWER puede leer)
    await requireRole("VIEWER");

    // 3. Obtener parámetros
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "active" | "archived" | null (todos)
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const coursesRef = adminDb.collection("courses");
    let query: Query<DocumentData> = coursesRef as Query<DocumentData>;

    // Filtrar por estado si se especifica
    if (status === "active" || status === "archived") {
      query = query.where("status", "==", status);
    }

    // Si no hay parámetros de paginación, mantener comportamiento original
    if (!pageParam && !limitParam) {
      // Intentar ordenar por nombre, pero si falla (por falta de índice), obtener sin ordenar
      try {
        query = query.orderBy("name", "asc");
        const snapshot = await query.get();
        // Usar el campo 'id' del documento (código original) si existe, sino usar el ID del documento
        const data: CourseRow[] = snapshot.docs.map((d) => {
          const docData = d.data();
          // Retornar d.id como el ID único del curso para evitar colisiones entre años
          return { ...docData, id: d.id } as CourseRow;
        });
        return NextResponse.json(Array.isArray(data) ? data : [], {
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        });
      } catch (orderError: any) {
        // Si falla el ordenamiento (probablemente falta índice), obtener sin ordenar
        logger.warn("No se pudo ordenar cursos, obteniendo sin orden", { error: orderError.message, endpoint: "/api/courses" });

        // Reconstruir la query con el filtro pero sin orderBy
        let queryWithoutOrder: Query<DocumentData> = coursesRef as Query<DocumentData>;
        if (status === "active" || status === "archived") {
          queryWithoutOrder = queryWithoutOrder.where("status", "==", status);
        }

        const snapshot = await queryWithoutOrder.get();
        // Usar el campo 'id' del documento (código original) si existe, sino usar el ID del documento
        const data: CourseRow[] = snapshot.docs.map((d) => {
          const docData = d.data();
          // Retornar d.id como el ID único del curso
          return { ...docData, id: d.id } as CourseRow;
        });

        // Filtrar por status en memoria si es necesario (por si acaso)
        let filteredData: CourseRow[] = data;
        if (status === "active" || status === "archived") {
          filteredData = data.filter((course: CourseRow) => {
            const courseStatus = course.status || "active";
            return courseStatus === status;
          });
        }

        // Ordenar manualmente en memoria
        const sortedData: CourseRow[] = Array.isArray(filteredData)
          ? filteredData.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          : [];

        return NextResponse.json(sortedData, {
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        });
      }
    }

    // 4. Paginación: parsear y validar parámetros
    const page = Math.max(1, parseInt(pageParam || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || "50", 10))); // Max 100, default 50
    const offset = (page - 1) * limit;

    // 5. Obtener total de documentos (considerando filtro de status)
    let totalQuery: Query<DocumentData> = coursesRef as Query<DocumentData>;
    if (status === "active" || status === "archived") {
      totalQuery = totalQuery.where("status", "==", status);
    }
    const totalSnapshot = await totalQuery.count().get();
    const total = totalSnapshot.data().count;

    // 6. Obtener documentos paginados
    // Intentar ordenar, pero si falla, obtener sin ordenar y ordenar en memoria
    try {
      query = query.orderBy("name", "asc");
      const snapshot = await query.limit(limit).offset(offset).get();
      // Asegurar que el ID del documento siempre tenga prioridad sobre el campo 'id' del documento
      const data: CourseRow[] = snapshot.docs.map((d) => {
        const docData = d.data();
        return { ...docData, id: d.id } as CourseRow;
      });

      const totalPages = Math.ceil(total / limit);

      return NextResponse.json(
        {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        {
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    } catch (orderError: any) {
      // Si falla el ordenamiento, obtener sin ordenar y aplicar paginación en memoria
      logger.warn("No se pudo ordenar cursos con paginación, obteniendo sin orden", { error: orderError.message, endpoint: "/api/courses", page, limit });

      let queryWithoutOrder: Query<DocumentData> = coursesRef as Query<DocumentData>;
      if (status === "active" || status === "archived") {
        queryWithoutOrder = queryWithoutOrder.where("status", "==", status);
      }

      const snapshot = await queryWithoutOrder.get();
      // Asegurar que el ID del documento siempre tenga prioridad sobre el campo 'id' del documento
      let data: CourseRow[] = snapshot.docs.map((d) => {
        const docData = d.data();
        return { ...docData, id: d.id } as CourseRow; // El ID del documento siempre sobrescribe cualquier campo 'id' interno
      });

      // Filtrar por status en memoria si es necesario
      if (status === "active" || status === "archived") {
        data = data.filter((course: CourseRow) => {
          const courseStatus = course.status || "active";
          return courseStatus === status;
        });
      }

      // Ordenar manualmente en memoria
      const sortedData: CourseRow[] = Array.isArray(data)
        ? data.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        : [];

      // Aplicar paginación en memoria
      const paginatedData = sortedData.slice(offset, offset + limit);
      const totalPages = Math.ceil(sortedData.length / limit);

      return NextResponse.json(
        {
          data: paginatedData,
          pagination: {
            page,
            limit,
            total: sortedData.length,
            totalPages,
          },
        },
        {
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "No tienes permisos para realizar esta acción" },
          { status: 403 }
        );
      }
    }

    logger.error("Error obteniendo cursos", error, { endpoint: "/api/courses" });
    // Si hay un error, devolver array vacío en lugar de objeto de error
    // Esto evita problemas en el frontend
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (ADMIN o superior puede crear cursos)
    const currentUser = await requireRole("ADMIN");

    // 3. Validar entrada
    const body = await request.json();
    const validation = validateCourse(body);

    if (!validation.valid) {
      return validationErrorResponse(validation.errors);
    }

    const { id, name, courseType = "Curso", year, month = null, edition = null, origin = "nuevo", status = "active" } = body;

    // Validar que el mes y edición sean consistentes
    // Si hay mes, debe haber edición
    if (month !== null && month !== undefined && (edition === null || edition === undefined)) {
      return NextResponse.json(
        { error: "Si se especifica un mes, también debe especificarse una edición" },
        { status: 400 }
      );
    }

    // Verificar unicidad: nombre + año + mes + edición deben ser únicos
    // Obtener todos los cursos con el mismo nombre y año, luego filtrar en memoria
    const courseYear = year ? parseInt(year.toString()) : new Date().getFullYear();
    const courseMonth = month !== null && month !== undefined ? parseInt(month.toString()) : null;
    const courseEdition = edition !== null && edition !== undefined ? parseInt(edition.toString()) : null;

    // Buscar cursos con el mismo nombre y año (Firestore permite hasta 2 condiciones where)
    const coursesWithSameNameAndYear = await adminDb.collection("courses")
      .where("name", "==", name.trim())
      .where("year", "==", courseYear)
      .get();

    // Filtrar en memoria por mes y edición
    const existingCourses = coursesWithSameNameAndYear.docs.filter((doc) => {
      const data = doc.data();
      const docMonth = data.month !== undefined ? data.month : null;
      const docEdition = data.edition !== undefined ? data.edition : null;

      // Comparar mes (null === null es true)
      const monthMatches = courseMonth === docMonth;
      // Comparar edición (null === null es true)
      const editionMatches = courseEdition === docEdition;

      return monthMatches && editionMatches;
    });

    if (existingCourses.length > 0) {
      const existingDoc = existingCourses[0];
      const existingCourse = existingDoc.data();
      const existingId = existingDoc.id;

      // Construir mensaje descriptivo
      const monthText = courseMonth ? `, mes ${courseMonth}` : "";
      const editionText = courseEdition ? `, edición ${courseEdition}` : "";

      return NextResponse.json(
        {
          error: `Ya existe un curso con el mismo nombre, año${monthText}${editionText}. Curso existente: "${existingCourse.name}" (ID: ${existingId})`,
          existingCourseId: existingId,
          conflictDetails: {
            name: existingCourse.name,
            year: existingCourse.year,
            month: existingCourse.month,
            edition: existingCourse.edition
          }
        },
        { status: 400 }
      );
    }

    // NOTA: El código (ID) puede repetirse porque es solo nomenclatura
    // La unicidad se basa en: nombre + año + mes + edición
    // Sin embargo, el ID del documento en Firestore debe ser único
    // Si el ID ya existe, generar un ID único para el documento pero mantener el código en el campo
    // El código se guarda en el campo "id" del documento, y el ID del documento será único
    let finalDocId = id;
    let existingDoc = await adminDb.collection("courses").doc(finalDocId).get();

    // Si el documento ya existe, verificar si es duplicado exacto
    if (existingDoc.exists) {
      const existingCourse = existingDoc.data();
      const isDuplicate =
        existingCourse?.name === name.trim() &&
        existingCourse?.year === (year ? parseInt(year.toString()) : new Date().getFullYear()) &&
        (existingCourse?.month || null) === (month !== null && month !== undefined ? parseInt(month.toString()) : null) &&
        (existingCourse?.edition || null) === (edition !== null && edition !== undefined ? parseInt(edition.toString()) : null);

      if (isDuplicate) {
        return NextResponse.json(
          { error: "Ya existe un curso con esta combinación exacta de nombre, año, mes y edición." },
          { status: 400 }
        );
      }

      // Si no es duplicado exacto pero el ID existe, generar un ID único para el documento
      // usando un hash basado en nombre+año+mes+edición
      const courseYear = year ? parseInt(year.toString()) : new Date().getFullYear();
      const courseMonth = month !== null && month !== undefined ? parseInt(month.toString()) : null;
      const courseEdition = edition !== null && edition !== undefined ? parseInt(edition.toString()) : null;

      // Generar un ID único basado en la combinación
      const uniqueSuffix = `${courseYear}${courseMonth ? `-${courseMonth}` : ''}${courseEdition ? `-E${courseEdition}` : ''}`;
      finalDocId = `${id}-${uniqueSuffix}`;

      // Verificar que este nuevo ID no exista
      existingDoc = await adminDb.collection("courses").doc(finalDocId).get();
      if (existingDoc.exists) {
        // Si aún existe, agregar timestamp
        finalDocId = `${id}-${uniqueSuffix}-${Date.now()}`;
      }
    }

    // 4. Crear carpeta en Google Drive para el curso (organizada por año)
    const parentFolderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID;
    let driveFolderId: string | null = null;

    if (parentFolderId) {
      try {
        const courseYear = year ? parseInt(year.toString()) : new Date().getFullYear();

        // Paso 1: Obtener o crear la carpeta del año
        console.log("[CREATE-COURSE] Obteniendo o creando carpeta del año:", {
          year: courseYear,
          parentFolderId,
        });

        const yearFolderResult = await getOrCreateFolderInAppsScriptDrive({
          folderName: courseYear.toString(),
          parentFolderId,
        });

        if (!yearFolderResult.ok || !yearFolderResult.folderId) {
          console.error("[CREATE-COURSE] ⚠️ Error obteniendo/creando carpeta del año:", yearFolderResult.error);
          // Continuar sin carpeta del año, intentar crear directamente en la carpeta principal
        } else {
          const yearFolderId = yearFolderResult.folderId;
          console.log("[CREATE-COURSE] ✅ Carpeta del año:", {
            year: courseYear,
            folderId: yearFolderId,
            created: yearFolderResult.created,
          });

          // Paso 2: Crear la carpeta del curso dentro de la carpeta del año
          // Usar el código original (id) para el nombre de la carpeta, no el ID del documento
          const courseFolderName = `${id} - ${name.trim()}`;

          console.log("[CREATE-COURSE] Creando carpeta del curso:", {
            folderName: courseFolderName,
            parentFolderId: yearFolderId,
          });

          const courseFolderResult = await createFolderInAppsScriptDrive({
            folderName: courseFolderName,
            parentFolderId: yearFolderId,
          });

          if (courseFolderResult.ok && courseFolderResult.folderId) {
            driveFolderId = courseFolderResult.folderId;
            console.log("[CREATE-COURSE] ✅ Carpeta del curso creada:", driveFolderId);
          } else {
            console.error("[CREATE-COURSE] ⚠️ Error creando carpeta del curso:", courseFolderResult.error);
            // No fallar la creación del curso si falla la carpeta, solo loguear
          }
        }
      } catch (folderError) {
        console.error("[CREATE-COURSE] ⚠️ Error al crear carpetas:", folderError);
        // No fallar la creación del curso si falla la carpeta
      }
    } else {
      console.warn("[CREATE-COURSE] ⚠️ DRIVE_CERTIFICATES_FOLDER_ID no configurado, no se creará carpeta");
    }

    // IMPORTANTE: El código original se guarda en el campo "id" del documento
    // El ID del documento puede ser diferente si hay conflicto, pero el código se mantiene
    const courseData: Course = {
      id: id, // Código original que el usuario ingresó, sin modificaciones
      name: name.trim(),
      courseType: courseType as Course["courseType"],
      year: year ? parseInt(year.toString()) : new Date().getFullYear(),
      month: month ? parseInt(month.toString()) : null,
      edition: edition ? parseInt(edition.toString()) : null,
      origin: origin as Course["origin"],
      status,
      driveFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Usar finalDocId como ID del documento (puede ser diferente del código si hay conflicto)
    await adminDb.collection("courses").doc(finalDocId).set(courseData);

    console.log("Curso creado:", courseData);

    // Registrar en historial unificado
    await adminDb.collection("systemHistory").add({
      action: "created",
      entityType: "course",
      entityId: finalDocId, // ID del documento
      entityName: name.trim(),
      performedBy: currentUser.email,
      timestamp: new Date().toISOString(),
      details: {
        courseType,
        year: courseData.year,
        status,
      },
    });

    return NextResponse.json(courseData, {
      status: 201,
      headers: {
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "No tienes permisos para crear cursos" },
          { status: 403 }
        );
      }
    }

    logger.error("Error creando curso", error, { endpoint: "/api/courses", method: "POST" });
    return NextResponse.json(
      { error: "Error al crear el curso" },
      { status: 500 }
    );
  }
}

