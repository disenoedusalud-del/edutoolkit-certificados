import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { deleteFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[GET-COURSE] 🚀 Función GET llamada");
  console.log("[GET-COURSE] URL:", request.url);

  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    await requireRole("VIEWER");

    const resolvedParams = await params;
    const id = decodeURIComponent(resolvedParams.id);
    console.log("[GET-COURSE] ID del curso obtenido:", id);

    // Intentar buscar el curso por ID del documento
    let doc = await adminDb.collection("courses").doc(id).get();

    // Si no existe, intentar buscar por el campo "id" dentro del documento
    if (!doc.exists) {
      console.log("[GET-COURSE] Curso no encontrado por ID de documento, buscando por campo 'id'...");
      const coursesSnapshot = await adminDb.collection("courses")
        .where("id", "==", id)
        .limit(1)
        .get();

      if (!coursesSnapshot.empty) {
        doc = coursesSnapshot.docs[0];
        console.log("[GET-COURSE] Curso encontrado por campo 'id', ID del documento:", doc.id);
      }
    }

    if (!doc.exists) {
      console.log("[GET-COURSE] ❌ Curso no encontrado con ID:", id);
      // Listar algunos IDs disponibles para debugging
      const allCourses = await adminDb.collection("courses").limit(5).get();
      const availableIds = allCourses.docs.map(d => ({ docId: d.id, courseId: d.data().id }));
      console.log("[GET-COURSE] IDs disponibles (primeros 5):", availableIds);

      return NextResponse.json(
        {
          error: "Curso no encontrado",
          requestedId: id,
          hint: "Verifica que el ID del curso sea correcto"
        },
        { status: 404 }
      );
    }

    // Contar certificados asociados (si se solicita)
    const { searchParams } = new URL(request.url);
    const includeCertificateCount = searchParams.get("includeCertificateCount") === "true";

    let certificateCount = 0;
    if (includeCertificateCount) {
      const certificatesSnapshot = await adminDb
        .collection("certificates")
        .get();

      certificateCount = certificatesSnapshot.docs.filter((certDoc) => {
        const certData = certDoc.data();
        const certCourseId = certData.courseId || "";
        return certCourseId.startsWith(id + "-");
      }).length;
    }

    const data = {
      id: doc.id,
      ...doc.data(),
      ...(includeCertificateCount && { certificateCount })
    } as Course;

    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("[COURSE-GET] Error obteniendo curso:", error);
    return NextResponse.json(
      { error: "Error al obtener el curso" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const currentUser = await requireRole("ADMIN");
    const resolvedParams = await params;
    const id = decodeURIComponent(resolvedParams.id);
    const body = await request.json();

    const docRef = adminDb.collection("courses").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    // Campos permitidos a actualizar de forma simplificada
    const allowedFields: (keyof Course)[] = [
      "name",
      "courseType",
      "year",
      "month",
      "edition",
      "origin",
      "status",
    ];

    const updateData: Partial<Course> = {
      updatedAt: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const value = (body as any)[field];
        if (value !== undefined) {
          (updateData as any)[field] = value;
        }
      }
    }

    await docRef.update(updateData);

    const updated = await docRef.get();
    const data = { id: updated.id, ...updated.data() } as Course;

    await adminDb.collection("systemHistory").add({
      action: "updated",
      entityType: "course",
      entityId: id,
      entityName: data.name || id,
      performedBy: currentUser.email,
      timestamp: new Date().toISOString(),
      details: {
        changes: updateData,
        simplified: true,
      },
    });

    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("[COURSE-PUT] Error actualizando curso:", error);
    return NextResponse.json(
      { error: "Error al actualizar el curso" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DELETE-COURSE] 🚀 Función DELETE llamada");
  console.log("[DELETE-COURSE] URL completa:", request.url);
  console.log("[DELETE-COURSE] Método:", request.method);
  console.log("[DELETE-COURSE] Headers:", Object.fromEntries(request.headers.entries()));

  let id: string | undefined;
  try {
    console.log("[DELETE-COURSE] Resolviendo parámetros...");
    const resolvedParams = await params;
    id = resolvedParams.id;
    // Decodificar el ID en caso de que esté codificado
    id = decodeURIComponent(id);
    console.log("[DELETE-COURSE] ID del curso obtenido (decodificado):", id);

    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      console.log("[DELETE-COURSE] ❌ Rate limit excedido");
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    console.log("[DELETE-COURSE] Verificando permisos...");
    const currentUser = await requireRole("ADMIN");
    console.log("[DELETE-COURSE] Usuario autenticado:", currentUser.email, "Rol:", currentUser.role);

    console.log("[DELETE-COURSE] Intentando eliminar curso:", id);

    // Intentar buscar el curso por ID del documento
    let doc = await adminDb.collection("courses").doc(id).get();

    // Si no existe, intentar buscar por el campo "id" dentro del documento
    if (!doc.exists) {
      console.log("[DELETE-COURSE] Curso no encontrado por ID de documento, buscando por campo 'id'...");
      const coursesSnapshot = await adminDb.collection("courses")
        .where("id", "==", id)
        .limit(1)
        .get();

      if (!coursesSnapshot.empty) {
        doc = coursesSnapshot.docs[0];
        console.log("[DELETE-COURSE] Curso encontrado por campo 'id', ID del documento:", doc.id);
        // Actualizar el id para usar el ID del documento real
        id = doc.id;
      }
    }

    if (!doc.exists) {
      console.log("[DELETE-COURSE] ❌ Curso no encontrado con ID:", id);
      // Listar algunos IDs disponibles para debugging
      const allCourses = await adminDb.collection("courses").limit(5).get();
      const availableIds = allCourses.docs.map(d => ({ docId: d.id, courseId: d.data().id }));
      console.log("[DELETE-COURSE] IDs disponibles (primeros 5):", availableIds);

      return NextResponse.json(
        {
          error: "Curso no encontrado",
          requestedId: id,
          hint: "Verifica que el ID del curso sea correcto"
        },
        { status: 404 }
      );
    }

    const courseData = doc.data();
    console.log("[DELETE-COURSE] Curso encontrado:", {
      id,
      name: courseData?.name,
      courseId: courseData?.id
    });

    // IMPORTANTE: NO eliminar certificados automáticamente
    // La relación entre cursos y certificados no es directa y puede causar eliminaciones incorrectas
    // Los certificados se relacionan con cursos a través del courseId que se genera dinámicamente
    // Eliminar certificados aquí podría eliminar certificados de otros cursos relacionados

    // Buscar certificados que podrían estar relacionados (solo para información)
    // Usar el ID exacto del curso como prefijo, no solo el código base
    const courseYear = courseData?.year || new Date().getFullYear();
    const courseCode = id.split("-")[0]; // Código base del curso

    console.log("[DELETE-COURSE] Buscando certificados potencialmente relacionados:", {
      courseId: id,
      courseCode,
      courseYear
    });

    // Buscar certificados que empiecen con el código del curso y el año
    // Esto es más específico que solo el código base
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .get();

    // Filtrar certificados que coincidan con el patrón del curso específico
    // Solo certificados que empiecen con el código del curso seguido del año
    const associatedCertificates = certificatesSnapshot.docs.filter((certDoc) => {
      const certData = certDoc.data();
      const certCourseId = certData.courseId || "";

      // Patrón más específico: debe empezar con el código del curso seguido de guión y año
      // Ejemplo: si curso es "NAEF" y año es 2025, buscar "NAEF-2025-"
      const pattern = new RegExp(`^${courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${courseYear}-`);
      const matches = pattern.test(certCourseId);

      if (matches) {
        console.log("[DELETE-COURSE] Certificado potencialmente relacionado encontrado:", {
          certId: certDoc.id,
          certCourseId,
          courseId: id
        });
      }
      return matches;
    });

    const certificateCount = associatedCertificates.length;

    if (certificateCount > 0) {
      console.log(`[DELETE-COURSE] 🗑️ Eliminando ${certificateCount} certificado(s) asociados...`);
      const batch = adminDb.batch();
      associatedCertificates.forEach((certDoc) => {
        batch.delete(certDoc.ref);
      });
      await batch.commit();
      console.log(`[DELETE-COURSE] ✅ Certificados eliminados de la base de datos.`);
    }

    // Obtener datos del curso antes de eliminar para el historial
    const courseName = courseData?.name || id;
    const driveFolderId = courseData?.driveFolderId;

    console.log(`[DELETE-COURSE] 📁 Información de carpeta Drive:`, {
      driveFolderId: driveFolderId || "NO HAY",
      courseName: courseName,
      courseId: id
    });

    // Resultados de la eliminación de Drive para incluir en la respuesta
    let driveDeletionResult = {
      attempted: false,
      success: false,
      folderId: driveFolderId || null,
      error: null as string | null
    };

    // Eliminar la carpeta de Google Drive si existe
    if (driveFolderId) {
      driveDeletionResult.attempted = true;
      console.log(`[DELETE-COURSE] 🗑️ Intentando eliminar carpeta de Drive: ${driveFolderId}`);
      try {
        const deleteResult = await deleteFolderInAppsScriptDrive({
          folderId: driveFolderId,
        });

        console.log(`[DELETE-COURSE] 📋 Resultado de eliminación:`, deleteResult);

        if (deleteResult.ok) {
          driveDeletionResult.success = true;
          console.log(`[DELETE-COURSE] ✅ Carpeta de Drive eliminada correctamente: ${driveFolderId}`);
        } else {
          driveDeletionResult.success = false;
          driveDeletionResult.error = deleteResult.error || "Error desconocido";
          console.error(`[DELETE-COURSE] ❌ Error eliminando carpeta de Drive:`, {
            folderId: driveFolderId,
            error: deleteResult.error
          });
          // No fallar la eliminación del curso si falla la eliminación de la carpeta
        }
      } catch (driveError) {
        driveDeletionResult.success = false;
        driveDeletionResult.error = driveError instanceof Error ? driveError.message : String(driveError);
        console.error(`[DELETE-COURSE] ❌ Excepción al intentar eliminar carpeta de Drive:`, {
          folderId: driveFolderId,
          error: driveDeletionResult.error,
          stack: driveError instanceof Error ? driveError.stack : undefined
        });
        // No fallar la eliminación del curso si falla la eliminación de la carpeta
      }
    } else {
      console.log(`[DELETE-COURSE] ⚠️ No hay carpeta de Drive asociada al curso (driveFolderId es null/undefined)`);
    }

    // Eliminar el curso
    await adminDb.collection("courses").doc(id).delete();

    console.log(`[DELETE-COURSE] ✅ Curso ${id} eliminado`);

    // Registrar en historial unificado
    await adminDb.collection("systemHistory").add({
      action: "deleted",
      entityType: "course",
      entityId: id,
      entityName: courseName,
      performedBy: currentUser.email,
      timestamp: new Date().toISOString(),
      details: {
        deletedCertificates: certificateCount,
        courseType: courseData?.courseType,
        year: courseData?.year,
        driveFolderDeletion: driveDeletionResult
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Curso eliminado correctamente",
        relatedCertificates: certificateCount,
        driveDeletion: driveDeletionResult,
        note: certificateCount > 0
          ? `Se encontraron ${certificateCount} certificado(s) relacionados que NO fueron eliminados. Elimínalos manualmente si es necesario.`
          : undefined
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        console.log("[DELETE-COURSE] ❌ No autenticado");
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        console.log("[DELETE-COURSE] ❌ Permisos insuficientes");
        return NextResponse.json(
          { error: "No tienes permisos para eliminar cursos. Solo ADMIN puede eliminar cursos." },
          { status: 403 }
        );
      }
    }

    // Log detallado del error
    console.error("[DELETE-COURSE] ❌ Error eliminando curso:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      courseId: id || "unknown",
    });

    const errorMessage = error instanceof Error
      ? `Error al eliminar el curso: ${error.message}`
      : "Error al eliminar el curso";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

