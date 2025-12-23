import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

// Versión simplificada y sintácticamente segura del handler de cursos individuales.
// Mantiene:
// - GET: obtener un curso por id.
// - PUT: actualizar campos básicos de un curso existente.
// No incluye (de momento) la lógica avanzada de:
// - renombrar carpeta en Drive
// - mover documentos por combinación código + edición + año
// Eso se puede re-incorporar luego, pero ahora priorizamos que el build pase
// y que la app vuelva a estar operativa en Vercel.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    await requireRole("VIEWER");

    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    const data = { id: doc.id, ...doc.data() } as Course;

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
    const { id } = await params;
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
    console.error("[COURSE-PUT] Error actualizando curso (simplificado):", error);
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
  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const currentUser = await requireRole("ADMIN");
    const { id } = await params;
    
    console.log("[DELETE-COURSE] Intentando eliminar curso:", id);
    
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      console.log("[DELETE-COURSE] ❌ Curso no encontrado:", id);
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    const courseData = doc.data();
    console.log("[DELETE-COURSE] Curso encontrado:", {
      id,
      name: courseData?.name,
      courseId: courseData?.id
    });

    // Contar certificados asociados al curso
    // El ID del curso puede ser "NAEF-2-2019" o "NAEF", necesitamos extraer el código base
    const baseCode = id.split("-")[0]; // Extraer solo el código base (ej: "NAEF" de "NAEF-2-2019")
    console.log("[DELETE-COURSE] Buscando certificados con código base:", baseCode);
    
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .get();

    const associatedCertificates = certificatesSnapshot.docs.filter((certDoc) => {
      const certData = certDoc.data();
      const certCourseId = certData.courseId || "";
      // Verificar si el courseId del certificado empieza con el código base del curso
      const matches = certCourseId.startsWith(baseCode + "-");
      if (matches) {
        console.log("[DELETE-COURSE] Certificado asociado encontrado:", certCourseId);
      }
      return matches;
    });

    const certificateCount = associatedCertificates.length;

    // Eliminar todos los certificados asociados
    if (certificateCount > 0) {
      console.log(`[DELETE-COURSE] Eliminando ${certificateCount} certificados asociados al curso ${id}`);
      
      const batch = adminDb.batch();
      associatedCertificates.forEach((certDoc) => {
        batch.delete(certDoc.ref);
      });
      await batch.commit();
      
      console.log(`[DELETE-COURSE] ✅ ${certificateCount} certificados eliminados`);
    }

    // Obtener datos del curso antes de eliminar para el historial (courseData ya está definido arriba)
    const courseName = courseData?.name || id;

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
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Curso eliminado correctamente",
        deletedCertificates: certificateCount
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
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "No tienes permisos para eliminar cursos. Solo ADMIN puede eliminar cursos." },
          { status: 403 }
        );
      }
    }

    console.error("[COURSE-DELETE] Error eliminando curso:", error);
    return NextResponse.json(
      { error: "Error al eliminar el curso" },
      { status: 500 }
    );
  }
}


