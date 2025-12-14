import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateCourse, validationErrorResponse } from "@/lib/validation";
import { getOrCreateFolderInAppsScriptDrive, createFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";
import type { Query, DocumentData } from "firebase-admin/firestore";

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

    // 3. Obtener cursos
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "active" | "archived" | null (todos)

    const coursesRef = adminDb.collection("courses");
    let query: Query<DocumentData> = coursesRef as Query<DocumentData>;

    // Filtrar por estado si se especifica
    if (status === "active" || status === "archived") {
      query = query.where("status", "==", status);
    }

    // Intentar ordenar por nombre, pero si falla (por falta de índice), obtener sin ordenar
    try {
      query = query.orderBy("name", "asc");
      const snapshot = await query.get();
      const data: CourseRow[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CourseRow));
      return NextResponse.json(Array.isArray(data) ? data : []);
    } catch (orderError: any) {
      // Si falla el ordenamiento (probablemente falta índice), obtener sin ordenar
      console.warn("No se pudo ordenar cursos, obteniendo sin orden:", orderError.message);
      
      // Reconstruir la query con el filtro pero sin orderBy
      let queryWithoutOrder: Query<DocumentData> = coursesRef as Query<DocumentData>;
      if (status === "active" || status === "archived") {
        queryWithoutOrder = queryWithoutOrder.where("status", "==", status);
      }
      
      const snapshot = await queryWithoutOrder.get();
      const data: CourseRow[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CourseRow));
      
      console.log("Cursos obtenidos (sin orden):", data.length, "Filtro status:", status);
      
      // Filtrar por status en memoria si es necesario (por si acaso)
      let filteredData: CourseRow[] = data;
      if (status === "active" || status === "archived") {
        filteredData = data.filter((course: CourseRow) => {
          const courseStatus = course.status || "active"; // Default a active si no tiene status
          return courseStatus === status;
        });
        console.log("Cursos filtrados por status:", filteredData.length);
      }
      
      // Ordenar manualmente en memoria
      const sortedData: CourseRow[] = Array.isArray(filteredData) 
        ? filteredData.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        : [];
      
      console.log("Cursos finales:", sortedData.length);
      return NextResponse.json(sortedData, {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
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

    console.error("Error fetching courses:", error);
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
    await requireRole("ADMIN");

    // 3. Validar entrada
    const body = await request.json();
    const validation = validateCourse(body);
    
    if (!validation.valid) {
      return validationErrorResponse(validation.errors);
    }

    const { id, name, courseType = "Curso", year, edition = null, origin = "nuevo", status = "active" } = body;

    // Verificar que no exista un curso con el mismo código
    const existingDoc = await adminDb.collection("courses").doc(id).get();
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: "Ya existe un curso con este código" },
        { status: 400 }
      );
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

    const courseData: Course = {
      id,
      name: name.trim(),
      courseType: courseType as Course["courseType"],
      year: year ? parseInt(year.toString()) : new Date().getFullYear(),
      edition: edition ? parseInt(edition.toString()) : null,
      origin: origin as Course["origin"],
      status,
      driveFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection("courses").doc(id).set(courseData);
    
    console.log("Curso creado:", courseData);

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

    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Error al crear el curso" },
      { status: 500 }
    );
  }
}

