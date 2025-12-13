// src/lib/adminRoles.ts
import { adminDb } from "@/lib/firebaseAdmin";

//
// Tipos de rol
//
export type AdminRole = "ADMIN" | "LECTOR";

export interface AdminUser {
  email: string;
  role: AdminRole;
  active?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const ADMIN_USERS_COLLECTION = "adminUsers";

//
// Helpers para listas en variables de entorno
//
function parseEmailList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Correos que son "super administradores"
 * Variable: MASTER_ADMIN_EMAILS = "correo1@...,correo2@..."
 */
export function isMasterAdmin(email: string): boolean {
  const list = parseEmailList(process.env.MASTER_ADMIN_EMAILS);
  return list.includes(email.toLowerCase());
}

// Alias para compatibilidad con código antiguo
export function isSuperAdminEmail(email: string): boolean {
  return isMasterAdmin(email);
}

/**
 * Correos que están autorizados para usar el panel
 * Variable: ALLOWED_ADMIN_EMAILS = "correo1@...,correo2@..."
 * Incluye también a los MASTER.
 */
export function isAllowedAdminEmail(email: string): boolean {
  const allowed = parseEmailList(process.env.ALLOWED_ADMIN_EMAILS);
  const masters = parseEmailList(process.env.MASTER_ADMIN_EMAILS);
  const set = new Set([...allowed, ...masters]);
  return set.has(email.toLowerCase());
}

/**
 * Obtiene el rol de un correo:
 * - Si está en MASTER_ADMIN_EMAILS -> "ADMIN"
 * - Si existe en la colección "adminUsers" -> usa ese rol (ADMIN/LECTOR)
 * - Si solo está en ALLOWED_ADMIN_EMAILS -> "ADMIN"
 * - Si no está en ningún lado -> "NONE"
 */
export async function getAdminRoleForEmail(
  email: string,
): Promise<AdminRole | "NONE"> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "NONE";

  // 1) MASTER siempre ADMIN
  if (isMasterAdmin(normalized)) {
    return "ADMIN";
  }

  // 2) Buscar en Firestore (colección adminUsers, doc ID = email)
  try {
    const docRef = adminDb
      .collection(ADMIN_USERS_COLLECTION)
      .doc(normalized);
    const snap = await docRef.get();

    if (snap.exists) {
      const data = snap.data() as Partial<AdminUser>;
      if (data.role === "ADMIN" || data.role === "LECTOR") {
        return data.role;
      }
    }
  } catch (error) {
    console.error("[ADMIN-ROLES] Error leyendo rol en Firestore:", error);
  }

  // 3) Si está en ALLOWED_ADMIN_EMAILS, pero no en Firestore -> ADMIN por defecto
  if (isAllowedAdminEmail(normalized)) {
    return "ADMIN";
  }

  // 4) No tiene ningún permiso
  return "NONE";
}

/**
 * Guarda / actualiza un usuario admin en Firestore.
 * Lo usará la API /api/admin-users.
 */
export async function saveAdminUser(
  email: string,
  role: AdminRole,
  updatedBy: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  await adminDb
    .collection(ADMIN_USERS_COLLECTION)
    .doc(normalized)
    .set(
      {
        email: normalized,
        role,
        active: true,
        updatedAt: new Date().toISOString(),
        updatedBy,
      },
      { merge: true },
    );
}

/**
 * Lista todos los usuarios administradores guardados en Firestore.
 */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const snap = await adminDb.collection(ADMIN_USERS_COLLECTION).get();
  return snap.docs.map((doc) => doc.data() as AdminUser);
}
