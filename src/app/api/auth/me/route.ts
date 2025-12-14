// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Obtener usuario actual
    const user = await getCurrentUser();

    if (!user) {
      console.log("[AUTH][ME][GET] ❌ No hay sesión válida");
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    console.log("[AUTH][ME][GET] ✅ Session cookie válida:", { email: user.email, role: user.role });

    return NextResponse.json(
      {
        email: user.email,
        role: user.role,
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

