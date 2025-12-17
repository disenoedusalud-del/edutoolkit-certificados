// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { isAuthorizedEmail } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    const body = await req.json();
    email = body.email;
    const password = body.password;

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
        logger.error("Error comprobando usuario existente", err, { email, endpoint: "/api/register" });
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

    logger.info("Usuario registrado exitosamente", { email });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error registrando usuario", error, { email: email || "unknown", endpoint: "/api/register" });
    return NextResponse.json(
      {
        error: "No se pudo crear la cuenta",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
