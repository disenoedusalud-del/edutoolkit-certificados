// src/app/api/debug/user-role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Endpoint de diagnóstico para verificar el rol de un usuario
 * Útil para debuggear problemas de roles
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Normalizar email para buscar en Firestore
    const normalizedEmail = user.email.toLowerCase();
    const docId = normalizedEmail.replace(/[.#$/[\]]/g, "_");

    // Buscar en Firestore
    const userDoc = await adminDb.collection("adminUsers").doc(docId).get();
    
    const debugInfo = {
      authenticatedUser: {
        email: user.email,
        role: user.role,
        uid: user.uid,
      },
      firestoreLookup: {
        docId: docId,
        exists: userDoc.exists,
        data: userDoc.exists ? userDoc.data() : null,
      },
      normalization: {
        originalEmail: user.email,
        normalizedEmail: normalizedEmail,
        docId: docId,
        pattern: "replace(/[.#$/[\]]/g, '_')",
      },
      masterAdminCheck: {
        masterAdminEmails: (process.env.MASTER_ADMIN_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
        isMasterAdmin: (process.env.MASTER_ADMIN_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
          .includes(normalizedEmail),
      },
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error al obtener información del usuario",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

