import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { renameFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";

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
    const currentUser = await requireRole("ADMIN");

    // 3. Obtener datos
    const { id: oldId } = await params;
    const body = await request.json();
    const { name, courseType, year, month, edition, origin, status, newId } = body;

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
          { error: "El código debe tener 1-20 caracteres (solo letras mayúsculas)" },
          { status: 400 }
        );
      }

      // Calcular el nuevo documento ID (código + edición + año)
      const finalYear = year !== undefined ? parseInt(year.toString()) : (oldDoc.data()?.year || new Date().getFullYear());
      const finalEdition = edition !== undefined ? (edition ? parseInt(edition.toString()) : null) : (oldDoc.data()?.edition ?? null);
      const newDocumentId = finalEdition !== null 
        ? `${newId}-${finalEdition}-${finalYear}` 
        : `${newId}-${finalYear}`;

      // Verificar que no exista un curso con el mismo código + edición + año
      const existingDoc = await adminDb.collection("courses").doc(newDocumentId).get();
      if (existingDoc.exists && newDocumentId !== oldId) {
        return NextResponse.json(
          { error: `Ya existe un curso con el código "${newId}", edición ${finalEdition === null ? "sin edición" : finalEdition} y año ${finalYear}. La combinación código + edición + año debe ser única.` },
          { status: 400 }
        );
      }

      // Actualizar todos los certificados que usan el código antiguo
      await updateCertificatesWithNewCourseCode(oldId, newId);

      // Crear el documento con el nuevo ID
      const courseData: Course = {
        id: newId, // El código corto (sin edición)
        name: name || oldDoc.data()?.name,
        courseType: courseType || oldDoc.data()?.courseType || "Curso",
        year: year !== undefined ? parseInt(year.toString()) : (oldDoc.data()?.year || new Date().getFullYear()),
        month: month !== undefined ? (month ? parseInt(month.toString()) : null) : (oldDoc.data()?.month || null),
        edition: finalEdition,
        origin: origin !== undefined ? origin : (oldDoc.data()?.origin || "nuevo"),
        status: status || oldDoc.data()?.status || "active",
        createdAt: oldDoc.data()?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Guardar con el nuevo documento ID compuesto
      await adminDb.collection("courses").doc(newDocumentId).set(courseData);

      // Eliminar el documento antiguo si el documento ID cambió
      if (oldId !== newDocumentId) {
        await adminDb.collection("courses").doc(oldId).delete();
      }

      // Registrar en historial unificado
      await adminDb.collection("systemHistory").add({
        action: "updated",
        entityType: "course",
        entityId: newId,
        entityName: courseData.name,
        performedBy: currentUser.email,
        timestamp: new Date().toISOString(),
        details: {
          oldId,
          newId,
          courseType: courseData.courseType,
          year: courseData.year,
          status: courseData.status,
        },
      });

      return NextResponse.json(courseData, {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
    } else {
      // Solo actualizar nombre, tipo, año, origen y/o estado
      const oldData = oldDoc.data() as Course;
      const oldName = oldData.name;
      const oldEdition = oldData.edition ?? null;
      
      // Extraer el código base del curso (el campo `id` del documento, no el documento ID)
      // El documento ID puede ser "NAEF-2024" o "NAEF-1-2024", pero el campo `id` siempre es solo el código
      const baseCode = oldData.id || oldId.split("-")[0];
      const oldYear = oldData.year || new Date().getFullYear();
      
      // Calcular el nuevo año y edición
      const newYear = year !== undefined ? parseInt(year.toString()) : oldYear;
      const newEdition = edition !== undefined ? (edition ? parseInt(edition.toString()) : null) : oldEdition;
      
      // Calcular el nuevo documento ID (código + edición + año)
      const newDocumentId = newEdition !== null 
        ? `${baseCode}-${newEdition}-${newYear}` 
        : `${baseCode}-${newYear}`;
      
      // Si la edición o el año cambió, verificar que no exista otro curso con la misma combinación
      if ((edition !== undefined && newEdition !== oldEdition) || (year !== undefined && newYear !== oldYear)) {
        const checkDocumentId = newEdition !== null 
          ? `${baseCode}-${newEdition}-${newYear}` 
          : `${baseCode}-${newYear}`;
        
        // Verificar que no exista otro curso con el mismo código + edición + año
        const existingDoc = await adminDb.collection("courses").doc(checkDocumentId).get();
        if (existingDoc.exists && checkDocumentId !== oldId) {
          return NextResponse.json(
            { error: `Ya existe un curso con el código "${baseCode}", edición ${newEdition === null ? "sin edición" : newEdition} y año ${newYear}. La combinación código + edición + año debe ser única.` },
            { status: 400 }
          );
        }
      }
      
      if (name !== undefined) {
        updateData.name = name.trim();
        
        // Si el nombre cambió, actualizar todos los certificados relacionados
        if (name.trim() !== oldName) {
          await updateCertificatesWithNewCourseName(oldId, name.trim());
        }
        
        // Si el nombre cambió y hay una carpeta de Drive, renombrarla
        if (name.trim() !== oldName && oldData.driveFolderId) {
          try {
            const newFolderName = `${oldId} - ${name.trim()}`;
            console.log("[UPDATE-COURSE] Renombrando carpeta de Drive:", {
              folderId: oldData.driveFolderId,
              oldName: `${oldId} - ${oldName}`,
              newName: newFolderName,
            });
            
            const renameResult = await renameFolderInAppsScriptDrive({
              folderId: oldData.driveFolderId,
              newName: newFolderName,
            });
            
            if (!renameResult.ok) {
              console.error("[UPDATE-COURSE] ⚠️ Error renombrando carpeta:", renameResult.error);
              // No fallar la actualización del curso si falla el renombrado de la carpeta
            } else {
              console.log("[UPDATE-COURSE] ✅ Carpeta renombrada correctamente");
            }
          } catch (folderError) {
            console.error("[UPDATE-COURSE] ⚠️ Error al renombrar carpeta:", folderError);
            // No fallar la actualización del curso si falla el renombrado de la carpeta
          }
        }
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
        
        // Si el tipo de curso cambió, actualizar todos los certificados relacionados
        if (courseType !== oldData.courseType) {
          await updateCertificatesWithNewCourseType(oldId, courseType as Course["courseType"]);
        }
      }
      if (year !== undefined) {
        updateData.year = parseInt(year.toString());
      }
      if (month !== undefined) {
        updateData.month = month ? parseInt(month.toString()) : null;
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

      // Si la edición o el año cambió, mover el documento al nuevo ID
      if (((edition !== undefined && newEdition !== oldEdition) || (year !== undefined && newYear !== oldYear)) && newDocumentId !== oldId) {
        // Obtener todos los datos actuales
        const currentData = oldDoc.data() as Course;
        const fullData: Course = {
          ...currentData,
          ...updateData,
        };
        
        // Crear el documento con el nuevo ID
        await adminDb.collection("courses").doc(newDocumentId).set(fullData);
        
        // Eliminar el documento antiguo
        await adminDb.collection("courses").doc(oldId).delete();
        
        const data = { id: newDocumentId, ...fullData } as Course;
        
        // Registrar en historial unificado
        await adminDb.collection("systemHistory").add({
          action: "updated",
          entityType: "course",
          entityId: newDocumentId,
          entityName: data.name || newDocumentId,
          performedBy: currentUser.email,
          timestamp: new Date().toISOString(),
          details: {
            oldId,
            newId: newDocumentId,
            changes: updateData,
          },
        });
        
        return NextResponse.json(data, {
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        });
      } else {
        // Si no cambió la edición ni el año, actualizar normalmente
        await adminDb.collection("courses").doc(oldId).update(updateData);

        const updatedDoc = await adminDb.collection("courses").doc(oldId).get();
        const data = { id: updatedDoc.id, ...updatedDoc.data() } as Course;

        // Registrar en historial unificado
        await adminDb.collection("systemHistory").add({
          action: "updated",
          entityType: "course",
          entityId: oldId,
          entityName: data.name || oldId,
          performedBy: currentUser.email,
          timestamp: new Date().toISOString(),
          details: {
            changes: updateData,
          },
        });

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
    const currentUser = await requireRole("MASTER_ADMIN");

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

    // 6. Obtener datos del curso antes de eliminar para el historial
    const courseData = doc.data();
    const courseName = courseData?.name || id;

    // 7. Eliminar el curso
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
 * Actualiza el nombre del curso en todos los certificados relacionados
 */
async function updateCertificatesWithNewCourseName(
  courseCode: string,
  newCourseName: string
): Promise<number> {
  try {
    // Buscar todos los certificados que usen este código de curso
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .get();

    const batch = adminDb.batch();
    let updateCount = 0;

    certificatesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Actualizar courseName si el courseId empieza con el código del curso
      if (data.courseId && typeof data.courseId === "string") {
        if (data.courseId.startsWith(courseCode + "-")) {
          updates.courseName = newCourseName;
          needsUpdate = true;
        }
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
        `[UPDATE-COURSE] Actualizados ${updateCount} certificados con nuevo nombre: "${newCourseName}"`
      );
    }

    return updateCount;
  } catch (error) {
    console.error("[UPDATE-COURSE] Error actualizando nombres en certificados:", error);
    throw error;
  }
}

/**
 * Actualiza el tipo de curso en todos los certificados relacionados
 */
async function updateCertificatesWithNewCourseType(
  courseCode: string,
  newCourseType: Course["courseType"]
): Promise<number> {
  try {
    // Buscar todos los certificados que usen este código de curso
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .get();

    const batch = adminDb.batch();
    let updateCount = 0;

    certificatesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      // Actualizar courseType si el courseId empieza con el código del curso
      if (data.courseId && typeof data.courseId === "string") {
        if (data.courseId.startsWith(courseCode + "-")) {
          updates.courseType = newCourseType;
          needsUpdate = true;
        }
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
        `[UPDATE-COURSE] Actualizados ${updateCount} certificados con nuevo tipo: "${newCourseType}"`
      );
    }

    return updateCount;
  } catch (error) {
    console.error("[UPDATE-COURSE] Error actualizando tipos en certificados:", error);
    throw error;
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

