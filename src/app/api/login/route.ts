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
      console.warn("[LOGIN] Intento de acceso con correo no autorizado:", userEmail);
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

    return response;
  } catch (error: any) {
    console.error("[LOGIN] Error creando sesión:", error);
    return NextResponse.json(
      {
        error: "No se pudo crear la sesión",
        details: error?.message ?? String(error),
      },
      { status: 401 }
    );
  }
}


