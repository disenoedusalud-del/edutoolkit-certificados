// src/app/api/debug/my-ip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Endpoint para obtener la IP del usuario actual.
 * Solo disponible para usuarios autenticados (no requiere rol específico).
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Obtener la IP del request
    // Intentar obtener de headers comunes (Vercel, proxies, etc.)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip"); // Cloudflare

    let ip: string | null = null;

    if (cfConnectingIP) {
      ip = cfConnectingIP;
    } else if (forwardedFor) {
      // x-forwarded-for puede contener múltiples IPs separadas por coma
      // La primera es generalmente la IP original del cliente
      ip = forwardedFor.split(",")[0].trim();
    } else if (realIP) {
      ip = realIP;
    }

    if (!ip) {
      return NextResponse.json(
        { error: "No se pudo determinar la IP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ip });
  } catch (error) {
    console.error("[DEBUG][MY-IP] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
