// src/app/api/auth/check-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Endpoint para verificar si un usuario existe en Firebase Auth
 * Útil para distinguir entre "usuario no existe" y "contraseña incorrecta"
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Validar entrada
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "El correo es requerido" },
        { status: 400 }
      );
    }

    // 3. Verificar si el usuario existe
    try {
      await adminAuth.getUserByEmail(email);
      return NextResponse.json(
        { exists: true },
        {
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code === "auth/user-not-found") {
        return NextResponse.json(
          { exists: false },
          {
            headers: {
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            },
          }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[CHECK-USER] Error:", error);
    return NextResponse.json(
      { error: "Error al verificar usuario" },
      { status: 500 }
    );
  }
}


