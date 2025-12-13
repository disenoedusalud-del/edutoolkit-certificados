// src/app/api/admin-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { AdminRole, AdminUser, isMasterAdmin } from "@/lib/adminRoles";

/**
 * Obtiene el correo del usuario autenticado a partir
 * de la cookie de sesión de Firebase.
 */
async function getCurrentUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.email ?? null;
  } catch (error) {
    console.error("[ADMIN-USERS] Error verificando sessionCookie:", error);
    return null;
  }
}

/**
 * GET /api/admin-users
 * Solo MASTER:
 *  - Lista todos los usuarios administradores guardados en Firestore
 */
export async function GET() {
  try {
    const email = await getCurrentUserEmail();

    if (!email || !isMasterAdmin(email)) {
      return NextResponse.json(
        { error: "No autorizado (solo MASTER_ADMIN)" },
        { status: 403 },
      );
    }

    const snapshot = await adminDb.collection("adminUsers").get();

    const users: AdminUser[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        email: data.email,
        role: data.role as AdminRole,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("[ADMIN-USERS][GET] Error:", error);
    return NextResponse.json(
      {
        error: "Error al obtener usuarios administradores",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin-users
 * Solo MASTER:
 *  - Crea o actualiza un usuario admin con rol ADMIN o LECTOR
 * Body JSON: { email: string, role: "ADMIN" | "LECTOR" }
 */
export async function POST(req: NextRequest) {
  try {
    const currentEmail = await getCurrentUserEmail();

    if (!currentEmail || !isMasterAdmin(currentEmail)) {
      return NextResponse.json(
        { error: "No autorizado (solo MASTER_ADMIN)" },
        { status: 403 },
      );
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Correo y rol son obligatorios" },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).toUpperCase() as AdminRole;

    if (!["ADMIN", "LECTOR"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Rol inválido. Use ADMIN o LECTOR." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const docRef = adminDb
      .collection("adminUsers")
      .doc(normalizedEmail.replace(/[.#$/[\]]/g, "_"));

    await docRef.set(
      {
        email: normalizedEmail,
        role: normalizedRole,
        updatedAt: now,
        updatedBy: currentEmail,
      },
      { merge: true },
    );

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      role: normalizedRole,
    });
  } catch (error: any) {
    console.error("[ADMIN-USERS][POST] Error:", error);
    return NextResponse.json(
      {
        error: "No se pudo guardar el usuario administrador",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}

