import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Certificate } from "@/types/Certificate";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateCertificate, validationErrorResponse } from "@/lib/validation";

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

    // 3. Obtener certificado
    const { id } = await params;
    const doc = await adminDb.collection("certificates").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    const data = { id: doc.id, ...doc.data() };
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

    console.error("Error fetching certificate:", error);
    return NextResponse.json(
      { error: "Error al obtener el certificado" },
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

    // 2. Verificar permisos (EDITOR o superior puede editar)
    await requireRole("EDITOR");

    // 3. Obtener ID y validar entrada
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

    // Validar entrada
    const validation = validateCertificate(body);
    if (!validation.valid) {
      return validationErrorResponse(validation.errors);
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
      month: body.month !== undefined ? (body.month ? Number(body.month) : null) : undefined,
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
          { error: "No tienes permisos para editar certificados" },
          { status: 403 }
        );
      }
    }

    console.error("Error updating certificate:", error);
    return NextResponse.json(
      { error: "Error al actualizar el certificado" },
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

    // 2. Verificar permisos (MASTER_ADMIN puede eliminar)
    await requireRole("MASTER_ADMIN");

    // 3. Eliminar certificado
    const { id } = await params;
    const doc = await adminDb.collection("certificates").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    await adminDb.collection("certificates").doc(id).delete();

    return NextResponse.json(
      { success: true, message: "Certificado eliminado" },
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
          { error: "No tienes permisos para eliminar certificados" },
          { status: 403 }
        );
      }
    }

    console.error("Error deleting certificate:", error);
    return NextResponse.json(
      { error: "Error al eliminar el certificado" },
      { status: 500 }
    );
  }
}
