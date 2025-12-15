// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";


const COOKIE_NAME = "edutoolkit_session";
// 7 días en segundos (para createSessionCookie)
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "Falta idToken" },
        { status: 400 }
      );
    }

    // Verificar el token del cliente (Firebase Auth en el navegador)
    const decoded = await adminAuth.verifyIdToken(idToken);

    console.log("[AUTH][SESSION][POST] Usuario autenticado:", decoded.uid, decoded.email);

    // Crear cookie de sesión con Firebase Admin (session cookie, no idToken)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
    });

    console.log("[AUTH][SESSION][POST] ✅ Session cookie creada exitosamente, expira en 7 días");

    const response = NextResponse.json({ ok: true });

    // Guardar session cookie (httpOnly, secure en producción)
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
  } catch (error) {
    console.error("[AUTH][SESSION][POST] Error creando sesión:", error);
    return NextResponse.json(
      {
        error: "No se pudo crear la sesión",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ ok: true });

    // Borrar la cookie de sesión
    response.cookies.set({
      name: COOKIE_NAME,
      value: "",
      maxAge: 0, // expira de inmediato
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[AUTH][SESSION][DELETE] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cerrar sesión" },
      { status: 500 }
    );
  }
}
