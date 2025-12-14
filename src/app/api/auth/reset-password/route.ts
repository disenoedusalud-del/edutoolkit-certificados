// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateEmail } from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * Verifica si un email está autorizado (misma lógica que login/register)
 */
async function isAuthorizedEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. Verificar en adminUsers (Firestore)
  const docId = normalizedEmail.replace(/[.#$/[\]]/g, "_");
  const userDoc = await adminDb.collection("adminUsers").doc(docId).get();
  
  if (userDoc.exists) {
    return true;
  }
  
  // 2. Verificar en MASTER_ADMIN_EMAILS
  const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  if (masterEmails.includes(normalizedEmail)) {
    return true;
  }
  
  // 3. Verificar en ALLOWED_ADMIN_EMAILS
  const allowedRaw = process.env.ALLOWED_ADMIN_EMAILS || "";
  const allowed = allowedRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  return allowed.includes(normalizedEmail);
}

export async function POST(request: NextRequest) {
  console.log("[RESET-PASSWORD] ⚡ Endpoint llamado");
  
  try {
    // 1. Rate limiting estricto
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.AUTH);
    if (!rateLimitResult.success) {
      console.log("[RESET-PASSWORD] ⚠️ Rate limit alcanzado");
      return rateLimitResponse(rateLimitResult.resetTime);
    }
    
    console.log("[RESET-PASSWORD] ✅ Rate limit OK");

    // 2. Validar entrada
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "El correo es requerido" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "El formato del correo no es válido" },
        { status: 400 }
      );
    }

    // 3. Verificar que el email esté autorizado
    console.log(`[RESET-PASSWORD] 🔍 Verificando autorización para: ${email}`);
    const isAuthorized = await isAuthorizedEmail(email);
    console.log(`[RESET-PASSWORD] 🔍 Resultado autorización: ${isAuthorized ? "✅ AUTORIZADO" : "❌ NO AUTORIZADO"}`);
    
    if (!isAuthorized) {
      console.log(`[RESET-PASSWORD] ⚠️ Email no autorizado, saliendo sin enviar email`);
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json(
        {
          success: true,
          message: "Si el correo está registrado, recibirás un email con instrucciones para restablecer tu contraseña.",
        },
        { status: 200 }
      );
    }

    // 4. Verificar que el usuario exista en Firebase Auth
    console.log(`[RESET-PASSWORD] 🔍 Verificando existencia en Firebase Auth para: ${email}`);
    try {
      await adminAuth.getUserByEmail(email);
      console.log(`[RESET-PASSWORD] ✅ Usuario existe en Firebase Auth`);
    } catch (error: unknown) {
      const err = error as { code?: string };
      console.log(`[RESET-PASSWORD] ❌ Error verificando usuario: ${err?.code || "desconocido"}`);
      // Si no existe, devolver mensaje genérico (por seguridad)
      if (err?.code === "auth/user-not-found") {
        console.log(`[RESET-PASSWORD] ⚠️ Usuario no encontrado, saliendo sin enviar email`);
        return NextResponse.json(
          {
            success: true,
            message: "Si el correo está registrado, recibirás un email con instrucciones para restablecer tu contraseña.",
          },
          { status: 200 }
        );
      }
      throw error;
    }

    // 5. Si llegamos aquí, el email está autorizado y existe
    // Generar el link de restablecimiento usando Admin SDK
    // Obtener la URL base del request
    let origin = request.headers.get("origin");
    if (!origin) {
      const host = request.headers.get("host");
      if (host) {
        origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
      } else {
        origin = process.env.NEXT_PUBLIC_APP_URL || 
                 (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                 "http://localhost:3000";
      }
    }
    
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: `${origin}/reset-password`,
    });

    // Enviar el email usando EmailJS
    console.log(`[RESET-PASSWORD] 📧 INICIANDO ENVÍO DE EMAIL a: ${email}`);
    console.log(`[RESET-PASSWORD] 🔗 Reset link generado: ${resetLink.substring(0, 80)}...`);
    
    try {
      const emailResult = await sendPasswordResetEmail({
        to: email,
        resetLink,
      });
      
      console.log(`[RESET-PASSWORD] ✅✅✅ Email de restablecimiento enviado EXITOSAMENTE a: ${email}`);
      console.log(`[RESET-PASSWORD] 📬 Resultado de EmailJS:`, JSON.stringify(emailResult, null, 2));
    } catch (emailError: any) {
      console.error("[RESET-PASSWORD] ❌❌❌ ERROR CRÍTICO enviando email:");
      console.error("[RESET-PASSWORD] Error message:", emailError?.message);
      console.error("[RESET-PASSWORD] Error text:", emailError?.text);
      console.error("[RESET-PASSWORD] Error status:", emailError?.status);
      console.error("[RESET-PASSWORD] Error completo:", JSON.stringify(emailError, null, 2));
      console.error("[RESET-PASSWORD] Stack trace:", emailError?.stack);
      // Por seguridad, aún devolvemos éxito para no revelar si el email existe
      // Pero registramos el error para debugging
    }

    // Por seguridad, siempre devolvemos el mismo mensaje
    return NextResponse.json(
      {
        success: true,
        message: "Si el correo está registrado, recibirás un email con instrucciones para restablecer tu contraseña.",
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("[RESET-PASSWORD] Error:", error);
    return NextResponse.json(
      {
        success: true,
        message: "Si el correo está registrado, recibirás un email con instrucciones para restablecer tu contraseña.",
      },
      { status: 200 }
    );
  }
}

