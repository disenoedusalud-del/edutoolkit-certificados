import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateStringArray, validationErrorResponse } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  try {
    // 1. Rate limiting (operaciones masivas son más pesadas)
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.HEAVY);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (ADMIN o superior para operaciones masivas)
    await requireRole("ADMIN");

    // 3. Validar entrada
    const body = await request.json();
    const { ids, deliveryStatus } = body;

    // Validar array de IDs
    const idsValidation = validateStringArray(ids, "ids");
    if (!idsValidation.valid) {
      return validationErrorResponse(idsValidation.errors);
    }

    // Validar deliveryStatus
    const validStatuses = [
      "en_archivo",
      "listo_para_entrega",
      "entregado",
      "digital_enviado",
      "anulado",
    ];
    if (!deliveryStatus || !validStatuses.includes(deliveryStatus)) {
      return NextResponse.json(
        {
          error: "Error de validación",
          details: [
            `Estado de entrega inválido. Debe ser uno de: ${validStatuses.join(", ")}`,
          ],
        },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();
    const updates = ids.map((id: string) => {
      const ref = adminDb.collection("certificates").doc(id);
      batch.update(ref, {
        deliveryStatus,
        updatedAt: new Date().toISOString(),
      });
      return id;
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        message: `${updates.length} certificado(s) actualizado(s)`,
        updated: updates.length,
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
          { error: "No tienes permisos para realizar operaciones masivas" },
          { status: 403 }
        );
      }
    }

    console.error("Error updating certificates:", error);
    return NextResponse.json(
      { error: "Error al actualizar los certificados" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Rate limiting (operaciones masivas son más pesadas)
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.HEAVY);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (EDITOR o superior puede eliminar masivamente)
    const user = await requireRole("EDITOR");

    // 3. Validar entrada
    const body = await request.json();
    const { ids } = body;

    // Validar array de IDs
    const idsValidation = validateStringArray(ids, "ids");
    if (!idsValidation.valid) {
      return validationErrorResponse(idsValidation.errors);
    }

    const batch = adminDb.batch();
    ids.forEach((id: string) => {
      const ref = adminDb.collection("certificates").doc(id);
      batch.delete(ref);
    });

    await batch.commit();

    // 4. Registrar en el historial
    try {
      await adminDb.collection("systemHistory").add({
        action: "deleted",
        entityType: "certificate",
        entityId: "bulk",
        entityName: `${ids.length} certificados (Masivo)`,
        performedBy: user.email,
        timestamp: new Date().toISOString(),
        details: {
          count: ids.length,
          ids: ids.slice(0, 50) // Guardar solo los primeros 50 para no exceder límites
        }
      });
    } catch (logError) {
      console.error("Error logging bulk deletion to history:", logError);
    }

    return NextResponse.json(
      {
        success: true,
        message: `${ids.length} certificado(s) eliminado(s)`,
        deleted: ids.length,
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
          { error: "No tienes permisos para eliminar certificados" },
          { status: 403 }
        );
      }
    }

    console.error("Error deleting certificates:", error);
    return NextResponse.json(
      { error: "Error al eliminar los certificados" },
      { status: 500 }
    );
  }
}

