// src/lib/auth.ts
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const COOKIE_NAME = "edutoolkit_session";

export type UserRole = "MASTER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER";

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
}

/**
 * Obtiene el usuario autenticado desde la cookie de sesión
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return null;
    }

    // Verificar la cookie de sesión con Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    if (!decoded.email) {
      return null;
    }

    // Obtener el rol del usuario desde Firestore
    const docId = decoded.email.toLowerCase().replace(/[.#$/[\]]/g, "_");
    const userDoc = await adminDb
      .collection("adminUsers")
      .doc(docId)
      .get();

    let role: UserRole = "VIEWER"; // Rol por defecto

    if (userDoc.exists) {
      const userData = userDoc.data();
      role = (userData?.role as UserRole) || "VIEWER";
    } else {
      // Si no existe en adminUsers, verificar si es MASTER_ADMIN desde env
      const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      
      if (masterEmails.includes(decoded.email.toLowerCase())) {
        role = "MASTER_ADMIN";
      }
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
    };
  } catch (error) {
    console.error("[AUTH] Error verificando sesión:", error);
    return null;
  }
}

/**
 * Verifica si el usuario tiene un rol específico o superior
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
    MASTER_ADMIN: 4,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Middleware helper para proteger endpoints
 * Retorna el usuario autenticado o lanza error si no está autenticado
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  
  return user;
}

/**
 * Middleware helper para verificar permisos por rol
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasRole(user.role, requiredRole)) {
    throw new Error("FORBIDDEN");
  }
  
  return user;
}

/**
 * Verifica si un email está autorizado para acceder al panel
 * Verifica en:
 * 1. Colección adminUsers en Firestore
 * 2. MASTER_ADMIN_EMAILS (variable de entorno)
 * 3. ALLOWED_ADMIN_EMAILS (variable de entorno, fallback)
 */
export async function isAuthorizedEmail(email: string): Promise<boolean> {
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

