// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";


/**
 * Verifica si un email está autorizado para crear cuenta
 * Verifica en:
 * 1. Colección adminUsers en Firestore
 * 2. MASTER_ADMIN_EMAILS (variable de entorno)
 * 3. ALLOWED_ADMIN_EMAILS (variable de entorno, fallback)
 */
async function isAllowedEmail(email: string): Promise<boolean> {
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

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    const isAllowed = await isAllowedEmail(email);
    
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
