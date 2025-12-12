// src/app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const COOKIE_NAME = "edutoolkit_session";
// 5 días en milisegundos
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "Falta idToken en el cuerpo de la petición" },
        { status: 400 }
      );
    }

    // 1) Verificar el token del cliente (Firebase Auth en el navegador)
    const decoded = await adminAuth.verifyIdToken(idToken);

    // 2) Leer lista de correos permitidos desde las variables de entorno
    const allowedRaw = process.env.ALLOWED_ADMIN_EMAILS || "";
    const allowedEmails = allowedRaw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = decoded.email?.toLowerCase();

    // Si no hay email o no está en la lista, bloquear
    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.warn(
        "[LOGIN] Intento de acceso con correo no autorizado:",
        userEmail
      );
      return NextResponse.json(
        { error: "Este correo no tiene permisos para acceder al panel." },
        { status: 403 }
      );
    }

    // 3) Crear cookie de sesión con Firebase Admin
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionCookie,
      maxAge: SESSION_EXPIRES_IN / 1000, // en segundos
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[LOGIN][POST] Error creando sesión:", error);
    return NextResponse.json(
      {
        error: "No se pudo crear la sesión",
        details: error?.message ?? String(error),
      },
      { status: 401 }
    );
  }
}


