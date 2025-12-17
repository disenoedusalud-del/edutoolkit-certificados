// src/app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { isAuthorizedEmail } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const COOKIE_NAME = "edutoolkit_session";
// 5 días en segundos (para createSessionCookie)
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 5;

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting estricto para login (prevenir fuerza bruta)
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Validar entrada
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "Falta idToken en el cuerpo de la petición" },
        { status: 400 }
      );
    }

    // 3. Verificar el token del cliente (Firebase Auth en el navegador)
    const decoded = await adminAuth.verifyIdToken(idToken);

    const userEmail = decoded.email?.toLowerCase();

    if (!userEmail) {
      return NextResponse.json(
        { error: "No se pudo obtener el correo del usuario" },
        { status: 400 }
      );
    }

    // 4. Verificar si el email está autorizado (misma lógica que registro)
    const isAuthorized = await isAuthorizedEmail(userEmail);

    if (!isAuthorized) {
      logger.warn("Intento de acceso con correo no autorizado", { email: userEmail });
      return NextResponse.json(
        { error: "Este correo no tiene permisos para acceder al panel. Contacta a un administrador para que te agregue a la lista de usuarios permitidos." },
        { status: 403 }
      );
    }

    // 5. Crear cookie de sesión con Firebase Admin
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
    });

    const response = NextResponse.json(
      { success: true },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );

    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionCookie,
      maxAge: SESSION_EXPIRES_IN_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    logger.info("Sesión creada exitosamente", { email: userEmail });
    return response;
  } catch (error: any) {
    logger.error("Error creando sesión", error, { endpoint: "/api/login" });
    return NextResponse.json(
      {
        error: "No se pudo crear la sesión",
        details: error?.message ?? String(error),
      },
      { status: 401 }
    );
  }
}


