// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Lee la lista de correos permitidos desde ALLOWED_ADMIN_EMAILS
 * Formato: "correo1@unah.edu.hn,correo2@unah.edu.hn"
 */
function isAllowedEmail(email: string): boolean {
  const raw = process.env.ALLOWED_ADMIN_EMAILS || "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 🔹 SOLO validamos correo + contraseña
    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // Verificar si el correo está autorizado (env var o lo que tenga configurado)
    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Este correo no está autorizado. Solicite acceso al departamento de comunicaciones.",
        },
        { status: 403 }
      );
    }

    // Verificar si ya existe usuario con ese correo
    try {
      const existing = await adminAuth.getUserByEmail(email);
      if (existing) {
        return NextResponse.json(
          {
            error:
              "Ya existe una cuenta con este correo. Use 'Iniciar sesión' o pida restablecer contraseña.",
          },
          { status: 409 }
        );
      }
    } catch (err: any) {
      // En Admin SDK, si no existe lanza auth/user-not-found
      if (err?.code !== "auth/user-not-found") {
        console.error("[REGISTER] Error comprobando usuario:", err);
        return NextResponse.json(
          { error: "Error interno al verificar el usuario." },
          { status: 500 }
        );
      }
    }

    // Crear el usuario en Firebase Auth
    await adminAuth.createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[REGISTER] Error:", error);
    return NextResponse.json(
      {
        error: "No se pudo crear la cuenta.",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
