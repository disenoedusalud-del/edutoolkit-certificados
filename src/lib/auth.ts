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
    console.log("[AUTH][getCurrentUser] Iniciando verificación de sesión...");
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

    console.log("[AUTH][getCurrentUser] Cookie encontrada:", !!sessionCookie);
    console.log("[AUTH][getCurrentUser] Nombre de cookie buscado:", COOKIE_NAME);
    
    if (!sessionCookie) {
      console.log("[AUTH][getCurrentUser] ❌ No se encontró cookie de sesión");
      // Listar todas las cookies disponibles para debug
      const allCookies = cookieStore.getAll();
      console.log("[AUTH][getCurrentUser] Cookies disponibles:", allCookies.map(c => c.name));
      return null;
    }

    console.log("[AUTH][getCurrentUser] ✅ Cookie encontrada, verificando con Firebase Admin...");

    // Verificar la cookie de sesión con Firebase Admin
    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      console.log("[AUTH][getCurrentUser] ✅ Cookie verificada, email:", decoded.email);
    } catch (verifyError: any) {
      console.error("[AUTH][getCurrentUser] ❌ Error verificando cookie:", verifyError?.message || verifyError);
      return null;
    }
    
    if (!decoded.email) {
      console.log("[AUTH][getCurrentUser] ❌ No se encontró email en el token decodificado");
      return null;
    }

    console.log("[AUTH][getCurrentUser] Obteniendo rol del usuario...");

    // Obtener el rol del usuario desde Firestore
    let userDoc;
    try {
      const docId = decoded.email.toLowerCase().replace(/[.#$/[\]]/g, "_");
      console.log("[AUTH][getCurrentUser] Buscando usuario en Firestore con docId:", docId);
      userDoc = await adminDb
        .collection("adminUsers")
        .doc(docId)
        .get();
      console.log("[AUTH][getCurrentUser] Usuario existe en Firestore:", userDoc.exists);
    } catch (firestoreError: any) {
      console.error("[AUTH][getCurrentUser] ❌ Error accediendo a Firestore:", firestoreError?.message || firestoreError);
      // Continuar con la verificación de MASTER_ADMIN_EMAILS
    }

    let role: UserRole = "VIEWER"; // Rol por defecto

    if (userDoc?.exists) {
      const userData = userDoc.data();
      role = (userData?.role as UserRole) || "VIEWER";
      console.log("[AUTH][getCurrentUser] Rol desde Firestore:", role);
    } else {
      // Si no existe en adminUsers, verificar si es MASTER_ADMIN desde env
      const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      
      console.log("[AUTH][getCurrentUser] MASTER_ADMIN_EMAILS configurado:", !!process.env.MASTER_ADMIN_EMAILS);
      console.log("[AUTH][getCurrentUser] Emails master:", masterEmails);
      console.log("[AUTH][getCurrentUser] Email del usuario:", decoded.email.toLowerCase());
      
      if (masterEmails.includes(decoded.email.toLowerCase())) {
        role = "MASTER_ADMIN";
        console.log("[AUTH][getCurrentUser] ✅ Usuario es MASTER_ADMIN");
      } else {
        console.log("[AUTH][getCurrentUser] ⚠️ Usuario no está en MASTER_ADMIN_EMAILS, usando rol VIEWER");
      }
    }

    console.log("[AUTH][getCurrentUser] ✅ Usuario autenticado:", { uid: decoded.uid, email: decoded.email, role });

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
    };
  } catch (error: any) {
    console.error("[AUTH][getCurrentUser] ❌ Error inesperado verificando sesión:", error?.message || error);
    console.error("[AUTH][getCurrentUser] Stack:", error?.stack);
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

