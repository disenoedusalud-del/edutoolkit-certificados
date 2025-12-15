// src/lib/firebaseAdmin.ts

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;

function normalizePrivateKey(pk: string): string {
  return (pk || "")
    .replace(/\\n/g, "\n")      // por si viene como \n literal
    .replace(/\r\n/g, "\n")     // CRLF
    .replace(/\r/g, "\n")       // CR
    .replace(/^"+|"+$/g, "")    // comillas pegadas
    .trim();
}

function cleanMaybeQuoted(val?: string | null): string {
  return (val || "").trim().replace(/^"+|"+$/g, "");
}

/**
 * Inicializa Firebase Admin de forma lazy (solo cuando se necesita)
 */
function getAdmin(): App {
  if (adminApp) return adminApp;

  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  // Preferido: JSON completo en base64
  const serviceAccountBase64 = cleanMaybeQuoted(process.env.FIREBASE_ADMIN_SA_BASE64);

  // Logs de debug (sin exponer secretos)
  console.log("[FIREBASE-ADMIN] hasBase64:", !!serviceAccountBase64);
  console.log("[FIREBASE-ADMIN] hasPkVar:", !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (serviceAccountBase64) {
    try {
      const json = Buffer.from(serviceAccountBase64, "base64").toString("utf8").trim();
      const sa = JSON.parse(json);

      // Mapear a camelCase (lo que espera firebase-admin)
      const projectId = sa.project_id ?? sa.projectId;
      const clientEmail = sa.client_email ?? sa.clientEmail;
      const privateKeyRaw = sa.private_key ?? sa.privateKey;

      const privateKey = normalizePrivateKey(privateKeyRaw);

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Service Account (base64) incompleto: projectId/clientEmail/privateKey");
      }

      console.log("[FIREBASE-ADMIN] ✅ usando base64");

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        } as any),
        projectId,
      });

      return adminApp;
    } catch (error) {
      console.error("[FIREBASE-ADMIN] ❌ Error usando FIREBASE_ADMIN_SA_BASE64:", error);
      throw new Error(
        `Error usando FIREBASE_ADMIN_SA_BASE64: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Fallback: variables individuales
  const projectId = cleanMaybeQuoted(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanMaybeQuoted(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKeyEnv = cleanMaybeQuoted(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKeyEnv) {
    throw new Error(
      "Faltan variables de Firebase Admin. Configure FIREBASE_ADMIN_SA_BASE64 o (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)."
    );
  }

  console.log("[FIREBASE-ADMIN] ⚠️ usando vars individuales");

  const privateKey = normalizePrivateKey(privateKeyEnv);

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    } as any),
    projectId,
  });

  return adminApp;
}

// Cache instancias
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;

function getAdminDb(): Firestore {
  if (!_adminDb) _adminDb = getFirestore(getAdmin());
  return _adminDb;
}

function getAdminAuth(): Auth {
  if (!_adminAuth) _adminAuth = getAuth(getAdmin());
  return _adminAuth;
}

// Compatibilidad con el código existente
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getAdminDb() as any)[prop];
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAdminAuth() as any)[prop];
  },
});
