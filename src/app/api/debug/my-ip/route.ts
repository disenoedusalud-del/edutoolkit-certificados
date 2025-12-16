// src/app/api/debug/my-ip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Rate limiting MUY permisivo para endpoints de debug
 * 50 requests por minuto - suficiente para uso normal pero difícil de alcanzar
 * Esto evita que te quedes bloqueado en los endpoints de debug
 */
const DEBUG_RATE_LIMIT = {
  maxRequests: 50,
  windowMs: 60 * 1000, // 1 minuto
};

/**
 * Endpoint para obtener la IP del usuario actual (solo MASTER_ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting muy permisivo (50 req/min) para evitar bloqueos en este endpoint
    const rateLimitResult = await rateLimit(request, DEBUG_RATE_LIMIT);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // Solo MASTER_ADMIN puede ver su IP
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json(
        { error: "Solo MASTER_ADMIN puede ver su IP" },
        { status: 403 }
      );
    }

    // Obtener IP del request
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfIP = request.headers.get("cf-connecting-ip");
    
    const clientIP = forwarded?.split(",")[0].trim() || realIP || cfIP || "unknown";

    return NextResponse.json(
      {
        ip: clientIP,
        headers: {
          "x-forwarded-for": forwarded || null,
          "x-real-ip": realIP || null,
          "cf-connecting-ip": cfIP || null,
        },
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("[MY-IP] Error:", error);
    return NextResponse.json(
      {
        error: "Error al obtener IP",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

