// src/lib/firebaseAdmin.ts

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;

/**
 * Inicializa Firebase Admin de forma lazy (solo cuando se necesita)
 * Esto evita que el build falle si faltan variables de entorno
 */
function getAdmin(): App {
  // Si ya está inicializado, retornar la instancia existente
  if (adminApp) {
    return adminApp;
  }

  // Intentar primero con FIREBASE_ADMIN_SA_BASE64 (JSON completo en base64)
  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SA_BASE64;
  
  // Logs de debug para verificar qué variables están disponibles
  console.log("[FIREBASE-ADMIN] hasBase64:", !!serviceAccountBase64);
  console.log("[FIREBASE-ADMIN] hasPk:", !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (serviceAccountBase64) {
    try {
      // Decodificar base64 y parsear JSON
      const serviceAccountJson = Buffer.from(serviceAccountBase64, "base64").toString("utf-8");
      const sa = JSON.parse(serviceAccountJson);
      
      // Normalizar private_key (cubre todos los casos posibles)
      let pk = (sa.private_key || "");
      
      // Normalizar saltos de línea
      pk = pk
        .replace(/\\n/g, "\n")    // por si viene como \n literal
        .replace(/\r\n/g, "\n")    // por si trae CRLF
        .replace(/\r/g, "\n")      // por si trae solo CR
        .trim();
      
      // Por si viene con comillas pegadas (pasa cuando se pega/serializa mal)
      pk = pk.replace(/^"+|"+$/g, "");
      
      const serviceAccount = {
        ...sa,
        private_key: pk,
      };
      
      console.log("[FIREBASE-ADMIN] ✅ usando base64");
      
      adminApp =
        getApps().length === 0
          ? initializeApp({
              credential: cert(serviceAccount as any),
              projectId: sa.project_id, // recomendado
            })
          : getApps()[0];
    } catch (error) {
      console.error("[FIREBASE-ADMIN] ❌ Error parseando FIREBASE_ADMIN_SA_BASE64:", error);
      throw new Error(
        `Error parseando FIREBASE_ADMIN_SA_BASE64: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // Fallback a variables individuales (compatibilidad)
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Faltan variables de entorno de Firebase Admin. Configura FIREBASE_ADMIN_SA_BASE64 o las variables individuales (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)."
      );
    }

    console.log("[FIREBASE-ADMIN] ⚠️ usando vars individuales");

    // Normalizar private_key (cubre todos los casos posibles)
    privateKey = privateKey
      .replace(/\\n/g, "\n")    // por si viene como \n literal
      .replace(/\r\n/g, "\n")    // por si trae CRLF
      .replace(/\r/g, "\n")      // por si trae solo CR
      .trim();
    
    // Por si viene con comillas pegadas (pasa cuando se pega/serializa mal)
    privateKey = privateKey.replace(/^"+|"+$/g, "");

    adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
            projectId, // recomendado
          })
        : getApps()[0];
  }

  return adminApp;
}

// Variables para cachear las instancias
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;

/**
 * Obtiene la instancia de Firestore (lazy initialization)
 */
function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getAdmin());
  }
  return _adminDb;
}

/**
 * Obtiene la instancia de Auth (lazy initialization)
 */
function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdmin());
  }
  return _adminAuth;
}

// Exportar como objetos que delegan a las funciones getter
// Esto mantiene compatibilidad con el código existente
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




