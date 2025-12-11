import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { Course } from "@/types/Course";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    const data = { id: doc.id, ...doc.data() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Error al obtener el curso" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oldId } = await params;
    const body = await request.json();
    const { name, courseType, edition, status, newId } = body;

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
        edition: edition !== undefined ? (edition ? parseInt(edition.toString()) : null) : (oldDoc.data()?.edition || null),
        status: status || oldDoc.data()?.status || "active",
        createdAt: oldDoc.data()?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Guardar con el nuevo ID
      await adminDb.collection("courses").doc(newId).set(courseData);

      // Eliminar el documento antiguo
      await adminDb.collection("courses").doc(oldId).delete();

      return NextResponse.json(courseData);
    } else {
      // Solo actualizar nombre, tipo y/o estado
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
      if (edition !== undefined) {
        updateData.edition = edition ? parseInt(edition.toString()) : null;
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

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Error al actualizar el curso" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    // En lugar de eliminar, archivar el curso
    await adminDb.collection("courses").doc(id).update({
      status: "archived",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Curso archivado" });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Error al archivar el curso" },
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

