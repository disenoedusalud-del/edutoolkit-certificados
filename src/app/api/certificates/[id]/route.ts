import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { Certificate } from "@/types/Certificate";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await adminDb.collection("certificates").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    const data = { id: doc.id, ...doc.data() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching certificate:", error);
    return NextResponse.json(
      { error: "Error al obtener el certificado" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar que el documento existe
    const doc = await adminDb.collection("certificates").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    // Validar campos requeridos
    if (!body.fullName || !body.courseName || !body.courseId || !body.courseType || !body.year) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Preparar datos de actualización, asegurando que los campos opcionales se manejen correctamente
    // Si un campo viene como string vacío, convertirlo a null explícitamente
    const processField = (value: any): any => {
      if (value === "" || value === undefined) return null;
      return value;
    };

    const updateData: Partial<Certificate> = {
      fullName: body.fullName,
      courseName: body.courseName,
      courseId: body.courseId,
      courseType: body.courseType,
      year: body.year,
      origin: body.origin || "nuevo",
      deliveryStatus: body.deliveryStatus || "en_archivo",
      contactSource: body.contactSource || "ninguno",
      email: processField(body.email),
      phone: processField(body.phone),
      driveFileId: processField(body.driveFileId),
      deliveryDate: processField(body.deliveryDate),
      deliveredTo: processField(body.deliveredTo),
      physicalLocation: processField(body.physicalLocation),
      folioCode: processField(body.folioCode),
      emailSent: body.emailSent !== undefined ? body.emailSent : false,
      whatsappSent: body.whatsappSent !== undefined ? body.whatsappSent : false,
      marketingConsent: body.marketingConsent !== undefined ? body.marketingConsent : false,
      updatedAt: new Date().toISOString(),
    };

    console.log("Actualizando certificado:", {
      id,
      driveFileId: {
        recibido: body.driveFileId,
        procesado: updateData.driveFileId,
      },
      updateData,
    });

    // Usar set con merge: true para asegurar que los valores null se guarden correctamente
    await adminDb.collection("certificates").doc(id).set(updateData, { merge: true });

    const updatedDoc = await adminDb.collection("certificates").doc(id).get();
    const data = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating certificate:", error);
    return NextResponse.json(
      { error: "Error al actualizar el certificado" },
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
    const doc = await adminDb.collection("certificates").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    await adminDb.collection("certificates").doc(id).delete();

    return NextResponse.json({ success: true, message: "Certificado eliminado" });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    return NextResponse.json(
      { error: "Error al eliminar el certificado" },
      { status: 500 }
    );
  }
}
