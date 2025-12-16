// src/app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export const runtime = "nodejs";


const COOKIE_NAME = "edutoolkit_session";
// 5 días en segundos (para createSessionCookie)
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 5;

/**
 * Verifica si un email está autorizado para acceder al panel
 * Verifica en:
 * 1. Colección adminUsers en Firestore
 * 2. MASTER_ADMIN_EMAILS (variable de entorno)
 * 3. ALLOWED_ADMIN_EMAILS (variable de entorno, fallback)
 */
async function isAuthorizedEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. Verificar en adminUsers (Firestore)
  const docId = normalizedEmail.replace(/[.#$/[\]]/g, "_");
  const userDoc = await adminDb.collection("adminUsers").doc(docId).get();
  
  if (userDoc.exists) {
    return true; // El usuario está en la lista de adminUsers
  }
  
  // 2. Verificar en MASTER_ADMIN_EMAILS
  const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  if (masterEmails.includes(normalizedEmail)) {
    return true;
  }
  
  // 3. Verificar en ALLOWED_ADMIN_EMAILS (fallback para compatibilidad)
  const allowedRaw = process.env.ALLOWED_ADMIN_EMAILS || "";
  const allowed = allowedRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  return allowed.includes(normalizedEmail);
}

export async function POST(request: NextRequest) {
  try {
    console.log("[LOGIN][POST] Iniciando proceso de login...");
    
    // 1. Rate limiting estricto para login (prevenir fuerza bruta)
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimitResult.success) {
      console.log("[LOGIN][POST] Rate limit excedido");
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Validar entrada
    const { idToken } = await request.json();

    if (!idToken) {
      console.log("[LOGIN][POST] ❌ Falta idToken");
      return NextResponse.json(
        { error: "Falta idToken en el cuerpo de la petición" },
        { status: 400 }
      );
    }

    console.log("[LOGIN][POST] ✅ idToken recibido, verificando...");

    // 3. Verificar el token del cliente (Firebase Auth en el navegador)
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
      console.log("[LOGIN][POST] ✅ Token verificado, email:", decoded.email);
    } catch (tokenError: any) {
      console.error("[LOGIN][POST] ❌ Error verificando token:", tokenError?.message || tokenError);
      return NextResponse.json(
        {
          error: "Token inválido o expirado",
          details: tokenError?.message ?? String(tokenError),
        },
        { status: 401 }
      );
    }

    const userEmail = decoded.email?.toLowerCase();

    if (!userEmail) {
      console.log("[LOGIN][POST] ❌ No se pudo obtener email del token");
      return NextResponse.json(
        { error: "No se pudo obtener el correo del usuario" },
        { status: 400 }
      );
    }

    console.log("[LOGIN][POST] Verificando autorización para:", userEmail);

    // 4. Verificar si el email está autorizado (misma lógica que registro)
    const isAuthorized = await isAuthorizedEmail(userEmail);

    console.log("[LOGIN][POST] Email autorizado:", isAuthorized);
    console.log("[LOGIN][POST] MASTER_ADMIN_EMAILS:", process.env.MASTER_ADMIN_EMAILS ? "configurado" : "NO configurado");
    console.log("[LOGIN][POST] ALLOWED_ADMIN_EMAILS:", process.env.ALLOWED_ADMIN_EMAILS ? "configurado" : "NO configurado");

    if (!isAuthorized) {
      console.warn(
        "[LOGIN] ❌ Intento de acceso con correo no autorizado:",
        userEmail
      );
      return NextResponse.json(
        { error: "Este correo no tiene permisos para acceder al panel. Contacta a un administrador para que te agregue a la lista de usuarios permitidos." },
        { status: 403 }
      );
    }

    console.log("[LOGIN][POST] ✅ Email autorizado, creando cookie de sesión...");

    // 3) Crear cookie de sesión con Firebase Admin
    let sessionCookie;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRES_IN_SECONDS,
      });
      console.log("[LOGIN][POST] ✅ Cookie de sesión creada exitosamente");
    } catch (cookieError: any) {
      console.error("[LOGIN][POST] ❌ Error creando cookie:", cookieError?.message || cookieError);
      return NextResponse.json(
        {
          error: "No se pudo crear la cookie de sesión",
          details: cookieError?.message ?? String(cookieError),
        },
        { status: 401 }
      );
    }

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

    console.log("[LOGIN][POST] ✅ Login exitoso para:", userEmail);
    return response;
  } catch (error: any) {
    console.error("[LOGIN][POST] ❌ Error inesperado creando sesión:", error);
    console.error("[LOGIN][POST] Stack:", error?.stack);
    return NextResponse.json(
      {
        error: "No se pudo crear la sesión",
        details: error?.message ?? String(error),
      },
      { status: 401 }
    );
  }
}


