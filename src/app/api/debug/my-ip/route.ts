// src/app/api/debug/my-ip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Endpoint para obtener la IP del usuario actual (solo MASTER_ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      ip: clientIP,
      headers: {
        "x-forwarded-for": forwarded || null,
        "x-real-ip": realIP || null,
        "cf-connecting-ip": cfIP || null,
      },
    });
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

