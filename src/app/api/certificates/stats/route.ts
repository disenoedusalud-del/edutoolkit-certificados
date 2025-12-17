import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import type { Certificate } from "@/types/Certificate";

/**
 * GET /api/certificates/stats
 * 
 * Retorna estadísticas agregadas de certificados sin cargar todos los documentos.
 * Esto es mucho más eficiente que cargar todos los certificados en el frontend.
 * 
 * Requiere: VIEWER o superior
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar rol (VIEWER o superior)
    try {
      await requireRole("VIEWER");
    } catch (error: any) {
      if (error.message === "FORBIDDEN" || error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        );
      }
      throw error;
    }

    // 3. Obtener todos los certificados (necesario para estadísticas)
    // Nota: Firestore no tiene agregaciones nativas, así que necesitamos leer los documentos
    // pero al menos lo hacemos en el backend y solo enviamos los datos agregados
    const snapshot = await adminDb.collection("certificates").get();
    
    const certificates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Certificate[];

    // 4. Calcular estadísticas
    const total = certificates.length;
    
    // Por estado
    const porEstado = certificates.reduce(
      (acc, cert) => {
        const status = (cert.deliveryStatus as string) || "en_archivo";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const entregados = porEstado["entregado"] || 0;
    const listosParaEntrega = porEstado["listo_para_entrega"] || 0;
    const enArchivo = porEstado["en_archivo"] || 0;
    const digitalEnviado = porEstado["digital_enviado"] || 0;

    // Por año
    const porAño = certificates.reduce(
      (acc, cert) => {
        const año = (cert.year as number) || new Date().getFullYear();
        acc[año] = (acc[año] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const añoActual = new Date().getFullYear();
    const esteAño = porAño[añoActual] || 0;

    // 5. Retornar estadísticas agregadas
    return NextResponse.json(
      {
        total,
        porEstado: {
          entregados,
          listosParaEntrega,
          enArchivo,
          digitalEnviado,
        },
        porAño,
        esteAño,
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    logger.error("Error fetching certificate stats", {
      error: error?.message || String(error),
      endpoint: "/api/certificates/stats",
    });

    return NextResponse.json(
      {
        error: "Error al obtener estadísticas",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

