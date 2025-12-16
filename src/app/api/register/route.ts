// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { isAuthorizedEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    const isAllowed = await isAuthorizedEmail(email);
    
    if (!isAllowed) {
      return NextResponse.json(
        {
          error:
            "Este correo no está autorizado. Contacta a un administrador para que te agregue a la lista de usuarios permitidos.",
        },
        { status: 403 },
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
          { status: 409 },
        );
      }
    } catch (err: any) {
      // En Admin SDK, si no existe lanza auth/user-not-found
      if (err?.code !== "auth/user-not-found") {
        console.error("[REGISTER] Error comprobando usuario:", err);
        return NextResponse.json(
          { error: "Error interno al verificar el usuario" },
          { status: 500 },
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
        error: "No se pudo crear la cuenta",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
