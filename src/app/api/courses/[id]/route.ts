import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar autenticación (VIEWER puede leer)
    await requireRole("VIEWER");

    // 3. Obtener curso
    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    // 4. Contar certificados asociados (si se solicita)
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
    };
    
    return NextResponse.json(data, {
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
          { error: "No tienes permisos para realizar esta acción" },
          { status: 403 }
        );
      }
    }

    console.error("Error fetching course:", error);
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
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (ADMIN o superior puede editar cursos)
    await requireRole("ADMIN");

    // 3. Obtener datos
    const { id: oldId } = await params;
    const body = await request.json();
    const { name, courseType, year, edition, origin, status, newId } = body;

    // Verificar que el curso existe
    const oldDoc = await adminDb.collection("courses").doc(oldId).get();
    if (!oldDoc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    const updateData: Partial<Course> = {
      updatedAt: new Date().toISOString(),
    };

    // Si se está cambiando el código
    if (newId && newId !== oldId) {
      // Validar formato del nuevo código
      const codeRegex = /^[A-Z]{1,20}$/;
      if (!codeRegex.test(newId)) {
        return NextResponse.json(
          { error: "El código debe tener 1-20 letras mayúsculas (A-Z)" },
          { status: 400 }
        );
      }

      // Verificar que el nuevo código no exista
      const existingDoc = await adminDb.collection("courses").doc(newId).get();
      if (existingDoc.exists) {
        return NextResponse.json(
          { error: "Ya existe un curso con este código" },
          { status: 400 }
        );
      }

      // Actualizar todos los certificados que usan el código antiguo
      await updateCertificatesWithNewCourseCode(oldId, newId);

      // Crear el documento con el nuevo ID
      const courseData: Course = {
        id: newId,
        name: name || oldDoc.data()?.name,
        courseType: courseType || oldDoc.data()?.courseType || "Curso",
        year: year !== undefined ? parseInt(year.toString()) : (oldDoc.data()?.year || new Date().getFullYear()),
        edition: edition !== undefined ? (edition ? parseInt(edition.toString()) : null) : (oldDoc.data()?.edition || null),
        origin: origin !== undefined ? origin : (oldDoc.data()?.origin || "nuevo"),
        status: status || oldDoc.data()?.status || "active",
        createdAt: oldDoc.data()?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Guardar con el nuevo ID
      await adminDb.collection("courses").doc(newId).set(courseData);

      // Eliminar el documento antiguo
      await adminDb.collection("courses").doc(oldId).delete();

      return NextResponse.json(courseData, {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
    } else {
      // Solo actualizar nombre, tipo, año, origen y/o estado
      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (courseType !== undefined) {
        const validCourseTypes = ["Curso", "Diplomado", "Webinar", "Taller", "Seminario"];
        if (!validCourseTypes.includes(courseType)) {
          return NextResponse.json(
            { error: "El tipo de curso no es válido" },
            { status: 400 }
          );
        }
        updateData.courseType = courseType as Course["courseType"];
      }
      if (year !== undefined) {
        updateData.year = parseInt(year.toString());
      }
      if (edition !== undefined) {
        updateData.edition = edition ? parseInt(edition.toString()) : null;
      }
      if (origin !== undefined) {
        if (origin !== "historico" && origin !== "nuevo") {
          return NextResponse.json(
            { error: "El origen debe ser 'historico' o 'nuevo'" },
            { status: 400 }
          );
        }
        updateData.origin = origin as Course["origin"];
      }
      if (status !== undefined) {
        if (status !== "active" && status !== "archived") {
          return NextResponse.json(
            { error: "El estado debe ser 'active' o 'archived'" },
            { status: 400 }
          );
        }
        updateData.status = status;
      }

      await adminDb.collection("courses").doc(oldId).update(updateData);

      const updatedDoc = await adminDb.collection("courses").doc(oldId).get();
      const data = { id: updatedDoc.id, ...updatedDoc.data() };

      return NextResponse.json(data, {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
    }
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
          { error: "No tienes permisos para editar cursos" },
          { status: 403 }
        );
      }
    }

    console.error("Error updating course:", error);
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
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (MASTER_ADMIN puede eliminar cursos)
    await requireRole("MASTER_ADMIN");

    // 3. Obtener curso
    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    // 4. Contar certificados asociados al curso
    // El courseId de los certificados tiene formato "CODIGO-AÑO-NUMERO" (ej: "LM-2025-01")
    // Buscamos todos los certificados que empiecen con el código del curso
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .get();

    const associatedCertificates = certificatesSnapshot.docs.filter((certDoc) => {
      const certData = certDoc.data();
      const certCourseId = certData.courseId || "";
      // Verificar si el courseId del certificado empieza con el código del curso
      return certCourseId.startsWith(id + "-");
    });

    const certificateCount = associatedCertificates.length;

    // 5. Eliminar todos los certificados asociados
    if (certificateCount > 0) {
      console.log(`[DELETE-COURSE] Eliminando ${certificateCount} certificados asociados al curso ${id}`);
      
      const batch = adminDb.batch();
      associatedCertificates.forEach((certDoc) => {
        batch.delete(certDoc.ref);
      });
      await batch.commit();
      
      console.log(`[DELETE-COURSE] ✅ ${certificateCount} certificados eliminados`);
    }

    // 6. Eliminar el curso
    await adminDb.collection("courses").doc(id).delete();

    console.log(`[DELETE-COURSE] ✅ Curso ${id} eliminado`);

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
          { error: "No tienes permisos para eliminar cursos. Solo MASTER_ADMIN puede eliminar cursos." },
          { status: 403 }
        );
      }
    }

    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Error al eliminar el curso" },
      { status: 500 }
    );
  }
}

/**
 * Actualiza todos los certificados que usan un código de curso antiguo
 * Actualiza: courseId, folioCode y cualquier referencia al código
 */
async function updateCertificatesWithNewCourseCode(
  oldCode: string,
  newCode: string
) {
  try {
    // Buscar todos los certificados que contengan el código antiguo
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .get();

    const batch = adminDb.batch();
    let updateCount = 0;

    certificatesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Actualizar courseId si contiene el código antiguo
      if (data.courseId && typeof data.courseId === "string") {
        if (data.courseId.startsWith(oldCode + "-")) {
          updates.courseId = data.courseId.replace(
            new RegExp(`^${oldCode}-`),
            `${newCode}-`
          );
          needsUpdate = true;
        }
      }

      // Actualizar folioCode si contiene el código antiguo
      if (data.folioCode && typeof data.folioCode === "string") {
        if (data.folioCode.startsWith(oldCode + "-")) {
          updates.folioCode = data.folioCode.replace(
            new RegExp(`^${oldCode}-`),
            `${newCode}-`
          );
          needsUpdate = true;
        }
      }

      // Actualizar courseName si coincide exactamente con el código antiguo
      // (esto es menos común, pero por si acaso)
      if (data.courseName === oldCode) {
        updates.courseName = newCode;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.updatedAt = new Date().toISOString();
        batch.update(doc.ref, updates);
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(
        `Actualizados ${updateCount} certificados: ${oldCode} → ${newCode}`
      );
    }

    return updateCount;
  } catch (error) {
    console.error("Error updating certificates:", error);
    throw error;
  }
}

