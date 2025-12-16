// src/app/api/debug/reset-rate-limit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resetRateLimitForIP, resetAllRateLimits } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Endpoint para resetear rate limits (solo MASTER_ADMIN)
 * Útil cuando un usuario se queda bloqueado por rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    // Solo MASTER_ADMIN puede resetear rate limits
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json(
        { error: "Solo MASTER_ADMIN puede resetear rate limits" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { ip, all } = body;

    // Obtener IP del request
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const requestIP = forwarded?.split(",")[0].trim() || realIP || "unknown";

    if (all === true) {
      // Resetear todos los rate limits
      const count = resetAllRateLimits();
      return NextResponse.json({
        success: true,
        message: `Se resetearon ${count} rate limits`,
        resetCount: count,
      });
    }

    // Resetear rate limit para una IP específica (o la IP del request)
    const targetIP = ip || requestIP;
    const existed = resetRateLimitForIP(targetIP);

    return NextResponse.json({
      success: true,
      message: existed 
        ? `Rate limit reseteado para IP: ${targetIP}`
        : `No se encontró rate limit para IP: ${targetIP}`,
      ip: targetIP,
      existed,
    });
  } catch (error) {
    console.error("[RESET-RATE-LIMIT] Error:", error);
    return NextResponse.json(
      {
        error: "Error al resetear rate limit",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

